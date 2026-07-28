import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ServiceGroupMembershipGroup } from '../../models/service-group-user.model';

export interface ServiceGroupUserAuditHistoryData {
  group: ServiceGroupMembershipGroup;
}

interface AuditEvent {
  icon: string;
  label: string;
  by?: string;
  at: string;
  variant: 'assigned' | 'disabled' | 'updated';
}

/**
 * Future API placeholder — there is no dedicated audit-log endpoint for Service
 * Group User assignments. Derives a best-effort timeline from each member's own
 * createdAt/createdBy, disabledAt/disabledBy and updatedAt/updatedBy fields (the
 * only history the current API surfaces), sorted most-recent first.
 */
@Component({
  selector: 'app-service-group-user-audit-history',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './service-group-user-audit-history.component.html',
  styleUrl: './service-group-user-audit-history.component.scss',
})
export class ServiceGroupUserAuditHistoryComponent {
  protected readonly data = inject<ServiceGroupUserAuditHistoryData>(MAT_DIALOG_DATA);

  protected readonly events: AuditEvent[] = this.buildEvents();

  private buildEvents(): AuditEvent[] {
    const events: AuditEvent[] = [];

    for (const m of this.data.group.members) {
      events.push({
        icon: 'person_add',
        label: `${m.userFullName} assigned (${m.assignmentType})`,
        by: m.createdBy,
        at: m.createdAt,
        variant: 'assigned',
      });

      if (m.disabledAt) {
        events.push({
          icon: 'toggle_off',
          label: `${m.userFullName} disabled`,
          by: m.disabledBy,
          at: m.disabledAt,
          variant: 'disabled',
        });
      } else if (m.updatedAt && m.updatedAt !== m.createdAt) {
        events.push({
          icon: 'edit',
          label: `${m.userFullName} assignment updated`,
          by: m.updatedBy,
          at: m.updatedAt,
          variant: 'updated',
        });
      }
    }

    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }
}
