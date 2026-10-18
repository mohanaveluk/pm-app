import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RequisitionParticipantRole } from '../models/material-requisition.model';
import { RequisitionInboxComponent } from '../components/requisition-inbox/requisition-inbox.component';

/**
 * The requisitions assigned to the signed-in user for review — by default those
 * still waiting for their review. Route: /material-requisitions/reviews
 */
@Component({
  selector: 'app-material-requisition-review-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RequisitionInboxComponent],
  template: `<app-requisition-inbox [role]="role" />`,
})
export class MaterialRequisitionReviewListComponent {
  protected readonly role = RequisitionParticipantRole.REVIEWER;
}
