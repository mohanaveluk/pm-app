import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VendorFormService } from '../../services/vendor-form.service';
import { OptionSearch } from '../../utils/option-search';
import {
  REVIEW_CYCLE_OPTIONS, RISK_CATEGORY_OPTIONS, VENDOR_CLASSIFICATION_OPTIONS,
  VendorEvaluation, enumLabel,
} from '../../models/vendor.model';
import { firstErrorMessage } from '../../validators/vendor.validators';

/**
 * Step 11 — Internal Evaluation & Approval.
 *
 * Two things this step deliberately does not do:
 *
 *  • It does not approve the vendor. Filling this in records a pre-qualification
 *    summary; the API always creates a vendor as UNDER_EVALUATION with
 *    isActive=false, and only the enable endpoint makes it selectable.
 *  • It does not submit per-stage approvals. The evaluation trail
 *    (technical / commercial / HSE / final) is read-only over
 *    GET /vendors/:id/evaluations — no endpoint accepts a new decision yet, so
 *    the trail is displayed rather than edited.
 */
@Component({
  selector: 'app-vendor-evaluation-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatRadioModule, MatDatepickerModule, MatNativeDateModule,
    MatIconModule, MatTooltipModule,
  ],
  templateUrl: './vendor-evaluation-step.component.html',
  styleUrl: '../vendor-step.shared.scss',
})
export class VendorEvaluationStepComponent {
  protected readonly formService = inject(VendorFormService);

  /** Inline search state for this step's dropdowns. */
  protected readonly optionSearch = new OptionSearch();

  readonly readonly = input(false);
  /** False when the user lacks the approve permission — scores stay visible, entry does not. */
  readonly canApprove = input(false);
  readonly evaluations = input<VendorEvaluation[]>([]);

  protected readonly riskOptions = RISK_CATEGORY_OPTIONS;
  protected readonly classificationOptions = VENDOR_CLASSIFICATION_OPTIONS;
  protected readonly reviewCycleOptions = REVIEW_CYCLE_OPTIONS;

  protected get group(): FormGroup {
    return this.formService.group('evaluation');
  }

  protected err(control: string, label: string): string {
    return firstErrorMessage(this.group.get(control), label);
  }

  protected label(value: string | null | undefined): string {
    return enumLabel(value);
  }

  /** Approval fields are locked unless the user actually holds the grant. */
  protected get approvalLocked(): boolean {
    return this.readonly() || !this.canApprove();
  }

  protected get reviewDateError(): boolean {
    return !!this.group.errors?.['reviewBeforeApproval'] && this.group.touched;
  }

  protected decisionClass(decision: string): string {
    switch (decision) {
      case 'APPROVED': return 'status-chip status-chip--active';
      case 'REJECTED': return 'status-chip status-chip--blacklisted';
      case 'ON_HOLD':
      case 'RETURNED': return 'status-chip status-chip--evaluation';
      default: return 'status-chip status-chip--inactive';
    }
  }
}
