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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../../services';
import { OrganizationService } from '../../../../services/organization.service';
import { ActivityStore } from '../../store/activity.store';
import { Activity, MappedDepartmentOption } from '../../models/activity.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

export interface ActivityFormDialogData {
  mode: 'create' | 'edit' | 'bulk';
  /** Required in edit mode. */
  activityId?: string;
  /** Pre-selects the discipline in create/bulk mode, e.g. from a "Duplicate" action. */
  presetDisciplineId?: string;
  presetDepartmentId?: string;
}

export type ActivityFormDialogResult = { action: 'saved'; saveAndNew: boolean } | undefined;

const POSITIVE_INTEGER_PATTERN = /^\d+$/;

function routeUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;
  return value.startsWith('/') ? null : { routeUrl: true };
}

@Component({
  selector: 'app-activity-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatAutocompleteModule, MatButtonModule, MatIconModule, MatSlideToggleModule, MatProgressSpinnerModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './activity-form-dialog.component.html',
  styleUrl: './activity-form-dialog.component.scss',
})
export class ActivityFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ActivityFormDialogComponent, ActivityFormDialogResult>);
  private readonly auth = inject(AuthService);
  private readonly organizationService = inject(OrganizationService);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(ActivityStore);
  protected readonly data = inject<ActivityFormDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly isBulk = this.data.mode === 'bulk';

  protected readonly loading = signal(this.isEdit);
  protected readonly loadError = signal('');
  protected readonly saving = this.store.saving;

  protected readonly organizationName = signal(this.auth.user()?.organizationId ?? '—');

  protected readonly mappedDepartments = signal<MappedDepartmentOption[]>([]);
  protected readonly loadingDepartments = signal(false);

  private currentActivity: Activity | null = null;
  private readonly currentActivitySignal = signal<Activity | null>(null);
  protected readonly currentActivityDiscipline = computed(() => {
    const a = this.currentActivitySignal();
    return a ? `${a.disciplineName}${a.disciplineCode ? ' (' + a.disciplineCode + ')' : ''}` : '';
  });
  protected readonly currentActivityDepartment = computed(() => {
    const a = this.currentActivitySignal();
    return a ? `${a.departmentName}${a.departmentCode ? ' (' + a.departmentCode + ')' : ''}` : '';
  });

  // ── Single create/edit form ───────────────────────────────────────
  protected readonly form = this.fb.nonNullable.group({
    disciplineId: ['', Validators.required],
    departmentId: ['', Validators.required],
    departmentDisciplineId: ['', Validators.required],
    code: [''], //, [Validators.required, Validators.maxLength(30)]
    name: ['', [Validators.required, Validators.maxLength(255)]],
    shortName: ['', Validators.maxLength(80)],
    description: [''],
    displayOrder: [0, [Validators.required, Validators.pattern(POSITIVE_INTEGER_PATTERN)]],
    moduleGroup: ['', Validators.maxLength(100)],
    icon: ['', Validators.maxLength(100)],
    routeUrl: ['', [Validators.maxLength(255), routeUrlValidator]],
    featureKey: ['', Validators.maxLength(100)],
    remarks: [''],
    isSystem: [false],
    isDefault: [false],
    isActive: [true],
  });

  // ── Bulk create form ───────────────────────────────────────────────
  protected readonly bulkForm = this.fb.nonNullable.group({
    disciplineId: ['', Validators.required],
    departmentId: ['', Validators.required],
    departmentDisciplineId: ['', Validators.required],
    items: this.fb.array<ReturnType<typeof this.buildBulkRow>>([]),
  });

  protected get bulkItems() {
    return this.bulkForm.controls.items;
  }

  private readonly disciplineIdValue = toSignal(this.form.controls.disciplineId.valueChanges, {
    initialValue: this.form.controls.disciplineId.value,
  });
  private readonly bulkDisciplineIdValue = toSignal(this.bulkForm.controls.disciplineId.valueChanges, {
    initialValue: this.bulkForm.controls.disciplineId.value,
  });

  protected readonly iconPreview = toSignal(this.form.controls.icon.valueChanges, { initialValue: '' });

  ngOnInit(): void {
    this.organizationService.getProfile().subscribe({
      next: (org) => this.organizationName.set(org?.organizationName ?? this.organizationName()),
      error: () => {},
    });

    if (this.isEdit) {
      this.loadActivity(this.data.activityId!);
      return;
    }

    // Cascading: Discipline -> Departments mapped to it -> Department-Discipline mapping.
    this.form.controls.disciplineId.valueChanges.subscribe((disciplineId) => this.onDisciplineChange(disciplineId, this.form));
    this.form.controls.departmentId.valueChanges.subscribe((departmentId) => this.onDepartmentChange(departmentId, this.form));
    this.bulkForm.controls.disciplineId.valueChanges.subscribe((disciplineId) => this.onDisciplineChange(disciplineId, this.bulkForm));
    this.bulkForm.controls.departmentId.valueChanges.subscribe((departmentId) => this.onDepartmentChange(departmentId, this.bulkForm));

    if (this.isBulk) {
      this.addBulkRow();
      if (this.data.presetDisciplineId) this.bulkForm.controls.disciplineId.setValue(this.data.presetDisciplineId);
    } else if (this.data.presetDisciplineId) {
      this.form.controls.disciplineId.setValue(this.data.presetDisciplineId);
    }
  }

  private onDisciplineChange(disciplineId: string, group: typeof this.form | typeof this.bulkForm): void {
    group.controls.departmentId.setValue('');
    group.controls.departmentDisciplineId.setValue('');
    this.mappedDepartments.set([]);
    if (!disciplineId) return;

    this.loadingDepartments.set(true);
    this.store.getDepartmentsForDiscipline(disciplineId).subscribe({
      next: (departments) => {
        this.mappedDepartments.set(departments);
        this.loadingDepartments.set(false);
        if (departments.length === 1) {
          group.controls.departmentId.setValue(departments[0].departmentId);
        } else if (this.data.presetDepartmentId && departments.some((d) => d.departmentId === this.data.presetDepartmentId)) {
          group.controls.departmentId.setValue(this.data.presetDepartmentId);
        }
      },
      error: () => {
        this.mappedDepartments.set([]);
        this.loadingDepartments.set(false);
      },
    });
  }

  private onDepartmentChange(departmentId: string, group: typeof this.form | typeof this.bulkForm): void {
    const match = this.mappedDepartments().find((d) => d.departmentId === departmentId);
    group.controls.departmentDisciplineId.setValue(match?.id ?? '');
  }

  private async loadActivity(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const activity = await this.store.getActivityById(id);
      this.currentActivity = activity;
      this.currentActivitySignal.set(activity);
      this.form.patchValue({
        disciplineId: activity.disciplineId,
        departmentId: activity.departmentId,
        departmentDisciplineId: activity.departmentDisciplineId,
        code: activity.code,
        name: activity.name,
        shortName: activity.shortName ?? '',
        description: activity.description ?? '',
        displayOrder: activity.displayOrder,
        moduleGroup: activity.moduleGroup ?? '',
        icon: activity.icon ?? '',
        routeUrl: activity.routeUrl ?? '',
        featureKey: activity.featureKey ?? '',
        remarks: activity.remarks ?? '',
        isSystem: activity.isSystem,
        isDefault: activity.isDefault,
        isActive: activity.isActive,
      });
      // Engineering Hierarchy is immutable after creation — lock it.
      this.form.controls.disciplineId.disable();
      this.form.controls.departmentId.disable();
      this.form.controls.departmentDisciplineId.disable();
      this.form.markAsPristine();
    } catch {
      this.loadError.set('Unable to load activity details. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private buildBulkRow() {
    return this.fb.nonNullable.group({
      code: ['', [Validators.required, Validators.maxLength(30)]],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      shortName: ['', Validators.maxLength(80)],
      moduleGroup: ['', Validators.maxLength(100)],
    });
  }

  addBulkRow(): void {
    this.bulkItems.push(this.buildBulkRow());
  }

  removeBulkRow(index: number): void {
    if (this.bulkItems.length > 1) this.bulkItems.removeAt(index);
  }

  onUppercaseInput(control: AbstractControl<string>, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    control.setValue(value.toUpperCase());
  }

  async save(saveAndNew: boolean): Promise<void> {
    if (this.isBulk) return this.saveBulk();
    if (this.saving()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    try {
      if (this.isEdit && this.currentActivity) {
        await this.store.updateActivity(this.currentActivity.id, {
          code: v.code,
          name: v.name,
          shortName: v.shortName.trim() || undefined,
          description: v.description.trim() || undefined,
          displayOrder: Number(v.displayOrder),
          moduleGroup: v.moduleGroup.trim() || undefined,
          icon: v.icon.trim() || undefined,
          routeUrl: v.routeUrl.trim() || undefined,
          featureKey: v.featureKey.trim() || undefined,
          remarks: v.remarks.trim() || undefined,
          isSystem: v.isSystem,
          isDefault: v.isDefault,
          isActive: v.isActive,
        });
      } else {
        await this.store.createActivity({
          departmentDisciplineId: v.departmentDisciplineId,
          departmentId: v.departmentId,
          disciplineId: v.disciplineId,
          //code: v.code,
          name: v.name,
          shortName: v.shortName.trim() || undefined,
          description: v.description.trim() || undefined,
          displayOrder: Number(v.displayOrder),
          moduleGroup: v.moduleGroup.trim() || undefined,
          icon: v.icon.trim() || undefined,
          routeUrl: v.routeUrl.trim() || undefined,
          featureKey: v.featureKey.trim() || undefined,
          remarks: v.remarks.trim() || undefined,
          isSystem: v.isSystem,
          isDefault: v.isDefault,
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

  private async saveBulk(): Promise<void> {
    if (this.saving()) return;

    this.bulkForm.markAllAsTouched();
    this.bulkItems.controls.forEach((row) => row.markAllAsTouched());
    if (this.bulkForm.invalid) return;

    const v = this.bulkForm.getRawValue();
    const codes = v.items.map((item) => item.code);
    const duplicates = codes.filter((code, i) => codes.indexOf(code) !== i);
    if (duplicates.length) {
      this.loadError.set(`Duplicate activity code(s) in this batch: ${Array.from(new Set(duplicates)).join(', ')}`);
      return;
    }
    this.loadError.set('');

    try {
      await this.store.bulkCreateActivities({
        departmentDisciplineId: v.departmentDisciplineId,
        activities: v.items.map((item) => ({
          code: item.code,
          name: item.name,
          shortName: item.shortName.trim() || undefined,
          moduleGroup: item.moduleGroup.trim() || undefined,
        })),
      });
      this.dialogRef.close({ action: 'saved', saveAndNew: false });
    } catch {
      // Store already surfaced a snackbar; keep the dialog open so the user can correct and retry.
    }
  }

  /** Pre-populates the create form (e.g. from "Duplicate") without touching the id being edited. */
  prefill(values: { shortName?: string; description?: string; moduleGroup?: string; icon?: string; isActive?: boolean }): void {
    this.form.patchValue(values);
  }

  resetForm(): void {
    if (this.isBulk) {
      this.bulkForm.reset({ disciplineId: '', departmentId: '', departmentDisciplineId: '' });
      while (this.bulkItems.length > 1) this.bulkItems.removeAt(0);
      this.bulkItems.at(0)?.reset({ code: '', name: '', shortName: '', moduleGroup: '' });
      this.mappedDepartments.set([]);
      return;
    }
    this.form.reset({
      disciplineId: '',
      departmentId: '',
      departmentDisciplineId: '',
      code: '',
      name: '',
      shortName: '',
      description: '',
      displayOrder: 0,
      moduleGroup: '',
      icon: '',
      routeUrl: '',
      featureKey: '',
      remarks: '',
      isSystem: false,
      isDefault: false,
      isActive: true,
    });
    this.mappedDepartments.set([]);
    this.currentActivity = null;
  }

  cancel(): void {
    const dirty = this.isBulk ? this.bulkForm.dirty : this.form.dirty;
    if (!dirty) {
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
    if (control.errors['pattern']) return 'Must be a non-negative whole number';
    if (control.errors['routeUrl']) return 'Route URL must begin with /';
    return '';
  }

  bulkErr(row: ReturnType<typeof this.buildBulkRow>, field: 'code' | 'name'): string {
    const control = row.controls[field];
    if (!control.touched || !control.errors) return '';
    if (control.errors['required']) return 'Required';
    if (control.errors['maxlength']) return `Max ${control.errors['maxlength'].requiredLength} characters`;
    return '';
  }
}
