import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ServiceGroupStore } from '../../store/service-group.store';
import { ServiceGroupListItem } from '../../models/service-group.model';

export interface ServiceGroupCloneDialogData {
  group: ServiceGroupListItem;
}

export type ServiceGroupCloneDialogResult = { action: 'cloned' } | undefined;

const CODE_PATTERN = /^[A-Za-z0-9_]+$/;

@Component({
  selector: 'app-service-group-clone-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './service-group-clone-dialog.component.html',
  styleUrl: './service-group-clone-dialog.component.scss',
})
export class ServiceGroupCloneDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ServiceGroupCloneDialogComponent, ServiceGroupCloneDialogResult>);
  protected readonly store = inject(ServiceGroupStore);
  protected readonly data = inject<ServiceGroupCloneDialogData>(MAT_DIALOG_DATA);

  protected readonly saving = this.store.saving;

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(CODE_PATTERN)]],
    name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(CODE_PATTERN)]],
    description: [this.data.group.description ?? ''],
  });

  onCodeInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toUpperCase();
    this.form.controls.code.setValue(value);
  }

  async clone(): Promise<void> {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    try {
      await this.store.cloneGroup(this.data.group.id, {
        code: v.code,
        name: v.name.trim(),
        description: v.description.trim() || undefined,
      });
      this.dialogRef.close({ action: 'cloned' });
    } catch {
      // Store already surfaced a snackbar; keep the dialog open so the user can correct and retry.
    }
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  err(field: 'code' | 'name'): string {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return '';
    if (control.errors['required']) return 'This field is required';
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    if (control.errors['pattern']) return 'Only letters, numbers and underscore (_) are allowed.';
    return '';
  }
}
