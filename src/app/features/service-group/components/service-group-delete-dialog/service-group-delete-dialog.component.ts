import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ServiceGroupListItem } from '../../models/service-group.model';

export interface ServiceGroupDeleteDialogData {
  group: ServiceGroupListItem;
}

@Component({
  selector: 'app-service-group-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './service-group-delete-dialog.component.html',
  styleUrl: './service-group-delete-dialog.component.scss',
})
export class ServiceGroupDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ServiceGroupDeleteDialogComponent, boolean>);
  protected readonly data = inject<ServiceGroupDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
