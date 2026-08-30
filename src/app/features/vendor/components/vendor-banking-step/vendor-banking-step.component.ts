import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VendorFormService } from '../../services/vendor-form.service';
import { OptionSearch } from '../../utils/option-search';
import {
  PAYMENT_METHOD_OPTIONS, PAYMENT_TERMS_OPTIONS, VendorBankAccount, maskAccount,
} from '../../models/vendor.model';
import { firstErrorMessage } from '../../validators/vendor.validators';

/**
 * Step 4 — Banking Information.
 *
 * One primary bank account plus the vendor-level commercial payment terms. The
 * account is a child record: the API writes it with the vendor and exposes no
 * bank-account update endpoint, so in edit mode existing accounts are listed
 * read-only and masked.
 *
 * Account number, IBAN and SWIFT are never echoed back from the server in
 * readable form unless the caller holds a sensitive-data role, so a masked
 * value is never written into an editable control — that would post
 * '••••1234' back as if it were real.
 */
@Component({
  selector: 'app-vendor-banking-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatButtonModule, MatTooltipModule,
  ],
  templateUrl: './vendor-banking-step.component.html',
  styleUrl: '../vendor-step.shared.scss',
})
export class VendorBankingStepComponent {
  protected readonly formService = inject(VendorFormService);

  /** Inline search state for this step's dropdowns. */
  protected readonly optionSearch = new OptionSearch();

  readonly readonly = input(false);
  /** Existing accounts, loaded in edit/view mode. */
  readonly existingAccounts = input<VendorBankAccount[]>([]);

  protected readonly paymentTermsOptions = PAYMENT_TERMS_OPTIONS;
  protected readonly paymentMethodOptions = PAYMENT_METHOD_OPTIONS;

  /** Account numbers are obscured until the user asks to check what they typed. */
  protected readonly revealTyped = signal(false);

  protected get group(): FormGroup {
    return this.formService.group('banking');
  }

  protected err(control: string, label: string): string {
    return firstErrorMessage(this.group.get(control), label);
  }

  protected mask(value: string | null | undefined): string {
    return maskAccount(value);
  }

  protected toggleReveal(): void {
    this.revealTyped.update((v) => !v);
  }

  protected get accountInputType(): string {
    return this.revealTyped() ? 'text' : 'password';
  }
}
