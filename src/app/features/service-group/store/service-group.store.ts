import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { ServiceGroupService } from '../services/service-group.service';
import {
  AvailableActivityOption, DEFAULT_SERVICE_GROUP_FILTER, PermissionMatrix, ServiceGroup,
  ServiceGroupFilter, ServiceGroupListItem, ServiceGroupSortField, SortDirection,
} from '../models/service-group.model';
import {
  CloneServiceGroupRequest, CopyPermissionsRequest, CreateServiceGroupRequest,
  ServiceGroupQueryParams, UpdateServiceGroupRequest,
} from '../models/service-group-request.model';

const SEARCH_DEBOUNCE_MS = 500;

/**
 * Page-level signal store for the Service Group (RBAC) module. Provided by
 * ServiceGroupComponent (not root) so state resets on each visit.
 *
 * The list endpoint deliberately omits activities/permissions for performance
 * (only an `activityCount`) — the grid's expandable rows lazy-load full detail
 * on first expand via `toggleExpand()`, cached here per service-group id so
 * re-collapsing/re-expanding doesn't re-fetch.
 */
@Injectable()
export class ServiceGroupStore {
  private readonly serviceGroupService = inject(ServiceGroupService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly serviceGroups = signal<ServiceGroupListItem[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly sortBy = signal<ServiceGroupSortField>('name');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly filter = signal<ServiceGroupFilter>({ ...DEFAULT_SERVICE_GROUP_FILTER });

  readonly availableActivities = signal<AvailableActivityOption[]>([]);

  readonly expandedIds = signal<Set<string>>(new Set());
  readonly loadingDetailIds = signal<Set<string>>(new Set());
  private readonly detailCache = signal<Map<string, ServiceGroup>>(new Map());

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.serviceGroups().length === 0);
  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.groupType || f.status !== 'all');
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
    this.loadAvailableActivities();
  }

  refresh(): void {
    this.detailCache.set(new Map());
    this.reload$.next();
  }

  setPage(page: number, pageSize: number): void {
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.reload$.next();
  }

  setSort(sortBy: ServiceGroupSortField, sortDirection: SortDirection): void {
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

  setFilter(partial: Partial<ServiceGroupFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_SERVICE_GROUP_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  // ── Expandable rows ────────────────────────────────────────────────

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  isLoadingDetail(id: string): boolean {
    return this.loadingDetailIds().has(id);
  }

  getDetail(id: string): ServiceGroup | undefined {
    return this.detailCache().get(id);
  }

  toggleExpand(id: string): void {
    const expanded = new Set(this.expandedIds());
    if (expanded.has(id)) {
      expanded.delete(id);
      this.expandedIds.set(expanded);
      return;
    }
    expanded.add(id);
    this.expandedIds.set(expanded);
    if (!this.detailCache().has(id)) {
      this.loadDetail(id);
    }
  }

  private loadDetail(id: string): void {
    this.loadingDetailIds.update((s) => new Set(s).add(id));
    this.serviceGroupService.getServiceGroupById(id).subscribe({
      next: (res) => {
        this.detailCache.update((m) => new Map(m).set(id, res.data));
        this.loadingDetailIds.update((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      },
      error: () => {
        this.snack.open('Unable to load Service Group details', 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
        this.loadingDetailIds.update((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      },
    });
  }

  // ── CRUD + lifecycle actions ───────────────────────────────────────

  async getServiceGroupById(id: string): Promise<ServiceGroup> {
    const res = await lastValueFrom(this.serviceGroupService.getServiceGroupById(id));
    return res.data;
  }

  async createServiceGroup(request: CreateServiceGroupRequest): Promise<ServiceGroup> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.serviceGroupService.createServiceGroup(request));
      this.snack.open('Service Group Created Successfully', 'OK', { duration: 3000 });
      this.refresh();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Save Service Group', { 409: 'Duplicate Service Group Code or Name' });
    } finally {
      this.saving.set(false);
    }
  }

  async updateServiceGroup(id: string, request: UpdateServiceGroupRequest): Promise<ServiceGroup> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.serviceGroupService.updateServiceGroup(id, request));
      this.snack.open('Service Group Updated Successfully', 'OK', { duration: 3000 });
      this.detailCache.update((m) => new Map(m).set(id, res.data));
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Save Service Group', { 409: 'Cannot Modify Immutable Code or Name' });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteServiceGroup(group: ServiceGroupListItem): Promise<void> {
    try {
      await lastValueFrom(this.serviceGroupService.deleteServiceGroup(group.id));
      this.snack.open('Service Group Deleted Successfully', 'OK', { duration: 3000 });
      this.refresh();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Delete Service Group', { 409: 'System Group or Assigned to Active Users' });
    }
  }

  async toggleActive(group: ServiceGroupListItem): Promise<void> {
    const nextActive = !group.isActive;
    try {
      const res = await lastValueFrom(
        nextActive ? this.serviceGroupService.enableGroup(group.id) : this.serviceGroupService.disableGroup(group.id),
      );
      this.detailCache.update((m) => new Map(m).set(group.id, res.data));
      this.snack.open(nextActive ? 'Service Group Enabled' : 'Service Group Disabled', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${nextActive ? 'Enable' : 'Disable'} Service Group`);
    }
  }

  async cloneGroup(id: string, request: CloneServiceGroupRequest): Promise<ServiceGroup> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.serviceGroupService.cloneGroup(id, request));
      this.snack.open('Service Group Cloned Successfully', 'OK', { duration: 3000 });
      this.refresh();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Clone Service Group', { 409: 'Duplicate Service Group Code or Name' });
    } finally {
      this.saving.set(false);
    }
  }

  async copyPermissions(id: string, request: CopyPermissionsRequest): Promise<ServiceGroup> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.serviceGroupService.copyPermissions(id, request));
      this.snack.open('Permissions Copied Successfully', 'OK', { duration: 3000 });
      this.detailCache.update((m) => new Map(m).set(id, res.data));
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Copy Permissions');
    } finally {
      this.saving.set(false);
    }
  }

  async getPermissionMatrix(id: string): Promise<PermissionMatrix> {
    const res = await lastValueFrom(this.serviceGroupService.getPermissionMatrix(id));
    return res.data;
  }

  /** Fresh (uncached) search across all Service Groups — used by the Clone/Copy source & target pickers. */
  searchGroupOptions(term: string): Observable<ServiceGroupListItem[]> {
    const params: ServiceGroupQueryParams = {
      page: 1,
      limit: 25,
      sortBy: 'name',
      sortOrder: 'ASC',
      search: term || undefined,
    };
    return this.serviceGroupService.getServiceGroups(params).pipe(map((res) => res.data.items));
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: ServiceGroupQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
      search: f.search || undefined,
      groupType: f.groupType ?? undefined,
      isActive: f.status === 'all' ? undefined : f.status === 'active',
    };

    return this.serviceGroupService.getServiceGroups(params).pipe(
      tap((res) => {
        this.serviceGroups.set(res.data.items);
        this.totalCount.set(res.data.total);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Unable to load Service Groups. Please try again.');
        this.serviceGroups.set([]);
        this.totalCount.set(0);
        this.loading.set(false);
        return of(void 0);
      }),
    );
  }

  private loadAvailableActivities(): void {
    this.serviceGroupService.getActivities().subscribe({
      next: (res) => this.availableActivities.set(res.data ?? []),
      error: () => this.availableActivities.set([]),
    });
  }

  private toStoreError(err: unknown, fallback: string, statusMessages: Record<number, string> = {}): Error {
    const httpErr = err as HttpErrorResponse;
    const status = httpErr?.status;
    const message = (status && statusMessages[status]) || httpErr?.error?.message || fallback;
    this.snack.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
    return new Error(message);
  }
}
