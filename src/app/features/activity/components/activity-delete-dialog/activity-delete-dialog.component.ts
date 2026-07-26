import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Activity } from '../../models/activity.model';

export interface ActivityDeleteDialogData {
  activity: Activity;
}

@Component({
  selector: 'app-activity-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './activity-delete-dialog.component.html',
  styleUrl: './activity-delete-dialog.component.scss',
})
export class ActivityDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ActivityDeleteDialogComponent, boolean>);
  protected readonly data = inject<ActivityDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
