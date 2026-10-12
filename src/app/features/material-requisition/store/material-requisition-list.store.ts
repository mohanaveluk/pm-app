import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { MaterialRequisitionService } from '../services/material-requisition.service';
import { ProjectService } from '../../project/services/project.service';
import { ProjectOption } from '../../project/models/project.model';
import {
  DEFAULT_MATERIAL_REQUISITION_FILTER, MaterialRequisition, MaterialRequisitionFilter, MaterialRequisitionListItem,
  MaterialRequisitionSortField, MaterialRequisitionStatus, SortDirection, requisitionStatusLabel,
} from '../models/material-requisition.model';
import { CreateMaterialRequisitionRequest, MaterialRequisitionQueryParams } from '../models/material-requisition-request.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Page-level signal store for the Material Requisition list. Provided by the
 * list component (not root) so state resets on each visit.
 */
@Injectable()
export class MaterialRequisitionListStore {
  private readonly service = inject(MaterialRequisitionService);
  private readonly projectService = inject(ProjectService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly requisitions = signal<MaterialRequisitionListItem[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly projects = signal<ProjectOption[]>([]);

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly sortBy = signal<MaterialRequisitionSortField>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly filter = signal<MaterialRequisitionFilter>({ ...DEFAULT_MATERIAL_REQUISITION_FILTER });

  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.requisitions().length === 0,
  );

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.status || f.projectId);
  });

  constructor() {
    this.reload$
      .pipe(switchMap(() => this.fetch()), takeUntilDestroyed(this.destroyRef))
      .subscribe();

    this.searchInput$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.applySearch(term));

    this.reload$.next();
    this.loadProjects();
  }

  refresh(): void {
    this.reload$.next();
  }

  setPage(page: number, pageSize: number): void {
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.reload$.next();
  }

  setSort(sortBy: MaterialRequisitionSortField, sortDirection: SortDirection): void {
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

  setFilter(partial: Partial<MaterialRequisitionFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.page.set(0);
    this.reload$.next();
  }

  resetFilters(): void {
    this.filter.set({ ...DEFAULT_MATERIAL_REQUISITION_FILTER });
    this.page.set(0);
    this.reload$.next();
  }

  // ── Actions ─────────────────────────────────────────────────────────

  async submit(item: MaterialRequisitionListItem): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(this.service.submitRequisition(item.id));
      this.snack.open(`${item.mrNumber} submitted — now Under Review`, 'OK', { duration: 4000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to submit the requisition');
    } finally {
      this.saving.set(false);
    }
  }

  async changeStatus(
    item: MaterialRequisitionListItem,
    status: MaterialRequisitionStatus,
  ): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(this.service.updateStatus(item.id, status));
      this.snack.open(`${item.mrNumber} is now ${requisitionStatusLabel(status)}`, 'OK', { duration: 3500 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to change the requisition status');
    } finally {
      this.saving.set(false);
    }
  }

  /** Copies a requisition into a new draft and returns it. */
  async clone(item: MaterialRequisitionListItem): Promise<MaterialRequisition> {
    this.saving.set(true);
    try {
      const source = (await lastValueFrom(this.service.getRequisitionById(item.id))).data;
      const request: CreateMaterialRequisitionRequest = {
        projectId: source.projectId,
        wbsCostCodeId: source.wbsCostCodeId,
        budgetHead: source.budgetHead,
        requiredOnSiteDate: source.requiredOnSiteDate,
        // The copy gets its own number from the system.
        mrNumber: null,
        mtoReference: source.mtoReference,
        pidReference: source.pidReference,
        isometricReference: source.isometricReference,
        areaUnit: source.areaUnit,
        remarks: source.remarks,
        items: source.items.map((i) => ({
          materialId: i.materialId,
          requestedQty: i.requestedQty,
          source: i.source,
          sourceReference: i.sourceReference,
        })),
        documents: source.documents.map((d) => ({
          documentType: d.documentType,
          documentName: d.documentName,
          documentUrl: d.documentUrl,
          fileName: d.fileName,
          mimeType: d.mimeType,
          fileSizeBytes: d.fileSizeBytes,
        })),
        submit: false,
      };
      const created = (await lastValueFrom(this.service.createRequisition(request))).data;
      this.snack.open(`Cloned ${item.mrNumber} as draft ${created.mrNumber}`, 'OK', { duration: 4000 });
      this.reload$.next();
      return created;
    } catch (err) {
      throw this.toStoreError(err, 'Unable to clone the requisition');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteRequisition(item: MaterialRequisitionListItem): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(this.service.deleteRequisition(item.id));
      this.snack.open('Requisition deleted successfully', 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      throw this.toStoreError(err, 'Unable to delete the requisition');
    } finally {
      this.saving.set(false);
    }
  }

  private loadProjects(): void {
    this.projectService.getActiveProjects().subscribe({
      next: (res) => this.projects.set(res.data ?? []),
      error: () => this.snack.open('Unable to load the project filter.', 'Close', {
        duration: 5000, panelClass: ['error-snackbar'],
      }),
    });
  }

  private fetch(): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filter();
    const params: MaterialRequisitionQueryParams = {
      page: this.page() + 1,
      limit: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
      search: f.search || undefined,
      status: f.status ?? undefined,
      projectId: f.projectId ?? undefined,
    };

    return this.service.getRequisitions(params).pipe(
      tap((res) => {
        const paged = res.data;
        this.requisitions.set(paged?.items ?? []);
        this.totalCount.set(paged?.total ?? 0);
        this.totalPages.set(paged?.totalPages ?? 0);
        this.loading.set(false);
      }),
      switchMap(() => of(void 0)),
      // Keeps the long-lived reload$ pipeline alive after a failed request.
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.messageForStatus(err, 'Unable to load Material Requisitions. Please try again.', {
          403: 'You do not have permission to view Material Requisitions.',
        }));
        this.requisitions.set([]);
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
      case 404: return 'The requisition could not be found. It may have been deleted.';
      case 409: return err.error?.message || 'This operation conflicts with existing data.';
      case 500: return 'Something went wrong. Please try again.';
      default:  return err?.error?.message || fallback;
    }
  }

  private toStoreError(err: unknown, fallback: string): Error {
    const httpErr = err as HttpErrorResponse;
    const apiMessage = httpErr?.error?.message;
    const text = Array.isArray(apiMessage) ? apiMessage.join(' ') : apiMessage;
    const message = (httpErr?.status === 400 || httpErr?.status === 409) && typeof text === 'string'
      ? text
      : this.messageForStatus(httpErr, fallback);
    this.snack.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
    return new Error(message);
  }
}
