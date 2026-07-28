import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface BulkDisableDialogData {
  count: number;
}

@Component({
  selector: 'app-bulk-disable-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './bulk-disable-dialog.component.html',
  styleUrl: './bulk-disable-dialog.component.scss',
})
export class BulkDisableDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<BulkDisableDialogComponent, boolean>);
  protected readonly data = inject<BulkDisableDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
