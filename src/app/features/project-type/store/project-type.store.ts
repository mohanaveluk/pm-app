import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { ProjectTypeService } from '../services/project-type.service';
import {
  DEFAULT_PROJECT_TYPE_FILTER, SortDirection, ProjectType, ProjectTypeFilter, ProjectTypeSortField,
} from '../models/project-type.model';
import {
  CreateProjectTypeRequest, UpdateProjectTypeRequest, ProjectTypeQueryParams,
} from '../models/project-type-request.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Project Type master. Provided by
 * ProjectTypeComponent (not root) so state resets on each visit and its
 * subscriptions tear down with the component via takeUntilDestroyed.
 *
 * Mirrors DepartmentStore/IndustryCategoryStore's shape and lifecycle. The
 * differences are dictated by the real API: no dedicated enable/disable
 * endpoints (status changes go through the same PUT as any other edit, like
 * Department), and `page`/`limit`/`sortOrder` query keys (like Industry
 * Category), not page/pageSize/sortDirection.
 */
@Injectable()
export class ProjectTypeStore {
  private readonly service = inject(ProjectTypeService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly projectTypes = signal<ProjectType[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly sortBy = signal<ProjectTypeSortField>('displayOrder');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly filter = signal<ProjectTypeFilter>({ ...DEFAULT_PROJECT_TYPE_FILTER });

  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.projectTypes().length === 0,
  );

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.status !== 'all');
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

  /** Reloads the current page while preserving search, filters, sort and paging. */
  refresh(): void {
    this.reload$.next();
  }

  setPage(page: number, pageSize: number): void {
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.reload$.next();
  }

  setSort(sortBy: ProjectTypeSortField, sortDirection: SortDirection): void {
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

  setFilter(partial: Partial<ProjectTypeFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_PROJECT_TYPE_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  // ── CRUD + lifecycle ───────────────────────────────────────────────

  async createProjectType(request: CreateProjectTypeRequest): Promise<ProjectType> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.createProjectType(request));
      this.snack.open('Project Type created successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save Project Type', {
        409: 'A Project Type with this name already exists in your organization.',
        422: 'Please check the highlighted fields and try again.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async updateProjectType(id: string, request: UpdateProjectTypeRequest): Promise<ProjectType> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.updateProjectType(id, request));
      this.snack.open('Project Type updated successfully', 'OK', { duration: 3000 });
      this.reload$.next();
      return res.data;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to save Project Type', {
        409: 'A Project Type with this name already exists in your organization.',
        422: 'Please check the highlighted fields and try again.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteProjectType(projectType: ProjectType): Promise<void> {
    this.deleting.set(true);
    try {
      await lastValueFrom(this.service.deleteProjectType(projectType.id));
      this.snack.open('Project Type deleted successfully', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to delete Project Type', {
        409: 'This Project Type is currently in use and cannot be deleted.',
      });
    } finally {
      this.deleting.set(false);
    }
  }

  /**
   * Flips the active flag through the same PUT the edit form uses — the API
   * exposes no dedicated enable/disable endpoint for Project Type (unlike
   * Industry Category), so this follows Department's toggle-via-update pattern.
   */
  async toggleActive(projectType: ProjectType): Promise<void> {
    const nextActive = !projectType.isActive;
    try {
      await lastValueFrom(this.service.updateProjectType(projectType.id, { isActive: nextActive }));
      this.snack.open(nextActive ? 'Project Type activated' : 'Project Type deactivated', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, `Unable to ${nextActive ? 'activate' : 'deactivate'} Project Type`, {
        409: 'This Project Type is currently in use and its status cannot be changed.',
      });
    }
  }

  async getProjectTypeById(id: string): Promise<ProjectType> {
    const res = await lastValueFrom(this.service.getProjectTypeById(id));
    return res.data;
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: ProjectTypeQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
      search: f.search || undefined,
      isActive: f.status === 'all' ? undefined : f.status === 'active',
    };

    return this.service.getProjectTypes(params).pipe(
      tap((res) => {
        const paged = res.data;
        this.projectTypes.set(paged?.items ?? []);
        this.totalCount.set(paged?.total ?? 0);
        this.totalPages.set(paged?.totalPages ?? 0);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.messageForStatus(err, 'Unable to load Project Types. Please try again.', {
          403: 'You do not have permission to view Project Types.',
        }));
        this.projectTypes.set([]);
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
      case 404: return 'Project Type could not be found. It may have been deleted.';
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
