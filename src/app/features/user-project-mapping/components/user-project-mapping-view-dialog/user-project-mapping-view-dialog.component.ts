import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserProjectMappingStore } from '../../store/user-project-mapping.store';
import {
  HISTORY_ACTION_LABELS, MAPPING_STATUS_LABELS, MappingHistoryEvent, MappingStatus, UserProjectMapping,
  UserProjectMappingDetail, initialsOf,
} from '../../models/user-project-mapping.model';

export interface UserProjectMappingViewDialogData {
  mapping: UserProjectMapping;
  canEdit: boolean;
}

/** Read-only view of a project's mapping: the project, its client, every user and the assignment history. */
@Component({
  selector: 'app-user-project-mapping-view-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './user-project-mapping-view-dialog.component.html',
  styleUrl: './user-project-mapping-view-dialog.component.scss',
})
export class UserProjectMappingViewDialogComponent {
  private readonly store = inject(UserProjectMappingStore);
  private readonly dialogRef = inject(MatDialogRef<UserProjectMappingViewDialogComponent, 'edit' | undefined>);
  protected readonly data = inject<UserProjectMappingViewDialogData>(MAT_DIALOG_DATA);

  protected readonly initialsOf = initialsOf;
  protected readonly detail = signal<UserProjectMappingDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      this.detail.set(await this.store.getDetail(this.data.mapping.projectId));
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  statusLabel(status: string | null): string {
    return status ? MAPPING_STATUS_LABELS[status as MappingStatus] ?? status : '';
  }

  actionLabel(e: MappingHistoryEvent): string {
    return HISTORY_ACTION_LABELS[e.action] ?? e.action;
  }

  actionIcon(e: MappingHistoryEvent): string {
    switch (e.action) {
      case 'ASSIGNED': return 'person_add';
      case 'UNASSIGNED': return 'person_remove';
      case 'DELETED': return 'delete';
      default: return 'sync_alt';
    }
  }

  edit(): void {
    this.dialogRef.close('edit');
  }
}
