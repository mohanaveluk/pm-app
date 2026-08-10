import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { MaterialGroupService } from '../services/material-group.service';
import { MaterialCategoryService } from '../../material-category/services/material-category.service';
import { MaterialCategoryOption } from '../../material-category/models/material-category.model';
import {
  DEFAULT_MATERIAL_GROUP_FILTER, MaterialGroup, MaterialGroupFilter,
  MaterialGroupSortField, SortDirection,
} from '../models/material-group.model';
import {
  CreateMaterialGroupRequest, MaterialGroupQueryParams, UpdateMaterialGroupRequest,
} from '../models/material-group-request.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Material Group master. Provided by
 * MaterialGroupComponent (not root) so state resets on each visit and its
 * subscriptions tear down with the component via takeUntilDestroyed.
 *
 * Mirrors MaterialCategoryStore, plus the parent-category dimension: an extra
 * filter, a cached dropdown of selectable parents, and error messages that
 * account for the parent-must-be-active rules the API enforces.
 */
@Injectable()
export class MaterialGroupStore {
  private readonly service = inject(MaterialGroupService);
  private readonly categoryService = inject(MaterialCategoryService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly materialGroups = signal<MaterialGroup[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  /** Active parent categories, for the filter bar and the create form's dropdown. */
  readonly categoryOptions = signal<MaterialCategoryOption[]>([]);
  readonly categoriesLoading = signal(true);

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly sortBy = signal<MaterialGroupSortField>('displayOrder');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly filter = signal<MaterialGroupFilter>({ ...DEFAULT_MATERIAL_GROUP_FILTER });

  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.materialGroups().length === 0,
  );

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.materialCategoryId || f.status !== 'all' || f.isSystem !== null);
  });

  constructor() {
    this.reload$
      .pipe(
        switchMap(() => this.fetch()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.searchInput$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((term) => this.applySearch(term));

    this.reload$.next();
    this.loadCategoryOptions();
  }

  /** Reloads the current page while preserving search, filters, sort and paging. */
  refresh(): void {
    this.reload$.next();
  }

  setPage(page: number, pageSize: number): void {
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.reload$.next();
  }

  setSort(sortBy: MaterialGroupSortField, sortDirection: SortDirection): void {
    this.sortBy.set(sortBy);
    this.sortDirection.set(sortDirection);
    this.reload$.next();
  }

  /** Debounced as the user types; call applySearch() directly on Enter for an immediate search. */
  onSearchInput(term: string): void {
    this.searchInput$.next(term);
  }

  applySearch(term: string): void {
    this.filter.update((f) => ({ ...f, search: term }));
    this.page.set(0);
    this.reload$.next();
  }

  setFilter(partial: Partial<MaterialGroupFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_MATERIAL_GROUP_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  // ── CRUD + lifecycle ───────────────────────────────────────────────

  async createMaterialGroup(request: CreateMaterialGroupRequest): Promise<MaterialGroup> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.createMaterialGroup(request));
      this.snack.open('Material Group created successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save Material Group', {
        400: 'The selected parent Material Category is inactive. Activate it first, then try again.',
        404: 'The selected parent Material Category could not be found.',
        409: 'A Material Group with this code or name already exists under the selected category.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async updateMaterialGroup(id: string, request: UpdateMaterialGroupRequest): Promise<MaterialGroup> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.updateMaterialGroup(id, request));
      this.snack.open('Material Group updated successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save Material Group', {
        409: 'A Material Group with this name already exists under the same category.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteMaterialGroup(group: MaterialGroup): Promise<void> {
    this.deleting.set(true);
    try {
      await lastValueFrom(this.service.deleteMaterialGroup(group.id));
      this.snack.open('Material Group deleted successfully', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to delete Material Group', {
        409: 'This group is a system group or is currently in use, so it cannot be deleted.',
      });
    } finally {
      this.deleting.set(false);
    }
  }

  /** Routes to the dedicated enable/disable endpoints rather than a full PUT. */
  async setActive(group: MaterialGroup, nextActive: boolean): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(
        nextActive
          ? this.service.enableMaterialGroup(group.id)
          : this.service.disableMaterialGroup(group.id),
      );
      this.snack.open(
        nextActive ? 'Material Group enabled' : 'Material Group disabled',
        'OK',
        { duration: 3000 },
      );
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${nextActive ? 'enable' : 'disable'} Material Group`, {
        400: nextActive
          ? 'This group is already active, or its parent Material Category is inactive.'
          : 'This group is already inactive.',
        409: 'This group is referenced by existing material records and cannot be disabled.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async getMaterialGroupById(id: string): Promise<MaterialGroup> {
    const res = await lastValueFrom(this.service.getMaterialGroupById(id));
    return res.data;
  }

  /** Active parent categories. Only active ones are selectable — the API rejects inactive parents. */
  private loadCategoryOptions(): void {
    this.categoriesLoading.set(true);
    this.categoryService.getActiveMaterialCategories().subscribe({
      next: (res) => {
        this.categoryOptions.set(res.data ?? []);
        this.categoriesLoading.set(false);
      },
      error: () => {
        this.categoryOptions.set([]);
        this.categoriesLoading.set(false);
        this.snack.open('Unable to load parent Material Categories.', 'Close', {
          duration: 5000, panelClass: ['error-snackbar'],
        });
      },
    });
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: MaterialGroupQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
      search: f.search || undefined,
      materialCategoryId: f.materialCategoryId ?? undefined,
      isActive: f.status === 'all' ? undefined : f.status === 'active',
      isSystem: f.isSystem ?? undefined,
    };

    return this.service.getMaterialGroups(params).pipe(
      tap((res) => {
        const paged = res.data;
        this.materialGroups.set(paged?.items ?? []);
        this.totalCount.set(paged?.total ?? 0);
        this.totalPages.set(paged?.totalPages ?? 0);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.messageForStatus(err, 'Unable to load Material Groups. Please try again.', {
          403: 'You do not have permission to view Material Groups.',
        }));
        this.materialGroups.set([]);
        this.totalCount.set(0);
        this.loading.set(false);
        return of(void 0);
      }),
    );
  }

  /**
   * Maps an HTTP failure onto a message safe to show a user. Raw API/SQL text is
   * only surfaced when the backend sent a deliberate `message` field.
   */
  private messageForStatus(
    err: HttpErrorResponse,
    fallback: string,
    statusMessages: Record<number, string> = {},
  ): string {
    const status = err?.status;
    if (status && statusMessages[status]) return statusMessages[status];

    switch (status) {
      case 0:   return 'Cannot reach the server. Check your connection and try again.';
      case 400: return err.error?.message || 'The submitted data is invalid. Please review and try again.';
      case 401: return 'Your session has expired. Please sign in again.';
      case 403: return 'You do not have permission to perform this operation.';
      case 404: return 'Material Group could not be found. It may have been deleted.';
      case 409: return err.error?.message || 'This operation conflicts with existing data.';
      case 500: return 'Something went wrong. Please try again.';
      default:  return err?.error?.message || fallback;
    }
  }

  private toStoreError(err: unknown, fallback: string, statusMessages: Record<number, string> = {}): Error {
    const httpErr = err as HttpErrorResponse;
    const message = this.messageForStatus(httpErr, fallback, statusMessages);
    this.snack.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
    return new Error(message);
  }
}
