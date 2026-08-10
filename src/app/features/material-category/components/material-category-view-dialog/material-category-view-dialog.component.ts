import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MaterialCategory, MaterialCategoryUsage } from '../../models/material-category.model';

export interface MaterialCategoryViewDialogData {
  materialCategory: MaterialCategory;
}

@Component({
  selector: 'app-material-category-view-dialog',
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './material-category-view-dialog.component.html',
  styleUrl: './material-category-view-dialog.component.scss',
})
export class MaterialCategoryViewDialogComponent {
  protected readonly data = inject<MaterialCategoryViewDialogData>(MAT_DIALOG_DATA);
  protected readonly category = this.data.materialCategory;

  /**
   * Downstream dependency counts. The API exposes no usage endpoint yet, so this
   * stays null and the template renders an explicit "not yet available" panel
   * rather than inventing numbers. Wiring a future
   * `GET /material-categories/:id/usage` into this signal is the only change
   * needed to light the section up.
   */
  protected readonly usage = signal<MaterialCategoryUsage | null>(null);
}
