import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RequisitionParticipantRole } from '../models/material-requisition.model';
import { RequisitionDecisionPageComponent } from '../components/requisition-decision-page/requisition-decision-page.component';

/**
 * Material Requisition Approval — an assigned approver reads the reviewed
 * requisition and its review comments (no editing) and records Approve,
 * Return for Clarification, Reject or Cancel with comments.
 * Route: /material-requisitions/approvals/:id
 */
@Component({
  selector: 'app-material-requisition-approval',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RequisitionDecisionPageComponent],
  template: `<app-requisition-decision-page [role]="role" />`,
})
export class MaterialRequisitionApprovalComponent {
  protected readonly role = RequisitionParticipantRole.APPROVER;
}
