import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ClientType } from '../../models/client-type.model';

export interface ClientTypeDeleteDialogData {
  clientType: ClientType;
}

@Component({
  selector: 'app-client-type-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './client-type-delete-dialog.component.html',
  styleUrl: './client-type-delete-dialog.component.scss',
})
export class ClientTypeDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ClientTypeDeleteDialogComponent, boolean>);
  protected readonly data = inject<ClientTypeDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
