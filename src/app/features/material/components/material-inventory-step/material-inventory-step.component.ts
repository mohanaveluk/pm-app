import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MaterialFormService } from '../../services/material-form.service';
import { STOCKING_STRATEGY_OPTIONS } from '../../models/material.model';

/**
 * Step 4 — Inventory & Storage. Carries a cross-field rule: safety stock must not
 * exceed the maximum stock level (enforced by `stockRangeValidator` on the group).
 */
@Component({
  selector: 'app-material-inventory-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatTooltipModule,
  ],
  templateUrl: './material-inventory-step.component.html',
  styleUrl: '../material-step.shared.scss',
})
export class MaterialInventoryStepComponent {
  protected readonly formService = inject(MaterialFormService);
  readonly readonly = input(false);

  protected readonly stockingOptions = STOCKING_STRATEGY_OPTIONS;

  protected get group(): FormGroup {
    return this.formService.group('inventory');
  }

  /** True once the user has interacted and safety stock exceeds the maximum. */
  protected get stockRangeInvalid(): boolean {
    return this.group.hasError('stockRange') && this.group.touched;
  }

  protected err(controlName: string): string {
    const control = this.group.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['min']) return 'Must be 0 or greater';
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    return '';
  }
}
