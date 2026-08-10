import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MaterialGroup } from '../../models/material-group.model';

export interface MaterialGroupStatusDialogData {
  materialGroup: MaterialGroup;
  /** The state being moved *to*. */
  activate: boolean;
}

/**
 * Shared confirmation for the enable and disable lifecycle actions. Disabling
 * carries the heavier warning because the API rejects it (409) when the group is
 * still referenced by Material Subcategory / Material Master / PR / PO / Inventory
 * records; enabling additionally requires the parent category to be active.
 */
@Component({
  selector: 'app-material-group-status-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './material-group-status-dialog.component.html',
  styleUrl: './material-group-status-dialog.component.scss',
})
export class MaterialGroupStatusDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<MaterialGroupStatusDialogComponent, boolean>);
  protected readonly data = inject<MaterialGroupStatusDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
