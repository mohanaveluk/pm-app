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
import { ActivityStore } from './store/activity.store';
import { Activity, ActivitySortField } from './models/activity.model';
import { ActivityFormDialogComponent, ActivityFormDialogData, ActivityFormDialogResult } from './components/activity-form-dialog/activity-form-dialog.component';
import { ActivityViewDialogComponent, ActivityViewDialogData } from './components/activity-view-dialog/activity-view-dialog.component';
import { ActivityDeleteDialogComponent, ActivityDeleteDialogData } from './components/activity-delete-dialog/activity-delete-dialog.component';
import { ActivityFilterDialogComponent, ActivityFilterDialogData, ActivityFilterDialogResult } from './components/activity-filter-dialog/activity-filter-dialog.component';
import { ActivityImportDialogComponent } from './components/activity-import-dialog/activity-import-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  sortField?: ActivitySortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'code', label: 'Activity Code', alwaysVisible: true, sortField: 'code' },
  { key: 'name', label: 'Activity Name', alwaysVisible: true, sortField: 'name' },
  { key: 'shortName', label: 'Short Name' },
  { key: 'department', label: 'Department' },
  { key: 'discipline', label: 'Discipline' },
  { key: 'moduleGroup', label: 'Module Group', sortField: 'moduleGroup' },
  { key: 'featureKey', label: 'Feature Key' },
  { key: 'routeUrl', label: 'Route URL' },
  { key: 'displayOrder', label: 'Display Order', sortField: 'displayOrder' },
  { key: 'status', label: 'Status', alwaysVisible: true },
  { key: 'createdAt', label: 'Created Date', sortField: 'createdAt' },
  { key: 'updatedAt', label: 'Updated Date' },
];

const DEFAULT_HIDDEN_COLUMNS = new Set<string>(['featureKey', 'routeUrl']);

@Component({
  selector: 'app-activity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ActivityStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule, MatDividerModule, MatBadgeModule,
  ],
  templateUrl: './activity.component.html',
  styleUrl: './activity.component.scss',
})
export class ActivityComponent {
  protected readonly store = inject(ActivityStore);
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

  trackByActivityId(_index: number, activity: Activity): string {
    return activity.id;
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

  onDepartmentFilterChange(departmentId: string | null): void {
    this.store.setFilter({ departmentId: departmentId || null });
  }

  onDisciplineFilterChange(disciplineId: string | null): void {
    this.store.setFilter({ disciplineId: disciplineId || null });
  }

  onStatusFilterChange(status: 'all' | 'active' | 'inactive'): void {
    this.store.setFilter({ status });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.store.resetFilters();
  }

  openAdvancedFilters(): void {
    this.dialog
      .open<ActivityFilterDialogComponent, ActivityFilterDialogData, ActivityFilterDialogResult>(
        ActivityFilterDialogComponent,
        { width: '600px', maxWidth: '95vw', viewContainerRef: this.viewContainerRef, data: { filter: this.store.filter() } },
      )
      .afterClosed()
      .subscribe((result) => {
        if (result) this.store.setFilter(result);
      });
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.store.setSort('displayOrder', 'asc');
      return;
    }
    this.store.setSort(sort.active as ActivitySortField, sort.direction);
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
    const rows = this.store.activities();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = ['Activity Code', 'Activity Name', 'Short Name', 'Department', 'Discipline', 'Module Group', 'Feature Key', 'Route URL', 'Display Order', 'Status', 'Created Date', 'Updated Date'];
    const lines = rows.map((a) => [
      a.code,
      a.name,
      a.shortName ?? '',
      a.departmentName,
      a.disciplineName,
      a.moduleGroup ?? '',
      a.featureKey ?? '',
      a.routeUrl ?? '',
      String(a.displayOrder),
      a.isActive ? 'Active' : 'Inactive',
      a.createdAt,
      a.updatedAt ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activities-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Exported current page to CSV', 'OK', { duration: 3000 });
  }

  exportComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  openImportDialog(): void {
    this.dialog.open(ActivityImportDialogComponent, { width: '460px', maxWidth: '95vw' });
  }

  openCreateDialog(): void {
    this.openFormDialog({ mode: 'create' });
  }

  openBulkCreateDialog(): void {
    this.openFormDialog({ mode: 'bulk' });
  }

  openEditDialog(activity: Activity, event?: Event): void {
    event?.stopPropagation();
    this.openFormDialog({ mode: 'edit', activityId: activity.id });
  }

  openDuplicateDialog(activity: Activity, event?: Event): void {
    event?.stopPropagation();
    const ref = this.dialog.open<ActivityFormDialogComponent, ActivityFormDialogData, ActivityFormDialogResult>(
      ActivityFormDialogComponent,
      {
        width: '840px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data: { mode: 'create', presetDisciplineId: activity.disciplineId, presetDepartmentId: activity.departmentId },
      },
    );
    ref.componentInstance.prefill({
      shortName: activity.shortName,
      description: activity.description,
      moduleGroup: activity.moduleGroup,
      icon: activity.icon,
      isActive: activity.isActive,
    });
  }

  copyActivityReference(activity: Activity, event?: Event): void {
    event?.stopPropagation();
    const text = `${activity.code} — ${activity.name}`;
    navigator.clipboard?.writeText(text).then(() => {
      this.snack.open(`Copied "${text}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  private openFormDialog(data: ActivityFormDialogData): void {
    this.dialog.open<ActivityFormDialogComponent, ActivityFormDialogData, ActivityFormDialogResult>(
      ActivityFormDialogComponent,
      {
        width: '840px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data,
      },
    );
  }

  openViewDialog(activity: Activity, event?: Event): void {
    event?.stopPropagation();
    this.dialog.open<ActivityViewDialogComponent, ActivityViewDialogData>(ActivityViewDialogComponent, {
      width: '680px',
      maxWidth: '95vw',
      data: { activity },
    });
  }

  async deleteActivity(activity: Activity, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<ActivityDeleteDialogComponent, ActivityDeleteDialogData, boolean>(
      ActivityDeleteDialogComponent,
      { width: '460px', maxWidth: '95vw', data: { activity } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.deleteActivity(activity);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async toggleActive(activity: Activity, event?: Event): Promise<void> {
    event?.stopPropagation();
    try {
      await this.store.toggleActive(activity);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  onStatusChipClick(activity: Activity, event: Event): void {
    if (!this.can(PERMISSIONS.ACTIVITIES_UPDATE)) return;
    this.toggleActive(activity, event);
  }
}
