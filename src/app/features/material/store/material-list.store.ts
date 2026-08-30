import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, forkJoin, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { MaterialService } from '../services/material.service';
import { MaterialCategoryService } from '../../material-category/services/material-category.service';
import { MaterialGroupService } from '../../material-group/services/material-group.service';
import { UnitOfMeasurementService } from '../../unit-of-measurement/services/unit-of-measurement.service';
import { MaterialCategoryOption } from '../../material-category/models/material-category.model';
import { MaterialGroupOption } from '../../material-group/models/material-group.model';
import { UnitOfMeasurementOption } from '../../unit-of-measurement/models/unit-of-measurement.model';
import {
  DEFAULT_MATERIAL_FILTER, Material, MaterialFilter, MaterialListItem, MaterialSortField,
  MaterialStatus, SortDirection,
} from '../models/material.model';
import { MaterialQueryParams } from '../models/material-request.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Material Master list. Provided by
 * MaterialListComponent (not root) so state resets on each visit.
 */
@Injectable()
export class MaterialListStore {
  private readonly service = inject(MaterialService);
  private readonly categoryService = inject(MaterialCategoryService);
  private readonly groupService = inject(MaterialGroupService);
  private readonly uomService = inject(UnitOfMeasurementService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly materials = signal<MaterialListItem[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly categories = signal<MaterialCategoryOption[]>([]);
  readonly groups = signal<MaterialGroupOption[]>([]);
  readonly uoms = signal<UnitOfMeasurementOption[]>([]);

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly sortBy = signal<MaterialSortField>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly filter = signal<MaterialFilter>({ ...DEFAULT_MATERIAL_FILTER });

  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.materials().length === 0,
  );

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(
      f.search || f.materialCategoryId || f.materialGroupId || f.unitOfMeasurementId ||
      f.status || f.criticalityLevel || f.manufacturerName || f.isStockItem !== null
    );
  });

  /** Groups scoped to the category filter, so the two filters stay coherent. */
  readonly filteredGroups = computed(() => {
    const categoryId = this.filter().materialCategoryId;
    const all = this.groups();
    return categoryId ? all.filter((g) => g.materialCategoryId === categoryId) : all;
  });

  constructor() {
    this.reload$
      .pipe(switchMap(() => this.fetch()), takeUntilDestroyed(this.destroyRef))
      .subscribe();

    this.searchInput$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.applySearch(term));

    this.reload$.next();
    this.loadReferenceData();
  }

  refresh(): void {
    this.reload$.next();
  }

  setPage(page: number, pageSize: number): void {
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.reload$.next();
  }

  setSort(sortBy: MaterialSortField, sortDirection: SortDirection): void {
    this.sortBy.set(sortBy);
    this.sortDirection.set(sortDirection);
    this.reload$.next();
  }

  onSearchInput(term: string): void {
    this.searchInput$.next(term);
  }

  applySearch(term: string): void {
    this.filter.update((f) => ({ ...f, search: term }));
    this.page.set(0);
    this.reload$.next();
  }

  setFilter(partial: Partial<MaterialFilter>): void {
    this.filter.update((f) => {
      const next = { ...f, ...partial };
      // Changing category invalidates a group that no longer belongs to it.
      if (partial.materialCategoryId !== undefined && next.materialGroupId) {
        const stillValid = this.groups().some(
          (g) => g.id === next.materialGroupId && g.materialCategoryId === next.materialCategoryId,
        );
        if (!stillValid) next.materialGroupId = null;
      }
      return next;
    });
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_MATERIAL_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  // ── Lifecycle actions ───────────────────────────────────────────────

  async setStatus(material: MaterialListItem, status: MaterialStatus): Promise<void> {
    this.saving.set(true);
    try {
      const call =
        status === MaterialStatus.ACTIVE ? this.service.enableMaterial(material.id)
        : status === MaterialStatus.INACTIVE ? this.service.disableMaterial(material.id)
        : this.service.obsoleteMaterial(material.id);

      await lastValueFrom(call);
      const verb = status === MaterialStatus.ACTIVE ? 'enabled'
        : status === MaterialStatus.INACTIVE ? 'disabled' : 'marked obsolete';
      this.snack.open(`Material ${verb}`, 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to change the material status', {
        400: 'The material is already in that status.',
        409: 'This material is referenced by existing transactions and cannot change status.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Clones a material via POST /materials/:id/clone, then reloads so the new
   * row appears. Sorting by createdAt desc (the default) surfaces it at the
   * top of page 1 without a manual refresh; a different sort/filter still
   * finds it on the next `refresh()` since the whole list is reloaded.
   */
  async cloneMaterial(material: MaterialListItem): Promise<Material> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.cloneMaterial(material.id));
      this.snack.open(`Cloned as ${res.data.code}`, 'OK', { duration: 3000 });
      this.page.set(0);
      this.sortBy.set('createdAt');
      this.sortDirection.set('desc');
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to clone the material', {
        404: 'This material could not be found. It may have been deleted.',
        409: 'The category, group, or unit of measurement has since been deactivated.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteMaterial(material: MaterialListItem): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(this.service.deleteMaterial(material.id));
      this.snack.open('Material deleted successfully', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to delete the material', {
        409: 'This material is referenced by existing transactions and cannot be deleted.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  private loadReferenceData(): void {
    forkJoin({
      categories: this.categoryService.getActiveMaterialCategories(),
      groups: this.groupService.getActiveMaterialGroups(),
      uoms: this.uomService.getActiveUnitsOfMeasurement(),
    }).subscribe({
      next: (res) => {
        this.categories.set(res.categories.data ?? []);
        this.groups.set(res.groups.data ?? []);
        this.uoms.set(res.uoms.data ?? []);
      },
      error: () => this.snack.open('Unable to load filter reference data.', 'Close', {
        duration: 5000, panelClass: ['error-snackbar'],
      }),
    });
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: MaterialQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
      search: f.search || undefined,
      materialCategoryId: f.materialCategoryId ?? undefined,
      materialGroupId: f.materialGroupId ?? undefined,
      unitOfMeasurementId: f.unitOfMeasurementId ?? undefined,
      status: f.status ?? undefined,
      criticalityLevel: f.criticalityLevel ?? undefined,
      manufacturerName: f.manufacturerName || undefined,
      isStockItem: f.isStockItem ?? undefined,
    };

    return this.service.getMaterials(params).pipe(
      tap((res) => {
        // NOTE: this list wraps its rows in `data`, not `items` — see PagedMaterials.
        const paged = res.data;
        this.materials.set(paged?.data ?? []);
        this.totalCount.set(paged?.total ?? 0);
        this.totalPages.set(paged?.totalPages ?? 0);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.messageForStatus(err, 'Unable to load Materials. Please try again.', {
          403: 'You do not have permission to view Materials.',
        }));
        this.materials.set([]);
        this.totalCount.set(0);
        this.loading.set(false);
        return of(void 0);
      }),
    );
  }

  private messageForStatus(
    err: HttpErrorResponse,
    fallback: string,
    statusMessages: Record<number, string> = {},
  ): string {
    const status = err?.status;
    if (status && statusMessages[status]) return statusMessages[status];

    switch (status) {
      case 0:   return 'Cannot reach the server. Check your connection and try again.';
      case 400: return err.error?.message || 'The request was invalid. Please review your filters.';
      case 401: return 'Your session has expired. Please sign in again.';
      case 403: return 'You do not have permission to perform this operation.';
      case 404: return 'Material could not be found. It may have been deleted.';
      case 409: return err.error?.message || 'This operation conflicts with existing data.';
      case 422: return err.error?.message || 'The submitted data could not be processed.';
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
