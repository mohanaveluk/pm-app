import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RequisitionParticipantRole } from '../models/material-requisition.model';
import { RequisitionDecisionPageComponent } from '../components/requisition-decision-page/requisition-decision-page.component';

/**
 * Material Requisition Review — an assigned reviewer reads the requisition,
 * may edit it, and records Reviewed, Return for Clarification, Reject or
 * Cancel with comments. Route: /material-requisitions/reviews/:id
 */
@Component({
  selector: 'app-material-requisition-review',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RequisitionDecisionPageComponent],
  template: `<app-requisition-decision-page [role]="role" />`,
})
export class MaterialRequisitionReviewComponent {
  protected readonly role = RequisitionParticipantRole.REVIEWER;
}
