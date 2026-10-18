import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, lastValueFrom } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import {
  APPROVER_EDITABLE_STATUSES, MaterialRequisition, MaterialRequisitionStatus, REVIEWER_EDITABLE_STATUSES,
  RequisitionParticipantRole, RequisitionUserOption, requisitionStatusLabel,
} from '../../models/material-requisition.model';
import { UpdateRequisitionParticipantsRequest } from '../../models/material-requisition-request.model';
import { RequisitionUserPickerComponent } from '../requisition-user-picker/requisition-user-picker.component';

export interface RequisitionParticipantsDialogData {
  requisitionId: string;
  mrNumber: string;
}

/** The updated requisition, or undefined when nothing was saved. */
export type RequisitionParticipantsDialogResult = MaterialRequisition | undefined;

/**
 * Change who reviews and who approves a requisition, from the list. Reviewers
 * can change until it is reviewed, approvers until it is approved; the API's
 * permissions say which of the two this user may change right now.
 */
@Component({
  selector: 'app-requisition-participants-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    RequisitionUserPickerComponent,
  ],
  templateUrl: './requisition-participants-dialog.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class RequisitionParticipantsDialogComponent implements OnInit {
  private readonly service = inject(MaterialRequisitionService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<RequisitionParticipantsDialogComponent, RequisitionParticipantsDialogResult>);
  protected readonly data = inject<RequisitionParticipantsDialogData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly mr = signal<MaterialRequisition | null>(null);
  protected readonly options = signal<RequisitionUserOption[]>([]);

  protected readonly reviewerIds = signal<string[]>([]);
  protected readonly approverIds = signal<string[]>([]);
  private initialReviewers: string[] = [];
  private initialApprovers: string[] = [];

  /** Users to offer, plus anyone already assigned who is no longer active. */
  protected readonly allOptions = computed<RequisitionUserOption[]>(() => {
    const opts = this.options();
    const assigned = (this.mr()?.participants ?? [])
      .filter((p) => !opts.some((o) => o.id === p.userId))
      .map((p) => ({ id: p.userId, name: p.userName, email: p.userEmail, position: null, role: null }));
    return [...assigned, ...opts];
  });

  protected readonly reviewersLocked = computed(() => !this.mr()?.permissions?.canEditReviewers);
  protected readonly approversLocked = computed(() => !this.mr()?.permissions?.canEditApprovers);

  protected readonly reviewersLockedReason = computed(() => this.lockReason(REVIEWER_EDITABLE_STATUSES, 'reviewed'));
  protected readonly approversLockedReason = computed(() => this.lockReason(APPROVER_EDITABLE_STATUSES, 'approved'));

  protected readonly statusText = computed(() => requisitionStatusLabel(this.mr()?.status ?? null));

  protected readonly dirty = computed(() =>
    !this.sameList(this.reviewerIds(), this.initialReviewers) || !this.sameList(this.approverIds(), this.initialApprovers));

  /** What stops saving, if anything. */
  protected readonly problem = computed(() => {
    const mr = this.mr();
    if (!mr || mr.status === MaterialRequisitionStatus.DRAFT) return null;
    if (!this.reviewersLocked() && !this.reviewerIds().length) return 'Keep at least one reviewer.';
    if (!this.approversLocked() && !this.approverIds().length) return 'Keep at least one approver.';
    return null;
  });

  protected readonly editable = computed(() => !this.reviewersLocked() || !this.approversLocked());

  ngOnInit(): void {
    forkJoin({
      mr: this.service.getRequisitionById(this.data.requisitionId),
      users: this.service.getParticipantOptions(),
    }).subscribe({
      next: ({ mr, users }) => {
        this.mr.set(mr.data);
        this.options.set(users.data ?? []);
        this.initialReviewers = this.idsOf(mr.data, RequisitionParticipantRole.REVIEWER);
        this.initialApprovers = this.idsOf(mr.data, RequisitionParticipantRole.APPROVER);
        this.reviewerIds.set([...this.initialReviewers]);
        this.approverIds.set([...this.initialApprovers]);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Unable to load the requisition or the users. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected async save(): Promise<void> {
    if (this.saving() || this.problem() || !this.dirty()) return;
    const request: UpdateRequisitionParticipantsRequest = {};
    if (!this.reviewersLocked() && !this.sameList(this.reviewerIds(), this.initialReviewers)) {
      request.reviewerIds = this.reviewerIds();
    }
    if (!this.approversLocked() && !this.sameList(this.approverIds(), this.initialApprovers)) {
      request.approverIds = this.approverIds();
    }

    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.updateParticipants(this.data.requisitionId, request));
      this.snack.open(this.savedMessage(res.data), 'OK', { duration: 4000 });
      this.dialogRef.close(res.data);
    } catch (err) {
      const m = (err as HttpErrorResponse)?.error?.message;
      const text = Array.isArray(m) ? m.join(' ') : m;
      this.snack.open(typeof text === 'string' && text ? text : 'The reviewers and approvers could not be saved.', 'Close', {
        duration: 6000, panelClass: ['error-snackbar'],
      });
    } finally {
      this.saving.set(false);
    }
  }

  protected cancel(): void {
    this.dialogRef.close(undefined);
  }

  private savedMessage(mr: MaterialRequisition): string {
    const before = this.mr()?.status;
    if (before !== mr.status && mr.status === MaterialRequisitionStatus.REVIEWED) {
      return `${mr.mrNumber}: everyone remaining has reviewed it — the approvers have been notified.`;
    }
    if (before !== mr.status && mr.status === MaterialRequisitionStatus.APPROVED) {
      return `${mr.mrNumber}: everyone remaining has approved it.`;
    }
    if (mr.status === MaterialRequisitionStatus.UNDER_REVIEW || mr.status === MaterialRequisitionStatus.REVIEWED) {
      return 'Reviewers and approvers updated — anyone added has been emailed.';
    }
    return 'Reviewers and approvers updated.';
  }

  private lockReason(editable: readonly MaterialRequisitionStatus[], verb: string): string | null {
    const mr = this.mr();
    if (!mr) return null;
    if (mr.lockedAt) return 'Locked — a purchase order has been raised.';
    if (!editable.includes(mr.status)) return `Locked — the requisition has been ${verb} (${requisitionStatusLabel(mr.status)}).`;
    return 'Only the requester can change these.';
  }

  private idsOf(mr: MaterialRequisition, role: RequisitionParticipantRole): string[] {
    return mr.participants
      .filter((p) => p.role === role)
      .sort((a, b) => a.sequence - b.sequence)
      .map((p) => p.userId);
  }

  private sameList(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
}
