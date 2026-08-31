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
import { UnitOfMeasurementStore } from '../../store/unit-of-measurement.store';
import {
  UOM_CODE_PATTERN, UOM_TYPE_META, UnitOfMeasurement, UomType, uomTypeMeta,
} from '../../models/unit-of-measurement.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

export interface UnitOfMeasurementFormDialogData {
  mode: 'create' | 'edit';
  unitOfMeasurementId?: string;
  /** Optional pre-selected family when opened from a type-filtered grid. */
  uomType?: UomType;
}

export type UnitOfMeasurementFormDialogResult =
  | { action: 'saved'; unitOfMeasurement: UnitOfMeasurement; saveAndNew: boolean }
  | undefined;

const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/;

@Component({
  selector: 'app-unit-of-measurement-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatSlideToggleModule,
    MatProgressSpinnerModule, MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './unit-of-measurement-form-dialog.component.html',
  styleUrl: './unit-of-measurement-form-dialog.component.scss',
})
export class UnitOfMeasurementFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<UnitOfMeasurementFormDialogComponent, UnitOfMeasurementFormDialogResult>);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(UnitOfMeasurementStore);
  protected readonly data = inject<UnitOfMeasurementFormDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly loading = signal(this.isEdit);
  protected readonly loadError = signal('');
  protected readonly saving = this.store.saving;

  protected readonly uomTypes = UOM_TYPE_META;
  protected readonly typeMeta = uomTypeMeta;

  private current: UnitOfMeasurement | null = null;

  protected readonly form = this.fb.nonNullable.group({
    code: [''], //, [Validators.required, Validators.maxLength(20), Validators.pattern(UOM_CODE_PATTERN)]
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    // `symbol` intentionally has no character pattern — it must accept °C, m², ft³.
    symbol: ['', [Validators.maxLength(20)]],
    shortName: ['', [Validators.maxLength(50)]],
    uomType: [UomType.OTHER as UomType, [Validators.required]],
    displayOrder: [0, [Validators.required, Validators.pattern(NON_NEGATIVE_INTEGER_PATTERN)]],
    isActive: [true],
    description: [''],
    remarks: [''],
  });

  /** Live hint under the type picker, e.g. "KG, G, TON, LB, OZ". */
  protected readonly selectedTypeExamples = signal('');

  ngOnInit(): void {
    // Codes are stored uppercase server-side; mirror that as the user types.
    this.form.controls.code.valueChanges.subscribe((value) => {
      const upper = value.toUpperCase();
      if (upper !== value) this.form.controls.code.setValue(upper, { emitEvent: false });
    });

    this.form.controls.uomType.valueChanges.subscribe((type) => {
      this.selectedTypeExamples.set(uomTypeMeta(type).examples);
    });

    if (this.isEdit && this.data.unitOfMeasurementId) {
      this.loadUnitOfMeasurement(this.data.unitOfMeasurementId);
      return;
    }

    const initialType = this.data.uomType ?? UomType.OTHER;
    this.form.patchValue({ uomType: initialType });
    this.selectedTypeExamples.set(uomTypeMeta(initialType).examples);
  }

  private async loadUnitOfMeasurement(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const uom = await this.store.getUnitOfMeasurementById(id);
      this.current = uom;
      this.form.patchValue({
        code: uom.code,
        name: uom.name,
        symbol: uom.symbol ?? '',
        shortName: uom.shortName ?? '',
        uomType: uom.uomType,
        displayOrder: uom.displayOrder,
        isActive: uom.isActive,
        description: uom.description ?? '',
        remarks: uom.remarks ?? '',
      });
      this.selectedTypeExamples.set(uomTypeMeta(uom.uomType).examples);
      // Code is immutable after creation (backend omits it from the update DTO).
      this.form.controls.code.disable();
      this.form.markAsPristine();
    } catch {
      this.loadError.set('Unable to load Unit of Measurement details. Please try again.');
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
      symbol: v.symbol.trim() || undefined,
      shortName: v.shortName.trim() || undefined,
      description: v.description.trim() || undefined,
      uomType: v.uomType,
      displayOrder: Number(v.displayOrder),
      isActive: v.isActive,
      remarks: v.remarks.trim() || undefined,
    };

    try {
      const unitOfMeasurement = this.isEdit && this.current
        ? await this.store.updateUnitOfMeasurement(this.current.id, common)
        : await this.store.createUnitOfMeasurement({ ...common }); //, code: v.code.trim().toUpperCase()

      if (saveAndNew) {
        this.resetForm();
        return;
      }
      this.dialogRef.close({ action: 'saved', unitOfMeasurement, saveAndNew: false });
    } catch {
      // Store already surfaced a snackbar; keep the dialog open so the user can correct and retry.
    }
  }

  /** Pre-populates the form (e.g. from "Duplicate") without touching the id being edited. */
  prefill(values: Partial<ReturnType<typeof this.form.getRawValue>>): void {
    this.form.patchValue(values);
  }

  resetForm(): void {
    const type = this.data.uomType ?? UomType.OTHER;
    this.form.reset({
      code: '',
      name: '',
      symbol: '',
      shortName: '',
      uomType: type,
      displayOrder: 0,
      isActive: true,
      description: '',
      remarks: '',
    });
    this.selectedTypeExamples.set(uomTypeMeta(type).examples);
    if (!this.isEdit) this.form.controls.code.enable();
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
      return field === 'uomType' ? 'Select a measurement family' : 'This field is required';
    }
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    // if (control.errors['pattern']) {
    //   return field === 'code'
    //     ? 'Only letters, numbers and underscore (_) are allowed.'
    //     : 'Must be a whole number of 0 or more';
    // }
    return '';
  }
}
