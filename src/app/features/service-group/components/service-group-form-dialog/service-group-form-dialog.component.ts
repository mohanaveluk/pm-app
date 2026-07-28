import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators,
} from '@angular/forms';
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
import { ServiceGroupStore } from '../../store/service-group.store';
import { ALL_PERMISSIONS, CORE_PERMISSIONS, PermissionType, ServiceGroup } from '../../models/service-group.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

export interface ServiceGroupFormDialogData {
  mode: 'create' | 'edit';
  /** Required in edit mode. */
  serviceGroupId?: string;
}

export type ServiceGroupFormDialogResult = { action: 'saved' } | undefined;

const CODE_PATTERN = /^[A-Za-z0-9_]+$/;

function nonEmptyArrayValidator(control: AbstractControl): ValidationErrors | null {
  return Array.isArray(control.value) && control.value.length > 0 ? null : { required: true };
}

@Component({
  selector: 'app-service-group-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSlideToggleModule, MatProgressSpinnerModule, MatDividerModule,
    MatTooltipModule, MatChipsModule,
  ],
  templateUrl: './service-group-form-dialog.component.html',
  styleUrl: './service-group-form-dialog.component.scss',
})
export class ServiceGroupFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ServiceGroupFormDialogComponent, ServiceGroupFormDialogResult>);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(ServiceGroupStore);
  protected readonly data = inject<ServiceGroupFormDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly loading = signal(this.isEdit);
  protected readonly loadError = signal('');
  protected readonly saving = this.store.saving;

  protected readonly corePermissions = CORE_PERMISSIONS;
  protected readonly extraPermissions = ALL_PERMISSIONS.filter((p) => !CORE_PERMISSIONS.includes(p));

  private currentGroup: ServiceGroup | null = null;

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(CODE_PATTERN)]],
    name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(CODE_PATTERN)]],
    description: [''],
    remarks: [''],
    isDefault: [false],
    isActive: [true],
    activities: this.fb.array<ReturnType<typeof this.buildActivityRow>>([]),
  });

  protected get activityRows() {
    return this.form.controls.activities;
  }

  private readonly activitiesValue = toSignal(this.form.controls.activities.valueChanges, {
    initialValue: this.form.controls.activities.value,
  });

  /** Activity ids selected in more than one row — surfaced as an inline error per offending row. */
  protected readonly duplicateActivityIds = computed(() => {
    const seen = new Set<string>();
    const dup = new Set<string>();
    for (const row of this.activitiesValue()) {
      if (!row.activityId) continue;
      if (seen.has(row.activityId)) dup.add(row.activityId);
      seen.add(row.activityId);
    }
    return dup;
  });

  ngOnInit(): void {
    if (this.isEdit) {
      this.loadGroup(this.data.serviceGroupId!);
      return;
    }
    this.addActivityRow();
  }

  private async loadGroup(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const group = await this.store.getServiceGroupById(id);
      this.currentGroup = group;
      this.form.patchValue({
        code: group.code,
        name: group.name,
        description: group.description ?? '',
        remarks: group.remarks ?? '',
        isDefault: group.isDefault,
        isActive: group.isActive,
      });
      for (const activity of group.activities) {
        this.activityRows.push(
          this.buildActivityRow(
            activity.activityId,
            activity.permissions.filter((p) => p.isAllowed).map((p) => p.permissionType),
          ),
        );
      }
      if (this.activityRows.length === 0) this.addActivityRow();
      // Code and name are permanently immutable — lock them even in edit mode.
      this.form.controls.code.disable();
      this.form.controls.name.disable();
      this.form.markAsPristine();
    } catch {
      this.loadError.set('Unable to load Service Group details. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private buildActivityRow(activityId = '', permissions: PermissionType[] = []) {
    return this.fb.nonNullable.group({
      activityId: [activityId, Validators.required],
      permissions: this.fb.nonNullable.control<PermissionType[]>(permissions, nonEmptyArrayValidator),
    });
  }

  addActivityRow(): void {
    this.activityRows.push(this.buildActivityRow());
  }

  removeActivityRow(index: number): void {
    if (this.activityRows.length > 1) this.activityRows.removeAt(index);
    else this.activityRows.at(0)?.reset({ activityId: '', permissions: [] });
  }

  togglePermission(row: ReturnType<typeof this.buildActivityRow>, permission: PermissionType): void {
    const control = row.controls.permissions;
    const current = control.value;
    control.setValue(
      current.includes(permission) ? current.filter((p) => p !== permission) : [...current, permission],
    );
    control.markAsTouched();
  }

  onCodeInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toUpperCase();
    this.form.controls.code.setValue(value);
  }

  async save(): Promise<void> {
    if (this.saving()) return;

    this.form.markAllAsTouched();
    this.activityRows.controls.forEach((row) => row.markAllAsTouched());

    if (this.form.invalid || this.duplicateActivityIds().size > 0) return;

    const v = this.form.getRawValue();
    const activities = v.activities
      .filter((a) => a.activityId)
      .map((a) => ({ activityId: a.activityId, permissions: a.permissions }));

    try {
      if (this.isEdit && this.currentGroup) {
        await this.store.updateServiceGroup(this.currentGroup.id, {
          description: v.description.trim() || undefined,
          remarks: v.remarks.trim() || undefined,
          isDefault: v.isDefault,
          isActive: v.isActive,
          activities,
        });
      } else {
        await this.store.createServiceGroup({
          code: v.code,
          name: v.name.trim(),
          description: v.description.trim() || undefined,
          remarks: v.remarks.trim() || undefined,
          isDefault: v.isDefault,
          isActive: v.isActive,
          activities,
        });
      }
      this.dialogRef.close({ action: 'saved' });
    } catch {
      // Store already surfaced a snackbar; keep the dialog open so the user can correct and retry.
    }
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

  err(field: 'code' | 'name'): string {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return '';
    if (control.errors['required']) return 'This field is required';
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    if (control.errors['pattern']) return 'Only letters, numbers and underscore (_) are allowed.';
    return '';
  }

  activityLabel(activityId: string): string {
    const activity = this.store.availableActivities().find((a) => a.id === activityId);
    return activity ? `${activity.name}${activity.moduleGroup ? ' — ' + activity.moduleGroup : ''}` : '';
  }
}
