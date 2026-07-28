import { ChangeDetectionStrategy, Component, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { PermissionService } from '../../core/rbac/permission.service';
import { PERMISSIONS } from '../../core/rbac/permissions.const';
import { ServiceGroupUserStore } from './store/service-group-user.store';
import {
  ServiceGroupMembershipGroup, ServiceGroupUserAssignment, ServiceGroupUserSortField,
} from './models/service-group-user.model';
import {
  ServiceGroupUserFormDialogComponent, ServiceGroupUserFormDialogData, ServiceGroupUserFormDialogResult,
} from './components/service-group-user-form-dialog/service-group-user-form-dialog.component';
import {
  ServiceGroupUserViewDialogComponent, ServiceGroupUserViewDialogData,
} from './components/service-group-user-view-dialog/service-group-user-view-dialog.component';
import {
  ServiceGroupUserDeleteDialogComponent, ServiceGroupUserDeleteDialogData,
} from './components/service-group-user-delete-dialog/service-group-user-delete-dialog.component';
import {
  ServiceGroupUserFilterDialogComponent, ServiceGroupUserFilterDialogData, ServiceGroupUserFilterDialogResult,
} from './components/service-group-user-filter-dialog/service-group-user-filter-dialog.component';
import {
  ServiceGroupUserAuditHistoryComponent, ServiceGroupUserAuditHistoryData,
} from './components/service-group-user-audit-history/service-group-user-audit-history.component';
import { BulkEnableDialogComponent, BulkEnableDialogData } from './components/bulk-enable-dialog/bulk-enable-dialog.component';
import { BulkDisableDialogComponent, BulkDisableDialogData } from './components/bulk-disable-dialog/bulk-disable-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  sortField?: ServiceGroupUserSortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'expand', label: '', alwaysVisible: true },
  { key: 'serviceGroup', label: 'Service Group', alwaysVisible: true, sortField: 'serviceGroupName' },
  { key: 'description', label: 'Description' },
  { key: 'totalUsers', label: 'Total Users', alwaysVisible: true },
  { key: 'activeUsers', label: 'Active Users' },
  { key: 'activities', label: 'Activities' },
  { key: 'status', label: 'Status', alwaysVisible: true },
  { key: 'createdAt', label: 'Created Date', sortField: 'createdAt' },
  { key: 'updatedAt', label: 'Updated Date', sortField: 'updatedAt' },
  { key: 'actions', label: 'Actions', alwaysVisible: true },
];

const DEFAULT_HIDDEN_COLUMNS = new Set<string>(['description', 'activities']);

@Component({
  selector: 'app-service-group-user',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ServiceGroupUserStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule, MatDividerModule, MatBadgeModule,
  ],
  templateUrl: './service-group-user.component.html',
  styleUrl: './service-group-user.component.scss',
})
export class ServiceGroupUserComponent {
  protected readonly store = inject(ServiceGroupUserStore);
  private readonly permissionService = inject(PermissionService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly columnDefs = COLUMN_DEFS;

  protected readonly searchTerm = signal('');
  protected readonly isFullscreen = signal(false);
  protected readonly compactDensity = signal(false);
  protected readonly hiddenColumns = signal(new Set(DEFAULT_HIDDEN_COLUMNS));

  protected readonly displayedColumns = computed(() =>
    this.columnDefs.filter((c) => !this.hiddenColumns().has(c.key)).map((c) => c.key),
  );

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  trackByGroupId(_index: number, group: ServiceGroupMembershipGroup): string {
    return group.serviceGroupId;
  }

  trackByAssignmentId(_index: number, member: ServiceGroupUserAssignment): string {
    return member.id;
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.store.onSearchInput(value);
  }

  onSearchEnter(): void {
    this.store.applySearch(this.searchTerm());
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.store.applySearch('');
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.store.resetFilters();
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.store.setSort('serviceGroupName', 'asc');
      return;
    }
    this.store.setSort(sort.active as ServiceGroupUserSortField, sort.direction);
  }

  onPageChange(event: PageEvent): void {
    this.store.setPage(event.pageIndex, event.pageSize);
  }

  toggleColumn(key: string): void {
    this.hiddenColumns.update((hidden) => {
      const next = new Set(hidden);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  isColumnVisible(key: string): boolean {
    return !this.hiddenColumns().has(key);
  }

  toggleDensity(): void {
    this.compactDensity.update((v) => !v);
  }

  toggleFullscreen(): void {
    this.isFullscreen.update((v) => !v);
  }

  print(): void {
    window.print();
  }

  exportCsv(): void {
    const groups = this.store.groups();
    if (!groups.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = ['Service Group Code', 'Service Group Name', 'User Name', 'Email', 'Assignment Type', 'Primary', 'Status', 'Effective From', 'Effective To', 'Remarks'];
    const lines: string[] = [];
    for (const g of groups) {
      for (const m of g.members) {
        lines.push([
          g.serviceGroupCode,
          g.serviceGroupName,
          m.userFullName,
          m.userEmail,
          m.assignmentType,
          m.isPrimary ? 'Yes' : 'No',
          m.isActive ? 'Active' : 'Inactive',
          m.effectiveFrom ?? '',
          m.effectiveTo ?? '',
          m.remarks ?? '',
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
      }
    }
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `service-group-users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Exported current data to CSV', 'OK', { duration: 3000 });
  }

  exportComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  toggleExpand(group: ServiceGroupMembershipGroup, event?: Event): void {
    event?.stopPropagation();
    this.store.toggleExpand(group.serviceGroupId);
  }

  activeCount(group: ServiceGroupMembershipGroup): number {
    return group.members.filter((m) => m.isActive).length;
  }

  openAssignDialog(): void {
    this.openFormDialog({ mode: 'create' });
  }

  openManageMembersDialog(group: ServiceGroupMembershipGroup, event?: Event): void {
    event?.stopPropagation();
    this.openFormDialog({ mode: 'edit', serviceGroupId: group.serviceGroupId });
  }

  private openFormDialog(data: ServiceGroupUserFormDialogData): void {
    this.dialog.open<ServiceGroupUserFormDialogComponent, ServiceGroupUserFormDialogData, ServiceGroupUserFormDialogResult>(
      ServiceGroupUserFormDialogComponent,
      {
        width: '1260px',
        maxWidth: '95vw',
        height: '90%',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data,
      },
    );
  }

  openViewDialog(group: ServiceGroupMembershipGroup, event?: Event): void {
    event?.stopPropagation();
    this.dialog.open<ServiceGroupUserViewDialogComponent, ServiceGroupUserViewDialogData>(ServiceGroupUserViewDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: { group },
    });
  }

  openFilterDialog(): void {
    const ref = this.dialog.open<ServiceGroupUserFilterDialogComponent, ServiceGroupUserFilterDialogData, ServiceGroupUserFilterDialogResult>(
      ServiceGroupUserFilterDialogComponent,
      { width: '480px', maxWidth: '95vw', viewContainerRef: this.viewContainerRef, data: { filter: this.store.filter() } },
    );
    ref.afterClosed().subscribe((result) => {
      if (result) this.store.setFilter(result);
    });
  }

  openAuditHistory(group: ServiceGroupMembershipGroup, event?: Event): void {
    event?.stopPropagation();
    this.dialog.open<ServiceGroupUserAuditHistoryComponent, ServiceGroupUserAuditHistoryData>(ServiceGroupUserAuditHistoryComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { group },
    });
  }

  async deleteAssignment(assignment: ServiceGroupUserAssignment, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<ServiceGroupUserDeleteDialogComponent, ServiceGroupUserDeleteDialogData, boolean>(
      ServiceGroupUserDeleteDialogComponent,
      { width: '460px', maxWidth: '95vw', data: { assignment } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.deleteAssignment(assignment);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async toggleAssignmentActive(assignment: ServiceGroupUserAssignment, event?: Event): Promise<void> {
    event?.stopPropagation();
    try {
      await this.store.toggleAssignmentActive(assignment);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  toggleAssignmentSelection(assignment: ServiceGroupUserAssignment, event?: Event): void {
    event?.stopPropagation();
    this.store.toggleAssignmentSelection(assignment.id);
  }

  async bulkEnable(): Promise<void> {
    const count = this.store.selectedCount();
    if (count === 0) return;
    const ref = this.dialog.open<BulkEnableDialogComponent, BulkEnableDialogData, boolean>(BulkEnableDialogComponent, {
      width: '440px', maxWidth: '95vw', data: { count },
    });
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.bulkEnable();
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async bulkDisable(): Promise<void> {
    const count = this.store.selectedCount();
    if (count === 0) return;
    const ref = this.dialog.open<BulkDisableDialogComponent, BulkDisableDialogData, boolean>(BulkDisableDialogComponent, {
      width: '440px', maxWidth: '95vw', data: { count },
    });
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.bulkDisable();
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }
}
