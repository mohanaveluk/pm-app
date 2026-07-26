import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services';
import { OrganizationService } from '../../../services/organization.service';
import { ActivityService } from '../services/activity.service';
import {
  Activity, ActivityFilter, ActivitySortField, DEFAULT_ACTIVITY_FILTER, MappedDepartmentOption, MappingOption, ReferenceOption, SortDirection,
} from '../models/activity.model';
import {
  BulkCreateActivityRequest, CreateActivityRequest, ActivityQueryParams, UpdateActivityRequest,
} from '../models/activity-request.model';
import { ApiEnvelope } from '../models/activity-response.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Activity master module. Provided by
 * ActivityComponent (not root) so state resets on each visit. Reference-data
 * lookups (active disciplines, discipline->department cascade) call their
 * own endpoints directly rather than depending on Discipline/DepartmentDiscipline
 * services, keeping this module self-contained.
 */
@Injectable()
export class ActivityStore {
  private readonly activityService = inject(ActivityService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly organizationService = inject(OrganizationService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly activities = signal<Activity[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly sortBy = signal<ActivitySortField>('displayOrder');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly filter = signal<ActivityFilter>({ ...DEFAULT_ACTIVITY_FILTER });

  readonly activeDisciplines = signal<ReferenceOption[]>([]);
  readonly activeDepartments = signal<ReferenceOption[]>([]);
  readonly activeMappings = signal<MappingOption[]>([]);
  readonly organizationName = signal('—');
  /** Distinct module groups seen across the active-activity dropdown source, for the filter picker. */
  readonly moduleGroups = signal<string[]>([]);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.activities().length === 0);
  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(
      f.search || f.organizationId || f.departmentId || f.disciplineId || f.departmentDisciplineId ||
      f.moduleGroup || f.status !== 'all' || f.createdFrom || f.createdTo || f.updatedFrom || f.updatedTo ||
      f.displayOrder !== null
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
    this.reload$.next();
  }

  setSort(sortBy: ActivitySortField, sortDirection: SortDirection): void {
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

  setFilter(partial: Partial<ActivityFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_ACTIVITY_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  /** Departments actually mapped to the given discipline — drives the cascading
   * Department picker in the form dialog. Each item carries the DepartmentDiscipline
   * mapping id the Activity form needs as departmentDisciplineId. */
  getDepartmentsForDiscipline(disciplineId: string): Observable<MappedDepartmentOption[]> {
    return this.http
      .get<ApiEnvelope<MappedDepartmentOption[]>>(`${environment.apiUrl}/v1/department-disciplines/discipline/${disciplineId}`)
      .pipe(map((res) => res.data ?? []));
  }

  async createActivity(request: CreateActivityRequest): Promise<Activity> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.activityService.createActivity(request));
      this.snack.open('Activity Created Successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Save Activity', { 409: 'Duplicate Activity Code or Name' });
    } finally {
      this.saving.set(false);
    }
  }

  async bulkCreateActivities(request: BulkCreateActivityRequest): Promise<{ created: number; skipped: number; skippedCodes: string[] }> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.activityService.bulkCreateActivities(request));
      const { created, skipped, skippedCodes } = res.data;
      const message = skipped
        ? `${created.length} activity/activities created, ${skipped} skipped (duplicate code)`
        : `${created.length} activity/activities created`;
      this.snack.open(message, 'OK', { duration: 4000 });
      this.reload$.next();
      return { created: created.length, skipped, skippedCodes };
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Create Activities');
    } finally {
      this.saving.set(false);
    }
  }

  async updateActivity(id: string, request: UpdateActivityRequest): Promise<Activity> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.activityService.updateActivity(id, request));
      this.snack.open('Activity Updated Successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Save Activity', { 409: 'Duplicate Activity Code or Name' });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteActivity(activity: Activity): Promise<void> {
    try {
      await lastValueFrom(this.activityService.deleteActivity(activity.id));
      this.snack.open('Activity Deleted Successfully', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Delete Activity', { 409: 'Activity is a system activity or referenced by other records' });
    }
  }

  async toggleActive(activity: Activity): Promise<void> {
    const nextActive = !activity.isActive;
    try {
      await lastValueFrom(
        this.activityService.updateActivity(activity.id, {
          code: activity.code,
          name: activity.name,
          shortName: activity.shortName,
          description: activity.description,
          displayOrder: activity.displayOrder,
          moduleGroup: activity.moduleGroup,
          icon: activity.icon,
          routeUrl: activity.routeUrl,
          featureKey: activity.featureKey,
          remarks: activity.remarks,
          isSystem: activity.isSystem,
          isDefault: activity.isDefault,
          isActive: nextActive,
        }),
      );
      this.snack.open(nextActive ? 'Activity Activated' : 'Activity Deactivated', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${nextActive ? 'Activate' : 'Deactivate'} Activity`);
    }
  }

  async getActivityById(id: string): Promise<Activity> {
    const res = await lastValueFrom(this.activityService.getActivityById(id));
    return res.data;
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: ActivityQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
      search: f.search || undefined,
      departmentId: f.departmentId ?? undefined,
      disciplineId: f.disciplineId ?? undefined,
      departmentDisciplineId: f.departmentDisciplineId ?? undefined,
      moduleGroup: f.moduleGroup ?? undefined,
      isActive: f.status === 'all' ? undefined : f.status === 'active',
    };

    return this.activityService.getActivities(params).pipe(
      tap((res) => {
        this.activities.set(res.data.items);
        this.totalCount.set(res.data.total);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Unable to load activities. Please try again.');
        this.activities.set([]);
        this.totalCount.set(0);
        this.loading.set(false);
        return of(void 0);
      }),
    );
  }

  private loadReferenceData(): void {
    const orgId = this.auth.user()?.organizationId;
    const params = orgId ? { organizationId: orgId } : undefined;

    this.http
      .get<ApiEnvelope<ReferenceOption[]>>(`${environment.apiUrl}/v1/disciplines/active`, { params })
      .subscribe({
        next: (res) => this.activeDisciplines.set(res.data ?? []),
        error: () => this.activeDisciplines.set([]),
      });

    this.http
      .get<ApiEnvelope<ReferenceOption[]>>(`${environment.apiUrl}/v1/departments/active`, { params })
      .subscribe({
        next: (res) => this.activeDepartments.set(res.data ?? []),
        error: () => this.activeDepartments.set([]),
      });

    interface MappingListItem {
      id: string;
      departmentName: string;
      disciplineName: string;
    }
    this.http
      .get<ApiEnvelope<MappingListItem[]>>(`${environment.apiUrl}/v1/department-disciplines/active`, { params })
      .subscribe({
        next: (res) => this.activeMappings.set(
          (res.data ?? []).map((m) => ({ id: m.id, label: `${m.departmentName} / ${m.disciplineName}` })),
        ),
        error: () => this.activeMappings.set([]),
      });

    this.activityService.getActiveActivities().subscribe({
      next: (res) => {
        const groups = new Set((res.data ?? []).map((a) => a.moduleGroup).filter((g): g is string => !!g));
        this.moduleGroups.set(Array.from(groups).sort());
      },
      error: () => this.moduleGroups.set([]),
    });

    this.organizationService.getProfile().subscribe({
      next: (org) => this.organizationName.set(org?.organizationName ?? this.organizationName()),
      error: () => {},
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
