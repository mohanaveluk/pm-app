import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WbsCostCode } from '../../models/wbs-cost-code.model';

export interface WbsCostCodeDeleteDialogData {
  wbsCostCode: WbsCostCode;
}

@Component({
  selector: 'app-wbs-cost-code-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './wbs-cost-code-delete-dialog.component.html',
  styleUrl: './wbs-cost-code-delete-dialog.component.scss',
})
export class WbsCostCodeDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<WbsCostCodeDeleteDialogComponent, boolean>);
  protected readonly data = inject<WbsCostCodeDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
