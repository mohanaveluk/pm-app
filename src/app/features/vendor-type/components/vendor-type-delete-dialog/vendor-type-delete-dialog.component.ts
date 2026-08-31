import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { VendorType } from '../../models/vendor-type.model';

export interface VendorTypeDeleteDialogData {
  vendorType: VendorType;
}

@Component({
  selector: 'app-vendor-type-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './vendor-type-delete-dialog.component.html',
  styleUrl: './vendor-type-delete-dialog.component.scss',
})
export class VendorTypeDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<VendorTypeDeleteDialogComponent, boolean>);
  protected readonly data = inject<VendorTypeDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
