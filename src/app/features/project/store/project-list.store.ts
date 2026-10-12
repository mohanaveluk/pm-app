import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, forkJoin, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { ProjectService } from '../services/project.service';
import { ClientService } from '../../client/services/client.service';
import { ClientOption } from '../../client/models/client.model';
import { ProjectTypeService } from '../../project-type/services/project-type.service';
import { ProjectType } from '../../project-type/models/project-type.model';
import {
  DEFAULT_PROJECT_FILTER, Project, ProjectFilter, ProjectManagerOption, ProjectSortField,
  ProjectStatus, SortDirection,
} from '../models/project.model';
import { ProjectQueryParams } from '../models/project-request.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Project Master list. Provided by
 * ProjectListComponent (not root) so state resets on each visit and its
 * subscriptions tear down with the component.
 */
@Injectable()
export class ProjectListStore {
  private readonly service = inject(ProjectService);
  private readonly clientService = inject(ClientService);
  private readonly typeService = inject(ProjectTypeService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly projects = signal<Project[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly clients = signal<ClientOption[]>([]);
  readonly projectTypes = signal<ProjectType[]>([]);
  readonly managers = signal<ProjectManagerOption[]>([]);

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly sortBy = signal<ProjectSortField>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly filter = signal<ProjectFilter>({ ...DEFAULT_PROJECT_FILTER });

  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.projects().length === 0,
  );

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.status || f.clientId || f.projectTypeId || f.projectManagerId || f.countryCode);
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

  refresh(): void {
    this.reload$.next();
  }

  setPage(page: number, pageSize: number): void {
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.reload$.next();
  }

  setSort(sortBy: ProjectSortField, sortDirection: SortDirection): void {
    this.sortBy.set(sortBy);
    this.sortDirection.set(sortDirection);
    this.reload$.next();
  }

  onSearchInput(term: string): void {
    this.searchInput$.next(term);
  }

  applySearch(term: string): void {
    this.filter.update((f) => ({ ...f, search: term }));
    this.page.set(0);
    this.reload$.next();
  }

  setFilter(partial: Partial<ProjectFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_PROJECT_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  // ── Actions ─────────────────────────────────────────────────────────

  async changeStatus(project: Project, status: ProjectStatus, reason?: string): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(this.service.updateStatus(project.id, { status, reason: reason || undefined }));
      this.snack.open('Project status updated', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to change the project status', {
        400: 'That status change is not allowed for this project.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteProject(project: Project): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(this.service.deleteProject(project.id));
      this.snack.open('Project deleted successfully', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to delete the project', {
        409: 'Only a planned or cancelled project can be deleted.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  private loadReferenceData(): void {
    forkJoin({
      clients: this.clientService.getActiveClients(),
      types: this.typeService.getActiveProjectTypes(),
      managers: this.service.getProjectManagers(),
    }).subscribe({
      next: (res) => {
        this.clients.set(res.clients.data ?? []);
        this.projectTypes.set(res.types.data ?? []);
        this.managers.set(res.managers.data ?? []);
      },
      error: () => this.snack.open('Unable to load filter reference data.', 'Close', {
        duration: 5000, panelClass: ['error-snackbar'],
      }),
    });
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: ProjectQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
      search: f.search || undefined,
      status: f.status ?? undefined,
      clientId: f.clientId ?? undefined,
      projectTypeId: f.projectTypeId ?? undefined,
      projectManagerId: f.projectManagerId ?? undefined,
      countryCode: f.countryCode ?? undefined,
    };

    return this.service.getProjects(params).pipe(
      tap((res) => {
        const paged = res.data;
        this.projects.set(paged?.items ?? []);
        this.totalCount.set(paged?.total ?? 0);
        this.totalPages.set(paged?.totalPages ?? 0);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request
      // instead of letting the error terminate the outer subscription.
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.messageForStatus(err, 'Unable to load Projects. Please try again.', {
          403: 'You do not have permission to view Projects.',
        }));
        this.projects.set([]);
        this.totalCount.set(0);
        this.loading.set(false);
        return of(void 0);
      }),
    );
  }

  private messageForStatus(
    err: HttpErrorResponse,
    fallback: string,
    statusMessages: Record<number, string> = {},
  ): string {
    const status = err?.status;
    if (status && statusMessages[status]) return statusMessages[status];

    switch (status) {
      case 0:   return 'Cannot reach the server. Check your connection and try again.';
      case 400: return err.error?.message || 'The request was invalid. Please review your filters.';
      case 401: return 'Your session has expired. Please sign in again.';
      case 403: return 'You do not have permission to perform this operation.';
      case 404: return 'Project could not be found. It may have been deleted.';
      case 409: return err.error?.message || 'This operation conflicts with existing data.';
      case 422: return err.error?.message || 'The submitted data could not be processed.';
      case 500: return 'Something went wrong. Please try again.';
      default:  return err?.error?.message || fallback;
    }
  }

  private toStoreError(err: unknown, fallback: string, statusMessages: Record<number, string> = {}): Error {
    const httpErr = err as HttpErrorResponse;
    // Prefer the API's own explanation for a rejected transition.
    const apiMessage = httpErr?.error?.message;
    const message = (httpErr?.status === 400 || httpErr?.status === 409) && typeof apiMessage === 'string'
      ? apiMessage
      : this.messageForStatus(httpErr, fallback, statusMessages);
    this.snack.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
    return new Error(message);
  }
}
