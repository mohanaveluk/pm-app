import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IndustryCategoryStore } from '../../store/industry-category.store';
import { INDUSTRY_CATEGORY_CODE_PATTERN, IndustryCategory } from '../../models/industry-category.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

export interface IndustryCategoryFormDialogData {
  mode: 'create' | 'edit';
  industryCategoryId?: string;
}

export type IndustryCategoryFormDialogResult =
  | { action: 'saved'; industryCategory: IndustryCategory; saveAndNew: boolean }
  | undefined;

const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/;

@Component({
  selector: 'app-industry-category-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSlideToggleModule, MatProgressSpinnerModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './industry-category-form-dialog.component.html',
  styleUrl: './industry-category-form-dialog.component.scss',
})
export class IndustryCategoryFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<IndustryCategoryFormDialogComponent, IndustryCategoryFormDialogResult>);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(IndustryCategoryStore);
  protected readonly data = inject<IndustryCategoryFormDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly loading = signal(this.isEdit);
  protected readonly loadError = signal('');
  protected readonly saving = this.store.saving;

  /** True when editing a platform-seeded category — the API forbids toggling isSystem. */
  protected readonly isSystemCategory = signal(false);

  private current: IndustryCategory | null = null;

  protected readonly form = this.fb.nonNullable.group({
    code: [''], //, [Validators.required, Validators.maxLength(30), Validators.pattern(INDUSTRY_CATEGORY_CODE_PATTERN)]
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    shortName: ['', [Validators.maxLength(100)]],
    displayOrder: [0, [Validators.required, Validators.pattern(NON_NEGATIVE_INTEGER_PATTERN)]],
    isActive: [true],
    description: [''],
    remarks: [''],
  });

  ngOnInit(): void {
    // Codes are stored uppercase server-side; mirror that as the user types.
    this.form.controls.code.valueChanges.subscribe((value) => {
      const upper = value.toUpperCase();
      if (upper !== value) this.form.controls.code.setValue(upper, { emitEvent: false });
    });

    if (this.isEdit && this.data.industryCategoryId) {
      this.loadIndustryCategory(this.data.industryCategoryId);
    }
  }

  private async loadIndustryCategory(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const category = await this.store.getIndustryCategoryById(id);
      this.current = category;
      this.isSystemCategory.set(category.isSystem);
      this.form.patchValue({
        code: category.code,
        name: category.name,
        shortName: category.shortName ?? '',
        displayOrder: category.displayOrder,
        isActive: category.isActive,
        description: category.description ?? '',
        remarks: category.remarks ?? '',
      });
      // Code is immutable after creation (backend omits it from the update DTO).
      this.form.controls.code.disable();
      this.form.markAsPristine();
    } catch {
      this.loadError.set('Unable to load Industry Category details. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async save(saveAndNew: boolean): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const common = {
      name: v.name.trim(),
      shortName: v.shortName.trim() || undefined,
      description: v.description.trim() || undefined,
      displayOrder: Number(v.displayOrder),
      isActive: v.isActive,
      remarks: v.remarks.trim() || undefined,
    };

    try {
      const industryCategory = this.isEdit && this.current
        ? await this.store.updateIndustryCategory(this.current.id, common)
        : await this.store.createIndustryCategory({ ...common }); //, code: v.code.trim().toUpperCase()

      if (saveAndNew) {
        this.resetForm();
        return;
      }
      this.dialogRef.close({ action: 'saved', industryCategory, saveAndNew: false });
    } catch {
      // Store already surfaced a snackbar; keep the dialog open so the user can correct and retry.
    }
  }

  /** Pre-populates the form (e.g. from "Duplicate") without touching the id being edited. */
  prefill(values: Partial<ReturnType<typeof this.form.getRawValue>>): void {
    this.form.patchValue(values);
  }

  resetForm(): void {
    this.form.reset({
      code: '',
      name: '',
      shortName: '',
      displayOrder: 0,
      isActive: true,
      description: '',
      remarks: '',
    });
    if (!this.isEdit) this.form.controls.code.enable();
    this.current = null;
  }

  cancel(): void {
    if (!this.form.dirty) {
      this.dialogRef.close(undefined);
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        data: {
          title: 'Discard Changes?',
          message: 'You have unsaved changes. Discard them and close?',
          confirmText: 'Discard',
          color: 'warn',
          icon: 'warning',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.dialogRef.close(undefined);
      });
  }

  err(field: keyof typeof this.form.controls): string {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return '';
    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    // if (control.errors['pattern']) {
    //   return field === 'code'
    //     ? 'Only letters, numbers and underscore (_) are allowed.'
    //     : 'Must be a whole number of 0 or more';
    // }
    return '';
  }
}
