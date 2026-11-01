import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, input, signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RequisitionFormService } from '../../services/requisition-form.service';
import {
  CHECKLIST_CONFIGS, ChecklistColumn, ChecklistKind, ChecklistRow, checklistRowErrors,
} from '../../models/requisition-checklist.model';

/**
 * The Compliance and the Deviation steps: a list of rows, Sr# by position,
 * added one after another. A row's errors show once the row has been touched
 * or the user tried to move on; a new row can only be added when the last one
 * is valid, and the cursor goes straight into it.
 */
@Component({
  selector: 'app-requisition-checklist-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatCheckboxModule, MatIconModule, MatTooltipModule],
  templateUrl: './requisition-checklist-step.component.html',
  styleUrls: ['../requisition-step.shared.scss', './requisition-checklist-step.component.scss'],
})
export class RequisitionChecklistStepComponent {
  protected readonly form = inject(RequisitionFormService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  readonly kind = input.required<ChecklistKind>();

  protected readonly config = computed(() => CHECKLIST_CONFIGS[this.kind()]);
  protected readonly rows = computed(() => this.form.checklistRows(this.kind())());
  protected readonly attempted = computed(() => this.form.checklistAttempted()[this.kind()]);
  protected readonly canAdd = computed(() => this.form.canAddChecklistRow(this.kind()));

  /** Rows the user has left at least once — their errors show from then on. */
  private readonly touched = signal<ReadonlySet<string>>(new Set());

  /** Errors to show, by row key then column key. */
  protected readonly shownErrors = computed(() => {
    const config = this.config();
    const touched = this.touched();
    const all = this.attempted();
    const out: Record<string, Record<string, string>> = {};
    for (const row of this.rows()) {
      out[row.key] = all || touched.has(row.key) ? checklistRowErrors(config, row) : {};
    }
    return out;
  });

  protected readonly invalidCount = computed(() => {
    const config = this.config();
    return this.rows().filter((r) => Object.keys(checklistRowErrors(config, r)).length > 0).length;
  });

  protected readonly addHint = computed(() =>
    this.canAdd() ? '' : 'Complete the last row before adding another');

  protected textValue(row: ChecklistRow, col: ChecklistColumn): string {
    return String(row.values[col.key] ?? '');
  }

  protected isRequired(row: ChecklistRow, col: ChecklistColumn): boolean {
    return !!col.required || (!!col.requiredUnless && !row.values[col.requiredUnless]);
  }

  protected onText(row: ChecklistRow, col: ChecklistColumn, event: Event): void {
    this.form.setChecklistValue(this.kind(), row.key, col.key, (event.target as HTMLInputElement).value);
  }

  protected onCheck(row: ChecklistRow, col: ChecklistColumn, checked: boolean): void {
    this.form.setChecklistValue(this.kind(), row.key, col.key, checked);
    this.markTouched(row.key);
  }

  protected markTouched(rowKey: string): void {
    if (this.touched().has(rowKey)) return;
    const next = new Set(this.touched());
    next.add(rowKey);
    this.touched.set(next);
  }

  /** Adds an empty row at the bottom and puts the cursor in its first field. */
  protected add(): void {
    const last = this.rows()[this.rows().length - 1];
    if (last) this.markTouched(last.key);
    const row = this.form.addChecklistRow(this.kind());
    if (!row) return;
    afterNextRender(() => {
      const input = this.host.nativeElement.querySelector(`[data-row="${row.key}"] input[type="text"]`) as HTMLInputElement | null;
      input?.focus();
    }, { injector: this.injector });
  }

  protected remove(row: ChecklistRow): void {
    this.form.removeChecklistRow(this.kind(), row.key);
  }

  protected errorId(row: ChecklistRow, col: ChecklistColumn): string {
    return `${this.kind()}-${row.key}-${col.key}-error`;
  }
}
