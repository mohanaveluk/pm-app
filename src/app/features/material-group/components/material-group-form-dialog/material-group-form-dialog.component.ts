import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MaterialGroupStore } from '../../store/material-group.store';
import { MATERIAL_GROUP_CODE_PATTERN, MaterialGroup } from '../../models/material-group.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

export interface MaterialGroupFormDialogData {
  mode: 'create' | 'edit';
  materialGroupId?: string;
  /** Optional pre-selected parent when opened from a category-filtered grid. */
  materialCategoryId?: string;
}

export type MaterialGroupFormDialogResult =
  | { action: 'saved'; materialGroup: MaterialGroup; saveAndNew: boolean }
  | undefined;

const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/;

@Component({
  selector: 'app-material-group-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatSlideToggleModule,
    MatProgressSpinnerModule, MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './material-group-form-dialog.component.html',
  styleUrl: './material-group-form-dialog.component.scss',
})
export class MaterialGroupFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<MaterialGroupFormDialogComponent, MaterialGroupFormDialogResult>);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(MaterialGroupStore);
  protected readonly data = inject<MaterialGroupFormDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly loading = signal(this.isEdit);
  protected readonly loadError = signal('');
  protected readonly saving = this.store.saving;

  /** True when editing a platform-seeded group — the API forbids toggling isSystem. */
  protected readonly isSystemGroup = signal(false);
  /** Parent category label shown read-only in edit mode (the FK is immutable). */
  protected readonly parentCategoryLabel = signal('');

  private current: MaterialGroup | null = null;

  protected readonly form = this.fb.nonNullable.group({
    materialCategoryId: ['', [Validators.required]],
    code: ['', [Validators.required, Validators.maxLength(30), Validators.pattern(MATERIAL_GROUP_CODE_PATTERN)]],
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

    if (this.isEdit && this.data.materialGroupId) {
      this.loadMaterialGroup(this.data.materialGroupId);
      return;
    }

    if (this.data.materialCategoryId) {
      this.form.patchValue({ materialCategoryId: this.data.materialCategoryId });
    }
  }

  private async loadMaterialGroup(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const group = await this.store.getMaterialGroupById(id);
      this.current = group;
      this.isSystemGroup.set(group.isSystem);
      this.parentCategoryLabel.set(`${group.materialCategoryName} (${group.materialCategoryCode})`);
      this.form.patchValue({
        materialCategoryId: group.materialCategoryId,
        code: group.code,
        name: group.name,
        shortName: group.shortName ?? '',
        displayOrder: group.displayOrder,
        isActive: group.isActive,
        description: group.description ?? '',
        remarks: group.remarks ?? '',
      });
      // Both are immutable after creation (backend omits them from the update DTO).
      this.form.controls.code.disable();
      this.form.controls.materialCategoryId.disable();
      this.form.markAsPristine();
    } catch {
      this.loadError.set('Unable to load Material Group details. Please try again.');
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
      const materialGroup = this.isEdit && this.current
        ? await this.store.updateMaterialGroup(this.current.id, common)
        : await this.store.createMaterialGroup({
            ...common,
            materialCategoryId: v.materialCategoryId,
            code: v.code.trim().toUpperCase(),
          });

      if (saveAndNew) {
        this.resetForm();
        return;
      }
      this.dialogRef.close({ action: 'saved', materialGroup, saveAndNew: false });
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
      materialCategoryId: this.data.materialCategoryId ?? '',
      code: '',
      name: '',
      shortName: '',
      displayOrder: 0,
      isActive: true,
      description: '',
      remarks: '',
    });
    if (!this.isEdit) {
      this.form.controls.code.enable();
      this.form.controls.materialCategoryId.enable();
    }
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
    if (control.errors['required']) {
      return field === 'materialCategoryId' ? 'Select a parent Material Category' : 'This field is required';
    }
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    if (control.errors['pattern']) {
      return field === 'code'
        ? 'Only letters, numbers and underscore (_) are allowed.'
        : 'Must be a whole number of 0 or more';
    }
    return '';
  }
}
