import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VendorFormService } from '../../services/vendor-form.service';
import { OptionSearch } from '../../utils/option-search';
import { COUNTRIES } from '../../../../shared/reference/countries';
import { VENDOR_ADDRESS_TYPE_OPTIONS, VendorAddressType } from '../../models/vendor.model';
import { firstErrorMessage } from '../../validators/vendor.validators';

/**
 * Step 2 — Contact Information.
 *
 * Phone numbers are captured as country code + number and joined by the mapper;
 * the flag is display-only and never reaches the API, which stores one string.
 *
 * Addresses are a repeatable child collection (vendor_addresses), not three
 * fixed slots: `addressType` spans REGISTERED, CORPORATE, FACTORY, WORKSHOP,
 * WAREHOUSE, BRANCH and SITE_OFFICE, and a vendor may hold several of any of
 * them. Rows are editable in both create and edit mode — the API's update path
 * replaces the collection transactionally.
 */
@Component({
  selector: 'app-vendor-contact-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatCheckboxModule, MatButtonModule, MatIconModule, MatTooltipModule,
  ],
  templateUrl: './vendor-contact-step.component.html',
  styleUrl: '../vendor-step.shared.scss',
})
export class VendorContactStepComponent {
  protected readonly formService = inject(VendorFormService);

  /** Inline search state for this step's dropdowns. */
  protected readonly optionSearch = new OptionSearch();

  readonly readonly = input(false);

  protected readonly countries = COUNTRIES;
  protected readonly addressTypeOptions = VENDOR_ADDRESS_TYPE_OPTIONS;

  protected get group(): FormGroup {
    return this.formService.group('contact');
  }

  protected get addresses(): FormArray {
    return this.formService.addresses;
  }

  protected addressGroup(index: number): FormGroup {
    return this.addresses.at(index) as FormGroup;
  }

  protected err(control: string, label: string): string {
    return firstErrorMessage(this.group.get(control), label);
  }

  protected rowErr(index: number, control: string, label: string): string {
    return firstErrorMessage(this.addressGroup(index).get(control), label);
  }

  /** Search keys are per row so two open dropdowns never share a filter. */
  protected countryKey(index: number): string {
    return `address-${index}`;
  }

  protected addAddress(): void {
    this.formService.addAddress(VendorAddressType.CORPORATE);
  }

  protected removeAddress(index: number): void {
    this.formService.removeAddress(index);
  }

  protected setPrimary(index: number): void {
    this.formService.setPrimaryAddress(index);
  }

  protected copyFromRegistered(index: number): void {
    this.formService.copyRegisteredAddressTo(index);
  }

  /** True for any row that is not itself the registered address. */
  protected canCopyFromRegistered(index: number): boolean {
    if (this.addressGroup(index).get('addressType')?.value === VendorAddressType.REGISTERED) return false;
    return this.addresses.controls.some(
      (control) => control.get('addressType')?.value === VendorAddressType.REGISTERED,
    );
  }

  protected addressLabel(index: number): string {
    const type = this.addressGroup(index).get('addressType')?.value as VendorAddressType;
    return this.addressTypeOptions.find((o) => o.value === type)?.label ?? 'Address';
  }
}
