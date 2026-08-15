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
 * Step 6 — Accounting & Valuation.
 *
 * Prices are stored as DECIMAL(18,4) server-side. Inputs use `step="0.0001"` and
 * values are passed through as-is; no client-side rounding or float arithmetic is
 * performed, so the four stored decimal places survive the round trip intact.
 */
@Component({
  selector: 'app-material-accounting-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatTooltipModule,
  ],
  templateUrl: './material-accounting-step.component.html',
  styleUrl: '../material-step.shared.scss',
})
export class MaterialAccountingStepComponent {
  protected readonly formService = inject(MaterialFormService);
  readonly readonly = input(false);

  /** Free-text on the backend (VARCHAR 50); these are the conventional values. */
  protected readonly valuationTypes = ['MOVING_AVERAGE', 'STANDARD', 'FIFO', 'LIFO', 'BATCH'];

  protected get group(): FormGroup {
    return this.formService.group('accounting');
  }

  /** Currency captured on the Procurement step; echoed here so prices have context. */
  protected get currency(): string {
    return (this.formService.group('procurement').get('currency')?.value as string) || '';
  }

  protected err(controlName: string): string {
    const control = this.group.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['min']) return 'Must be 0 or greater';
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    return '';
  }
}
