import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IndustryCategory, IndustryCategoryUsage } from '../../models/industry-category.model';

export interface IndustryCategoryViewDialogData {
  industryCategory: IndustryCategory;
}

@Component({
  selector: 'app-industry-category-view-dialog',
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './industry-category-view-dialog.component.html',
  styleUrl: './industry-category-view-dialog.component.scss',
})
export class IndustryCategoryViewDialogComponent {
  protected readonly data = inject<IndustryCategoryViewDialogData>(MAT_DIALOG_DATA);
  protected readonly category = this.data.industryCategory;

  /**
   * Downstream dependency counts. The API exposes no usage endpoint yet, so this
   * stays null and the template renders an explicit "not yet available" panel
   * rather than inventing numbers. Wiring a future
   * `GET /industry-categories/:id/usage` into this signal is the only change
   * needed to light the section up.
   */
  protected readonly usage = signal<IndustryCategoryUsage | null>(null);
}
