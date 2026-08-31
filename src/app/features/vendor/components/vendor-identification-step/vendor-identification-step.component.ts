import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { VendorFormService } from '../../services/vendor-form.service';
import { VendorStatus, enumLabel } from '../../models/vendor.model';
import { firstErrorMessage } from '../../validators/vendor.validators';
import {
  CreateCategoryDialogComponent, CreateCategoryDialogResult,
} from '../../../material/components/create-category-dialog/create-category-dialog.component';

/**
 * Step 1 — Vendor Identification.
 *
 * Vendor Code is server-generated and shown as "Auto Generated" until it exists.
 *
 * The Industry Category picker was removed from this step. The API still
 * requires industryCategoryId and still derives the code prefix from it, so the
 * control lives on in the form and VendorFormService fills it with the first
 * active category — see applyDefaultIndustryCategory().
 */
@Component({
  selector: 'app-vendor-identification-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatAutocompleteModule, MatButtonModule, MatIconModule, MatTooltipModule,
    MatChipsModule,
  ],
  templateUrl: './vendor-identification-step.component.html',
  styleUrl: '../vendor-step.shared.scss',
})
export class VendorIdentificationStepComponent {
  protected readonly formService = inject(VendorFormService);
  private readonly dialog = inject(MatDialog);

  readonly readonly = input(false);
  readonly vendorCode = input<string | null>(null);
  readonly vendorStatus = input<VendorStatus | null>(null);

  protected readonly parentSearch = signal('');
  protected readonly materialSearch = signal('');
  protected readonly vendorTypeSearch = signal('');

  /** Active vendor types for this organization, ordered for display. */
  protected readonly filteredVendorTypes = computed(() => {
    const term = this.vendorTypeSearch().trim().toLowerCase();
    const all = [...this.formService.vendorTypes()].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
    );
    if (!term) return all;
    return all.filter((t) => `${t.name} ${t.code} ${t.shortName ?? ''}`.toLowerCase().includes(term));
  });

  protected get group(): FormGroup {
    return this.formService.group('identification');
  }

  /** Inline filter for the Material Categories select. */
  protected readonly filteredMaterialCategories = computed(() => {
    const term = this.materialSearch().trim().toLowerCase();
    const options = this.formService.materialCategories();
    if (!term) return options;
    return options.filter((c) => `${c.code} ${c.name} ${c.shortName ?? ''}`.toLowerCase().includes(term));
  });

  protected get selectedMaterialCategories(): string[] {
    return (this.group.get('productCategories')?.value as string[]) ?? [];
  }

  /** Client-side filter over the already-loaded active vendors. */
  protected readonly filteredParents = computed(() => {
    const term = this.parentSearch().trim().toLowerCase();
    const options = this.formService.parentVendorOptions();
    if (!term) return options.slice(0, 50);
    return options
      .filter((v) => `${v.code} ${v.vendorName} ${v.tradeName ?? ''}`.toLowerCase().includes(term))
      .slice(0, 50);
  });

  protected err(control: string, label: string): string {
    return firstErrorMessage(this.group.get(control), label);
  }

  protected label(value: string | null | undefined): string {
    return enumLabel(value);
  }

  protected onParentSearch(value: string): void {
    this.parentSearch.set(value);
  }

  protected parentDisplay = (id: string): string =>
    id ? this.formService.parentVendorLabel(id) : '';

  protected clearParent(): void {
    this.group.get('parentCompanyId')?.setValue('');
    this.group.get('parentCompanyId')?.markAsDirty();
    this.parentSearch.set('');
  }

  /**
   * Creates a Material Category inline, reusing the Material Master's own
   * name-only dialog rather than duplicating it. The list is then refreshed and
   * the new category pre-selected — no page reload, nothing typed is lost.
   */
  async createMaterialCategory(): Promise<void> {
    const ref = this.dialog.open<CreateCategoryDialogComponent, void, CreateCategoryDialogResult>(
      CreateCategoryDialogComponent,
      { width: '520px', maxWidth: '95vw', disableClose: true },
    );

    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    this.formService.refreshMaterialCategories(result.created?.id);
    this.materialSearch.set('');
  }

  protected removeMaterialCategory(name: string): void {
    const control = this.group.get('productCategories');
    control?.setValue(this.selectedMaterialCategories.filter((c) => c !== name));
    control?.markAsDirty();
  }
}
