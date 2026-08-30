import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { VendorFormService } from '../../services/vendor-form.service';
import { OptionSearch } from '../../utils/option-search';
import { DELIVERY_CAPABILITY_OPTIONS, TRANSPORT_MODE_OPTIONS } from '../../models/vendor.model';
import { firstErrorMessage } from '../../validators/vendor.validators';

/**
 * Step 9 — Logistics & Supply Chain.
 *
 * Transport modes reuse the Material Master's TransportationMode vocabulary
 * rather than declaring a second, divergent copy of the same domain terms.
 */
@Component({
  selector: 'app-vendor-logistics-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatRadioModule, MatSlideToggleModule, MatIconModule, MatChipsModule,
  ],
  templateUrl: './vendor-logistics-step.component.html',
  styleUrl: '../vendor-step.shared.scss',
})
export class VendorLogisticsStepComponent {
  protected readonly formService = inject(VendorFormService);

  /** Inline search state for this step's dropdowns. */
  protected readonly optionSearch = new OptionSearch();

  readonly readonly = input(false);

  protected readonly deliveryOptions = DELIVERY_CAPABILITY_OPTIONS;
  protected readonly transportOptions = TRANSPORT_MODE_OPTIONS;

  protected get group(): FormGroup {
    return this.formService.group('logistics');
  }

  protected err(control: string, label: string): string {
    return firstErrorMessage(this.group.get(control), label);
  }

  protected get warehouses(): string[] {
    return (this.group.get('warehouseLocations')?.value as string[]) ?? [];
  }

  protected addWarehouse(event: MatChipInputEvent): void {
    const value = (event.value ?? '').trim();
    event.chipInput?.clear();
    if (!value || this.warehouses.includes(value)) return;
    this.group.get('warehouseLocations')?.setValue([...this.warehouses, value]);
    this.group.markAsDirty();
  }

  protected removeWarehouse(location: string): void {
    this.group.get('warehouseLocations')?.setValue(this.warehouses.filter((w) => w !== location));
    this.group.markAsDirty();
  }
}
