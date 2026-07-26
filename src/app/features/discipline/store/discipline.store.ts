import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../../../services';
import { DisciplineService } from '../services/discipline.service';
import {
  DEFAULT_DISCIPLINE_FILTER, Discipline, DisciplineFilter, DisciplineSortField, SortDirection,
} from '../models/discipline.model';
import { CreateDisciplineRequest, DisciplineQueryParams, UpdateDisciplineRequest } from '../models/discipline-request.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Discipline master module. Provided by
 * DisciplineComponent (not root) so state resets on each visit and its
 * subscriptions tear down with the component via takeUntilDestroyed.
 */
@Injectable()
export class DisciplineStore {
  private readonly disciplineService = inject(DisciplineService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

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

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.disciplines().length === 0);
  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.organizationId || f.status !== 'all' || f.createdFrom || f.createdTo || f.updatedFrom || f.updatedTo);
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
          shortName: discipline.shortName,
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

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: DisciplineQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortDirection: this.sortDirection(),
      search: f.search || undefined,
      organizationId: f.organizationId ?? this.auth.user()?.organizationId,
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
