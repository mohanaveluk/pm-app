import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RequisitionParticipantRole } from '../models/material-requisition.model';
import { RequisitionInboxComponent } from '../components/requisition-inbox/requisition-inbox.component';

/**
 * The requisitions assigned to the signed-in user for approval — by default the
 * reviewed ones still waiting for their decision. Route: /material-requisitions/approvals
 */
@Component({
  selector: 'app-material-requisition-approval-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RequisitionInboxComponent],
  template: `<app-requisition-inbox [role]="role" />`,
})
export class MaterialRequisitionApprovalListComponent {
  protected readonly role = RequisitionParticipantRole.APPROVER;
}
