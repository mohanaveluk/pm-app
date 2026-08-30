import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VendorFormService } from '../../services/vendor-form.service';
import { TAX_DOCUMENT_TYPE_OPTIONS, TaxDocumentType } from '../../models/vendor.model';
import { firstErrorMessage } from '../../validators/vendor.validators';

/**
 * Step 3 — Statutory & Legal.
 *
 * The tax regime is deliberately country-agnostic: GST is not universal, so the
 * enum spans the common regimes with an OTHER escape. Certificates themselves
 * are captured on the Quality & HSE step, where expiry dates live.
 */
@Component({
  selector: 'app-vendor-legal-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatRadioModule, MatIconModule, MatTooltipModule,
  ],
  templateUrl: './vendor-legal-step.component.html',
  styleUrl: '../vendor-step.shared.scss',
})
export class VendorLegalStepComponent {
  protected readonly formService = inject(VendorFormService);

  readonly readonly = input(false);

  protected readonly taxTypeOptions = TAX_DOCUMENT_TYPE_OPTIONS;

  protected get group(): FormGroup {
    return this.formService.group('legal');
  }

  protected err(control: string, label: string): string {
    return firstErrorMessage(this.group.get(control), label);
  }

  /** "Other" regimes must name themselves in the document number field. */
  protected get isOtherTaxType(): boolean {
    return this.group.get('taxDocumentType')?.value === TaxDocumentType.OTHER;
  }

  protected get otherTypeError(): boolean {
    return !!this.group.errors?.['taxTypeUnspecified'] && this.group.touched;
  }
}
