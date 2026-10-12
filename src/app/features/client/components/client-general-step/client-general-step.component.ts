import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { COUNTRIES } from '../../../../shared/reference/countries';
import { ClientFormService } from '../../services/client-form.service';

/**
 * Step 1 — the only step with mandatory fields (name and client type), so it
 * gates progression while a client is being created. Kept compact on purpose:
 * everything else is optional and lives in the later steps.
 */
@Component({
  selector: 'app-client-general-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterLink, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './client-general-step.component.html',
  styleUrl: '../client-step.shared.scss',
})
export class ClientGeneralStepComponent {
  protected readonly formService = inject(ClientFormService);

  /** The client being edited, so it can be left out of its own parent list. */
  readonly clientId = input<string | null>(null);

  protected readonly countries = COUNTRIES;

  protected readonly industrySearch = signal('');
  protected readonly parentSearch = signal('');

  protected get group(): FormGroup {
    return this.formService.group('general');
  }

  protected readonly visibleIndustries = computed(() => {
    const term = this.industrySearch().trim().toLowerCase();
    const all = this.formService.industries();
    return term
      ? all.filter((i) => i.name.toLowerCase().includes(term) || i.code.toLowerCase().includes(term))
      : all;
  });

  /** Any active client except this one — the backend also rejects cycles. */
  protected readonly visibleParents = computed(() => {
    const term = this.parentSearch().trim().toLowerCase();
    const self = this.clientId();
    const all = this.formService.parentOptions().filter((c) => c.id !== self);
    return term
      ? all.filter((c) =>
          c.clientName.toLowerCase().includes(term)
          || c.code.toLowerCase().includes(term)
          || (c.displayName ?? '').toLowerCase().includes(term))
      : all;
  });

  protected readonly noClientTypes = computed(
    () => !this.formService.referenceLoading() && this.formService.clientTypes().length === 0,
  );

  protected err(controlName: string): string {
    const control = this.group.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['required']) {
      return controlName === 'clientTypeId' ? 'Select a client type' : 'This field is required';
    }
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    if (control.errors['pattern']) {
      switch (controlName) {
        case 'website': return 'Enter a valid website, e.g. www.example.com';
        default: return 'Invalid format';
      }
    }
    return '';
  }
}
