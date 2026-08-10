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
import { MaterialGroupStore } from './store/material-group.store';
import { MaterialGroup, MaterialGroupSortField } from './models/material-group.model';
import {
  MaterialGroupFormDialogComponent, MaterialGroupFormDialogData, MaterialGroupFormDialogResult,
} from './components/material-group-form-dialog/material-group-form-dialog.component';
import {
  MaterialGroupViewDialogComponent, MaterialGroupViewDialogData,
} from './components/material-group-view-dialog/material-group-view-dialog.component';
import {
  MaterialGroupDeleteDialogComponent, MaterialGroupDeleteDialogData,
} from './components/material-group-delete-dialog/material-group-delete-dialog.component';
import {
  MaterialGroupStatusDialogComponent, MaterialGroupStatusDialogData,
} from './components/material-group-status-dialog/material-group-status-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  /** Present only for the four fields the backend query DTO can actually sort on. */
  sortField?: MaterialGroupSortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'code', label: 'Code', alwaysVisible: true, sortField: 'code' },
  { key: 'name', label: 'Name', alwaysVisible: true, sortField: 'name' },
  { key: 'category', label: 'Material Category', alwaysVisible: true },
  { key: 'shortName', label: 'Short Name' },
  { key: 'description', label: 'Description' },
  { key: 'displayOrder', label: 'Display Order', sortField: 'displayOrder' },
  { key: 'isSystem', label: 'System' },
  { key: 'status', label: 'Status', alwaysVisible: true },
  { key: 'createdBy', label: 'Created By' },
  { key: 'createdAt', label: 'Created Date', sortField: 'createdAt' },
  { key: 'updatedAt', label: 'Updated Date' },
];

const DEFAULT_HIDDEN_COLUMNS = new Set(['description', 'createdBy', 'updatedAt']);

@Component({
  selector: 'app-material-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MaterialGroupStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule, MatDividerModule,
  ],
  templateUrl: './material-group.component.html',
  styleUrl: './material-group.component.scss',
})
export class MaterialGroupComponent {
  protected readonly store = inject(MaterialGroupStore);
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

  /** Placeholder rows for the skeleton loading state. */
  protected readonly skeletonRows = Array.from({ length: 6 });

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  trackByGroupId(_index: number, group: MaterialGroup): string {
    return group.id;
  }

  // ── Search / filter / sort / paging ────────────────────────────────

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

  onCategoryFilterChange(materialCategoryId: string | null): void {
    this.store.setFilter({ materialCategoryId });
  }

  onStatusFilterChange(status: 'all' | 'active' | 'inactive'): void {
    this.store.setFilter({ status });
  }

  onSystemFilterChange(isSystem: boolean | null): void {
    this.store.setFilter({ isSystem });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.store.resetFilters();
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.store.setSort('displayOrder', 'asc');
      return;
    }
    this.store.setSort(sort.active as MaterialGroupSortField, sort.direction);
  }

  onPageChange(event: PageEvent): void {
    this.store.setPage(event.pageIndex, event.pageSize);
  }

  // ── Table chrome ───────────────────────────────────────────────────

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

  resetColumns(): void {
    this.hiddenColumns.set(new Set(DEFAULT_HIDDEN_COLUMNS));
  }

  toggleDensity(): void {
    this.compactDensity.update((v) => !v);
  }

  toggleFullscreen(): void {
    this.isFullscreen.update((v) => !v);
  }

  /** Escape leaves fullscreen. */
  onEscape(): void {
    if (this.isFullscreen()) this.isFullscreen.set(false);
  }

  print(): void {
    window.print();
  }

  exportCsv(): void {
    const rows = this.store.materialGroups();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = [
      'Category Code', 'Category Name', 'Code', 'Name', 'Short Name', 'Description',
      'Display Order', 'Status', 'System', 'Created By', 'Created At', 'Updated By', 'Updated At',
    ];
    const lines = rows.map((g) => [
      g.materialCategoryCode,
      g.materialCategoryName,
      g.code,
      g.name,
      g.shortName ?? '',
      g.description ?? '',
      String(g.displayOrder),
      g.isActive ? 'Active' : 'Inactive',
      g.isSystem ? 'Yes' : 'No',
      g.createdBy ?? '',
      g.createdAt,
      g.updatedBy ?? '',
      g.updatedAt ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `material-groups-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Exported current view to CSV', 'OK', { duration: 3000 });
  }

  exportComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  // ── Row actions ────────────────────────────────────────────────────

  openCreateDialog(): void {
    // Carry the active category filter through as the default parent.
    this.openFormDialog({
      mode: 'create',
      materialCategoryId: this.store.filter().materialCategoryId ?? undefined,
    });
  }

  openEditDialog(group: MaterialGroup, event?: Event): void {
    event?.stopPropagation();
    this.openFormDialog({ mode: 'edit', materialGroupId: group.id });
  }

  openDuplicateDialog(group: MaterialGroup, event?: Event): void {
    event?.stopPropagation();
    const ref = this.dialog.open<MaterialGroupFormDialogComponent, MaterialGroupFormDialogData, MaterialGroupFormDialogResult>(
      MaterialGroupFormDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data: { mode: 'create', materialCategoryId: group.materialCategoryId },
      },
    );
    ref.componentInstance.prefill({
      materialCategoryId: group.materialCategoryId,
      name: `${group.name} (Copy)`,
      shortName: group.shortName ?? '',
      displayOrder: group.displayOrder,
      isActive: group.isActive,
      description: group.description ?? '',
      remarks: group.remarks ?? '',
    });
  }

  copyGroupCode(group: MaterialGroup, event?: Event): void {
    event?.stopPropagation();
    navigator.clipboard?.writeText(group.code).then(() => {
      this.snack.open(`Copied "${group.code}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  private openFormDialog(data: MaterialGroupFormDialogData): void {
    this.dialog.open<MaterialGroupFormDialogComponent, MaterialGroupFormDialogData, MaterialGroupFormDialogResult>(
      MaterialGroupFormDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data,
      },
    );
  }

  async openViewDialog(group: MaterialGroup, event?: Event): Promise<void> {
    event?.stopPropagation();
    // Re-fetch so the dialog shows the freshest record rather than a stale grid row.
    let full = group;
    try {
      full = await this.store.getMaterialGroupById(group.id);
    } catch {
      // Fall back to the row we already have — the dialog is read-only either way.
    }
    this.dialog.open<MaterialGroupViewDialogComponent, MaterialGroupViewDialogData>(
      MaterialGroupViewDialogComponent,
      { width: '640px', maxWidth: '95vw', data: { materialGroup: full } },
    );
  }

  async deleteGroup(group: MaterialGroup, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<MaterialGroupDeleteDialogComponent, MaterialGroupDeleteDialogData, boolean>(
      MaterialGroupDeleteDialogComponent,
      { width: '460px', maxWidth: '95vw', data: { materialGroup: group } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.deleteMaterialGroup(group);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async setActive(group: MaterialGroup, activate: boolean, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<MaterialGroupStatusDialogComponent, MaterialGroupStatusDialogData, boolean>(
      MaterialGroupStatusDialogComponent,
      { width: '460px', maxWidth: '95vw', data: { materialGroup: group, activate } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.setActive(group, activate);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  onStatusChipClick(group: MaterialGroup, event: Event): void {
    const needed = group.isActive
      ? PERMISSIONS.MATERIAL_GROUPS_DISABLE
      : PERMISSIONS.MATERIAL_GROUPS_ENABLE;
    if (!this.can(needed)) return;
    this.setActive(group, !group.isActive, event);
  }

  /** True when the row's status can be toggled by the current user. */
  canToggle(group: MaterialGroup): boolean {
    return this.can(
      group.isActive
        ? PERMISSIONS.MATERIAL_GROUPS_DISABLE
        : PERMISSIONS.MATERIAL_GROUPS_ENABLE,
    );
  }
}
