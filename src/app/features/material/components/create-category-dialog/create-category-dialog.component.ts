import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { MaterialCategoryService } from '../../../material-category/services/material-category.service';
import { MaterialCategory } from '../../../material-category/models/material-category.model';
import { deriveMasterCode } from '../../utils/derive-code';

export interface CreateCategoryDialogResult {
  created?: MaterialCategory;
}

/**
 * Creates a Material Category without leaving the Material workspace.
 *
 * The user supplies only a name; code / short name / description are derived and
 * shown as a live preview before submitting. The derived code satisfies
 * CreateMaterialCategoryDto's `^[A-Za-z0-9_]+$` rule and 30-char limit.
 */
@Component({
  selector: 'app-create-category-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './create-category-dialog.component.html',
  styleUrl: './create-category-dialog.component.scss',
})
export class CreateCategoryDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CreateCategoryDialogComponent, CreateCategoryDialogResult>);
  private readonly categoryService = inject(MaterialCategoryService);
  private readonly snack = inject(MatSnackBar);

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
  });

  private readonly nameValue = toSignal(this.form.controls.name.valueChanges, { initialValue: '' });

  /** Live preview of everything the frontend will derive from the name. */
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
    if (control.errors['required']) return 'Category name is required';
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
        this.categoryService.createMaterialCategory({
          code: p.code,
          name,
          shortName: p.shortName,
          description: p.description,
          displayOrder: 0,
          isActive: true,
        }),
      );
      this.snack.open('Material Category created', 'OK', { duration: 3000 });
      this.dialogRef.close({ created: res.data });
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      const message = httpErr?.status === 409
        ? 'This category already exists. Pick it from the list instead.'
        : httpErr?.error?.message || 'Material Category could not be created.';
      this.snack.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      // On a duplicate the list is refreshed by the caller so the existing row
      // becomes selectable — we never create a client-side duplicate.
      if (httpErr?.status === 409) this.dialogRef.close({});
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
