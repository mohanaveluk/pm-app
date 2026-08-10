import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MaterialCategory } from '../../models/material-category.model';

export interface MaterialCategoryStatusDialogData {
  materialCategory: MaterialCategory;
  /** The state being moved *to*. */
  activate: boolean;
}

/**
 * Shared confirmation for the enable and disable lifecycle actions. Disabling
 * carries the heavier warning because the API rejects it (409) when the category
 * is still referenced by Material Master / PR / PO / Inventory records.
 */
@Component({
  selector: 'app-material-category-status-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './material-category-status-dialog.component.html',
  styleUrl: './material-category-status-dialog.component.scss',
})
export class MaterialCategoryStatusDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<MaterialCategoryStatusDialogComponent, boolean>);
  protected readonly data = inject<MaterialCategoryStatusDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
