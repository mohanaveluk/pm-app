import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UnitOfMeasurement } from '../../models/unit-of-measurement.model';

export interface UnitOfMeasurementStatusDialogData {
  unitOfMeasurement: UnitOfMeasurement;
  /** The state being moved *to*. */
  activate: boolean;
}

/**
 * Shared confirmation for activate / deactivate. There is no enable/disable
 * endpoint on this controller — the store carries the change through PUT — but
 * the action still warrants a confirmation because deactivating a unit removes
 * it from every downstream Material, PR and PO picker.
 */
@Component({
  selector: 'app-unit-of-measurement-status-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './unit-of-measurement-status-dialog.component.html',
  styleUrl: './unit-of-measurement-status-dialog.component.scss',
})
export class UnitOfMeasurementStatusDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UnitOfMeasurementStatusDialogComponent, boolean>);
  protected readonly data = inject<UnitOfMeasurementStatusDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
