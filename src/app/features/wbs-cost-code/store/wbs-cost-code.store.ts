import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { WbsCostCodeService } from '../services/wbs-cost-code.service';
import {
  DEFAULT_WBS_COST_CODE_FILTER, DisciplineOption, ProjectOption, SortDirection, WbsCostCode,
  WbsCostCodeFilter, WbsCostCodeSortField,
} from '../models/wbs-cost-code.model';
import {
  CreateWbsCostCodeRequest, UpdateWbsCostCodeRequest, WbsCostCodeQueryParams,
} from '../models/wbs-cost-code-request.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the WBS master. Provided by
 * WbsCostCodeComponent (not root) so state resets on each visit and its
 * subscriptions tear down with the component via takeUntilDestroyed.
 *
 * Same shape and lifecycle as ProjectTypeStore/VendorTypeStore, plus the
 * active-discipline lookup that feeds the Discipline filter and form field.
 */
@Injectable()
export class WbsCostCodeStore {
  private readonly service = inject(WbsCostCodeService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly wbsCostCodes = signal<WbsCostCode[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  /** Active disciplines of the organization — options for the filter and the form. */
  readonly disciplines = signal<DisciplineOption[]>([]);
  readonly disciplinesLoading = signal(false);

  /** Open projects of the organization — options for the Project field. */
  readonly projects = signal<ProjectOption[]>([]);
  readonly projectsLoading = signal(false);

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly sortBy = signal<WbsCostCodeSortField>('code');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly filter = signal<WbsCostCodeFilter>({ ...DEFAULT_WBS_COST_CODE_FILTER });

  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.wbsCostCodes().length === 0,
  );

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.status !== 'all' || f.disciplineId);
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
    this.loadDisciplines();
    this.loadProjects();
  }

  /** Reloads the current page while preserving search, filters, sort and paging. */
  refresh(): void {
    this.reload$.next();
  }

  setPage(page: number, pageSize: number): void {
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.reload$.next();
  }

  setSort(sortBy: WbsCostCodeSortField, sortDirection: SortDirection): void {
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

  setFilter(partial: Partial<WbsCostCodeFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_WBS_COST_CODE_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  // ── CRUD + lifecycle ───────────────────────────────────────────────

  async createWbsCostCode(request: CreateWbsCostCodeRequest): Promise<WbsCostCode> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.createWbsCostCode(request));
      this.snack.open('WBS created successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save WBS', {
        409: 'A WBS with this code already exists in your organization.',
        422: 'Please check the highlighted fields and try again.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async updateWbsCostCode(id: string, request: UpdateWbsCostCodeRequest): Promise<WbsCostCode> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.updateWbsCostCode(id, request));
      this.snack.open('WBS updated successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save WBS', {
        422: 'Please check the highlighted fields and try again.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteWbsCostCode(wbsCostCode: WbsCostCode): Promise<void> {
    this.deleting.set(true);
    try {
      await lastValueFrom(this.service.deleteWbsCostCode(wbsCostCode.id));
      this.snack.open('WBS deleted successfully', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to delete WBS', {
        409: 'This WBS is currently in use and cannot be deleted.',
      });
    } finally {
      this.deleting.set(false);
    }
  }

  /**
   * Flips the active flag through the same PUT the edit form uses — the API
   * exposes no dedicated enable/disable endpoint for this master.
   */
  async toggleActive(wbsCostCode: WbsCostCode): Promise<void> {
    const nextActive = !wbsCostCode.isActive;
    try {
      await lastValueFrom(this.service.updateWbsCostCode(wbsCostCode.id, { isActive: nextActive }));
      this.snack.open(nextActive ? 'WBS activated' : 'WBS deactivated', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${nextActive ? 'activate' : 'deactivate'} WBS`, {
        409: 'This WBS is currently in use and its status cannot be changed.',
      });
    }
  }

  async getWbsCostCodeById(id: string): Promise<WbsCostCode> {
    const res = await lastValueFrom(this.service.getWbsCostCodeById(id));
    return res.data;
  }

  /**
   * Loads the discipline dropdown. A failure leaves the list empty rather than
   * blocking the page: the Discipline field is optional, so the master stays
   * usable and the form says the list could not be loaded.
   */
  loadDisciplines(): void {
    this.disciplinesLoading.set(true);
    this.service.getActiveDisciplines().subscribe({
      next: (res) => {
        this.disciplines.set(res.data ?? []);
        this.disciplinesLoading.set(false);
      },
      error: () => {
        this.disciplines.set([]);
        this.disciplinesLoading.set(false);
      },
    });
  }

  /** Same failure handling as the disciplines: an empty list, with the form saying so. */
  loadProjects(): void {
    this.projectsLoading.set(true);
    this.service.getActiveProjects().subscribe({
      next: (res) => {
        this.projects.set(res.data ?? []);
        this.projectsLoading.set(false);
      },
      error: () => {
        this.projects.set([]);
        this.projectsLoading.set(false);
      },
    });
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: WbsCostCodeQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
      search: f.search || undefined,
      isActive: f.status === 'all' ? undefined : f.status === 'active',
      disciplineId: f.disciplineId || undefined,
    };

    return this.service.getWbsCostCodes(params).pipe(
      tap((res) => {
        const paged = res.data;
        this.wbsCostCodes.set(paged?.items ?? []);
        this.totalCount.set(paged?.total ?? 0);
        this.totalPages.set(paged?.totalPages ?? 0);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.messageForStatus(err, 'Unable to load WBS. Please try again.', {
          403: 'You do not have permission to view WBS',
        }));
        this.wbsCostCodes.set([]);
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
      case 404: return 'WBS could not be found. It may have been deleted.';
      case 409: return err.error?.message || 'This operation conflicts with existing data.';
      case 422: return err.error?.message || 'The submitted data failed validation. Please review and try again.';
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
