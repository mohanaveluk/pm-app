import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RequisitionFormService } from '../../services/requisition-form.service';
import { RequisitionUserPickerComponent } from '../requisition-user-picker/requisition-user-picker.component';

/**
 * Reviewers & Approvers step: who reviews the requisition, then who approves
 * it. Internal users only; the same person may hold both roles.
 */
@Component({
  selector: 'app-requisition-participants-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, RequisitionUserPickerComponent],
  templateUrl: './requisition-participants-step.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class RequisitionParticipantsStepComponent {
  protected readonly form = inject(RequisitionFormService);

  /** The chosen ids, in order — read from the form for the two pickers. */
  protected readonly reviewerIds = computed(() => (this.form.reviewerIdsValue() as string[] | null) ?? []);
  protected readonly approverIds = computed(() => (this.form.approverIdsValue() as string[] | null) ?? []);
}
