import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PermissionPreview } from '../../services/service-group-user.service';
import { ServiceGroupUserStore } from '../../store/service-group-user.store';
import { ServiceGroupMembershipGroup } from '../../models/service-group-user.model';
import { ServiceGroupPermissionPreviewComponent } from '../service-group-permission-preview/service-group-permission-preview.component';

export interface ServiceGroupUserViewDialogData {
  group: ServiceGroupMembershipGroup;
}

@Component({
  selector: 'app-service-group-user-view-dialog',
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatTableModule,
    MatTooltipModule, ServiceGroupPermissionPreviewComponent,
  ],
  templateUrl: './service-group-user-view-dialog.component.html',
  styleUrl: './service-group-user-view-dialog.component.scss',
})
export class ServiceGroupUserViewDialogComponent implements OnInit {
  private readonly store = inject(ServiceGroupUserStore);
  protected readonly data = inject<ServiceGroupUserViewDialogData>(MAT_DIALOG_DATA);

  protected readonly memberColumns = ['user', 'assignmentType', 'primary', 'status', 'effective', 'remarks'];

  protected readonly permissionPreview = signal<PermissionPreview | null>(null);
  protected readonly loadingPreview = signal(true);

  protected readonly activeCount = this.data.group.members.filter((m) => m.isActive).length;
  protected readonly primaryCount = this.data.group.members.filter((m) => m.isPrimary).length;

  async ngOnInit(): Promise<void> {
    try {
      this.permissionPreview.set(await this.store.getPermissionPreview(this.data.group.serviceGroupId));
    } catch {
      this.permissionPreview.set(null);
    } finally {
      this.loadingPreview.set(false);
    }
  }
}
