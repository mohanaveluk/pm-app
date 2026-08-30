import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VendorFormService } from '../../services/vendor-form.service';
import { COMPLIANCE_STANDARD_SUGGESTIONS } from '../../models/vendor.model';
import { firstErrorMessage } from '../../validators/vendor.validators';

/**
 * Step 6 — Technical Capability.
 *
 * Material categories moved to the Identification step, where the vendor's
 * supply scope is decided. What remains here is the narrative capability the
 * API stores as free text, plus service categories and compliance standards.
 */
@Component({
  selector: 'app-vendor-technical-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatChipsModule, MatTooltipModule,
  ],
  templateUrl: './vendor-technical-step.component.html',
  styleUrl: '../vendor-step.shared.scss',
})
export class VendorTechnicalStepComponent {
  protected readonly formService = inject(VendorFormService);

  readonly readonly = input(false);

  protected readonly standardSuggestions = COMPLIANCE_STANDARD_SUGGESTIONS;

  protected get group(): FormGroup {
    return this.formService.group('technical');
  }

  protected err(control: string, label: string): string {
    return firstErrorMessage(this.group.get(control), label);
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

  /** Appends the standard to the free-text compliance field. */
  protected addStandard(standard: string): void {
    const control = this.group.get('complianceStandards');
    const current = (control?.value as string ?? '').trim();
    if (current.split(/,\s*/).includes(standard)) return;
    control?.setValue(current ? `${current}, ${standard}` : standard);
    control?.markAsDirty();
  }
}
