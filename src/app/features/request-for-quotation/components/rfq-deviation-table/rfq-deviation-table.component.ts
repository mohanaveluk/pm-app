import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, input, model, signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RfqDeviation } from '../../models/rfq.model';

/** What is wrong with one deviation row, by field (empty when valid). */
export function deviationErrors(d: RfqDeviation): Partial<Record<'clauseNo' | 'rfqRequirement' | 'justification', string>> {
  const errors: Partial<Record<'clauseNo' | 'rfqRequirement' | 'justification', string>> = {};
  if (!d.clauseNo?.trim()) errors.clauseNo = 'Enter the clause no.';
  if (!d.rfqRequirement?.trim()) errors.rfqRequirement = 'Enter the RFQ requirement';
  if (!d.vendorDeviation && !d.justification?.trim()) errors.justification = 'Required when Vendor Deviation is not ticked';
  return errors;
}

export function deviationIssues(rows: RfqDeviation[]): string[] {
  return rows.flatMap((d, i) => {
    const first = Object.values(deviationErrors(d))[0];
    return first ? [`Deviation item ${i + 1}: ${first.charAt(0).toLowerCase()}${first.slice(1)}.`] : [];
  });
}

/**
 * The vendor's deviation list: Sr# by position, rows added at the bottom one
 * after another (only once the last row is valid; the cursor goes straight
 * into the new row). Clause No. and RFQ Requirement are required, and so is
 * the Justification when Vendor Deviation is not ticked. Errors show once a
 * row has been left, or once the vendor tried to save.
 */
@Component({
  selector: 'app-rfq-deviation-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatCheckboxModule, MatIconModule, MatTooltipModule],
  templateUrl: './rfq-deviation-table.component.html',
  styleUrl: '../rfq-grid.shared.scss',
})
export class RfqDeviationTableComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  readonly rows = model<RfqDeviation[]>([]);
  readonly editable = input(false);
  /** The vendor tried to save: every row's errors show. */
  readonly attempted = input(false);

  private readonly touched = signal<ReadonlySet<number>>(new Set());

  protected readonly errors = computed(() => {
    const all = this.attempted();
    const touched = this.touched();
    return this.rows().map((d, i) => (all || touched.has(i) ? deviationErrors(d) : {}));
  });

  protected readonly canAdd = computed(() => {
    const rows = this.rows();
    return !rows.length || !Object.keys(deviationErrors(rows[rows.length - 1])).length;
  });

  protected readonly invalidCount = computed(() => this.rows().filter((d) => Object.keys(deviationErrors(d)).length).length);

  protected set(index: number, patch: Partial<RfqDeviation>): void {
    this.rows.update((list) => list.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected touch(index: number): void {
    if (this.touched().has(index)) return;
    this.touched.set(new Set([...this.touched(), index]));
  }

  protected add(): void {
    const count = this.rows().length;
    if (count) this.touch(count - 1);
    if (!this.canAdd()) return;
    this.rows.update((list) => [...list, { clauseNo: '', rfqRequirement: '', vendorDeviation: false, justification: null }]);
    afterNextRender(() => {
      const inputs = this.host.nativeElement.querySelectorAll('tr[data-row] input[type="text"]');
      const row = this.host.nativeElement.querySelector(`tr[data-row="${count}"] input[type="text"]`) as HTMLInputElement | null;
      (row ?? (inputs[inputs.length - 1] as HTMLInputElement | undefined))?.focus();
    }, { injector: this.injector });
  }

  /** Removing a row renumbers the rest (Sr# is the position). */
  protected remove(index: number): void {
    this.rows.update((list) => list.filter((_, i) => i !== index));
    this.touched.set(new Set([...this.touched()].filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))));
  }
}
