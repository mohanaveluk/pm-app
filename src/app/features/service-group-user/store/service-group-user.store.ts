import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, forkJoin, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { ServiceGroupUserService, PermissionPreview } from '../services/service-group-user.service';
import {
  AvailableUserOption, DEFAULT_SERVICE_GROUP_USER_FILTER, ServiceGroupMembershipGroup, ServiceGroupOption,
  ServiceGroupUserAssignment, ServiceGroupUserFilter, ServiceGroupUserSortField, SortDirection, UserServiceGroup,
} from '../models/service-group-user.model';
import {
  BulkAssignmentIdsRequest, CreateServiceGroupUserRequest, ServiceGroupUserQueryParams, SyncServiceGroupUsersRequest,
} from '../models/service-group-user-request.model';

const SEARCH_DEBOUNCE_MS = 500;

/** No grouped-list endpoint exists server-side (the real API returns a flat
 * paginated assignment list), so a single large batch of Service Groups and
 * assignments is fetched per organization and grouped/filtered/sorted/paginated
 * entirely client-side, mirroring the Department-Discipline module's approach. */
const BATCH_LIMIT = 2000;

/**
 * Page-level signal store for the Service Group User Assignment module.
 * Provided by ServiceGroupUserComponent (not root) so state resets on each visit.
 */
@Injectable()
export class ServiceGroupUserStore {
  private readonly service = inject(ServiceGroupUserService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  private readonly rawAssignments = signal<ServiceGroupUserAssignment[]>([]);
  private readonly rawServiceGroups = signal<ServiceGroupOption[]>([]);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly sortBy = signal<ServiceGroupUserSortField>('serviceGroupName');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly filter = signal<ServiceGroupUserFilter>({ ...DEFAULT_SERVICE_GROUP_USER_FILTER });

  readonly availableServiceGroups = signal<ServiceGroupOption[]>([]);
  readonly availableUsers = signal<AvailableUserOption[]>([]);
  readonly availableUsersLoading = signal(true);

  readonly expandedIds = signal<Set<string>>(new Set());
  readonly selectedAssignmentIds = signal<Set<string>>(new Set());

  readonly groups = computed<ServiceGroupMembershipGroup[]>(() =>
    this.buildGroups(this.rawServiceGroups(), this.rawAssignments()),
  );

  private readonly visibleGroups = computed<ServiceGroupMembershipGroup[]>(() => {
    const filtered = this.applyFilter(this.groups(), this.filter());
    return this.applySort(filtered, this.sortBy(), this.sortDirection());
  });

  readonly totalCount = computed(() => this.visibleGroups().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));

  readonly pagedGroups = computed<ServiceGroupMembershipGroup[]>(() => {
    const start = this.page() * this.pageSize();
    return this.visibleGroups().slice(start, start + this.pageSize());
  });

  readonly selectedCount = computed(() => this.selectedAssignmentIds().size);
  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.totalCount() === 0);
  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(
      f.search || f.serviceGroupId || f.assignmentType || f.status !== 'all' || f.primaryOnly ||
      f.createdFrom || f.createdTo
    );
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
    this.loadReferenceData();
  }

  refresh(): void {
    this.reload$.next();
  }

  setPage(page: number, pageSize: number): void {
    this.page.set(page);
    this.pageSize.set(pageSize);
  }

  setSort(sortBy: ServiceGroupUserSortField, sortDirection: SortDirection): void {
    this.sortBy.set(sortBy);
    this.sortDirection.set(sortDirection);
  }

  /** Debounced as the user types; call applySearch() directly on Enter for an immediate search. */
  onSearchInput(term: string): void {
    this.searchInput$.next(term);
  }

  applySearch(term: string): void {
    this.filter.update((f) => ({ ...f, search: term }));
    this.page.set(0);
  }

  setFilter(partial: Partial<ServiceGroupUserFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_SERVICE_GROUP_USER_FILTER });
    this.page.set(0);
  }

  // ── Expandable rows ────────────────────────────────────────────────

  isExpanded(serviceGroupId: string): boolean {
    return this.expandedIds().has(serviceGroupId);
  }

  toggleExpand(serviceGroupId: string): void {
    this.expandedIds.update((s) => {
      const next = new Set(s);
      if (next.has(serviceGroupId)) next.delete(serviceGroupId);
      else next.add(serviceGroupId);
      return next;
    });
  }

  // ── Bulk selection ─────────────────────────────────────────────────

  isAssignmentSelected(id: string): boolean {
    return this.selectedAssignmentIds().has(id);
  }

  toggleAssignmentSelection(id: string): void {
    this.selectedAssignmentIds.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  clearSelection(): void {
    this.selectedAssignmentIds.set(new Set());
  }

  getGroupByServiceGroupId(serviceGroupId: string): ServiceGroupMembershipGroup | undefined {
    return this.groups().find((g) => g.serviceGroupId === serviceGroupId);
  }

  // ── CRUD + lifecycle actions ───────────────────────────────────────

  async createAssignment(request: CreateServiceGroupUserRequest): Promise<{ created: number; skipped: number }> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.createAssignment(request));
      const { created, skipped } = res.data;
      const message = skipped
        ? `${created.length} user(s) assigned, ${skipped} already assigned (skipped)`
        : `${created.length} user(s) assigned successfully`;
      this.snack.open(message, 'OK', { duration: 4000 });
      this.refresh();
      return { created: created.length, skipped };
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Assign Users');
    } finally {
      this.saving.set(false);
    }
  }

  async syncAssignments(serviceGroupId: string, request: SyncServiceGroupUsersRequest): Promise<void> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.syncAssignments(serviceGroupId, request));
      const { added, removed, reEnabled } = res.data;
      const parts: string[] = [];
      if (added) parts.push(`${added} added`);
      if (removed) parts.push(`${removed} removed`);
      if (reEnabled) parts.push(`${reEnabled} re-enabled`);
      this.snack.open(parts.length ? `Membership updated (${parts.join(', ')})` : 'No changes to membership', 'OK', { duration: 4000 });
      this.refresh();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Update Membership');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteAssignment(assignment: ServiceGroupUserAssignment): Promise<void> {
    try {
      await lastValueFrom(this.service.deleteAssignment(assignment.id));
      this.snack.open('Assignment Removed Successfully', 'OK', { duration: 3000 });
      this.refresh();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Remove Assignment');
    }
  }

  async toggleAssignmentActive(assignment: ServiceGroupUserAssignment): Promise<void> {
    const nextActive = !assignment.isActive;
    try {
      await lastValueFrom(
        nextActive ? this.service.enableAssignment(assignment.id) : this.service.disableAssignment(assignment.id),
      );
      this.snack.open(nextActive ? 'User Access Enabled' : 'User Access Disabled', 'OK', { duration: 3000 });
      this.refresh();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${nextActive ? 'Enable' : 'Disable'} Assignment`);
    }
  }

  async bulkEnable(): Promise<void> {
    await this.bulkStatusChange(true);
  }

  async bulkDisable(): Promise<void> {
    await this.bulkStatusChange(false);
  }

  private async bulkStatusChange(activate: boolean): Promise<void> {
    const ids = Array.from(this.selectedAssignmentIds());
    if (ids.length === 0) return;

    const request: BulkAssignmentIdsRequest = { assignmentIds: ids };
    this.saving.set(true);
    try {
      const res = await lastValueFrom(activate ? this.service.bulkEnable(request) : this.service.bulkDisable(request));
      const { succeeded, failed } = res.data;
      this.snack.open(
        failed
          ? `${succeeded} ${activate ? 'enabled' : 'disabled'}, ${failed} failed`
          : `${succeeded} assignment(s) ${activate ? 'enabled' : 'disabled'}`,
        'OK',
        { duration: 4000 },
      );
      this.clearSelection();
      this.refresh();
    } catch (err) {
      throw this.toStoreError(err, `Unable to Bulk ${activate ? 'Enable' : 'Disable'}`);
    } finally {
      this.saving.set(false);
    }
  }

  async getUsersForServiceGroup(serviceGroupId: string): Promise<ServiceGroupUserAssignment[]> {
    const group = this.getGroupByServiceGroupId(serviceGroupId);
    return group?.members ?? [];
  }

  async getServiceGroupsForUser(userId: string): Promise<UserServiceGroup[]> {
    const res = await lastValueFrom(this.service.getServiceGroupsByUser(userId));
    return res.data.serviceGroups;
  }

  async getPermissionPreview(serviceGroupId: string): Promise<PermissionPreview> {
    return lastValueFrom(this.service.getPermissionPreview(serviceGroupId));
  }

  /** Reads from the cached available-users list first (no network round-trip); only
   * falls back to a live fetch if the user isn't in the cached org-wide list. */
  async getUserOption(userId: string): Promise<AvailableUserOption | null> {
    const cached = this.availableUsers().find((u) => u.id === userId);
    if (cached) return cached;
    return lastValueFrom(this.service.getUserProfile(userId));
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const params: ServiceGroupUserQueryParams = {
      page: 1,
      limit: BATCH_LIMIT,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    };

    return forkJoin({
      assignments: this.service.getAssignments(params),
      serviceGroups: this.service.getAvailableServiceGroups(),
    }).pipe(
      tap(({ assignments, serviceGroups }) => {
        this.rawAssignments.set(assignments.data.items);
        this.rawServiceGroups.set(serviceGroups);
        this.availableServiceGroups.set(serviceGroups);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Unable to load Service Group User Assignments. Please try again.');
        this.rawAssignments.set([]);
        this.loading.set(false);
        return of(void 0);
      }),
    );
  }

  private buildGroups(
    serviceGroups: ServiceGroupOption[],
    assignments: ServiceGroupUserAssignment[],
  ): ServiceGroupMembershipGroup[] {
    const byGroup = new Map<string, ServiceGroupUserAssignment[]>();
    for (const a of assignments) {
      const arr = byGroup.get(a.serviceGroupId) ?? [];
      arr.push(a);
      byGroup.set(a.serviceGroupId, arr);
    }

    const sgMap = new Map(serviceGroups.map((sg) => [sg.id, sg]));
    const allIds = new Set<string>([...sgMap.keys(), ...byGroup.keys()]);

    return Array.from(allIds).map((id) => {
      const sg = sgMap.get(id);
      const members = (byGroup.get(id) ?? []).slice().sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
      const first = members[0];

      let createdAt = new Date().toISOString();
      let updatedAt: string | undefined;
      for (const m of members) {
        if (new Date(m.createdAt) < new Date(createdAt)) createdAt = m.createdAt;
        const candidate = m.updatedAt ?? m.createdAt;
        if (!updatedAt || new Date(candidate) > new Date(updatedAt)) updatedAt = candidate;
      }
      if (members.length === 0) createdAt = new Date().toISOString();

      return {
        serviceGroupId: id,
        serviceGroupCode: sg?.code ?? first?.serviceGroupCode ?? '',
        serviceGroupName: sg?.name ?? first?.serviceGroupName ?? '',
        serviceGroupDescription: sg?.description,
        activityCount: sg?.activityCount ?? 0,
        isServiceGroupActive: sg?.isActive ?? true,
        members,
        createdAt,
        updatedAt,
      };
    });
  }

  private applyFilter(groups: ServiceGroupMembershipGroup[], f: ServiceGroupUserFilter): ServiceGroupMembershipGroup[] {
    const term = f.search.trim().toLowerCase();

    return groups.filter((g) => {
      if (f.serviceGroupId && g.serviceGroupId !== f.serviceGroupId) return false;
      if (f.assignmentType && !g.members.some((m) => m.assignmentType === f.assignmentType)) return false;
      if (f.status === 'active' && !g.members.some((m) => m.isActive)) return false;
      if (f.status === 'inactive' && !g.members.some((m) => !m.isActive)) return false;
      if (f.primaryOnly && !g.members.some((m) => m.isPrimary)) return false;

      if (f.createdFrom) {
        const from = new Date(f.createdFrom).getTime();
        if (!g.members.some((m) => new Date(m.createdAt).getTime() >= from)) return false;
      }
      if (f.createdTo) {
        const to = new Date(f.createdTo).getTime() + (24 * 60 * 60 * 1000 - 1);
        if (!g.members.some((m) => new Date(m.createdAt).getTime() <= to)) return false;
      }

      if (term) {
        const groupMatch =
          g.serviceGroupName.toLowerCase().includes(term) ||
          g.serviceGroupCode.toLowerCase().includes(term) ||
          (g.serviceGroupDescription ?? '').toLowerCase().includes(term);
        const memberMatch = g.members.some(
          (m) =>
            m.userFullName.toLowerCase().includes(term) ||
            m.userEmail.toLowerCase().includes(term) ||
            (m.userPosition ?? '').toLowerCase().includes(term) ||
            (m.remarks ?? '').toLowerCase().includes(term),
        );
        if (!groupMatch && !memberMatch) return false;
      }

      return true;
    });
  }

  private applySort(
    groups: ServiceGroupMembershipGroup[],
    sortBy: ServiceGroupUserSortField,
    direction: SortDirection,
  ): ServiceGroupMembershipGroup[] {
    const sorted = [...groups].sort((a, b) => {
      let cmp: number;
      if (sortBy === 'serviceGroupName') {
        cmp = a.serviceGroupName.localeCompare(b.serviceGroupName);
      } else if (sortBy === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        cmp = new Date(a.updatedAt ?? a.createdAt).getTime() - new Date(b.updatedAt ?? b.createdAt).getTime();
      }
      return direction === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }

  private loadReferenceData(): void {
    this.availableUsersLoading.set(true);
    this.service.getAvailableUsers().subscribe({
      next: (users) => { this.availableUsers.set(users); this.availableUsersLoading.set(false); },
      error: () => {
        this.availableUsers.set([]);
        this.availableUsersLoading.set(false);
        this.snack.open('Unable to load organization users for assignment.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      },
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
