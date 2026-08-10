import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UnitOfMeasurement } from '../../models/unit-of-measurement.model';

export interface UnitOfMeasurementDeleteDialogData {
  unitOfMeasurement: UnitOfMeasurement;
}

@Component({
  selector: 'app-unit-of-measurement-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './unit-of-measurement-delete-dialog.component.html',
  styleUrl: './unit-of-measurement-delete-dialog.component.scss',
})
export class UnitOfMeasurementDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UnitOfMeasurementDeleteDialogComponent, boolean>);
  protected readonly data = inject<UnitOfMeasurementDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
