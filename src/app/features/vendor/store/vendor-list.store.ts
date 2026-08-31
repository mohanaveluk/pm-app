import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { VendorService } from '../services/vendor.service';
import {
  DEFAULT_VENDOR_FILTER, SortDirection, Vendor, VendorFilter, VendorListItem, VendorSortField,
} from '../models/vendor.model';
import { VendorQueryParams } from '../models/vendor-request.model';
import { VendorStatusChangeAccepted } from '../models/vendor-response.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Vendor Master list. Provided by
 * VendorListComponent (not root) so state resets on each visit and its
 * subscriptions tear down with the component via takeUntilDestroyed.
 *
 * All paging, sorting, searching and filtering are server-side — the list
 * endpoint is the only thing that ever sees the full vendor set, and child
 * collections are never fetched here.
 */
@Injectable()
export class VendorListStore {
  private readonly service = inject(VendorService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly vendors = signal<VendorListItem[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly sortBy = signal<VendorSortField>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly filter = signal<VendorFilter>({ ...DEFAULT_VENDOR_FILTER });

  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.vendors().length === 0,
  );

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(
      f.search || f.vendorTypeId || f.vendorStatus || f.vendorClassification ||
      f.riskCategory || f.industryCategoryId || f.countryOfRegistration || f.pendingStatusChange ||
      f.isActive !== null || f.includeBlacklisted
    );
  });

  constructor() {
    this.reload$
      .pipe(
        // switchMap cancels a stale request when the user keeps typing or paging.
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

  refresh(): void {
    this.reload$.next();
  }

  setPage(page: number, pageSize: number): void {
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.reload$.next();
  }

  setSort(sortBy: VendorSortField, sortDirection: SortDirection): void {
    this.sortBy.set(sortBy);
    this.sortDirection.set(sortDirection);
    this.page.set(0);
    this.reload$.next();
  }

  onSearchInput(term: string): void {
    this.searchInput$.next(term);
  }

  applySearch(term: string): void {
    this.filter.update((f) => ({ ...f, search: term.trim() }));
    this.page.set(0);
    this.reload$.next();
  }

  setFilter(patch: Partial<VendorFilter>): void {
    this.filter.update((f) => ({ ...f, ...patch }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_VENDOR_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  // ── Mutations ───────────────────────────────────────────────────────

  async deleteVendor(vendor: VendorListItem): Promise<void> {
    this.deleting.set(true);
    try {
      await lastValueFrom(this.service.deleteVendor(vendor.id));
      this.snack.open(`${vendor.code} deleted`, 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to delete this vendor', {
        409: 'This vendor is referenced by existing procurement records and cannot be deleted.',
      });
    } finally {
      this.deleting.set(false);
    }
  }

  /**
   * Clones a vendor via POST /vendors/:id/clone, then reloads so the new row
   * appears. Sorting by createdAt desc (the default) surfaces it at the top of
   * page 1 without a manual refresh; a different sort/filter still finds it on
   * the next `refresh()` since the whole list is reloaded.
   */
  async cloneVendor(vendor: VendorListItem): Promise<Vendor> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.cloneVendor(vendor.id));
      this.snack.open(`Cloned as ${res.data.code}`, 'OK', { duration: 3000 });
      this.page.set(0);
      this.sortBy.set('createdAt');
      this.sortDirection.set('desc');
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to clone this vendor', {
        404: 'This vendor could not be found. It may have been deleted.',
        409: 'The Industry Category has since been deactivated, or the cloned name/registration number is already taken.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async setActive(vendor: VendorListItem, nextActive: boolean): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(
        nextActive ? this.service.enableVendor(vendor.id) : this.service.disableVendor(vendor.id),
      );
      this.snack.open(`${vendor.code} ${nextActive ? 'enabled' : 'disabled'}`, 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${nextActive ? 'enable' : 'disable'} this vendor`, {
        400: `This vendor is already ${nextActive ? 'active' : 'inactive'}.`,
        409: nextActive
          ? 'A blacklisted vendor must be removed from the blacklist before it can be enabled.'
          : 'This vendor cannot be disabled in its current state.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Raises a blacklist REQUEST — the vendor is not blacklisted here. It is
   * flagged pendingStatusChange=PENDING_BLACKLIST while a manager approves, so
   * the message says what actually happened rather than claiming the ban landed.
   */
  async blacklist(vendor: VendorListItem, reason: string): Promise<void> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.blacklistVendor(vendor.id, { reason }));
      this.snack.open(this.requestMessage(vendor.code, 'Blacklist', res.data), 'OK', { duration: 6000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to raise the blacklist request', {
        400: 'A reason is required to request a blacklisting.',
        409: 'This vendor is already blacklisted, or another request is already pending.',
        422: 'No manager is available to approve this request in your organization.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  /** Raises an un-blacklist REQUEST; also approval-gated and reason-bearing. */
  async removeBlacklist(vendor: VendorListItem, reason: string): Promise<void> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.removeBlacklist(vendor.id, { reason }));
      this.snack.open(this.requestMessage(vendor.code, 'Un-blacklist', res.data), 'OK', { duration: 6000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to raise the un-blacklist request', {
        400: 'A reason is required to request that a blacklisting be lifted.',
        409: 'This vendor is not blacklisted, or another request is already pending.',
        422: 'No manager is available to approve this request in your organization.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * The request can stand even when its notification email fails, so both facts
   * are reported instead of implying the approvers have been reached.
   */
  private requestMessage(code: string, kind: string, accepted: VendorStatusChangeAccepted): string {
    const base = `${kind} request raised for ${code} — awaiting manager approval.`;
    if (!accepted?.notificationSent) {
      return `${base} The approval email could not be sent; the request still stands.`;
    }
    const count = accepted.approversNotified ?? 0;
    return `${base} ${count} approver${count === 1 ? '' : 's'} notified.`;
  }

  // ── Fetch ───────────────────────────────────────────────────────────

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: VendorQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
      search: f.search || undefined,
      vendorTypeId: f.vendorTypeId ?? undefined,
      vendorStatus: f.vendorStatus ?? undefined,
      vendorClassification: f.vendorClassification ?? undefined,
      riskCategory: f.riskCategory ?? undefined,
      pendingStatusChange: f.pendingStatusChange ?? undefined,
      industryCategoryId: f.industryCategoryId ?? undefined,
      countryOfRegistration: f.countryOfRegistration ?? undefined,
      isActive: f.isActive ?? undefined,
      includeBlacklisted: f.includeBlacklisted || undefined,
    };

    return this.service.getVendors(params).pipe(
      tap((res) => {
        const paged = res.data;
        this.vendors.set(paged?.items ?? []);
        this.totalCount.set(paged?.total ?? 0);
        this.totalPages.set(paged?.totalPages ?? 0);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.messageForStatus(err, 'Unable to load vendors. Please try again.', {
          403: 'You do not have permission to view vendors.',
        }));
        this.vendors.set([]);
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
      case 404: return 'This vendor could not be found. It may have been deleted.';
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
