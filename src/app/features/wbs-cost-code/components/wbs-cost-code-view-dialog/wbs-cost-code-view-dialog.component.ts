import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WbsCostCode } from '../../models/wbs-cost-code.model';

export interface WbsCostCodeViewDialogData {
  wbsCostCode: WbsCostCode;
}

/** Read-only inspection dialog — no editing happens here (see item 12 of the spec). */
@Component({
  selector: 'app-wbs-cost-code-view-dialog',
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './wbs-cost-code-view-dialog.component.html',
  styleUrl: './wbs-cost-code-view-dialog.component.scss',
})
export class WbsCostCodeViewDialogComponent {
  protected readonly data = inject<WbsCostCodeViewDialogData>(MAT_DIALOG_DATA);
  protected readonly wbsCostCode = this.data.wbsCostCode;
}
