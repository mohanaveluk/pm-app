import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  WORKFLOW_ACTION_LABELS, WorkflowEvent, requisitionStatusLabel,
} from '../../models/material-requisition.model';

const ACTION_ICONS: Record<string, string> = {
  CREATED: 'add_circle',
  UPDATED: 'edit',
  SUBMITTED: 'send',
  RESUBMITTED: 'replay',
  EDITED_IN_REVIEW: 'edit_note',
  REVIEWED: 'task_alt',
  REVIEW_COMPLETED: 'fact_check',
  APPROVED: 'verified',
  APPROVAL_COMPLETED: 'verified',
  RETURNED: 'undo',
  REJECTED: 'block',
  CANCELLED: 'cancel',
  STATUS_CHANGED: 'swap_horiz',
  LOCKED: 'lock',
};

const ACTION_TONE: Record<string, 'positive' | 'negative' | 'neutral'> = {
  REVIEWED: 'positive', REVIEW_COMPLETED: 'positive', APPROVED: 'positive', APPROVAL_COMPLETED: 'positive',
  REJECTED: 'negative', CANCELLED: 'negative', RETURNED: 'neutral',
};

/**
 * The requisition's timeline: every step of every round, newest first, with
 * who took it and what they said. Read from the workflow events recorded
 * under the requisition's tracking id.
 */
@Component({
  selector: 'app-requisition-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe, MatIconModule],
  templateUrl: './requisition-history.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class RequisitionHistoryComponent {
  readonly events = input<WorkflowEvent[]>([]);
  readonly trackingId = input<string | null>(null);

  protected readonly newestFirst = computed(() => [...(this.events() ?? [])].reverse());

  protected label(e: WorkflowEvent): string {
    const base = WORKFLOW_ACTION_LABELS[e.action] ?? e.action;
    if (e.action === 'STATUS_CHANGED' && e.toStatus) return `${base} to ${requisitionStatusLabel(e.toStatus)}`;
    return base;
  }

  protected icon(e: WorkflowEvent): string {
    return ACTION_ICONS[e.action] ?? 'radio_button_checked';
  }

  protected tone(e: WorkflowEvent): string {
    return `timeline__dot timeline__dot--${ACTION_TONE[e.action] ?? 'neutral'}`;
  }

  /** Who acted: a review or approval step says in which capacity. */
  protected stage(e: WorkflowEvent): string {
    if (e.entityType === 'MR_REVIEW') return 'Review';
    if (e.entityType === 'MR_APPROVAL') return 'Approval';
    return 'Requisition';
  }
}
