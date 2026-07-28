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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { PermissionService } from '../../core/rbac/permission.service';
import { PERMISSIONS } from '../../core/rbac/permissions.const';
import { ServiceGroupStore } from './store/service-group.store';
import { GroupType, ServiceGroup, ServiceGroupListItem, ServiceGroupSortField } from './models/service-group.model';
import { ServiceGroupFormDialogComponent, ServiceGroupFormDialogData, ServiceGroupFormDialogResult } from './components/service-group-form-dialog/service-group-form-dialog.component';
import { ServiceGroupViewDialogComponent, ServiceGroupViewDialogData } from './components/service-group-view-dialog/service-group-view-dialog.component';
import { ServiceGroupDeleteDialogComponent, ServiceGroupDeleteDialogData } from './components/service-group-delete-dialog/service-group-delete-dialog.component';
import { ServiceGroupCloneDialogComponent, ServiceGroupCloneDialogData } from './components/service-group-clone-dialog/service-group-clone-dialog.component';
import { ServiceGroupCopyDialogComponent, ServiceGroupCopyDialogData } from './components/service-group-copy-dialog/service-group-copy-dialog.component';
import { ServiceGroupPermissionMatrixComponent, ServiceGroupPermissionMatrixData } from './components/service-group-permission-matrix/service-group-permission-matrix.component';
import { ServiceGroupAuditHistoryComponent, ServiceGroupAuditHistoryData } from './components/service-group-audit-history/service-group-audit-history.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  sortField?: ServiceGroupSortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'expand', label: '', alwaysVisible: true },
  { key: 'code', label: 'Service Group', alwaysVisible: true, sortField: 'code' },
  { key: 'description', label: 'Description' },
  { key: 'activities', label: 'Activities', alwaysVisible: true },
  { key: 'groupType', label: 'Group Type', sortField: 'groupType' },
  { key: 'isDefault', label: 'Default' },
  { key: 'status', label: 'Status', alwaysVisible: true },
  { key: 'createdAt', label: 'Created Date', sortField: 'createdAt' },
  { key: 'updatedAt', label: 'Updated Date' },
  { key: 'actions', label: 'Actions', alwaysVisible: true },
];

const DEFAULT_HIDDEN_COLUMNS = new Set<string>(['description']);

@Component({
  selector: 'app-service-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ServiceGroupStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule, MatDividerModule,
  ],
  templateUrl: './service-group.component.html',
  styleUrl: './service-group.component.scss',
})
export class ServiceGroupComponent {
  protected readonly store = inject(ServiceGroupStore);
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

  trackByGroupId(_index: number, group: ServiceGroupListItem): string {
    return group.id;
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

  onGroupTypeFilterChange(groupType: GroupType | null): void {
    this.store.setFilter({ groupType });
  }

  onStatusFilterChange(status: 'all' | 'active' | 'inactive'): void {
    this.store.setFilter({ status });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.store.resetFilters();
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.store.setSort('name', 'asc');
      return;
    }
    this.store.setSort(sort.active as ServiceGroupSortField, sort.direction);
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
    const rows = this.store.serviceGroups();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = ['Service Group Code', 'Service Group Name', 'Description', 'Activities', 'Group Type', 'Default', 'Status', 'Created Date', 'Updated Date'];
    const lines = rows.map((g) => [
      g.code,
      g.name,
      g.description ?? '',
      String(g.activityCount),
      g.groupType,
      g.isDefault ? 'Yes' : 'No',
      g.isActive ? 'Active' : 'Inactive',
      g.createdAt,
      g.updatedAt ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `service-groups-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Exported current page to CSV', 'OK', { duration: 3000 });
  }

  exportComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  toggleExpand(group: ServiceGroupListItem, event?: Event): void {
    event?.stopPropagation();
    this.store.toggleExpand(group.id);
  }

  openCreateDialog(): void {
    this.openFormDialog({ mode: 'create' });
  }

  openEditDialog(group: ServiceGroupListItem, event?: Event): void {
    event?.stopPropagation();
    this.openFormDialog({ mode: 'edit', serviceGroupId: group.id });
  }

  private openFormDialog(data: ServiceGroupFormDialogData): void {
    this.dialog.open<ServiceGroupFormDialogComponent, ServiceGroupFormDialogData, ServiceGroupFormDialogResult>(
      ServiceGroupFormDialogComponent,
      {
        width: '900px',
        maxWidth: '95vw',
        height: '85%',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data,
      },
    );
  }

  async openViewDialog(group: ServiceGroupListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    const full = await this.loadFullDetail(group.id);
    if (!full) return;
    this.dialog.open<ServiceGroupViewDialogComponent, ServiceGroupViewDialogData>(ServiceGroupViewDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: { group: full },
    });
  }

  openCloneDialog(group: ServiceGroupListItem, event?: Event): void {
    event?.stopPropagation();
    this.dialog.open<ServiceGroupCloneDialogComponent, ServiceGroupCloneDialogData>(ServiceGroupCloneDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      disableClose: true,
      viewContainerRef: this.viewContainerRef,
      data: { group },
    });
  }

  openCopyDialog(group: ServiceGroupListItem, event?: Event): void {
    event?.stopPropagation();
    this.dialog.open<ServiceGroupCopyDialogComponent, ServiceGroupCopyDialogData>(ServiceGroupCopyDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      disableClose: true,
      viewContainerRef: this.viewContainerRef,
      data: { group },
    });
  }

  openPermissionMatrix(group: ServiceGroupListItem, event?: Event): void {
    event?.stopPropagation();
    this.dialog.open<ServiceGroupPermissionMatrixComponent, ServiceGroupPermissionMatrixData>(ServiceGroupPermissionMatrixComponent, {
      width: '900px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: { serviceGroupId: group.id, serviceGroupName: group.name },
    });
  }

  async openAuditHistory(group: ServiceGroupListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    const full = await this.loadFullDetail(group.id);
    if (!full) return;
    this.dialog.open<ServiceGroupAuditHistoryComponent, ServiceGroupAuditHistoryData>(ServiceGroupAuditHistoryComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { group: full },
    });
  }

  async deleteGroup(group: ServiceGroupListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<ServiceGroupDeleteDialogComponent, ServiceGroupDeleteDialogData, boolean>(
      ServiceGroupDeleteDialogComponent,
      { width: '460px', maxWidth: '95vw', data: { group } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.deleteServiceGroup(group);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async toggleActive(group: ServiceGroupListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    try {
      await this.store.toggleActive(group);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  onStatusChipClick(group: ServiceGroupListItem, event: Event): void {
    if (!this.can(PERMISSIONS.SERVICE_GROUPS_ENABLE) && !this.can(PERMISSIONS.SERVICE_GROUPS_DISABLE)) return;
    this.toggleActive(group, event);
  }

  private async loadFullDetail(id: string): Promise<ServiceGroup | null> {
    const cached = this.store.getDetail(id);
    if (cached) return cached;
    try {
      return await this.store.getServiceGroupById(id);
    } catch {
      this.snack.open('Unable to load Service Group details', 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
      return null;
    }
  }
}
