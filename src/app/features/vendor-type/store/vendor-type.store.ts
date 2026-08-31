import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { VendorTypeService } from '../services/vendor-type.service';
import {
  DEFAULT_VENDOR_TYPE_FILTER, SortDirection, VendorType, VendorTypeFilter, VendorTypeSortField,
} from '../models/vendor-type.model';
import {
  CreateVendorTypeRequest, UpdateVendorTypeRequest, VendorTypeQueryParams,
} from '../models/vendor-type-request.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Vendor Type master. Provided by
 * VendorTypeComponent (not root) so state resets on each visit and its
 * subscriptions tear down with the component via takeUntilDestroyed.
 *
 * Mirrors DepartmentStore/IndustryCategoryStore's shape and lifecycle. The
 * differences are dictated by the real API: no dedicated enable/disable
 * endpoints (status changes go through the same PUT as any other edit, like
 * Department), and `page`/`limit`/`sortOrder` query keys (like Industry
 * Category), not page/pageSize/sortDirection.
 */
@Injectable()
export class VendorTypeStore {
  private readonly service = inject(VendorTypeService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly vendorTypes = signal<VendorType[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly sortBy = signal<VendorTypeSortField>('displayOrder');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly filter = signal<VendorTypeFilter>({ ...DEFAULT_VENDOR_TYPE_FILTER });

  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.vendorTypes().length === 0,
  );

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.status !== 'all');
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

  setSort(sortBy: VendorTypeSortField, sortDirection: SortDirection): void {
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

  setFilter(partial: Partial<VendorTypeFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_VENDOR_TYPE_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  // ── CRUD + lifecycle ───────────────────────────────────────────────

  async createVendorType(request: CreateVendorTypeRequest): Promise<VendorType> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.createVendorType(request));
      this.snack.open('Vendor Type created successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save Vendor Type', {
        409: 'A Vendor Type with this name already exists in your organization.',
        422: 'Please check the highlighted fields and try again.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async updateVendorType(id: string, request: UpdateVendorTypeRequest): Promise<VendorType> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.updateVendorType(id, request));
      this.snack.open('Vendor Type updated successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save Vendor Type', {
        409: 'A Vendor Type with this name already exists in your organization.',
        422: 'Please check the highlighted fields and try again.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteVendorType(vendorType: VendorType): Promise<void> {
    this.deleting.set(true);
    try {
      await lastValueFrom(this.service.deleteVendorType(vendorType.id));
      this.snack.open('Vendor Type deleted successfully', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to delete Vendor Type', {
        409: 'This Vendor Type is currently in use by one or more vendors and cannot be deleted.',
      });
    } finally {
      this.deleting.set(false);
    }
  }

  /**
   * Flips the active flag through the same PUT the edit form uses — the API
   * exposes no dedicated enable/disable endpoint for Vendor Type (unlike
   * Industry Category), so this follows Department's toggle-via-update pattern.
   */
  async toggleActive(vendorType: VendorType): Promise<void> {
    const nextActive = !vendorType.isActive;
    try {
      await lastValueFrom(this.service.updateVendorType(vendorType.id, { isActive: nextActive }));
      this.snack.open(nextActive ? 'Vendor Type activated' : 'Vendor Type deactivated', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${nextActive ? 'activate' : 'deactivate'} Vendor Type`, {
        409: 'This Vendor Type is currently in use and its status cannot be changed.',
      });
    }
  }

  async getVendorTypeById(id: string): Promise<VendorType> {
    const res = await lastValueFrom(this.service.getVendorTypeById(id));
    return res.data;
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: VendorTypeQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
      search: f.search || undefined,
      isActive: f.status === 'all' ? undefined : f.status === 'active',
    };

    return this.service.getVendorTypes(params).pipe(
      tap((res) => {
        const paged = res.data;
        this.vendorTypes.set(paged?.items ?? []);
        this.totalCount.set(paged?.total ?? 0);
        this.totalPages.set(paged?.totalPages ?? 0);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.messageForStatus(err, 'Unable to load Vendor Types. Please try again.', {
          403: 'You do not have permission to view Vendor Types.',
        }));
        this.vendorTypes.set([]);
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
      case 404: return 'Vendor Type could not be found. It may have been deleted.';
      case 409: return err.error?.message || 'This operation conflicts with existing data.';
      case 422: return err.error?.message || 'The submitted data failed validation. Please review and try again.';
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
