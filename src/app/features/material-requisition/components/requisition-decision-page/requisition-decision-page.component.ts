import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../../services';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import {
  APPROVAL_DECISION_OPTIONS, DECISION_LABELS, MaterialRequisition, MaterialRequisitionStatus,
  REVIEW_DECISION_OPTIONS, RequisitionDecision, RequisitionParticipantRole, requisitionStatusLabel,
} from '../../models/material-requisition.model';
import { RequisitionDetailsComponent } from '../requisition-details/requisition-details.component';
import { RequisitionParticipantsComponent } from '../requisition-participants/requisition-participants.component';
import { RequisitionHistoryComponent } from '../requisition-history/requisition-history.component';
import {
  RequisitionDecisionPanelComponent, RequisitionDecisionSubmit,
} from '../requisition-decision-panel/requisition-decision-panel.component';

/**
 * The screen a reviewer or approver acts from: the whole requisition, who else
 * is involved and what they decided, its history, and the decision panel.
 *
 * A reviewer may also edit the requisition (the wizard, then back here); their
 * review must then say what they changed. An approver cannot edit.
 */
@Component({
  selector: 'app-requisition-decision-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatButtonModule, MatChipsModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    RequisitionDetailsComponent, RequisitionParticipantsComponent, RequisitionHistoryComponent,
    RequisitionDecisionPanelComponent,
  ],
  templateUrl: './requisition-decision-page.component.html',
  styleUrls: [
    '../requisition-step.shared.scss',
    '../../material-requisition-view/material-requisition-view.component.scss',
  ],
})
export class RequisitionDecisionPageComponent implements OnInit {
  private readonly service = inject(MaterialRequisitionService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly role = input.required<RequisitionParticipantRole>();

  protected readonly reviewing = computed(() => this.role() === RequisitionParticipantRole.REVIEWER);
  protected readonly options = computed(() => (this.reviewing() ? REVIEW_DECISION_OPTIONS : APPROVAL_DECISION_OPTIONS));
  protected readonly inboxLabel = computed(() => (this.reviewing() ? 'Requisition Reviews' : 'Requisition Approvals'));

  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly busy = signal(false);
  protected readonly mr = signal<MaterialRequisition | null>(null);
  /** Set once this user's decision is recorded on this screen. */
  protected readonly done = signal<RequisitionDecision | null>(null);

  protected readonly myEmail = computed(() => this.auth.user()?.email ?? null);

  /** My own reviewer / approver row for this role, if I am one. */
  protected readonly me = computed(() => {
    const email = this.myEmail()?.toLowerCase();
    return this.mr()?.participants.find(
      (p) => p.role === this.role() && p.userEmail.toLowerCase() === email,
    ) ?? null;
  });

  protected readonly canDecide = computed(() => {
    const p = this.mr()?.permissions;
    return !this.done() && !!p && (this.reviewing() ? p.canReview : p.canApprove);
  });

  /** A reviewer can still change the requisition while their review is due. */
  protected readonly canEdit = computed(
    () => this.reviewing() && this.canDecide() && !!this.mr()?.permissions?.canEdit,
  );

  /** Why there is no decision panel — shown instead of it. */
  protected readonly notice = computed(() => {
    const mr = this.mr();
    if (!mr || this.canDecide()) return null;
    const me = this.me();
    const done = this.done();
    if (done) return { icon: 'task_alt', text: `Your decision has been recorded: ${DECISION_LABELS[done]}.` };
    if (mr.lockedAt) return { icon: 'lock', text: 'This requisition is locked — a purchase order has been raised.' };
    if (!me) {
      return { icon: 'info', text: `You are not ${this.reviewing() ? 'a reviewer' : 'an approver'} of this requisition.` };
    }
    if (me.decision) {
      return { icon: 'task_alt', text: `You recorded ${DECISION_LABELS[me.decision]} for this round.` };
    }
    const waiting = this.reviewing() ? MaterialRequisitionStatus.UNDER_REVIEW : MaterialRequisitionStatus.REVIEWED;
    if (mr.status !== waiting) {
      return {
        icon: 'info',
        text: this.reviewing()
          ? `It is ${requisitionStatusLabel(mr.status).toLowerCase()} — not waiting for review.`
          : mr.status === MaterialRequisitionStatus.UNDER_REVIEW
            ? 'It is still under review. You will be emailed when it is ready for approval.'
            : `It is ${requisitionStatusLabel(mr.status).toLowerCase()} — not waiting for approval.`,
      };
    }
    return { icon: 'info', text: 'No decision is due from you right now.' };
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const res = await lastValueFrom(this.service.getRequisitionById(id));
      this.mr.set(res.data);
    } catch (err) {
      const status = (err as HttpErrorResponse)?.status;
      this.loadError.set(
        status === 404 ? 'This requisition could not be found. It may have been deleted.'
          : status === 403 ? 'You do not have access to this requisition.'
          : 'Unable to load the requisition. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected async decide(event: RequisitionDecisionSubmit): Promise<void> {
    const mr = this.mr();
    if (!mr || this.busy()) return;
    this.busy.set(true);
    try {
      const request = { decision: event.decision, comments: event.comments || undefined };
      const res = await lastValueFrom(this.reviewing()
        ? this.service.reviewRequisition(mr.id, request)
        : this.service.approveRequisition(mr.id, request));
      this.mr.set(res.data);
      this.done.set(event.decision);
      this.snack.open(this.outcomeMessage(res.data), 'OK', { duration: 5000 });
    } catch (err) {
      const e = err as HttpErrorResponse;
      const m = e?.error?.message;
      const text = Array.isArray(m) ? m.join(' ') : m;
      this.snack.open(typeof text === 'string' && text ? text : 'Your decision could not be recorded.', 'Close', {
        duration: 6000, panelClass: ['error-snackbar'],
      });
    } finally {
      this.busy.set(false);
    }
  }

  private outcomeMessage(mr: MaterialRequisition): string {
    switch (mr.status) {
      case MaterialRequisitionStatus.REVIEWED: return `${mr.mrNumber} reviewed — the approvers have been notified.`;
      case MaterialRequisitionStatus.APPROVED: return `${mr.mrNumber} approved — everyone involved has been notified.`;
      case MaterialRequisitionStatus.RETURNED: return `${mr.mrNumber} returned to the requester for clarification.`;
      case MaterialRequisitionStatus.REJECTED: return `${mr.mrNumber} rejected.`;
      case MaterialRequisitionStatus.CANCELLED: return `${mr.mrNumber} cancelled.`;
      default: return 'Your decision has been recorded.';
    }
  }

  /** Opens the wizard; saving there brings the reviewer back here. */
  protected edit(): void {
    const id = this.mr()?.id;
    if (id) void this.router.navigate(['/material-requisitions', id, 'edit'], { queryParams: { returnTo: 'review' } });
  }

  protected backToInbox(): void {
    void this.router.navigate(['/material-requisitions', this.reviewing() ? 'reviews' : 'approvals']);
  }

  protected viewFull(): void {
    const id = this.mr()?.id;
    if (id) void this.router.navigate(['/material-requisitions', id]);
  }

  protected statusClass(status: string): string {
    return `status-chip status-chip--${status.toLowerCase().replace('_', '-')}`;
  }

  protected statusText(status: string): string {
    return requisitionStatusLabel(status);
  }
}
