import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  DECISION_LABELS, MaterialRequisition, RequisitionDecision, RequisitionParticipant,
  RequisitionParticipantRole,
} from '../../models/material-requisition.model';

/**
 * The reviewers and approvers of a requisition, in order, with each one's
 * decision and comments for the current round.
 */
@Component({
  selector: 'app-requisition-participants',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe, MatIconModule, MatTooltipModule],
  templateUrl: './requisition-participants.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class RequisitionParticipantsComponent {
  readonly mr = input.required<MaterialRequisition>();
  /** Highlights the signed-in user's own row. */
  readonly currentUserEmail = input<string | null>(null);

  protected readonly decisionLabels: Record<string, string> = DECISION_LABELS;

  protected readonly reviewers = computed(() => this.byRole(RequisitionParticipantRole.REVIEWER));
  protected readonly approvers = computed(() => this.byRole(RequisitionParticipantRole.APPROVER));

  private byRole(role: RequisitionParticipantRole): RequisitionParticipant[] {
    return (this.mr().participants ?? [])
      .filter((p) => p.role === role)
      .sort((a, b) => a.sequence - b.sequence);
  }

  protected isMe(p: RequisitionParticipant): boolean {
    const me = this.currentUserEmail();
    return !!me && p.userEmail.toLowerCase() === me.toLowerCase();
  }

  protected decisionClass(decision: RequisitionDecision | null): string {
    if (!decision) return 'decision-chip decision-chip--pending';
    return `decision-chip decision-chip--${decision.toLowerCase()}`;
  }
}
