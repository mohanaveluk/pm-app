import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VendorFormService } from '../../services/vendor-form.service';
import { VendorFileUploadComponent } from '../vendor-file-upload/vendor-file-upload.component';
import { firstErrorMessage } from '../../validators/vendor.validators';

/**
 * Step 5 — Financial & Commercial.
 *
 * Turnover is a child collection (vendor_turnovers): three rows by default,
 * each needing a year, an amount and a currency before the API will accept it.
 * Like the other child collections it is create-time only.
 */
@Component({
  selector: 'app-vendor-financial-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatCheckboxModule, MatChipsModule,
    MatTooltipModule, VendorFileUploadComponent,
  ],
  templateUrl: './vendor-financial-step.component.html',
  styleUrl: '../vendor-step.shared.scss',
})
export class VendorFinancialStepComponent {
  protected readonly formService = inject(VendorFormService);

  readonly readonly = input(false);

  protected get group(): FormGroup {
    return this.formService.group('financial');
  }

  protected get turnovers(): FormArray {
    return this.formService.turnovers;
  }

  protected turnoverGroup(index: number): FormGroup {
    return this.turnovers.at(index) as FormGroup;
  }

  protected control(path: string): FormControl {
    return this.group.get(path) as FormControl;
  }

  protected err(control: string, label: string): string {
    return firstErrorMessage(this.group.get(control), label);
  }

  protected rowErr(index: number, control: string, label: string): string {
    return firstErrorMessage(this.turnoverGroup(index).get(control), label);
  }

  protected get contractReferences(): string[] {
    return (this.group.get('contractReferenceNumbers')?.value as string[]) ?? [];
  }

  protected addContractReference(event: MatChipInputEvent): void {
    const value = (event.value ?? '').trim();
    event.chipInput?.clear();
    if (!value || this.contractReferences.includes(value)) return;
    this.group.get('contractReferenceNumbers')?.setValue([...this.contractReferences, value]);
    this.group.markAsDirty();
  }

  protected removeContractReference(reference: string): void {
    this.group.get('contractReferenceNumbers')?.setValue(
      this.contractReferences.filter((r) => r !== reference),
    );
    this.group.markAsDirty();
  }

  protected addTurnover(): void {
    this.formService.addTurnover();
  }

  protected removeTurnover(index: number): void {
    this.formService.removeTurnover(index);
  }

  protected turnoverStatementControl(index: number): FormControl {
    return this.turnoverGroup(index).get('financialStatementUrl') as FormControl;
  }
}
