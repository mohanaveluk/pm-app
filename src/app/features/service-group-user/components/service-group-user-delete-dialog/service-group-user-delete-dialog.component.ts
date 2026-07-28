import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ServiceGroupUserAssignment } from '../../models/service-group-user.model';

export interface ServiceGroupUserDeleteDialogData {
  assignment: ServiceGroupUserAssignment;
}

@Component({
  selector: 'app-service-group-user-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './service-group-user-delete-dialog.component.html',
  styleUrl: './service-group-user-delete-dialog.component.scss',
})
export class ServiceGroupUserDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ServiceGroupUserDeleteDialogComponent, boolean>);
  protected readonly data = inject<ServiceGroupUserDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
