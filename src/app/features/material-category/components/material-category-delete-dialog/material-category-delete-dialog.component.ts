import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MaterialCategory } from '../../models/material-category.model';

export interface MaterialCategoryDeleteDialogData {
  materialCategory: MaterialCategory;
}

@Component({
  selector: 'app-material-category-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './material-category-delete-dialog.component.html',
  styleUrl: './material-category-delete-dialog.component.scss',
})
export class MaterialCategoryDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<MaterialCategoryDeleteDialogComponent, boolean>);
  protected readonly data = inject<MaterialCategoryDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
