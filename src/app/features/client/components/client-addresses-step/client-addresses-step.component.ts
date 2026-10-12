import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { COUNTRIES } from '../../../../shared/reference/countries';
import { LANGUAGE_OPTIONS, timeZoneOptions } from '../../models/client.model';
import { ClientFormService } from '../../services/client-form.service';

/**
 * Step 2 — the registered office, plus any number of operational offices when
 * the operational address differs from the registered one, and the client's
 * regional settings.
 *
 * Both kinds of office share one address structure; only their role differs.
 */
@Component({
  selector: 'app-client-addresses-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatSlideToggleModule, MatTooltipModule,
  ],
  templateUrl: './client-addresses-step.component.html',
  styleUrl: '../client-step.shared.scss',
})
export class ClientAddressesStepComponent {
  protected readonly formService = inject(ClientFormService);

  protected readonly countries = COUNTRIES;
  protected readonly languages = LANGUAGE_OPTIONS;
  protected readonly timeZones = timeZoneOptions();
  protected readonly timeZoneSearch = signal('');

  protected get group(): FormGroup {
    return this.formService.group('addresses');
  }

  protected get registered(): FormGroup {
    return this.formService.registeredAddress;
  }

  protected get operational(): FormGroup[] {
    return this.formService.operationalAddresses.controls;
  }

  private readonly sameAsRegisteredValue = toSignal(
    this.group.get('operationalAddressSameAsRegistered')!.valueChanges,
    { initialValue: this.group.get('operationalAddressSameAsRegistered')!.value as boolean },
  );

  protected readonly sameAsRegistered = computed(() => this.sameAsRegisteredValue());

  protected readonly visibleTimeZones = computed(() => {
    const term = this.timeZoneSearch().trim().toLowerCase();
    return term ? this.timeZones.filter((z) => z.toLowerCase().includes(term)) : this.timeZones;
  });

  protected addOffice(): void {
    this.formService.addOperationalAddress();
  }

  protected removeOffice(index: number): void {
    this.formService.removeOperationalAddress(index);
  }

  /** Switching "same as registered" on does not discard offices until the step is saved. */
  protected get hasOperationalOffices(): boolean {
    return this.operational.length > 0;
  }

  protected officeTitle(group: FormGroup, index: number): string {
    const label = (group.get('label')?.value as string)?.trim();
    return label || `Operational Office ${index + 1}`;
  }
}
