import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  RequisitionCandidate, RequisitionLineSource,
} from '../../models/material-requisition.model';
import { RequisitionFormService } from '../../services/requisition-form.service';

interface TableRow {
  candidate: RequisitionCandidate;
  pinned: boolean;
}

/**
 * The one table every material source feeds. Quantities are typed straight
 * into the rows, and a row whose quantity is filled stays at the top of the
 * list — whatever the source or the current search — so the requisition being
 * built is always in view.
 *
 * Selection lives in RequisitionFormService, not here, so it survives paging,
 * searching and switching between sources.
 */
@Component({
  selector: 'app-requisition-items-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatTableModule, MatIconModule, MatButtonModule, MatTooltipModule, MatCheckboxModule],
  templateUrl: './requisition-items-table.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class RequisitionItemsTableComponent {
  protected readonly form = inject(RequisitionFormService);

  /** The materials the active source is offering (the current page / search). */
  readonly rows = input.required<RequisitionCandidate[]>();
  /** Where a line picked here is recorded as coming from. */
  readonly source = input.required<RequisitionLineSource>();
  readonly sourceReference = input<string | null>(null);
  /** Heading for the source's own quantity column ("Previous Qty", "BOM Qty" …), if it has one. */
  readonly referenceLabel = input<string | null>(null);
  readonly loading = input(false);
  readonly emptyMessage = input('No materials to show.');

  protected readonly displayedColumns = computed(() => {
    const cols = ['select', 'code', 'description', 'category', 'uom'];
    if (this.referenceLabel()) cols.push('reference');
    cols.push('quantity', 'stock', 'actions');
    return cols;
  });

  /** Pinned lines first (as they were entered), then the rest of the results. */
  protected readonly tableRows = computed<TableRow[]>(() => {
    const pinned: TableRow[] = this.form.selectedLines().map((line) => ({
      pinned: true,
      candidate: {
        materialId: line.materialId,
        code: line.code,
        description: line.description,
        categoryName: line.categoryName,
        groupName: null,
        uom: line.uom,
        stockOnHand: line.stockOnHand,
        // Show the source's reference quantity where this page still has the row.
        referenceQty: this.rows().find((r) => r.materialId === line.materialId)?.referenceQty ?? null,
      },
    }));
    const pinnedIds = new Set(pinned.map((p) => p.candidate.materialId));
    const rest: TableRow[] = this.rows()
      .filter((r) => !pinnedIds.has(r.materialId))
      .map((candidate) => ({ candidate, pinned: false }));
    return [...pinned, ...rest];
  });

  protected readonly pinnedCount = computed(() => this.form.selectedLines().length);

  protected isSelected(row: TableRow): boolean {
    return this.form.isSelected(row.candidate.materialId);
  }

  /** Ticked but no quantity yet — flagged so it is obvious what is missing. */
  protected needsQuantity(row: TableRow): boolean {
    return this.isSelected(row) && !((this.form.quantityOf(row.candidate.materialId) ?? 0) > 0);
  }

  protected onToggle(row: TableRow, checked: boolean): void {
    this.form.setSelected(row.candidate, checked, this.source(), this.sourceReference());
  }

  protected valueOf(row: TableRow): string {
    const qty = this.form.quantityOf(row.candidate.materialId);
    return qty === null ? '' : String(qty);
  }

  /** A typed value that cannot be a requested quantity (negative, or too precise). */
  protected invalid(row: TableRow): boolean {
    const qty = this.form.quantityOf(row.candidate.materialId);
    return qty !== null && (qty < 0 || Math.round(qty * 1000) / 1000 !== qty);
  }

  protected onInput(row: TableRow, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const qty = raw === '' ? null : Number(raw);
    this.form.setQuantity(
      row.candidate,
      qty !== null && Number.isFinite(qty) ? qty : null,
      this.source(),
      this.sourceReference(),
    );
  }

  /** The field was left: a filled row is pinned, an empty or 0 row is dropped. */
  protected onCommit(row: TableRow): void {
    this.form.commitQuantity(row.candidate.materialId);
  }

  protected remove(row: TableRow): void {
    this.form.removeLine(row.candidate.materialId);
  }

  protected trackByMaterial(_index: number, row: TableRow): string {
    return row.candidate.materialId;
  }
}
