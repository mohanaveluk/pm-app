import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../../../services';
import { OrganizationService } from '../../../../services/organization.service';
import { DepartmentDisciplineStore } from '../../store/department-discipline.store';
import { DepartmentDisciplineGroup } from '../../models/department-discipline.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

export interface DepartmentDisciplineFormDialogData {
  mode: 'create' | 'edit';
  /** Required in edit mode: the department whose disciplines are being changed. */
  departmentId?: string;
  /** Pre-selects the department in create mode, e.g. when creating from a "Duplicate" action. */
  presetDepartmentId?: string;
}

export type DepartmentDisciplineFormDialogResult =
  | { action: 'saved'; saveAndNew: boolean }
  | undefined;

@Component({
  selector: 'app-department-discipline-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSlideToggleModule, MatProgressSpinnerModule,
    MatDividerModule, MatTooltipModule, MatChipsModule,
  ],
  templateUrl: './department-discipline-form-dialog.component.html',
  styleUrl: './department-discipline-form-dialog.component.scss',
})
export class DepartmentDisciplineFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<DepartmentDisciplineFormDialogComponent, DepartmentDisciplineFormDialogResult>);
  private readonly auth = inject(AuthService);
  private readonly organizationService = inject(OrganizationService);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(DepartmentDisciplineStore);
  protected readonly data = inject<DepartmentDisciplineFormDialogData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly saving = this.store.saving;
  protected readonly isEdit = this.data.mode === 'edit';

  private currentGroup: DepartmentDisciplineGroup | null = null;

  protected readonly organizationName = signal(this.auth.user()?.organizationId ?? '—');

  protected readonly form = this.fb.nonNullable.group({
    departmentId: ['', Validators.required],
    disciplineIds: [[] as string[], Validators.required],
    isActive: [true],
    remarks: [''],
  });

  private readonly disciplineIdsValue = toSignal(this.form.controls.disciplineIds.valueChanges, {
    initialValue: this.form.controls.disciplineIds.value,
  });

  protected readonly selectedDisciplineCount = computed(() => this.disciplineIdsValue().length);

  ngOnInit(): void {
    this.organizationService.getProfile().subscribe({
      next: (org) => this.organizationName.set(org?.organizationName ?? this.organizationName()),
      error: () => {},
    });

    if (this.data.mode === 'edit') {
      this.loadGroup(this.data.departmentId!);
      return;
    }

    if (this.data.presetDepartmentId) {
      this.form.controls.departmentId.setValue(this.data.presetDepartmentId);
    }
  }

  private loadGroup(departmentId: string): void {
    const group = this.store.getGroupByDepartmentId(departmentId);
    if (!group) {
      this.loadError.set('Unable to load this department\'s disciplines. Please try again.');
      return;
    }
    this.currentGroup = group;
    this.form.patchValue({
      departmentId: group.departmentId,
      disciplineIds: group.assignments.map((a) => a.disciplineId),
      isActive: group.assignments.length === 0 || group.assignments.every((a) => a.isActive),
      remarks: '',
    });
    this.form.controls.departmentId.disable();
    this.form.markAsPristine();
  }

  async save(saveAndNew: boolean): Promise<void> {
    this.form.controls.disciplineIds.updateValueAndValidity();
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const organizationId = this.auth.user()?.organizationId ?? '';

    try {
      if (this.isEdit && this.currentGroup) {
        await this.store.syncDepartmentDisciplines(this.currentGroup, v.disciplineIds, {
          isActive: v.isActive,
          remarks: v.remarks.trim() || undefined,
        });
      } else if (v.disciplineIds.length > 1) {
        await this.store.bulkCreateMappings({
          organizationId,
          departmentId: v.departmentId,
          disciplineIds: v.disciplineIds,
          remarks: v.remarks.trim() || undefined,
          isActive: v.isActive,
        });
      } else {
        await this.store.createMapping({
          organizationId,
          departmentId: v.departmentId,
          disciplineId: v.disciplineIds[0],
          displayOrder: 1,
          remarks: v.remarks.trim() || undefined,
          isActive: v.isActive,
        });
      }

      if (saveAndNew) {
        this.resetForm();
        return;
      }
      this.dialogRef.close({ action: 'saved', saveAndNew: false });
    } catch {
      // Store already surfaced a snackbar; keep the dialog open so the user can correct and retry.
    }
  }

  /** Pre-populates the form (e.g. from "Duplicate" — copies a department's discipline set to a new one). */
  prefill(values: { departmentId?: string; disciplineIds?: string[]; isActive?: boolean; remarks?: string }): void {
    this.form.patchValue(values);
  }

  resetForm(): void {
    this.form.reset({
      departmentId: '',
      disciplineIds: [],
      isActive: true,
      remarks: '',
    });
    this.currentGroup = null;
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

  err(field: 'departmentId' | 'disciplineIds'): string {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return '';
    if (control.errors['required']) return 'This field is required';
    return '';
  }
}
