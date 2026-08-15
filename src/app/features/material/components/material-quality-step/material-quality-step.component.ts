import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MaterialFormService } from '../../services/material-form.service';
import { INSPECTION_TYPE_OPTIONS } from '../../models/material.model';

/**
 * Step 5 — Quality & Inspection. Turning on "Calibration Required" makes the
 * interval mandatory (enforced by `calibrationValidator` on the group).
 */
@Component({
  selector: 'app-material-quality-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatSlideToggleModule, MatTooltipModule,
  ],
  templateUrl: './material-quality-step.component.html',
  styleUrl: '../material-step.shared.scss',
})
export class MaterialQualityStepComponent {
  protected readonly formService = inject(MaterialFormService);
  readonly readonly = input(false);

  protected readonly inspectionOptions = INSPECTION_TYPE_OPTIONS;

  protected get group(): FormGroup {
    return this.formService.group('quality');
  }

  protected get calibrationRequired(): boolean {
    return this.group.get('calibrationRequired')?.value === true;
  }

  protected get calibrationIntervalMissing(): boolean {
    return this.group.hasError('calibrationInterval') && this.group.touched;
  }

  protected err(controlName: string): string {
    const control = this.group.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['min']) return `Must be ${control.errors['min'].min} or greater`;
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    return '';
  }
}
