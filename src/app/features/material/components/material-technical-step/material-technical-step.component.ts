import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MaterialFormService } from '../../services/material-form.service';

/**
 * Step 2 — Technical Specifications. No mandatory fields, so the stepper lets the
 * user pass straight through.
 *
 * Fields are grouped into Identification / Manufacturer / Physical / Operating /
 * Certification rather than one long column. Category-specific attributes (pipe
 * schedule, valve class, IP rating, …) belong to a future Material Classification
 * module: this section deliberately carries only what the current API stores, and
 * the section-per-card layout leaves room to slot a dynamic-attributes card in
 * later without disturbing the rest.
 */
@Component({
  selector: 'app-material-technical-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatTooltipModule,
  ],
  templateUrl: './material-technical-step.component.html',
  styleUrl: '../material-step.shared.scss',
})
export class MaterialTechnicalStepComponent {
  protected readonly formService = inject(MaterialFormService);
  readonly readonly = input(false);

  protected get group(): FormGroup {
    return this.formService.group('technical');
  }

  protected err(controlName: string): string {
    const control = this.group.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    return '';
  }
}
