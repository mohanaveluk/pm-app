import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Activity } from '../../models/activity.model';

export interface ActivityViewDialogData {
  activity: Activity;
}

@Component({
  selector: 'app-activity-view-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule],
  templateUrl: './activity-view-dialog.component.html',
  styleUrl: './activity-view-dialog.component.scss',
})
export class ActivityViewDialogComponent {
  protected readonly data = inject<ActivityViewDialogData>(MAT_DIALOG_DATA);
  protected readonly activity = this.data.activity;
}
