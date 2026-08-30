import { Component, computed, inject, signal } from '@angular/core';
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
import { IndustryCategoryService } from '../../../industry-category/services/industry-category.service';
import { IndustryCategory } from '../../../industry-category/models/industry-category.model';
import { deriveMasterCode } from '../../../material/utils/derive-code';

export interface CreateIndustryCategoryDialogResult {
  created?: IndustryCategory;
}

/**
 * Creates an Industry Category without leaving the Vendor workspace.
 *
 * The user supplies only a name; code, short name and description are derived
 * and previewed before submitting. The derived code satisfies
 * CreateIndustryCategoryDto's `^[A-Za-z0-9_]+$` rule and 30-character limit.
 */
@Component({
  selector: 'app-create-industry-category-dialog',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './create-industry-category-dialog.component.html',
  styleUrl: './create-industry-category-dialog.component.scss',
})
export class CreateIndustryCategoryDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject(MatDialogRef<CreateIndustryCategoryDialogComponent, CreateIndustryCategoryDialogResult>);
  private readonly categoryService = inject(IndustryCategoryService);
  private readonly snack = inject(MatSnackBar);

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
  });

  private readonly nameValue = toSignal(this.form.controls.name.valueChanges, { initialValue: '' });

  /** Live preview of everything the frontend derives from the name. */
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
        this.categoryService.createIndustryCategory({
          code: p.code,
          name,
          shortName: p.shortName,
          description: p.description,
          displayOrder: 0,
          isActive: true,
          remarks: '',
        }),
      );
      this.snack.open('Industry Category created', 'OK', { duration: 3000 });
      this.dialogRef.close({ created: res.data });
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      const message = this.messageFor(httpErr);
      this.snack.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      // On a duplicate the caller refreshes the list so the existing row becomes
      // selectable — we never create a client-side duplicate.
      if (httpErr?.status === 409) this.dialogRef.close({});
    } finally {
      this.saving.set(false);
    }
  }

  private messageFor(err: HttpErrorResponse): string {
    switch (err?.status) {
      case 0:   return 'Cannot reach the server. Check your connection and try again.';
      case 400: return err.error?.message || 'The category details are invalid.';
      case 401: return 'Your session has expired. Please sign in again.';
      case 403: return 'You do not have permission to create Industry Categories.';
      case 409: return 'This category already exists. Pick it from the list instead.';
      default:  return err?.error?.message || 'Industry Category could not be created.';
    }
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
