import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { MaterialGroupService } from '../../../material-group/services/material-group.service';
import { MaterialGroup } from '../../../material-group/models/material-group.model';
import { deriveMasterCode } from '../../utils/derive-code';

export interface CreateGroupDialogData {
  materialCategoryId: string;
  materialCategoryLabel: string;
}

export interface CreateGroupDialogResult {
  created?: MaterialGroup;
}

/**
 * Creates a Material Group under the category already chosen on the Material
 * workspace. The parent is fixed and shown read-only — a group created here must
 * belong to the category the material is being classified under.
 */
@Component({
  selector: 'app-create-group-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './create-group-dialog.component.html',
  styleUrl: '../create-category-dialog/create-category-dialog.component.scss',
})
export class CreateGroupDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CreateGroupDialogComponent, CreateGroupDialogResult>);
  private readonly groupService = inject(MaterialGroupService);
  private readonly snack = inject(MatSnackBar);
  protected readonly data = inject<CreateGroupDialogData>(MAT_DIALOG_DATA);

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
  });

  private readonly nameValue = toSignal(this.form.controls.name.valueChanges, { initialValue: '' });

  protected readonly preview = computed(() => {
    const name = this.nameValue().trim();
    return {
      code: deriveMasterCode(name, 30),
      shortName: name.slice(0, 100),
      description: name,
    };
  });

  protected err(): string {
    const control = this.form.controls.name;
    if (!control.touched || !control.errors) return '';
    if (control.errors['required']) return 'Group name is required';
    if (control.errors['minlength']) return 'Minimum 2 characters';
    if (control.errors['maxlength']) return 'Maximum 255 characters';
    return '';
  }

  async create(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const name = this.form.controls.name.value.trim();
    const p = this.preview();
    if (!p.code) {
      this.snack.open('Enter a name containing at least one letter or digit.', 'Close', { duration: 4000 });
      return;
    }

    this.saving.set(true);
    try {
      const res = await lastValueFrom(
        this.groupService.createMaterialGroup({
          materialCategoryId: this.data.materialCategoryId,
          code: p.code,
          name,
          shortName: p.shortName,
          description: p.description,
          displayOrder: 0,
          isActive: true,
        }),
      );
      this.snack.open('Material Group created', 'OK', { duration: 3000 });
      this.dialogRef.close({ created: res.data });
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      let message: string;
      switch (httpErr?.status) {
        case 409: message = 'This group already exists under the selected category. Pick it from the list instead.'; break;
        case 400: message = 'The selected category is inactive, so groups cannot be added to it.'; break;
        case 404: message = 'The selected category could not be found. Refresh and try again.'; break;
        default:  message = httpErr?.error?.message || 'Material Group could not be created.';
      }
      this.snack.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      if (httpErr?.status === 409) this.dialogRef.close({});
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
