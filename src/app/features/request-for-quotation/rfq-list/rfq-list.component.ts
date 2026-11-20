import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, lastValueFrom, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PermissionService } from '../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../core/rbac/permissions.const';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { RfqService } from '../services/rfq.service';
import {
  RFQ_STATUS_HINTS, RFQ_STATUS_LABELS, RfqGroupBy, RfqGroupSummary, RfqListItem, RfqSortField, RfqStatus, rfqStatusLabel,
} from '../models/rfq.model';
import { canDownloadRfqPdf, pdfErrorMessage } from '../models/rfq-pdf';

const COLUMNS = ['rfqNumber', 'subject', 'project', 'vendor', 'requisitions', 'bidClosingDate', 'items', 'status', 'createdAt', 'actions'];

export type RfqViewMode = 'list' | RfqGroupBy;
const VIEW_KEY = 'pm.rfq-list.view';

/** A vendor / project heading row of the grouped table. */
export interface RfqGroupRow {
  group: true;
  key: string | null;
  code: string | null;
  name: string;
  total: number;
  open: number;
}

export type RfqTableRow = RfqListItem | RfqGroupRow;
const isGroup = (row: RfqTableRow): row is RfqGroupRow => (row as RfqGroupRow).group === true;

function loadView(): RfqViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === 'vendor' || v === 'project' ? v : 'list';
  } catch {
    return 'list';
  }
}

/** Requests for Quotation: the buyer's RFQs, or — for a vendor — the RFQs issued to it. */
@Component({
  selector: 'app-rfq-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, MatButtonModule, MatButtonToggleModule, MatChipsModule, MatFormFieldModule, MatIconModule, MatInputModule, MatMenuModule,
    MatPaginatorModule, MatSelectModule, MatSortModule, MatTableModule, MatToolbarModule, MatTooltipModule,
  ],
  templateUrl: './rfq-list.component.html',
  styleUrls: [
    '../../material-requisition/material-requisition-list/material-requisition-list.component.scss',
    './rfq-list.component.scss',
  ],
})
export class RfqListComponent {
  private readonly service = inject(RfqService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly permissionService = inject(PermissionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly viewMode = signal<RfqViewMode>(loadView());
  /** The grouped-by column is in the heading, so the rows leave it out. */
  protected readonly columns = computed(() => {
    const mode = this.viewMode();
    return COLUMNS.filter((c) => !(mode === 'vendor' && c === 'vendor') && !(mode === 'project' && c === 'project'));
  });
  protected readonly groups = signal<RfqGroupSummary[]>([]);
  protected readonly isGroupRow = (_: number, row: RfqTableRow): boolean => isGroup(row);
  protected readonly trackRow = (_: number, row: RfqTableRow): string => (isGroup(row) ? 'group:' + (row.key ?? 'none') : row.id);

  /** The page's rows with a heading before each vendor / project (grouped views). */
  protected readonly tableRows = computed<RfqTableRow[]>(() => {
    const mode = this.viewMode();
    const rows = this.rows();
    if (mode === 'list') return rows;
    const totals = new Map(this.groups().map((g) => [g.key, g]));
    const out: RfqTableRow[] = [];
    let current: string | null | undefined;
    for (const r of rows) {
      const key = mode === 'vendor' ? r.vendorId : r.projectId;
      if (key !== current || !out.length) {
        current = key;
        const t = totals.get(key ?? null);
        out.push({
          group: true, key: key ?? null,
          code: mode === 'vendor' ? r.vendorCode : r.projectCode,
          name: mode === 'vendor' ? (r.vendorName ?? 'No vendor chosen yet') : (r.projectName ?? '—'),
          total: t?.total ?? 0, open: t?.open ?? 0,
        });
      }
      out.push(r);
    }
    return out;
  });
  protected readonly groupCount = computed(() => this.tableRows().filter(isGroup).length);
  protected readonly statusOptions = (Object.keys(RFQ_STATUS_LABELS) as RfqStatus[]).map((value) => ({
    value, label: RFQ_STATUS_LABELS[value], hint: RFQ_STATUS_HINTS[value],
  }));
  protected readonly skeletonRows = Array.from({ length: 6 });

  protected readonly rows = signal<RfqListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly sortBy = signal<RfqSortField>('createdAt');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');
  protected readonly search = signal('');
  protected readonly status = signal<RfqStatus | null>(null);

  protected readonly hasFilters = computed(() => !!(this.search() || this.status()));
  protected readonly canManage = computed(() => this.permissionService.hasPermission(PERMISSIONS.RFQ_MANAGE));

  private readonly reload$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  constructor() {
    this.reload$.pipe(
      switchMap(() => {
        this.loading.set(true);
        this.error.set(null);
        return this.service.getRfqs({
          page: this.page() + 1,
          limit: this.pageSize(),
          sortBy: this.sortBy(),
          sortOrder: this.sortDirection() === 'asc' ? 'ASC' : 'DESC',
          search: this.search() || undefined,
          status: this.status() ?? undefined,
          groupBy: this.viewMode() === 'list' ? undefined : this.viewMode() as RfqGroupBy,
        }).pipe(
          tap((res) => {
            this.rows.set(res.data?.items ?? []);
            this.total.set(res.data?.total ?? 0);
            this.groups.set(res.data?.groups ?? []);
            this.loading.set(false);
          }),
          catchError((err: HttpErrorResponse) => {
            this.error.set(err?.status === 403
              ? 'You do not have permission to view Requests for Quotation.'
              : 'Unable to load Requests for Quotation. Please try again.');
            this.rows.set([]);
            this.total.set(0);
            this.loading.set(false);
            return of(null);
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();

    this.search$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((term) => {
      this.search.set(term);
      this.page.set(0);
      this.reload$.next();
    });

    this.reload$.next();
  }

  protected refresh(): void { this.reload$.next(); }

  protected setViewMode(mode: RfqViewMode): void {
    if (mode === this.viewMode()) return;
    this.viewMode.set(mode);
    try { localStorage.setItem(VIEW_KEY, mode); } catch { /* the choice is just not remembered */ }
    this.page.set(0);
    this.reload$.next();
  }

  protected onSearch(event: Event): void { this.search$.next((event.target as HTMLInputElement).value.trim()); }

  protected clearSearch(input: HTMLInputElement): void {
    input.value = '';
    this.search$.next('');
  }

  protected setStatus(status: RfqStatus | null): void {
    this.status.set(status);
    this.page.set(0);
    this.reload$.next();
  }

  protected onSort(sort: Sort): void {
    this.sortBy.set((sort.active || 'createdAt') as RfqSortField);
    this.sortDirection.set(sort.direction || 'desc');
    this.reload$.next();
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.reload$.next();
  }

  protected create(): void { void this.router.navigate(['/rfqs/create']); }

  protected view(row: RfqListItem, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/rfqs', row.id]);
  }

  protected edit(row: RfqListItem, event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/rfqs', row.id, 'edit']);
  }

  protected async remove(row: RfqListItem, event: Event): Promise<void> {
    event.stopPropagation();
    const data: ConfirmDialogData = {
      title: `Delete RFQ ${row.rfqNumber}?`,
      message: 'The draft RFQ is deleted and its quantities are open again for another RFQ.',
      confirmText: 'Delete', cancelText: 'Keep', color: 'warn', icon: 'delete',
    };
    const ok = await lastValueFrom(this.dialog.open(ConfirmDialogComponent, { data, width: '440px' }).afterClosed());
    if (!ok) return;
    try {
      await lastValueFrom(this.service.delete(row.id));
      this.snack.open(`RFQ ${row.rfqNumber} deleted`, 'OK', { duration: 3000 });
      this.reload$.next();
    } catch (err) {
      const m = (err as HttpErrorResponse)?.error?.message;
      this.snack.open(typeof m === 'string' ? m : 'Unable to delete the RFQ.', 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
    }
  }

protected readonly downloading = signal<string | null>(null);

  protected canDownload(status: RfqStatus | null | undefined): boolean { return canDownloadRfqPdf(status); }

  /** Downloads the RFQ as a PDF. */
  protected async downloadPdf(rfq: { id: string; rfqNumber: string; revisionNo: number }, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (this.downloading()) return;
    this.downloading.set(rfq.id);
    try {
      await this.service.downloadPdf(rfq);
    } catch (err) {
      this.snack.open(await pdfErrorMessage(err), 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
    } finally {
      this.downloading.set(null);
    }
  }

  protected statusLabel(s: RfqStatus): string { return rfqStatusLabel(s); }
  protected statusHint(s: RfqStatus): string { return RFQ_STATUS_HINTS[s]; }
  protected statusClass(s: RfqStatus): string { return `status-chip rfq-status rfq-status--${s.toLowerCase()}`; }

  protected requisitionText(row: RfqListItem): string {
    return row.requisitions.map((r) => (r.shortDescription ? `${r.mrNumber} — ${r.shortDescription}` : r.mrNumber)).join('\n');
  }

  protected closingSoon(row: RfqListItem): boolean {
    if (!row.bidClosingDate || !['ISSUED', 'ACKNOWLEDGED'].includes(row.status)) return false;
    const days = (new Date(row.bidClosingDate).getTime() - Date.now()) / 86_400_000;
    return days <= 3;
  }
}
