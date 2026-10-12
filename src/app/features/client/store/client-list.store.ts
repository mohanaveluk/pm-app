import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, forkJoin, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { ClientService } from '../services/client.service';
import { ClientTypeService } from '../../client-type/services/client-type.service';
import { ClientType } from '../../client-type/models/client-type.model';
import { IndustryCategoryService } from '../../industry-category/services/industry-category.service';
import { IndustryCategoryOption } from '../../industry-category/models/industry-category.model';
import {
  ClientFilter, ClientListItem, ClientSortField, DEFAULT_CLIENT_FILTER, SortDirection,
} from '../models/client.model';
import { ClientQueryParams } from '../models/client-request.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Client Master list. Provided by
 * ClientListComponent (not root) so state resets on each visit and its
 * subscriptions tear down with the component.
 */
@Injectable()
export class ClientListStore {
  private readonly service = inject(ClientService);
  private readonly clientTypeService = inject(ClientTypeService);
  private readonly industryService = inject(IndustryCategoryService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly clients = signal<ClientListItem[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly clientTypes = signal<ClientType[]>([]);
  readonly industries = signal<IndustryCategoryOption[]>([]);

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly sortBy = signal<ClientSortField>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly filter = signal<ClientFilter>({ ...DEFAULT_CLIENT_FILTER });

  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.clients().length === 0,
  );

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.clientTypeId || f.industryCategoryId || f.countryCode || f.status);
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

  setSort(sortBy: ClientSortField, sortDirection: SortDirection): void {
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

  setFilter(partial: Partial<ClientFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_CLIENT_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  // ── Lifecycle actions ───────────────────────────────────────────────

  async activate(client: ClientListItem): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(this.service.activateClient(client.id));
      this.snack.open('Client activated', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to activate the client', {
        400: 'The client is already active.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async deactivate(client: ClientListItem, reason?: string): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(this.service.deactivateClient(client.id, reason ? { reason } : {}));
      this.snack.open('Client deactivated', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to deactivate the client', {
        400: 'The client is already inactive.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteClient(client: ClientListItem): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(this.service.deleteClient(client.id));
      this.snack.open('Client deleted successfully', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to delete the client', {
        409: 'This client cannot be deleted while it has subsidiaries or is referenced elsewhere. Deactivate it instead.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  private loadReferenceData(): void {
    forkJoin({
      types: this.clientTypeService.getActiveClientTypes(),
      industries: this.industryService.getActiveIndustryCategories(),
    }).subscribe({
      next: (res) => {
        this.clientTypes.set(res.types.data ?? []);
        this.industries.set(res.industries.data ?? []);
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
    const params: ClientQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
      search: f.search || undefined,
      clientTypeId: f.clientTypeId ?? undefined,
      industryCategoryId: f.industryCategoryId ?? undefined,
      countryCode: f.countryCode ?? undefined,
      status: f.status ?? undefined,
    };

    return this.service.getClients(params).pipe(
      tap((res) => {
        const paged = res.data;
        this.clients.set(paged?.items ?? []);
        this.totalCount.set(paged?.total ?? 0);
        this.totalPages.set(paged?.totalPages ?? 0);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.messageForStatus(err, 'Unable to load Clients. Please try again.', {
          403: 'You do not have permission to view Clients.',
        }));
        this.clients.set([]);
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
      case 404: return 'Client could not be found. It may have been deleted.';
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
