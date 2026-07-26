import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../../../services';
import { DepartmentService } from '../services/department.service';
import {
  DEFAULT_DEPARTMENT_FILTER, Department, DepartmentData, DepartmentFilter, DepartmentSortField, SortDirection,
} from '../models/department.model';
import { CreateDepartmentRequest, DepartmentQueryParams, UpdateDepartmentRequest } from '../models/department-request.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Department master module. Provided by
 * DepartmentComponent (not root) so state resets on each visit and its
 * subscriptions tear down with the component via takeUntilDestroyed.
 */
@Injectable()
export class DepartmentStore {
  private readonly departmentService = inject(DepartmentService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly departments = signal<DepartmentData[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly totalPages = signal(0);
  readonly sortBy = signal<DepartmentSortField>('displayOrder');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly filter = signal<DepartmentFilter>({ ...DEFAULT_DEPARTMENT_FILTER });

  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.departments().length === 0);
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

  setSort(sortBy: DepartmentSortField, sortDirection: SortDirection): void {
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

  setFilter(partial: Partial<DepartmentFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_DEPARTMENT_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  async createDepartment(request: CreateDepartmentRequest): Promise<Department> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.departmentService.createDepartment(request));
      this.snack.open('Department Created Successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Save Department', { 409: 'Duplicate Department Code' });
    } finally {
      this.saving.set(false);
    }
  }

  async updateDepartment(id: string, request: UpdateDepartmentRequest): Promise<Department> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.departmentService.updateDepartment(id, request));
      this.snack.open('Department Updated Successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Save Department', { 409: 'Duplicate Department Code' });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteDepartment(department: DepartmentData): Promise<void> {
    try {
      await lastValueFrom(this.departmentService.deleteDepartment(department.id));
      this.snack.open('Department Deleted Successfully', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to Delete Department');
    }
  }

  async toggleActive(department: DepartmentData): Promise<void> {
    const nextActive = !department.isActive;
    try {
      await lastValueFrom(
        this.departmentService.updateDepartment(department.id, {
          code: department.code,
          name: department.name,
          shortName: department.shortName,
          description: department.description,
          displayOrder: department.displayOrder,
          remarks: department.remarks,
          isActive: nextActive,
        }),
      );
      this.snack.open(nextActive ? 'Department Activated' : 'Department Deactivated', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${nextActive ? 'Activate' : 'Deactivate'} Department`);
    }
  }

  getDepartmentById(id: string): Promise<Department> {
    return lastValueFrom(this.departmentService.getDepartmentById(id));
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: DepartmentQueryParams = {
      page: this.page() + 1,
      pageSize: this.pageSize(),
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

    return this.departmentService.getDepartments(params).pipe(
      tap((res) => {
        const dData: any = res.data;
        this.departments.set(dData?.items);
        this.totalCount.set(dData?.total);
        //this.page.set(dData?.page);
        //this.totalPages.set(dData?.totalPages);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Unable to load departments. Please try again.');
        this.departments.set([]);
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
