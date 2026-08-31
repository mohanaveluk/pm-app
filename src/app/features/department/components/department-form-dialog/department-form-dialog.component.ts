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
import { AuthService } from '../../../../services';
import { OrganizationService } from '../../../../services/organization.service';
import { DepartmentStore } from '../../store/department.store';
import { Department, DepartmentData } from '../../models/department.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

export interface DepartmentFormDialogData {
  mode: 'create' | 'edit';
  code?: string;
  departmentId?: string;
}

export type DepartmentFormDialogResult =
  | { action: 'saved'; department: Department; saveAndNew: boolean }
  | undefined;

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

@Component({
  selector: 'app-department-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSlideToggleModule, MatProgressSpinnerModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './department-form-dialog.component.html',
  styleUrl: './department-form-dialog.component.scss',
})
export class DepartmentFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<DepartmentFormDialogComponent, DepartmentFormDialogResult>);
  private readonly auth = inject(AuthService);
  private readonly organizationService = inject(OrganizationService);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(DepartmentStore);
  protected readonly data = inject<DepartmentFormDialogData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(this.data.mode === 'edit');
  protected readonly loadError = signal('');
  protected readonly saving = this.store.saving;
  protected readonly isEdit = this.data.mode === 'edit';

  private currentDepartment: DepartmentData | null = null;

  protected readonly organizationName = signal(this.auth.user()?.organizationId ?? '—');

  protected readonly form = this.fb.nonNullable.group({
    code: [''], //, [Validators.required, Validators.maxLength(20)]
    name: ['', [Validators.required, Validators.maxLength(255)]],
    shortName: ['', [Validators.maxLength(50)]],
    displayOrder: [1, [Validators.required, Validators.pattern(POSITIVE_INTEGER_PATTERN)]],
    isActive: [true],
    description: [''],
    remarks: [''],
  });

  ngOnInit(): void {
    // Department codes are always stored/compared uppercase.
    this.form.controls.code.valueChanges.subscribe((value) => {
      const upper = value.toUpperCase();
      if (upper !== value) this.form.controls.code.setValue(upper, { emitEvent: false });
    });

    this.organizationService.getProfile().subscribe({
      next: (org) => this.organizationName.set(org?.organizationName ?? this.organizationName()),
      error: () => {},
    });

    if (this.data.mode === 'edit' && this.data.departmentId) {
      this.loadDepartment(this.data.departmentId);
    }
  }

  private async loadDepartment(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const department = await this.store.getDepartmentById(id);
      this.currentDepartment = department.data;
      this.form.patchValue({
        code: department.data?.code,
        name: department.data?.name,
        shortName: department.data?.shortName ?? '',
        displayOrder: department.data?.displayOrder,
        isActive: department.data?.isActive,
        description: department.data?.description ?? '',
        remarks: department.data?.remarks ?? '',
      });
      this.form.markAsPristine();
    } catch {
      this.loadError.set('Unable to load department details. Please try again.');
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
    const payload = {
      code: v.code.trim().toUpperCase(),
      name: v.name.trim(),
      shortName: v.shortName.trim() || undefined,
      displayOrder: Number(v.displayOrder),
      isActive: v.isActive,
      description: v.description.trim() || undefined,
      remarks: v.remarks.trim() || undefined,
    };

    try {
      const department = this.isEdit && this.currentDepartment
        ? await this.store.updateDepartment(this.currentDepartment.id, payload)
        : await this.store.createDepartment({
            ...payload,
            organizationId: this.auth.user()?.organizationId ?? '',
          });

      if (saveAndNew) {
        this.resetForm();
        return;
      }
      this.dialogRef.close({ action: 'saved', department, saveAndNew: false });
    } catch {
      // Store already surfaced a snackbar; keep the dialog open so the user can correct and retry.
    }
  }

  /** Pre-populates the form (e.g. from "Duplicate Department") without touching the id being edited. */
  prefill(values: Partial<ReturnType<typeof this.form.getRawValue>>): void {
    this.form.patchValue(values);
  }

  resetForm(): void {
    this.form.reset({
      code: '',
      name: '',
      shortName: '',
      displayOrder: 1,
      isActive: true,
      description: '',
      remarks: '',
    });
    this.currentDepartment = null;
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
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    if (control.errors['pattern']) return 'Must be a positive whole number';
    return '';
  }
}
