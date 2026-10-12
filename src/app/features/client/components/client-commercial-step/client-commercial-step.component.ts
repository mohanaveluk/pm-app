import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PAYMENT_TERMS_OPTIONS } from '../../../vendor/models/vendor.model';
import {
  CURRENCY_OPTIONS, DATE_FORMAT_OPTIONS, INCOTERM_OPTIONS, LEGAL_ENTITY_TYPE_OPTIONS,
} from '../../models/client.model';
import { ClientFormService } from '../../services/client-form.service';

/**
 * Step 4 — legal, commercial and contracting information. Every field is
 * optional: registration and tax identifiers are not required for every
 * country or organization type, so nothing here blocks progress.
 */
@Component({
  selector: 'app-client-commercial-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatTooltipModule,
  ],
  templateUrl: './client-commercial-step.component.html',
  styleUrl: '../client-step.shared.scss',
})
export class ClientCommercialStepComponent {
  protected readonly formService = inject(ClientFormService);

  protected readonly legalTypes = LEGAL_ENTITY_TYPE_OPTIONS;
  protected readonly currencies = CURRENCY_OPTIONS;
  protected readonly paymentTerms = PAYMENT_TERMS_OPTIONS;
  protected readonly incoterms = INCOTERM_OPTIONS;
  protected readonly dateFormats = DATE_FORMAT_OPTIONS;

  protected readonly currencySearch = signal('');

  protected get group(): FormGroup {
    return this.formService.group('commercial');
  }

  protected readonly visibleCurrencies = computed(() => {
    const term = this.currencySearch().trim().toLowerCase();
    return term
      ? this.currencies.filter((c) => c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term))
      : this.currencies;
  });

  protected err(controlName: string): string {
    const control = this.group.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    if (control.errors['pattern']) return 'Use letters, digits and - . / only (3–50 characters)';
    return '';
  }
}
