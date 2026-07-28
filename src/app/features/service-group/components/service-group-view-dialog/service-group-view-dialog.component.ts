import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { ServiceGroup } from '../../models/service-group.model';

export interface ServiceGroupViewDialogData {
  group: ServiceGroup;
}

@Component({
  selector: 'app-service-group-view-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule, MatExpansionModule],
  templateUrl: './service-group-view-dialog.component.html',
  styleUrl: './service-group-view-dialog.component.scss',
})
export class ServiceGroupViewDialogComponent {
  protected readonly data = inject<ServiceGroupViewDialogData>(MAT_DIALOG_DATA);
  protected readonly group = this.data.group;

  allowedPermissions(activity: ServiceGroup['activities'][number]) {
    return activity.permissions.filter((p) => p.isAllowed);
  }
}
