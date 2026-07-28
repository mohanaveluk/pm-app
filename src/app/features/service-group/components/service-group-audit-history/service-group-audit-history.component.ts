import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ServiceGroup } from '../../models/service-group.model';

export interface ServiceGroupAuditHistoryData {
  group: ServiceGroup;
}

interface AuditEvent {
  icon: string;
  label: string;
  by?: string;
  at?: string;
  variant: 'created' | 'modified' | 'enabled' | 'disabled';
}

/**
 * Future API placeholder — there is no audit-log endpoint yet. Shows a
 * best-effort timeline derived from the Service Group's own createdAt/By and
 * updatedAt/By fields (the only history the current API surfaces), clearly
 * labeled as provisional so it isn't mistaken for a full field-level audit trail.
 */
@Component({
  selector: 'app-service-group-audit-history',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './service-group-audit-history.component.html',
  styleUrl: './service-group-audit-history.component.scss',
})
export class ServiceGroupAuditHistoryComponent {
  protected readonly data = inject<ServiceGroupAuditHistoryData>(MAT_DIALOG_DATA);

  protected readonly events: AuditEvent[] = this.buildEvents();

  private buildEvents(): AuditEvent[] {
    const g = this.data.group;
    const events: AuditEvent[] = [
      { icon: 'add_circle', label: 'Service Group Created', by: g.createdBy, at: g.createdAt, variant: 'created' },
    ];

    if (g.updatedAt && g.updatedAt !== g.createdAt) {
      events.push({
        icon: g.isActive ? 'toggle_on' : 'toggle_off',
        label: g.isActive ? 'Service Group Enabled' : 'Service Group Disabled',
        by: g.updatedBy,
        at: g.updatedAt,
        variant: g.isActive ? 'enabled' : 'disabled',
      });
    }

    return events;
  }
}
