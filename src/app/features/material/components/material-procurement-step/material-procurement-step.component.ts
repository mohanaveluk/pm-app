import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MaterialFormService } from '../../services/material-form.service';

/**
 * Step 3 — Procurement Data.
 *
 * Preferred Vendor and Purchase UOM are database-derived: the API stores
 * `preferredVendorId` / `purchaseUomId` as forward references, but no Vendor
 * Master exists yet and there is no endpoint to resolve a vendor name. Rather
 * than invent one, the vendor field is rendered disabled with an explicit
 * "populated from the Approved Vendor List" note. Purchase UOM is selectable
 * because the UOM master does exist.
 */
@Component({
  selector: 'app-material-procurement-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatTooltipModule,
  ],
  templateUrl: './material-procurement-step.component.html',
  styleUrl: '../material-step.shared.scss',
})
export class MaterialProcurementStepComponent {
  protected readonly formService = inject(MaterialFormService);
  readonly readonly = input(false);

  protected get group(): FormGroup {
    return this.formService.group('procurement');
  }

  protected err(controlName: string): string {
    const control = this.group.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['min']) return 'Must be 0 or greater';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    return '';
  }
}
