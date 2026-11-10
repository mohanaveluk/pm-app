import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../../../services';
import { DisciplineService } from '../services/discipline.service';
import { DepartmentService } from '../../department/services/department.service';
import {
  DEFAULT_DISCIPLINE_FILTER, Discipline, DisciplineDepartmentGroup, DisciplineFilter, DisciplineSortField,
  DisciplineTableRow, DisciplineViewMode, SortDirection,
} from '../models/discipline.model';
import { CreateDisciplineRequest, DisciplineQueryParams, UpdateDisciplineRequest } from '../models/discipline-request.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Discipline master module. Provided by
 * DisciplineComponent (not root) so state resets on each visit and its
 * subscriptions tear down with the component via takeUntilDestroyed.
 */
const VIEW_MODE_KEY = 'pm_discipline_view_mode';
/** The department view loads every matching discipline in one request. */
const GROUPED_LIMIT = 1000;

function readViewMode(): DisciplineViewMode {
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === 'department' || saved === 'departmentTable' ? saved : 'list';
  } catch {
    return 'list';
  }
}

@Injectable()
export class DisciplineStore {
  private readonly disciplineService = inject(DisciplineService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly departmentService = inject(DepartmentService);

  /** Active departments, for the Department filter. */
  readonly departments = signal<Array<{ id: string; name: string; code?: string }>>([]);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly disciplines = signal<Discipline[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly sortBy = signal<DisciplineSortField>('displayOrder');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly filter = signal<DisciplineFilter>({ ...DEFAULT_DISCIPLINE_FILTER });

  /** Table (paged) or department-wise. The department view loads every matching discipline at once. */
  readonly viewMode = signal<DisciplineViewMode>(readViewMode());

  /**
   * The department-wise view: each department with its disciplines, in name
   * order. With no filters on, departments without any discipline are listed
   * too, so the whole organization is visible at a glance.
   */
  readonly departmentGroups = computed<DisciplineDepartmentGroup[]>(() => {
    const groups = new Map<string, DisciplineDepartmentGroup>();
    const keyOf = (id: string | null | undefined) => id ?? '__none__';

    const f = this.filter();
    const showEmpty = !this.hasActiveFilters() || (!!f.departmentId && !f.search && f.status === 'all');
    if (showEmpty) {
      for (const d of this.departments()) {
        if (f.departmentId && d.id !== f.departmentId) continue;
        groups.set(keyOf(d.id), {
          departmentId: d.id, departmentName: d.name, departmentCode: d.code ?? null, disciplines: [], activeCount: 0,
        });
      }
    }
    for (const disc of this.disciplines()) {
      const key = keyOf(disc.departmentId);
      let group = groups.get(key);
      if (!group) {
        const known = this.departments().find((d) => d.id === disc.departmentId);
        group = {
          departmentId: disc.departmentId ?? null,
          departmentName: disc.department?.name ?? known?.name ?? (disc.departmentId ? 'Unknown department' : 'No department'),
          departmentCode: disc.department?.code ?? known?.code ?? null,
          disciplines: [],
          activeCount: 0,
        };
        groups.set(key, group);
      }
      group.disciplines.push(disc);
      if (disc.isActive) group.activeCount++;
    }
    for (const g of groups.values()) {
      g.disciplines.sort((a, b) => (a.displayOrder - b.displayOrder) || a.name.localeCompare(b.name));
    }
    // Departments by name; "No department" last.
    return [...groups.values()].sort((a, b) => {
      if (!a.departmentId !== !b.departmentId) return a.departmentId ? -1 : 1;
      return a.departmentName.localeCompare(b.departmentName);
    });
  });

  /**
   * The department-wise table: a heading row per department, then its
   * disciplines. Departments without disciplines are left out here.
   */
  readonly departmentTableRows = computed<DisciplineTableRow[]>(() =>
    this.departmentGroups()
      .filter((g) => g.disciplines.length > 0)
      .flatMap((g) => [
        {
          groupHeader: true as const,
          departmentId: g.departmentId,
          departmentName: g.departmentName,
          departmentCode: g.departmentCode,
          count: g.disciplines.length,
          activeCount: g.activeCount,
        },
        ...g.disciplines,
      ]));

  setViewMode(mode: DisciplineViewMode): void {
    if (mode === this.viewMode()) return;
    this.viewMode.set(mode);
    try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch { /* the choice lasts for this visit */ }
    this.page.set(0);
    this.reload$.next();
  }

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.disciplines().length === 0);
  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.organizationId || f.departmentId || f.status !== 'all' || f.createdFrom || f.createdTo || f.updatedFrom || f.updatedTo);
  });

  constructor() {
    this.loadDepartments();
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

  refresh(): void {
    this.reload$.next();
  }

  setPage(page: number, pageSize: number): void {
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.reload$.next();
  }

  setSort(sortBy: DisciplineSortField, sortDirection: SortDirection): void {
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

  setFilter(partial: Partial<DisciplineFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_DISCIPLINE_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  async createDiscipline(request: CreateDisciplineRequest): Promise<Discipline> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.disciplineService.createDiscipline(request));
      this.snack.open('Discipline Created Successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Save Discipline', { 409: 'Duplicate Discipline Code' });
    } finally {
      this.saving.set(false);
    }
  }

  async updateDiscipline(id: string, request: UpdateDisciplineRequest): Promise<Discipline> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.disciplineService.updateDiscipline(id, request));
      this.snack.open('Discipline Updated Successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Save Discipline', { 409: 'Duplicate Discipline Code' });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteDiscipline(discipline: Discipline): Promise<void> {
    try {
      await lastValueFrom(this.disciplineService.deleteDiscipline(discipline.id));
      this.snack.open('Discipline Deleted Successfully', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Delete Discipline');
    }
  }

  async toggleActive(discipline: Discipline): Promise<void> {
    const nextActive = !discipline.isActive;
    try {
      await lastValueFrom(
        this.disciplineService.updateDiscipline(discipline.id, {
          code: discipline.code,
          name: discipline.name,
          departmentId: discipline.departmentId,
          description: discipline.description,
          displayOrder: discipline.displayOrder,
          remarks: discipline.remarks,
          isActive: nextActive,
        }),
      );
      this.snack.open(nextActive ? 'Discipline Activated' : 'Discipline Deactivated', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${nextActive ? 'Activate' : 'Deactivate'} Discipline`);
    }
  }

  async getDisciplineById(id: string): Promise<Discipline> {
    const res = await lastValueFrom(this.disciplineService.getDisciplineById(id));
    return res.data;
  }

  /** The Department filter's options; a failure just leaves the filter empty. */
  private loadDepartments(): void {
    this.departmentService.getActiveDepartments(this.auth.user()?.organizationId ?? undefined).subscribe({
      next: (res: unknown) => {
        const list = ((res as { data?: unknown })?.data ?? res ?? []) as Array<{ id: string; name: string; code?: string }>;
        this.departments.set([...list].sort((a, b) => a.name.localeCompare(b.name)));
      },
      error: () => this.departments.set([]),
    });
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    // The department view groups every matching discipline, so it asks for all of them.
    const grouped = this.viewMode() !== 'list';
    const params: DisciplineQueryParams = {
      page: grouped ? 1 : this.page() + 1,
      limit: grouped ? GROUPED_LIMIT : this.pageSize(),
      sortBy: grouped ? 'name' : this.sortBy(),
      sortDirection: grouped ? 'asc' : this.sortDirection(),
      search: f.search || undefined,
      organizationId: f.organizationId ?? this.auth.user()?.organizationId,
      departmentId: f.departmentId ?? undefined,
      isActive: f.status === 'all' ? undefined : f.status === 'active',
      createdFrom: f.createdFrom?.toISOString(),
      createdTo: f.createdTo?.toISOString(),
      updatedFrom: f.updatedFrom?.toISOString(),
      updatedTo: f.updatedTo?.toISOString(),
    };

    return this.disciplineService.getDisciplines(params).pipe(
      tap((res) => {
        this.disciplines.set(res.data.items);
        this.totalCount.set(res.data.total);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Unable to load disciplines. Please try again.');
        this.disciplines.set([]);
        this.totalCount.set(0);
        this.loading.set(false);
        return of(void 0);
      }),
    );
  }

  private toStoreError(err: unknown, fallback: string, statusMessages: Record<number, string> = {}): Error {
    const httpErr = err as HttpErrorResponse;
    const status = httpErr?.status;
    const message = (status && statusMessages[status]) || httpErr?.error?.message || fallback;
    this.snack.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
    return new Error(message);
  }
}
