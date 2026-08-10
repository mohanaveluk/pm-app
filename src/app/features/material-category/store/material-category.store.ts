import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { MaterialCategoryService } from '../services/material-category.service';
import {
  DEFAULT_MATERIAL_CATEGORY_FILTER, MaterialCategory, MaterialCategoryFilter,
  MaterialCategorySortField, SortDirection,
} from '../models/material-category.model';
import {
  CreateMaterialCategoryRequest, MaterialCategoryQueryParams, UpdateMaterialCategoryRequest,
} from '../models/material-category-request.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Material Category master. Provided by
 * MaterialCategoryComponent (not root) so state resets on each visit and its
 * subscriptions tear down with the component via takeUntilDestroyed.
 *
 * Mirrors DepartmentStore's shape and lifecycle; the differences are dictated by
 * the real API — dedicated enable/disable PATCH endpoints instead of a full PUT,
 * and `page`/`limit`/`sortOrder` query keys instead of page/pageSize/sortDirection.
 */
@Injectable()
export class MaterialCategoryStore {
  private readonly service = inject(MaterialCategoryService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly materialCategories = signal<MaterialCategory[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly sortBy = signal<MaterialCategorySortField>('displayOrder');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly filter = signal<MaterialCategoryFilter>({ ...DEFAULT_MATERIAL_CATEGORY_FILTER });

  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.materialCategories().length === 0,
  );

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.status !== 'all' || f.isSystem !== null);
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

  setSort(sortBy: MaterialCategorySortField, sortDirection: SortDirection): void {
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

  setFilter(partial: Partial<MaterialCategoryFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_MATERIAL_CATEGORY_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  // ── CRUD + lifecycle ───────────────────────────────────────────────

  async createMaterialCategory(request: CreateMaterialCategoryRequest): Promise<MaterialCategory> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.createMaterialCategory(request));
      this.snack.open('Material Category created successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save Material Category', {
        409: 'A Material Category with this code or name already exists.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async updateMaterialCategory(id: string, request: UpdateMaterialCategoryRequest): Promise<MaterialCategory> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.updateMaterialCategory(id, request));
      this.snack.open('Material Category updated successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save Material Category', {
        409: 'A Material Category with this name already exists.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteMaterialCategory(category: MaterialCategory): Promise<void> {
    this.deleting.set(true);
    try {
      await lastValueFrom(this.service.deleteMaterialCategory(category.id));
      this.snack.open('Material Category deleted successfully', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to delete Material Category', {
        409: 'This category is a system category or is currently in use, so it cannot be deleted.',
      });
    } finally {
      this.deleting.set(false);
    }
  }

  /** Routes to the dedicated enable/disable endpoints rather than a full PUT. */
  async setActive(category: MaterialCategory, nextActive: boolean): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(
        nextActive
          ? this.service.enableMaterialCategory(category.id)
          : this.service.disableMaterialCategory(category.id),
      );
      this.snack.open(
        nextActive ? 'Material Category enabled' : 'Material Category disabled',
        'OK',
        { duration: 3000 },
      );
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${nextActive ? 'enable' : 'disable'} Material Category`, {
        400: `This category is already ${nextActive ? 'active' : 'inactive'}.`,
        409: 'This category is referenced by existing material records and cannot be disabled.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async getMaterialCategoryById(id: string): Promise<MaterialCategory> {
    const res = await lastValueFrom(this.service.getMaterialCategoryById(id));
    return res.data;
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: MaterialCategoryQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
      search: f.search || undefined,
      isActive: f.status === 'all' ? undefined : f.status === 'active',
      isSystem: f.isSystem ?? undefined,
    };

    return this.service.getMaterialCategories(params).pipe(
      tap((res) => {
        const paged = res.data;
        this.materialCategories.set(paged?.items ?? []);
        this.totalCount.set(paged?.total ?? 0);
        this.totalPages.set(paged?.totalPages ?? 0);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.messageForStatus(err, 'Unable to load Material Categories. Please try again.', {
          403: 'You do not have permission to view Material Categories.',
        }));
        this.materialCategories.set([]);
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
      case 404: return 'Material Category could not be found. It may have been deleted.';
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
