import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { IndustryCategory } from '../../models/industry-category.model';

export interface IndustryCategoryDeleteDialogData {
  industryCategory: IndustryCategory;
}

@Component({
  selector: 'app-industry-category-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './industry-category-delete-dialog.component.html',
  styleUrl: './industry-category-delete-dialog.component.scss',
})
export class IndustryCategoryDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<IndustryCategoryDeleteDialogComponent, boolean>);
  protected readonly data = inject<IndustryCategoryDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
