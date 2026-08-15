import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MaterialFormService } from '../../services/material-form.service';
import { HAZARDOUS_CLASSES, HAZARD_OPTIONS } from '../../models/material.model';

/**
 * Step 7 — Safety, Compliance & Handling.
 *
 * Selecting a hazardous classification surfaces a single amber caution banner
 * prompting for MSDS and PPE details. Deliberately restrained: one banner, no
 * red-on-red, so genuine hazards still stand out.
 */
@Component({
  selector: 'app-material-safety-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatTooltipModule,
  ],
  templateUrl: './material-safety-step.component.html',
  styleUrl: '../material-step.shared.scss',
})
export class MaterialSafetyStepComponent {
  protected readonly formService = inject(MaterialFormService);
  readonly readonly = input(false);

  protected readonly hazardOptions = HAZARD_OPTIONS;

  protected get group(): FormGroup {
    return this.formService.group('safety');
  }

  private readonly hazardValue = toSignal(
    this.formService.group('safety').get('hazardClassification')!.valueChanges,
    { initialValue: this.formService.group('safety').get('hazardClassification')!.value as string | null },
  );

  protected readonly isHazardous = computed(() => {
    const value = this.hazardValue();
    return !!value && HAZARDOUS_CLASSES.has(value);
  });

  protected err(controlName: string): string {
    const control = this.group.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    return '';
  }
}
