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
import { PACKAGING_TYPE_OPTIONS, TRANSPORT_MODE_OPTIONS } from '../../models/material.model';

/** Step 8 — Logistics & Packaging. */
@Component({
  selector: 'app-material-logistics-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatSlideToggleModule, MatTooltipModule,
  ],
  templateUrl: './material-logistics-step.component.html',
  styleUrl: '../material-step.shared.scss',
})
export class MaterialLogisticsStepComponent {
  protected readonly formService = inject(MaterialFormService);
  readonly readonly = input(false);

  protected readonly packagingOptions = PACKAGING_TYPE_OPTIONS;
  protected readonly transportOptions = TRANSPORT_MODE_OPTIONS;

  protected get group(): FormGroup {
    return this.formService.group('logistics');
  }

  protected err(controlName: string): string {
    const control = this.group.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['min']) return `Must be ${control.errors['min'].min} or greater`;
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    return '';
  }
}
