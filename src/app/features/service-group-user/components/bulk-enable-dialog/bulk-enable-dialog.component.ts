import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface BulkEnableDialogData {
  count: number;
}

@Component({
  selector: 'app-bulk-enable-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './bulk-enable-dialog.component.html',
  styleUrl: './bulk-enable-dialog.component.scss',
})
export class BulkEnableDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<BulkEnableDialogComponent, boolean>);
  protected readonly data = inject<BulkEnableDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
