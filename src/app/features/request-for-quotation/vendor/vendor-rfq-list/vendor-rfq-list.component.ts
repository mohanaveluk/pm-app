import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RfqService } from '../../services/rfq.service';
import { RFQ_STATUS_HINTS, RfqListItem, RfqStatus, rfqStatusLabel } from '../../models/rfq.model';
import { canDownloadRfqPdf, pdfErrorMessage } from '../../models/rfq-pdf';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VendorRfqAccessService } from '../../../../core/rbac/vendor-rfq-access.service';

type Stage = 'all' | 'ISSUED' | 'ACKNOWLEDGED' | 'QUOTED';

const COLUMNS = ['rfqNumber', 'subject', 'customer', 'bidClosingDate', 'items', 'status', 'action'];

/**
 * The vendor's RFQs (external users): only the RFQs issued to its own vendor
 * (the server filters). Each row leads to the next step — acknowledge an
 * issued RFQ, respond to an acknowledged one, or view a submitted response.
 */
@Component({
  selector: 'app-vendor-rfq-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, MatButtonModule, MatButtonToggleModule, MatChipsModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatPaginatorModule, MatTableModule, MatTooltipModule,
  ],
  templateUrl: './vendor-rfq-list.component.html',
  styleUrls: [
    '../../../material-requisition/material-requisition-list/material-requisition-list.component.scss',
    '../../rfq-list/rfq-list.component.scss',
    './vendor-rfq-list.component.scss',
  ],
})
export class VendorRfqListComponent {
  private readonly service = inject(RfqService);
  private readonly router = inject(Router);
  private readonly access = inject(VendorRfqAccessService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snack = inject(MatSnackBar);

  protected readonly columns = COLUMNS;
  protected readonly skeletonRows = Array.from({ length: 5 });
  protected readonly summary = this.access.summary;

  protected readonly rows = signal<RfqListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly stage = signal<Stage>('all');
  protected readonly search = signal('');

  protected readonly hasFilters = computed(() => this.stage() !== 'all' || !!this.search());

  private readonly reload$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  constructor() {
    this.reload$.pipe(
      switchMap(() => {
        this.loading.set(true);
        this.error.set(null);
        const stage = this.stage();
        return this.service.getRfqs({
          page: this.page() + 1,
          limit: this.pageSize(),
          sortBy: 'bidClosingDate',
          sortOrder: 'ASC',
          search: this.search() || undefined,
          status: stage === 'all' ? undefined : stage,
        }).pipe(
          tap((res) => {
            this.rows.set(res.data?.items ?? []);
            this.total.set(res.data?.total ?? 0);
            this.loading.set(false);
          }),
          catchError((err: HttpErrorResponse) => {
            this.error.set(err?.status === 403
              ? 'Your account cannot view Requests for Quotation.'
              : 'Unable to load your Requests for Quotation. Please try again.');
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
    this.access.refresh();
  }

  protected refresh(): void {
    this.reload$.next();
    this.access.refresh();
  }

  protected setStage(stage: Stage): void {
    this.stage.set(stage);
    this.page.set(0);
    this.reload$.next();
  }

  protected onSearch(event: Event): void { this.search$.next((event.target as HTMLInputElement).value.trim()); }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.reload$.next();
  }

  /** The next step for this RFQ. */
  protected action(row: RfqListItem): { label: string; icon: string; primary: boolean } {
    switch (row.status) {
      case 'ISSUED': return { label: 'Acknowledge', icon: 'task_alt', primary: true };
      case 'ACKNOWLEDGED': return { label: 'Respond', icon: 'edit_note', primary: true };
      case 'QUOTED': return { label: 'View / Update', icon: 'visibility', primary: false };
      default: return { label: 'View', icon: 'visibility', primary: false };
    }
  }

  protected open(row: RfqListItem, event?: Event): void {
    event?.stopPropagation();
    if (row.status === 'ISSUED' || row.status === 'DECLINED') {
      void this.router.navigate(['/vendor-rfqs', row.id, 'acknowledge']);
    } else {
      void this.router.navigate(['/vendor-rfqs', row.id]);
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

  protected closingSoon(row: RfqListItem): boolean {
    if (!row.bidClosingDate || !['ISSUED', 'ACKNOWLEDGED'].includes(row.status)) return false;
    return (new Date(row.bidClosingDate).getTime() - Date.now()) / 86_400_000 <= 3;
  }
}
