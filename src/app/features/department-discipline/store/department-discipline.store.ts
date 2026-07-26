import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services';
import { OrganizationService } from '../../../services/organization.service';
import { DepartmentDisciplineService } from '../services/department-discipline.service';
import {
  DEFAULT_MAPPING_FILTER, DepartmentDisciplineGroup, DepartmentDisciplineMapping, GroupSortField, MappingFilter, SortDirection,
} from '../models/department-discipline.model';
import {
  BulkCreateDepartmentDisciplineRequest, CreateDepartmentDisciplineRequest, MappingQueryParams,
} from '../models/department-discipline-request.model';
import { ApiEnvelope } from '../models/department-discipline-response.model';

const SEARCH_DEBOUNCE_MS = 350;

/** No grouped-list endpoint exists server-side, so a single large batch of flat
 * mappings is fetched per organization and grouped/filtered/sorted/paginated
 * entirely client-side. This caps how many mapping rows a single organization
 * can have while still seeing its full grid. */
const BATCH_LIMIT = 1000;

/** Minimal shape needed to populate the Department/Discipline pickers in the form dialog. */
export interface ReferenceOption {
  id: string;
  code: string;
  name: string;
}

/**
 * Page-level signal store for the Department-Discipline mapping module.
 * Provided by DepartmentDisciplineComponent (not root) so state resets on
 * each visit. Reference-data lookups (active departments/disciplines) call
 * their own /active endpoints directly rather than depending on
 * DepartmentService/DisciplineService, keeping this module self-contained.
 */
@Injectable()
export class DepartmentDisciplineStore {
  private readonly mappingService = inject(DepartmentDisciplineService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly organizationService = inject(OrganizationService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  private readonly rawMappings = signal<DepartmentDisciplineMapping[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly sortBy = signal<GroupSortField>('departmentName');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly filter = signal<MappingFilter>({ ...DEFAULT_MAPPING_FILTER });

  readonly activeDepartments = signal<ReferenceOption[]>([]);
  readonly activeDisciplines = signal<ReferenceOption[]>([]);
  readonly organizationName = signal('—');

  /** All departments with their mapped disciplines, ungrouped by filter/sort/page. */
  readonly groups = computed<DepartmentDisciplineGroup[]>(() => this.groupMappings(this.rawMappings()));

  private readonly visibleGroups = computed<DepartmentDisciplineGroup[]>(() => {
    const filtered = this.applyFilter(this.groups(), this.filter());
    return this.applySort(filtered, this.sortBy(), this.sortDirection());
  });

  readonly totalCount = computed(() => this.visibleGroups().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));

  /** The page of department groups the grid renders. */
  readonly pagedGroups = computed<DepartmentDisciplineGroup[]>(() => {
    const start = this.page() * this.pageSize();
    return this.visibleGroups().slice(start, start + this.pageSize());
  });

  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.totalCount() === 0);
  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.organizationId || f.departmentId || f.disciplineId || f.status !== 'all' || f.createdFrom || f.createdTo || f.updatedFrom || f.updatedTo);
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

  setSort(sortBy: GroupSortField, sortDirection: SortDirection): void {
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

  setFilter(partial: Partial<MappingFilter>): void {
    const orgChanged = partial.organizationId !== undefined && partial.organizationId !== this.filter().organizationId;
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    if (orgChanged) this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_MAPPING_FILTER });
    this.page.set(0);
  }

  getGroupByDepartmentId(departmentId: string): DepartmentDisciplineGroup | undefined {
    return this.groups().find((g) => g.departmentId === departmentId);
  }

  async createMapping(request: CreateDepartmentDisciplineRequest): Promise<DepartmentDisciplineMapping> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.mappingService.createMapping(request));
      this.snack.open('Mapping Created Successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Save Mapping', { 409: 'Duplicate Department-Discipline Mapping' });
    } finally {
      this.saving.set(false);
    }
  }

  async bulkCreateMappings(request: BulkCreateDepartmentDisciplineRequest): Promise<DepartmentDisciplineMapping[]> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.mappingService.bulkCreateMappings(request));
      this.snack.open(`${request.disciplineIds.length} Mappings Created Successfully`, 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Save Mappings', { 409: 'Duplicate Department-Discipline Mapping' });
    } finally {
      this.saving.set(false);
    }
  }

  /** Diffs the department's current disciplines against the newly selected set:
   * added disciplines get created (single or bulk), removed ones get soft-deleted.
   * Disciplines left unchanged keep their existing remarks/isActive/displayOrder. */
  async syncDepartmentDisciplines(
    group: DepartmentDisciplineGroup,
    selectedDisciplineIds: string[],
    opts: { isActive: boolean; remarks?: string },
  ): Promise<void> {
    const currentIds = new Set(group.assignments.map((a) => a.disciplineId));
    const nextIds = new Set(selectedDisciplineIds);

    const toAdd = selectedDisciplineIds.filter((id) => !currentIds.has(id));
    const toRemove = group.assignments.filter((a) => !nextIds.has(a.disciplineId));

    if (!toAdd.length && !toRemove.length) return;

    this.saving.set(true);
    try {
      const organizationId = group.organizationId || this.auth.user()?.organizationId || '';
      const nextDisplayOrder = group.assignments.reduce((max, a) => Math.max(max, a.displayOrder), 0) + 1;

      if (toRemove.length) {
        await Promise.all(toRemove.map((a) => lastValueFrom(this.mappingService.deleteMapping(a.mappingId))));
      }

      if (toAdd.length === 1) {
        await lastValueFrom(this.mappingService.createMapping({
          organizationId,
          departmentId: group.departmentId,
          disciplineId: toAdd[0],
          displayOrder: nextDisplayOrder,
          remarks: opts.remarks,
          isActive: opts.isActive,
        }));
      } else if (toAdd.length > 1) {
        await lastValueFrom(this.mappingService.bulkCreateMappings({
          organizationId,
          departmentId: group.departmentId,
          disciplineIds: toAdd,
          remarks: opts.remarks,
          isActive: opts.isActive,
        }));
      }

      const parts: string[] = [];
      if (toAdd.length) parts.push(`${toAdd.length} added`);
      if (toRemove.length) parts.push(`${toRemove.length} removed`);
      this.snack.open(`Disciplines updated (${parts.join(', ')})`, 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Update Disciplines');
    } finally {
      this.saving.set(false);
    }
  }

  /** Bulk-toggles every discipline assignment in the group. If the group is in a
   * mixed active/inactive state, clicking activates all of them. */
  async toggleGroupActive(group: DepartmentDisciplineGroup): Promise<void> {
    const nextActive = !group.assignments.every((a) => a.isActive);
    this.saving.set(true);
    try {
      await Promise.all(
        group.assignments.map((a) =>
          lastValueFrom(this.mappingService.updateMapping(a.mappingId, {
            departmentId: group.departmentId,
            disciplineId: a.disciplineId,
            displayOrder: a.displayOrder,
            remarks: a.remarks,
            isActive: nextActive,
          })),
        ),
      );
      this.snack.open(nextActive ? 'Department Disciplines Activated' : 'Department Disciplines Deactivated', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${nextActive ? 'Activate' : 'Deactivate'} Disciplines`);
    } finally {
      this.saving.set(false);
    }
  }

  async deleteGroup(group: DepartmentDisciplineGroup): Promise<void> {
    try {
      await Promise.all(group.assignments.map((a) => lastValueFrom(this.mappingService.deleteMapping(a.mappingId))));
      this.snack.open('Department-Discipline Mappings Deleted', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Delete Mappings');
    }
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: MappingQueryParams = {
      page: 1,
      limit: BATCH_LIMIT,
      sortBy: 'createdAt',
      sortDirection: 'desc',
      organizationId: f.organizationId ?? this.auth.user()?.organizationId,
    };

    return this.mappingService.getMappings(params).pipe(
      tap((res) => {
        this.rawMappings.set(res.data.items);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Unable to load mappings. Please try again.');
        this.rawMappings.set([]);
        this.loading.set(false);
        return of(void 0);
      }),
    );
  }

  private groupMappings(mappings: DepartmentDisciplineMapping[]): DepartmentDisciplineGroup[] {
    const byDepartment = new Map<string, DepartmentDisciplineGroup>();

    for (const m of mappings) {
      let group = byDepartment.get(m.departmentId);
      if (!group) {
        group = {
          departmentId: m.departmentId,
          department: {id:  m.departmentId, code: m.departmentCode!, name: m.departmentName!},
          organizationId: m.organizationId,
          assignments: [],
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        };
        byDepartment.set(m.departmentId, group);
      }

      group.assignments.push({
        mappingId: m.id,
        disciplineId: m.disciplineId,
        discipline: {id: m.disciplineId, code: m.disciplineCode!, name: m.disciplineName!},
        isActive: m.isActive,
        displayOrder: m.displayOrder,
        remarks: m.remarks,
      });

      if (!group.department && m.department) group.department = m.department;
      if (new Date(m.createdAt) < new Date(group.createdAt)) group.createdAt = m.createdAt;
      if (m.updatedAt && (!group.updatedAt || new Date(m.updatedAt) > new Date(group.updatedAt))) group.updatedAt = m.updatedAt;
    }

    for (const group of byDepartment.values()) {
      group.assignments.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    return Array.from(byDepartment.values());
  }

  private applyFilter(groups: DepartmentDisciplineGroup[], f: MappingFilter): DepartmentDisciplineGroup[] {
    const term = f.search.trim().toLowerCase();

    return groups.filter((g) => {
      if (f.departmentId && g.departmentId !== f.departmentId) return false;
      if (f.disciplineId && !g.assignments.some((a) => a.disciplineId === f.disciplineId)) return false;
      if (f.status === 'active' && !g.assignments.some((a) => a.isActive)) return false;
      if (f.status === 'inactive' && !g.assignments.some((a) => !a.isActive)) return false;
      if (f.createdFrom && new Date(g.createdAt) < f.createdFrom) return false;
      if (f.createdTo && new Date(g.createdAt) > f.createdTo) return false;
      if (f.updatedFrom && (!g.updatedAt || new Date(g.updatedAt) < f.updatedFrom)) return false;
      if (f.updatedTo && (!g.updatedAt || new Date(g.updatedAt) > f.updatedTo)) return false;

      if (term) {
        const deptMatch =
          g.department?.name?.toLowerCase().includes(term) ||
          g.department?.code?.toLowerCase().includes(term) ||
          g.departmentId.toLowerCase().includes(term);
        const discMatch = g.assignments.some(
          (a) => a.discipline?.name?.toLowerCase().includes(term) || a.discipline?.code?.toLowerCase().includes(term),
        );
        if (!deptMatch && !discMatch) return false;
      }

      return true;
    });
  }

  private applySort(groups: DepartmentDisciplineGroup[], sortBy: GroupSortField, direction: SortDirection): DepartmentDisciplineGroup[] {
    const sorted = [...groups].sort((a, b) => {
      let cmp: number;
      if (sortBy === 'departmentName') {
        cmp = (a.department?.name ?? a.departmentId).localeCompare(b.department?.name ?? b.departmentId);
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
    const orgId = this.auth.user()?.organizationId;
    const params = orgId ? new HttpParams().set('organizationId', orgId) : undefined;

    this.http
      .get<ApiEnvelope<ReferenceOption[]>>(`${environment.apiUrl}/v1/departments/active`, { params })
      .subscribe({
        next: (res) => this.activeDepartments.set(res.data ?? []),
        error: () => this.activeDepartments.set([]),
      });

    this.http
      .get<ApiEnvelope<ReferenceOption[]>>(`${environment.apiUrl}/v1/disciplines/active`, { params })
      .subscribe({
        next: (res) => this.activeDisciplines.set(res.data ?? []),
        error: () => this.activeDisciplines.set([]),
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
