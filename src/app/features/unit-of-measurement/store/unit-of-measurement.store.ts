import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { UnitOfMeasurementService } from '../services/unit-of-measurement.service';
import {
  DEFAULT_UOM_FILTER, SortDirection, UnitOfMeasurement, UnitOfMeasurementFilter,
  UnitOfMeasurementSortField,
} from '../models/unit-of-measurement.model';
import {
  CreateUnitOfMeasurementRequest, UnitOfMeasurementQueryParams, UpdateUnitOfMeasurementRequest,
} from '../models/unit-of-measurement-request.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Unit of Measurement master. Provided by
 * UnitOfMeasurementComponent (not root) so state resets on each visit and its
 * subscriptions tear down with the component via takeUntilDestroyed.
 */
@Injectable()
export class UnitOfMeasurementStore {
  private readonly service = inject(UnitOfMeasurementService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly unitsOfMeasurement = signal<UnitOfMeasurement[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly sortBy = signal<UnitOfMeasurementSortField>('displayOrder');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly filter = signal<UnitOfMeasurementFilter>({ ...DEFAULT_UOM_FILTER });

  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.unitsOfMeasurement().length === 0,
  );

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.uomType || f.status !== 'all');
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

  setSort(sortBy: UnitOfMeasurementSortField, sortDirection: SortDirection): void {
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

  setFilter(partial: Partial<UnitOfMeasurementFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_UOM_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  // ── CRUD + lifecycle ───────────────────────────────────────────────

  async createUnitOfMeasurement(request: CreateUnitOfMeasurementRequest): Promise<UnitOfMeasurement> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.createUnitOfMeasurement(request));
      this.snack.open('Unit of Measurement created successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save Unit of Measurement', {
        409: 'A Unit of Measurement with this code or name already exists.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async updateUnitOfMeasurement(id: string, request: UpdateUnitOfMeasurementRequest): Promise<UnitOfMeasurement> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.updateUnitOfMeasurement(id, request));
      this.snack.open('Unit of Measurement updated successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save Unit of Measurement', {
        409: 'A Unit of Measurement with this name already exists.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteUnitOfMeasurement(uom: UnitOfMeasurement): Promise<void> {
    this.deleting.set(true);
    try {
      await lastValueFrom(this.service.deleteUnitOfMeasurement(uom.id));
      this.snack.open('Unit of Measurement deleted successfully', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to delete Unit of Measurement', {
        409: 'This unit is referenced by existing material, requisition or inventory records and cannot be deleted.',
      });
    } finally {
      this.deleting.set(false);
    }
  }

  /**
   * There is no enable/disable endpoint on this controller, so activation rides
   * on PUT. Only `isActive` is sent — round-tripping name/code would needlessly
   * re-run the server's uniqueness checks.
   */
  async setActive(uom: UnitOfMeasurement, nextActive: boolean): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(this.service.updateUnitOfMeasurement(uom.id, { isActive: nextActive }));
      this.snack.open(
        nextActive ? 'Unit of Measurement activated' : 'Unit of Measurement deactivated',
        'OK',
        { duration: 3000 },
      );
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${nextActive ? 'activate' : 'deactivate'} Unit of Measurement`);
    } finally {
      this.saving.set(false);
    }
  }

  async getUnitOfMeasurementById(id: string): Promise<UnitOfMeasurement> {
    const res = await lastValueFrom(this.service.getUnitOfMeasurementById(id));
    return res.data;
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: UnitOfMeasurementQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
      search: f.search || undefined,
      uomType: f.uomType ?? undefined,
      isActive: f.status === 'all' ? undefined : f.status === 'active',
    };

    return this.service.getUnitsOfMeasurement(params).pipe(
      tap((res) => {
        const paged = res.data;
        this.unitsOfMeasurement.set(paged?.items ?? []);
        this.totalCount.set(paged?.total ?? 0);
        this.totalPages.set(paged?.totalPages ?? 0);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.messageForStatus(err, 'Unable to load Units of Measurement. Please try again.', {
          403: 'You do not have permission to view Units of Measurement.',
        }));
        this.unitsOfMeasurement.set([]);
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
      case 404: return 'Unit of Measurement could not be found. It may have been deleted.';
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
