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
import { ProjectTypeStore } from '../../store/project-type.store';
import { ProjectType } from '../../models/project-type.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

export interface ProjectTypeFormDialogData {
  mode: 'create' | 'edit';
  projectTypeId?: string;
}

export type ProjectTypeFormDialogResult =
  | { action: 'saved'; projectType: ProjectType; saveAndNew: boolean }
  | undefined;

const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/;

/**
 * Create/Edit dialog for the Project Type master. Structured exactly like
 * IndustryCategoryFormDialogComponent: `code` is server-generated (a
 * per-organization sequence starting at 0001), so the control exists only to
 * render the value once known — it is disabled immediately in edit mode and
 * never submitted to the API.
 */
@Component({
  selector: 'app-project-type-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSlideToggleModule, MatProgressSpinnerModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './project-type-form-dialog.component.html',
  styleUrl: './project-type-form-dialog.component.scss',
})
export class ProjectTypeFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ProjectTypeFormDialogComponent, ProjectTypeFormDialogResult>);
  private readonly auth = inject(AuthService);
  private readonly organizationService = inject(OrganizationService);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(ProjectTypeStore);
  protected readonly data = inject<ProjectTypeFormDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly loading = signal(this.isEdit);
  protected readonly loadError = signal('');
  protected readonly saving = this.store.saving;

  protected readonly organizationName = signal(this.auth.user()?.organizationId ?? '—');

  private current: ProjectType | null = null;

  protected readonly form = this.fb.nonNullable.group({
    code: [''],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    shortName: ['', [Validators.maxLength(50)]],
    displayOrder: [0, [Validators.required, Validators.pattern(NON_NEGATIVE_INTEGER_PATTERN)]],
    isActive: [true],
    description: [''],
    remarks: [''],
  });

  ngOnInit(): void {
    // The code field is display-only from the start — nothing to generate
    // client-side, but it stays disabled so it never posts.
    this.form.controls.code.disable();

    this.organizationService.getProfile().subscribe({
      next: (org) => this.organizationName.set(org?.organizationName ?? this.organizationName()),
      error: () => {},
    });

    if (this.isEdit && this.data.projectTypeId) {
      this.loadProjectType(this.data.projectTypeId);
    }
  }

  private async loadProjectType(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const projectType = await this.store.getProjectTypeById(id);
      this.current = projectType;
      this.form.patchValue({
        code: projectType.code,
        name: projectType.name,
        shortName: projectType.shortName ?? '',
        displayOrder: projectType.displayOrder,
        isActive: projectType.isActive,
        description: projectType.description ?? '',
        remarks: projectType.remarks ?? '',
      });
      this.form.markAsPristine();
    } catch {
      this.loadError.set('Unable to load Project Type details. Please try again.');
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
      name: v.name.trim(),
      shortName: v.shortName.trim() || undefined,
      description: v.description.trim() || undefined,
      displayOrder: Number(v.displayOrder),
      isActive: v.isActive,
      remarks: v.remarks.trim() || undefined,
    };

    try {
      const projectType = this.isEdit && this.current
        ? await this.store.updateProjectType(this.current.id, payload)
        : await this.store.createProjectType(payload);

      if (saveAndNew) {
        this.resetForm();
        return;
      }
      this.dialogRef.close({ action: 'saved', projectType, saveAndNew: false });
    } catch {
      // Store already surfaced a snackbar; keep the dialog open so the user can correct and retry.
    }
  }

  /** Pre-populates the form (e.g. from "Duplicate") without touching the id being edited. */
  prefill(values: Partial<{ name: string; shortName: string; displayOrder: number; isActive: boolean; description: string; remarks: string }>): void {
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
    this.form.controls.code.disable();
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
    if (control.errors['required']) return 'Project Type name is required.';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    if (control.errors['pattern']) return 'Please enter a valid display order.';
    return '';
  }
}
