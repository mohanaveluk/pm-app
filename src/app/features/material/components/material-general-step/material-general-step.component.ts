import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { MaterialFormService } from '../../services/material-form.service';
import { CRITICALITY_OPTIONS } from '../../models/material.model';
import {
  CreateCategoryDialogComponent, CreateCategoryDialogResult,
} from '../create-category-dialog/create-category-dialog.component';
import {
  CreateGroupDialogComponent, CreateGroupDialogData, CreateGroupDialogResult,
} from '../create-group-dialog/create-group-dialog.component';

const SHORT_DESCRIPTION_MAX = 500;

/**
 * Step 1 — the only step with mandatory fields, so it gates progression during
 * creation. Owns the Category → Group cascade and the two on-the-fly creation
 * dialogs.
 */
@Component({
  selector: 'app-material-general-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatSlideToggleModule,
    MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './material-general-step.component.html',
  styleUrl: '../material-step.shared.scss',
})
export class MaterialGeneralStepComponent {
  protected readonly formService = inject(MaterialFormService);
  private readonly dialog = inject(MatDialog);

  /** Read-only mode is used by the View screen, which reuses these same steps. */
  readonly readonly = input(false);

  /**
   * Once a purchase order has been issued against this material, its
   * identifying descriptions are frozen — the supplier was priced against
   * this exact wording, so it must not silently change under an open PO.
   * Every other field on this step (classification, handling, remarks)
   * stays editable.
   */
  readonly isPurchaseOrderIssued = input(false);

  protected readonly criticalityOptions = CRITICALITY_OPTIONS;
  protected readonly shortDescriptionMax = SHORT_DESCRIPTION_MAX;

  /** Client-side search terms for the three long dropdowns. */
  protected readonly categorySearch = signal('');
  protected readonly groupSearch = signal('');
  protected readonly uomSearch = signal('');

  protected get group(): FormGroup {
    return this.formService.group('general');
  }

  protected readonly shortDescriptionRemaining = computed(() => SHORT_DESCRIPTION_MAX);

  protected readonly visibleCategories = computed(() => {
    const term = this.categorySearch().trim().toLowerCase();
    const all = this.formService.categories();
    if (!term) return all;
    return all.filter((c) => c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term));
  });

  protected readonly visibleGroups = computed(() => {
    const term = this.groupSearch().trim().toLowerCase();
    const all = this.formService.filteredGroups();
    if (!term) return all;
    return all.filter((g) => g.name.toLowerCase().includes(term) || g.code.toLowerCase().includes(term));
  });

  protected readonly visibleUoms = computed(() => {
    const term = this.uomSearch().trim().toLowerCase();
    const all = this.formService.uoms();
    if (!term) return all;
    return all.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.code.toLowerCase().includes(term) ||
        (u.symbol ?? '').toLowerCase().includes(term),
    );
  });

  /** Short/Long Description are frozen once a PO has been issued. */
  protected readonly descriptionsLocked = computed(() => this.isPurchaseOrderIssued());

  protected descriptionsLockedReason(): string {
    return 'A purchase order has been issued against this material. '
      + 'Short and Long Description are frozen and can no longer be edited.';
  }

  /** Live character counter for the short description. */
  protected remainingChars(): number {
    const value = (this.group.get('shortDescription')?.value ?? '') as string;
    return SHORT_DESCRIPTION_MAX - value.length;
  }

  protected err(controlName: string): string {
    const control = this.group.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['required']) {
      switch (controlName) {
        case 'materialCategoryId': return 'Select a Material Category';
        case 'materialGroupId': return 'Select a Material Group';
        case 'unitOfMeasurementId': return 'Select a Unit of Measurement';
        case 'criticalityLevel': return 'Select a criticality level';
        default: return 'This field is required';
      }
    }
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    return '';
  }

  // ── On-the-fly reference data ───────────────────────────────────────

  async openCreateCategory(): Promise<void> {
    const ref = this.dialog.open<CreateCategoryDialogComponent, void, CreateCategoryDialogResult>(
      CreateCategoryDialogComponent,
      { width: '520px', maxWidth: '95vw', disableClose: true },
    );
    const result = await firstValueFrom(ref.afterClosed());
    if (result?.created) {
      // Refresh, then select the new category — which clears any stale group.
      this.formService.reloadCategories(result.created.id);
    }
  }

  async openCreateGroup(): Promise<void> {
    const categoryId = this.group.get('materialCategoryId')?.value as string;
    if (!categoryId) return;

    const ref = this.dialog.open<CreateGroupDialogComponent, CreateGroupDialogData, CreateGroupDialogResult>(
      CreateGroupDialogComponent,
      {
        width: '520px',
        maxWidth: '95vw',
        disableClose: true,
        data: {
          materialCategoryId: categoryId,
          materialCategoryLabel: this.formService.categoryLabel(categoryId),
        },
      },
    );
    const result = await firstValueFrom(ref.afterClosed());
    if (result?.created) {
      this.formService.reloadGroups(result.created.id);
    }
  }
}
