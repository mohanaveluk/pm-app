import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import { MaterialRequisitionListItem, requisitionStatusLabel } from '../../models/material-requisition.model';

export type ImportSource = 'mr' | 'po';

/** What was picked: the new requisition is pre-filled from it in the wizard. */
export interface ImportRequisitionResult {
  source: ImportSource;
  id: string;
  label: string;
}

const PAGE_SIZE = 10;

/**
 * Import: start a new requisition from a previous Material Requisition or a
 * Purchase Order. The lists are searched and paged on the server, since they
 * keep growing over time.
 */
@Component({
  selector: 'app-import-requisition-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatPaginatorModule, MatProgressSpinnerModule,
  ],
  templateUrl: './import-requisition-dialog.component.html',
  styleUrls: ['../requisition-step.shared.scss', './import-requisition-dialog.component.scss'],
})
export class ImportRequisitionDialogComponent {
  private readonly service = inject(MaterialRequisitionService);
  private readonly dialogRef = inject(MatDialogRef<ImportRequisitionDialogComponent, ImportRequisitionResult>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly source = signal<ImportSource | null>(null);
  protected readonly search = signal('');
  protected readonly page = signal(0);
  protected readonly total = signal(0);
  protected readonly rows = signal<MaterialRequisitionListItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly selected = signal<MaterialRequisitionListItem | null>(null);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly statusLabel = requisitionStatusLabel;

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.reload$.pipe(
      tap(() => { this.loading.set(true); this.error.set(''); }),
      switchMap(() => this.service.getRequisitions({
        page: this.page() + 1,
        limit: PAGE_SIZE,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        search: this.search().trim() || undefined,
      }).pipe(catchError((err: HttpErrorResponse) => {
        this.error.set(err?.status === 0
          ? 'Cannot reach the server. Check your connection and try again.'
          : 'The requisitions could not be loaded.');
        return of(null);
      }))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((res) => {
      this.rows.set(res?.data?.items ?? []);
      this.total.set(res?.data?.total ?? 0);
      this.loading.set(false);
    });

    this.searchInput$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.search.set(term);
        this.page.set(0);
        this.reload$.next();
      });
  }

  chooseSource(source: ImportSource): void {
    if (this.source() === source) return;
    this.source.set(source);
    this.selected.set(null);
    this.search.set('');
    this.page.set(0);
    if (source === 'mr') this.reload$.next();
  }

  onSearch(event: Event): void {
    this.searchInput$.next((event.target as HTMLInputElement).value);
  }

  clearSearch(input: HTMLInputElement): void {
    input.value = '';
    this.searchInput$.next('');
  }

  onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.reload$.next();
  }

  retry(): void {
    this.reload$.next();
  }

  pick(row: MaterialRequisitionListItem): void {
    this.selected.set(row);
  }

  confirm(): void {
    const row = this.selected();
    if (!row || this.source() !== 'mr') return;
    this.dialogRef.close({ source: 'mr', id: row.id, label: row.mrNumber });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
