import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { ProjectService } from '../../project/services/project.service';
import { ProjectOption } from '../../project/models/project.model';
import { ClientService } from '../../client/services/client.service';
import { ClientOption } from '../../client/models/client.model';
import { UserProjectMappingService } from '../services/user-project-mapping.service';
import {
  DEFAULT_MAPPING_FILTER, EligibleUser, MappingFilter, MappingSortField, MappingStatus, SortDirection,
  UserProjectMapping, UserProjectMappingDetail,
} from '../models/user-project-mapping.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the User–Project Mapping master. Provided by
 * UserProjectMappingComponent (not root), so state resets on each visit; the
 * drawer and dialogs opened from the page share it.
 *
 * Paging, sorting and filtering happen on the server — one row per project.
 */
@Injectable()
export class UserProjectMappingStore {
  private readonly service = inject(UserProjectMappingService);
  private readonly projectService = inject(ProjectService);
  private readonly clientService = inject(ClientService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly mappings = signal<UserProjectMapping[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly sortBy = signal<MappingSortField>('projectCode');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly filter = signal<MappingFilter>({ ...DEFAULT_MAPPING_FILTER });

  // Reference data for the filters and the drawer.
  readonly projects = signal<ProjectOption[]>([]);
  readonly clients = signal<ClientOption[]>([]);
  readonly users = signal<EligibleUser[]>([]);
  readonly usersLoading = signal(false);
  readonly usersError = signal<string | null>(null);

  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.totalCount() === 0);
  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.projectId || f.clientId || f.userId || f.status !== 'all');
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

  // ── List state ───────────────────────────────────────────────────

  refresh(): void {
    this.reload$.next();
  }

  setPage(page: number, pageSize: number): void {
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.reload$.next();
  }

  setSort(sortBy: MappingSortField, sortDirection: SortDirection): void {
    this.sortBy.set(sortBy);
    this.sortDirection.set(sortDirection);
    this.page.set(0);
    this.reload$.next();
  }

  /** Debounced as the user types; call applySearch() directly on Enter. */
  onSearchInput(term: string): void {
    this.searchInput$.next(term);
  }

  applySearch(term: string): void {
    if (term === this.filter().search) return;
    this.setFilter({ search: term });
  }

  setFilter(partial: Partial<MappingFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_MAPPING_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  // ── Changes ──────────────────────────────────────────────────────

  async create(projectId: string, userIds: string[]): Promise<UserProjectMappingDetail> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.createMapping({ projectId, userIds }));
      this.snack.open(`Project assigned to ${userIds.length} user${userIds.length === 1 ? '' : 's'}`, 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save the mapping');
    } finally {
      this.saving.set(false);
    }
  }

  async update(projectId: string, userIds: string[]): Promise<UserProjectMappingDetail> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.updateMapping(projectId, { userIds }));
      this.snack.open('Project mapping updated', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save the mapping');
    } finally {
      this.saving.set(false);
    }
  }

  async setStatus(mapping: UserProjectMapping, status: MappingStatus): Promise<void> {
    try {
      await lastValueFrom(this.service.setStatus(mapping.projectId, status));
      this.snack.open(
        `${mapping.projectCode} mapping ${status === 'ACTIVE' ? 'activated' : 'deactivated'}`, 'OK', { duration: 3000 },
      );
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${status === 'ACTIVE' ? 'activate' : 'deactivate'} the mapping`);
    }
  }

  async remove(mapping: UserProjectMapping): Promise<void> {
    try {
      await lastValueFrom(this.service.deleteMapping(mapping.projectId));
      this.snack.open(`${mapping.projectCode} mapping deleted`, 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to delete the mapping');
    }
  }

  async getDetail(projectId: string): Promise<UserProjectMappingDetail> {
    try {
      return (await lastValueFrom(this.service.getMapping(projectId))).data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to load the mapping');
    }
  }

  /** The project's mapping, or null when the project has none yet (no error shown). */
  async findExisting(projectId: string): Promise<UserProjectMappingDetail | null> {
    try {
      return (await lastValueFrom(this.service.getMapping(projectId))).data;
    } catch (err) {
      if ((err as HttpErrorResponse)?.status === 404) return null;
      throw this.toStoreError(err, 'Unable to check the project mapping');
    }
  }

  /** Reloads the eligible users (the drawer's Retry). */
  loadUsers(): void {
    this.usersLoading.set(true);
    this.usersError.set(null);
    this.service.getEligibleUsers().subscribe({
      next: (res) => {
        this.users.set(res.data ?? []);
        this.usersLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.users.set([]);
        this.usersError.set(this.messageForStatus(err, 'Unable to load users'));
        this.usersLoading.set(false);
      },
    });
  }

  // ── Internals ────────────────────────────────────────────────────

  private loadReferenceData(): void {
    // Dropdown data: a failure leaves the list empty instead of blocking the page.
    this.projectService.getActiveProjects().subscribe({
      next: (res) => this.projects.set(res.data ?? []),
      error: () => this.projects.set([]),
    });
    this.clientService.getActiveClients().subscribe({
      next: (res) => this.clients.set(res.data ?? []),
      error: () => this.clients.set([]),
    });
    this.loadUsers();
  }

  private fetch(): Observable<void> {
    const f = this.filter();
    this.loading.set(true);
    this.error.set(null);
    return this.service.getMappings({
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'desc' ? 'DESC' : 'ASC',
      search: f.search.trim() || undefined,
      projectId: f.projectId ?? undefined,
      clientId: f.clientId ?? undefined,
      userId: f.userId ?? undefined,
      status: f.status === 'all' ? undefined : f.status,
    }).pipe(
      tap((res) => {
        this.mappings.set(res.data?.items ?? []);
        this.totalCount.set(res.data?.total ?? 0);
        this.loading.set(false);
      }),
      map(() => void 0),
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.messageForStatus(err, 'Unable to load project mappings. Please try again.', {
          403: 'You do not have permission to view project mappings',
        }));
        this.mappings.set([]);
        this.totalCount.set(0);
        this.loading.set(false);
        return of(void 0);
      }),
    );
  }

  /**
   * Maps an HTTP failure onto a message safe to show a user. Raw API text is
   * only surfaced when the backend sent a deliberate `message` field.
   */
  private messageForStatus(err: HttpErrorResponse, fallback: string, statusMessages: Record<number, string> = {}): string {
    const status = err?.status;
    if (status && statusMessages[status]) return statusMessages[status];
    const apiMessage = Array.isArray(err?.error?.message) ? err.error.message.join(' ') : err?.error?.message;
    switch (status) {
      case 0:   return 'Cannot reach the server. Check your connection and try again.';
      case 400: return apiMessage || 'The submitted data is invalid. Please review and try again.';
      case 401: return 'Your session has expired. Please sign in again.';
      case 403: return 'You do not have permission to perform this operation.';
      case 404: return apiMessage || 'The project mapping could not be found. It may have been deleted.';
      case 409: return apiMessage || 'This operation conflicts with existing data.';
      case 422: return apiMessage || 'The submitted data failed validation. Please review and try again.';
      case 500: return 'Something went wrong. Please try again.';
      default:  return apiMessage || fallback;
    }
  }

  private toStoreError(err: unknown, fallback: string, statusMessages: Record<number, string> = {}): Error {
    const message = this.messageForStatus(err as HttpErrorResponse, fallback, statusMessages);
    this.snack.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
    return new Error(message);
  }
}
