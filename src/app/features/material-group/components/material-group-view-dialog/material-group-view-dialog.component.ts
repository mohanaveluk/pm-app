import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MaterialGroup, MaterialGroupUsage } from '../../models/material-group.model';

export interface MaterialGroupViewDialogData {
  materialGroup: MaterialGroup;
}

@Component({
  selector: 'app-material-group-view-dialog',
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './material-group-view-dialog.component.html',
  styleUrl: './material-group-view-dialog.component.scss',
})
export class MaterialGroupViewDialogComponent {
  protected readonly data = inject<MaterialGroupViewDialogData>(MAT_DIALOG_DATA);
  protected readonly group = this.data.materialGroup;

  /**
   * Downstream dependency counts. The API exposes no usage endpoint yet, so this
   * stays null and the template renders an explicit "not yet available" panel
   * rather than inventing numbers. Wiring a future
   * `GET /material-groups/:id/usage` into this signal is the only change needed.
   */
  protected readonly usage = signal<MaterialGroupUsage | null>(null);
}
