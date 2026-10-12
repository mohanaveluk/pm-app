import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CURRENCY_OPTIONS, MEASUREMENT_SYSTEM_OPTIONS } from '../../models/client.model';
import { ClientFormService } from '../../services/client-form.service';

/**
 * Step 5 — defaults the Project Master reuses so users do not retype the same
 * choices for every project. They are only defaults: a project may override any
 * of them where its contract or execution plan requires something different.
 */
@Component({
  selector: 'app-client-defaults-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatSlideToggleModule, MatTooltipModule,
  ],
  templateUrl: './client-defaults-step.component.html',
  styleUrl: '../client-step.shared.scss',
})
export class ClientDefaultsStepComponent {
  protected readonly formService = inject(ClientFormService);

  protected readonly currencies = CURRENCY_OPTIONS;
  protected readonly measurementSystems = MEASUREMENT_SYSTEM_OPTIONS;
  protected readonly currencySearch = signal('');

  protected get group(): FormGroup {
    return this.formService.group('defaults');
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
    if (control.errors['pattern']) return 'Enter a valid URL, e.g. https://portal.example.com';
    return '';
  }
}
