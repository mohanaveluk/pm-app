import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VendorType } from '../../models/vendor-type.model';

export interface VendorTypeViewDialogData {
  vendorType: VendorType;
}

/** Read-only inspection dialog — no editing happens here (see item 12 of the spec). */
@Component({
  selector: 'app-vendor-type-view-dialog',
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './vendor-type-view-dialog.component.html',
  styleUrl: './vendor-type-view-dialog.component.scss',
})
export class VendorTypeViewDialogComponent {
  protected readonly data = inject<VendorTypeViewDialogData>(MAT_DIALOG_DATA);
  protected readonly vendorType = this.data.vendorType;
}
