import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RequisitionUserOption } from '../../models/material-requisition.model';

/**
 * Picks an ordered list of internal users (reviewers or approvers): a
 * searchable multi-select plus numbered chips that can be removed. Used by the
 * wizard's header step and by the list's "Reviewers & Approvers" dialog.
 */
@Component({
  selector: 'app-requisition-user-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatIconModule, MatTooltipModule],
  templateUrl: './requisition-user-picker.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class RequisitionUserPickerComponent {
  readonly label = input.required<string>();
  readonly placeholder = input('Select one or more people');
  readonly options = input<RequisitionUserOption[]>([]);
  /** The chosen user ids, in order. */
  readonly selectedIds = model<string[]>([]);
  /** People who cannot be picked here (none by default — a reviewer may also approve). */
  readonly blockedIds = input<string[]>([]);
  readonly blockedReason = input('Already chosen for the other role');
  readonly locked = input(false);
  readonly lockedReason = input<string | null>(null);
  readonly loading = input(false);
  /** Chip prefix: R1, R2 … or A1, A2 … */
  readonly stepPrefix = input('');
  readonly tone = input<'reviewer' | 'approver'>('reviewer');

  protected readonly search = signal('');

  protected readonly selected = computed(() => {
    const all = this.options();
    return this.selectedIds()
      .map((id) => all.find((u) => u.id === id))
      .filter((u): u is RequisitionUserOption => !!u);
  });

  /** Search by name, email, position or role; chosen people always stay listed. */
  protected readonly visible = computed(() => {
    const t = this.search().trim().toLowerCase();
    const chosen = new Set(this.selectedIds());
    const all = this.options();
    if (!t) return all;
    return all.filter((u) =>
      chosen.has(u.id)
      || u.name.toLowerCase().includes(t)
      || u.email.toLowerCase().includes(t)
      || (u.position ?? '').toLowerCase().includes(t)
      || (u.role ?? '').toLowerCase().includes(t));
  });

  protected readonly triggerText = computed(() => this.selected().map((u) => u.name).join(', '));

  protected isBlocked(id: string): boolean {
    return this.blockedIds().includes(id) && !this.selectedIds().includes(id);
  }

  /**
   * mat-select reports its value in option order; keep the order people were
   * picked in, adding new picks at the end.
   */
  protected onSelectionChange(value: string[]): void {
    const current = this.selectedIds();
    const kept = current.filter((id) => value.includes(id));
    const added = value.filter((id) => !current.includes(id));
    this.selectedIds.set([...kept, ...added]);
  }

  protected remove(id: string): void {
    if (this.locked()) return;
    this.selectedIds.set(this.selectedIds().filter((x) => x !== id));
  }

  protected onOpened(open: boolean): void {
    if (!open) this.search.set('');
  }
}
