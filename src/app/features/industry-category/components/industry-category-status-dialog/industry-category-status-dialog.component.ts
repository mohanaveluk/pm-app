import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { IndustryCategory } from '../../models/industry-category.model';

export interface IndustryCategoryStatusDialogData {
  industryCategory: IndustryCategory;
  /** The state being moved *to*. */
  activate: boolean;
}

/**
 * Shared confirmation for the enable and disable lifecycle actions. Disabling
 * carries the heavier warning because the API rejects it (409) when the category
 * is still referenced by Project / Department / Discipline / Activity / Supplier records.
 */
@Component({
  selector: 'app-industry-category-status-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './industry-category-status-dialog.component.html',
  styleUrl: './industry-category-status-dialog.component.scss',
})
export class IndustryCategoryStatusDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<IndustryCategoryStatusDialogComponent, boolean>);
  protected readonly data = inject<IndustryCategoryStatusDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
