import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VendorFormService } from '../../services/vendor-form.service';
import { VendorFileUploadComponent } from '../vendor-file-upload/vendor-file-upload.component';
import { firstErrorMessage } from '../../validators/vendor.validators';

/**
 * Step 7 — Quality, HSE & Compliance.
 *
 * Certifications are modelled as child records rather than free text so that
 * expiry dates can drive re-qualification later; the API derives isExpired and
 * daysToExpiry from them on read.
 */
@Component({
  selector: 'app-vendor-quality-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatDatepickerModule, MatNativeDateModule, MatButtonModule, MatIconModule,
    MatTooltipModule, VendorFileUploadComponent,
  ],
  templateUrl: './vendor-quality-step.component.html',
  styleUrl: '../vendor-step.shared.scss',
})
export class VendorQualityStepComponent {
  protected readonly formService = inject(VendorFormService);

  readonly readonly = input(false);

  protected get group(): FormGroup {
    return this.formService.group('quality');
  }

  protected get certifications(): FormArray {
    return this.formService.certifications;
  }

  protected certificationGroup(index: number): FormGroup {
    return this.certifications.at(index) as FormGroup;
  }

  protected control(path: string): FormControl {
    return this.group.get(path) as FormControl;
  }

  protected certificationDocControl(index: number): FormControl {
    return this.certificationGroup(index).get('documentUrl') as FormControl;
  }

  protected err(control: string, label: string): string {
    return firstErrorMessage(this.group.get(control), label);
  }

  protected rowErr(index: number, control: string, label: string): string {
    return firstErrorMessage(this.certificationGroup(index).get(control), label);
  }

  protected expiryBeforeIssue(index: number): boolean {
    const group = this.certificationGroup(index);
    return !!group.errors?.['expiryBeforeIssue'] && group.touched;
  }

  protected addCertification(): void {
    this.formService.addCertification();
  }

  protected removeCertification(index: number): void {
    this.formService.removeCertification(index);
  }
}
