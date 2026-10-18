import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DecisionOption, RequisitionDecision } from '../../models/material-requisition.model';

export interface RequisitionDecisionSubmit {
  decision: RequisitionDecision;
  comments: string;
}

const MAX_COMMENTS = 4000;

/**
 * Pick a decision, explain it, submit. Used by both the review and the approval
 * screens — only the options differ. Comments are required whenever the chosen
 * option says so, and always when `commentsRequired` is set (a reviewer who
 * edited the requisition).
 */
@Component({
  selector: 'app-requisition-decision-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './requisition-decision-panel.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class RequisitionDecisionPanelComponent {
  readonly title = input('Your decision');
  readonly options = input.required<readonly DecisionOption[]>();
  /** Forces comments for every decision (e.g. the reviewer edited the requisition). */
  readonly commentsRequired = input(false);
  readonly commentsRequiredReason = input<string | null>(null);
  readonly busy = input(false);

  readonly submitted = output<RequisitionDecisionSubmit>();

  protected readonly maxComments = MAX_COMMENTS;
  protected readonly decision = signal<RequisitionDecision | null>(null);
  protected readonly comments = signal('');
  protected readonly touched = signal(false);

  protected readonly selected = computed(
    () => this.options().find((o) => o.value === this.decision()) ?? null,
  );

  protected readonly needsComments = computed(
    () => this.commentsRequired() || !!this.selected()?.needsComments,
  );

  protected readonly commentsMissing = computed(
    () => this.needsComments() && !this.comments().trim(),
  );

  protected readonly canSubmit = computed(
    () => !!this.decision() && !this.commentsMissing() && this.comments().length <= MAX_COMMENTS && !this.busy(),
  );

  protected readonly placeholder = computed(() => {
    switch (this.decision()) {
      case RequisitionDecision.RETURNED: return 'What needs to change before it can go ahead?';
      case RequisitionDecision.REJECTED: return 'Why is it rejected?';
      case RequisitionDecision.CANCELLED: return 'Why is it cancelled?';
      case RequisitionDecision.REVIEWED: return 'Anything the approvers should know (optional unless you edited it)';
      case RequisitionDecision.APPROVED: return 'Approval notes (optional)';
      default: return 'Choose a decision first';
    }
  });

  protected choose(value: RequisitionDecision): void {
    this.decision.set(value);
  }

  protected submit(): void {
    this.touched.set(true);
    const decision = this.decision();
    if (!decision || !this.canSubmit()) return;
    this.submitted.emit({ decision, comments: this.comments().trim() });
  }
}
