import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UnitOfMeasurement, UnitOfMeasurementUsage, uomTypeMeta } from '../../models/unit-of-measurement.model';

export interface UnitOfMeasurementViewDialogData {
  unitOfMeasurement: UnitOfMeasurement;
}

@Component({
  selector: 'app-unit-of-measurement-view-dialog',
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './unit-of-measurement-view-dialog.component.html',
  styleUrl: './unit-of-measurement-view-dialog.component.scss',
})
export class UnitOfMeasurementViewDialogComponent {
  protected readonly data = inject<UnitOfMeasurementViewDialogData>(MAT_DIALOG_DATA);
  protected readonly uom = this.data.unitOfMeasurement;
  protected readonly meta = uomTypeMeta(this.uom.uomType);

  /**
   * Downstream dependency counts. The API exposes no usage endpoint yet, so this
   * stays null and the template renders an explicit "not yet available" panel
   * rather than inventing numbers. Wiring a future
   * `GET /unit-of-measurements/:id/usage` into this signal is the only change needed.
   */
  protected readonly usage = signal<UnitOfMeasurementUsage | null>(null);
}
