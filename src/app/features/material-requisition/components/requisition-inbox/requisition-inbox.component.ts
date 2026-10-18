import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError, tap } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import {
  MaterialRequisitionListItem, RequisitionParticipantRole, requisitionStatusLabel,
} from '../../models/material-requisition.model';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * "My reviews" / "My approvals": the requisitions assigned to the signed-in
 * user in one role. By default only those still waiting for their decision;
 * "All assigned" includes the ones they have already decided.
 */
@Component({
  selector: 'app-requisition-inbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, DatePipe, MatToolbarModule, MatButtonModule, MatButtonToggleModule, MatIconModule,
    MatTooltipModule, MatFormFieldModule, MatInputModule, MatTableModule, MatPaginatorModule, MatChipsModule,
  ],
  templateUrl: './requisition-inbox.component.html',
  styleUrls: [
    '../../material-requisition-list/material-requisition-list.component.scss',
    './requisition-inbox.component.scss',
  ],
})
export class RequisitionInboxComponent implements OnInit {
  private readonly service = inject(MaterialRequisitionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly role = input.required<RequisitionParticipantRole>();

  protected readonly reviewing = computed(() => this.role() === RequisitionParticipantRole.REVIEWER);
  protected readonly title = computed(() => (this.reviewing() ? 'Requisition Reviews' : 'Requisition Approvals'));
  protected readonly subtitle = computed(() => (this.reviewing()
    ? 'Material requisitions assigned to you for review.'
    : 'Reviewed material requisitions waiting for your approval.'));

  protected readonly rows = signal<MaterialRequisitionListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly pendingOnly = signal(true);
  protected readonly searchTerm = signal('');

  protected readonly columns = ['mrNumber', 'project', 'client', 'ros', 'items', 'submitted', 'status'];
  protected readonly skeletonRows = Array.from({ length: 5 });

  private readonly reload$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  ngOnInit(): void {
    this.reload$
      .pipe(
        tap(() => { this.loading.set(true); this.error.set(null); }),
        switchMap(() => {
          const params = {
            page: this.page() + 1,
            limit: this.pageSize(),
            search: this.searchTerm().trim() || undefined,
            pendingOnly: this.pendingOnly(),
          };
          const request = this.reviewing() ? this.service.getMyReviews(params) : this.service.getMyApprovals(params);
          return request.pipe(catchError((err: HttpErrorResponse) => {
            this.error.set(err?.status === 0
              ? 'Cannot reach the server. Check your connection and try again.'
              : 'Unable to load your requisitions. Please try again.');
            return of(null);
          }));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.rows.set(res?.data?.items ?? []);
        this.total.set(res?.data?.total ?? 0);
        this.loading.set(false);
      });

    this.search$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => { this.page.set(0); this.reload$.next(); });

    this.reload$.next();
  }

  protected refresh(): void {
    this.reload$.next();
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.search$.next(value);
  }

  protected clearSearch(): void {
    this.searchTerm.set('');
    this.search$.next('');
  }

  protected setPendingOnly(value: boolean): void {
    this.pendingOnly.set(value);
    this.page.set(0);
    this.reload$.next();
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.reload$.next();
  }

  protected open(row: MaterialRequisitionListItem): void {
    void this.router.navigate(['/material-requisitions', this.reviewing() ? 'reviews' : 'approvals', row.id]);
  }

  protected statusLabel(status: string): string {
    return requisitionStatusLabel(status);
  }

  protected statusClass(status: string): string {
    return `status-chip status-chip--${status.toLowerCase().replace('_', '-')}`;
  }

  protected projectText(r: MaterialRequisitionListItem): string {
    if (!r.projectName) return '—';
    return r.projectCode ? `${r.projectCode} — ${r.projectName}` : r.projectName;
  }
}
