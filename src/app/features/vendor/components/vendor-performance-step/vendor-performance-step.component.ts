import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VendorFormService } from '../../services/vendor-form.service';
import { COUNTRIES, countryName } from '../../../../shared/reference/countries';
import { VendorPerformance } from '../../models/vendor.model';

/**
 * Step 8 — Performance History.
 *
 * These are the vendor's own declared credentials, captured at registration.
 * Scored performance is a separate, append-only child collection written by
 * project and procurement workflows — this screen shows it read-only when the
 * vendor already exists.
 */
@Component({
  selector: 'app-vendor-performance-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatChipsModule, MatTooltipModule,
  ],
  templateUrl: './vendor-performance-step.component.html',
  styleUrl: '../vendor-step.shared.scss',
})
export class VendorPerformanceStepComponent {
  protected readonly formService = inject(VendorFormService);

  readonly readonly = input(false);
  /** Scored evaluations recorded against this vendor, when it already exists. */
  readonly performanceHistory = input<VendorPerformance[]>([]);

  protected readonly countries = COUNTRIES;

  protected get group(): FormGroup {
    return this.formService.group('performance');
  }

  protected values(control: string): string[] {
    return (this.group.get(control)?.value as string[]) ?? [];
  }

  protected addValue(control: string, raw: string): void {
    const value = raw.trim();
    if (!value || this.values(control).includes(value)) return;
    this.group.get(control)?.setValue([...this.values(control), value]);
    this.group.markAsDirty();
  }

  protected addFromChipInput(control: string, event: MatChipInputEvent): void {
    this.addValue(control, event.value ?? '');
    event.chipInput?.clear();
  }

  protected removeValue(control: string, value: string): void {
    this.group.get(control)?.setValue(this.values(control).filter((v) => v !== value));
    this.group.markAsDirty();
  }

  protected country(code: string): string {
    return countryName(code);
  }

  protected get unusedCountries(): { code: string; name: string; flag: string }[] {
    const chosen = this.values('geographicalExperience');
    return this.countries.filter((c) => !chosen.includes(c.code));
  }
}
