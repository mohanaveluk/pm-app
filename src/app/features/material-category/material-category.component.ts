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
import { MaterialCategoryStore } from './store/material-category.store';
import { MaterialCategory, MaterialCategorySortField } from './models/material-category.model';
import {
  MaterialCategoryFormDialogComponent, MaterialCategoryFormDialogData, MaterialCategoryFormDialogResult,
} from './components/material-category-form-dialog/material-category-form-dialog.component';
import {
  MaterialCategoryViewDialogComponent, MaterialCategoryViewDialogData,
} from './components/material-category-view-dialog/material-category-view-dialog.component';
import {
  MaterialCategoryDeleteDialogComponent, MaterialCategoryDeleteDialogData,
} from './components/material-category-delete-dialog/material-category-delete-dialog.component';
import {
  MaterialCategoryStatusDialogComponent, MaterialCategoryStatusDialogData,
} from './components/material-category-status-dialog/material-category-status-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  /** Present only for the four fields the backend query DTO can actually sort on. */
  sortField?: MaterialCategorySortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'code', label: 'Code', alwaysVisible: true, sortField: 'code' },
  { key: 'name', label: 'Name', alwaysVisible: true, sortField: 'name' },
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
  selector: 'app-material-category',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MaterialCategoryStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule, MatDividerModule,
  ],
  templateUrl: './material-category.component.html',
  styleUrl: './material-category.component.scss',
})
export class MaterialCategoryComponent {
  protected readonly store = inject(MaterialCategoryStore);
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

  trackByCategoryId(_index: number, category: MaterialCategory): string {
    return category.id;
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
    this.store.setSort(sort.active as MaterialCategorySortField, sort.direction);
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

  /** Escape leaves fullscreen — matches the keyboard expectations in the spec. */
  onEscape(): void {
    if (this.isFullscreen()) this.isFullscreen.set(false);
  }

  print(): void {
    window.print();
  }

  exportCsv(): void {
    const rows = this.store.materialCategories();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = [
      'Code', 'Name', 'Short Name', 'Description', 'Display Order',
      'Status', 'System', 'Created By', 'Created At', 'Updated By', 'Updated At',
    ];
    const lines = rows.map((c) => [
      c.code,
      c.name,
      c.shortName ?? '',
      c.description ?? '',
      String(c.displayOrder),
      c.isActive ? 'Active' : 'Inactive',
      c.isSystem ? 'Yes' : 'No',
      c.createdBy ?? '',
      c.createdAt,
      c.updatedBy ?? '',
      c.updatedAt ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `material-categories-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Exported current view to CSV', 'OK', { duration: 3000 });
  }

  exportComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  // ── Row actions ────────────────────────────────────────────────────

  openCreateDialog(): void {
    this.openFormDialog({ mode: 'create' });
  }

  openEditDialog(category: MaterialCategory, event?: Event): void {
    event?.stopPropagation();
    this.openFormDialog({ mode: 'edit', materialCategoryId: category.id });
  }

  openDuplicateDialog(category: MaterialCategory, event?: Event): void {
    event?.stopPropagation();
    const ref = this.dialog.open<MaterialCategoryFormDialogComponent, MaterialCategoryFormDialogData, MaterialCategoryFormDialogResult>(
      MaterialCategoryFormDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data: { mode: 'create' },
      },
    );
    ref.componentInstance.prefill({
      name: `${category.name} (Copy)`,
      shortName: category.shortName ?? '',
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      description: category.description ?? '',
      remarks: category.remarks ?? '',
    });
  }

  copyCategoryCode(category: MaterialCategory, event?: Event): void {
    event?.stopPropagation();
    navigator.clipboard?.writeText(category.code).then(() => {
      this.snack.open(`Copied "${category.code}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  private openFormDialog(data: MaterialCategoryFormDialogData): void {
    this.dialog.open<MaterialCategoryFormDialogComponent, MaterialCategoryFormDialogData, MaterialCategoryFormDialogResult>(
      MaterialCategoryFormDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data,
      },
    );
  }

  async openViewDialog(category: MaterialCategory, event?: Event): Promise<void> {
    event?.stopPropagation();
    // Re-fetch so the dialog shows the freshest record rather than a stale grid row.
    let full = category;
    try {
      full = await this.store.getMaterialCategoryById(category.id);
    } catch {
      // Fall back to the row we already have — the dialog is read-only either way.
    }
    this.dialog.open<MaterialCategoryViewDialogComponent, MaterialCategoryViewDialogData>(
      MaterialCategoryViewDialogComponent,
      { width: '640px', maxWidth: '95vw', data: { materialCategory: full } },
    );
  }

  async deleteCategory(category: MaterialCategory, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<MaterialCategoryDeleteDialogComponent, MaterialCategoryDeleteDialogData, boolean>(
      MaterialCategoryDeleteDialogComponent,
      { width: '460px', maxWidth: '95vw', data: { materialCategory: category } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.deleteMaterialCategory(category);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async setActive(category: MaterialCategory, activate: boolean, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<MaterialCategoryStatusDialogComponent, MaterialCategoryStatusDialogData, boolean>(
      MaterialCategoryStatusDialogComponent,
      { width: '460px', maxWidth: '95vw', data: { materialCategory: category, activate } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.setActive(category, activate);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  onStatusChipClick(category: MaterialCategory, event: Event): void {
    const needed = category.isActive
      ? PERMISSIONS.MATERIAL_CATEGORIES_DISABLE
      : PERMISSIONS.MATERIAL_CATEGORIES_ENABLE;
    if (!this.can(needed)) return;
    this.setActive(category, !category.isActive, event);
  }

  /** True when the row's status can be toggled by the current user. */
  canToggle(category: MaterialCategory): boolean {
    return this.can(
      category.isActive
        ? PERMISSIONS.MATERIAL_CATEGORIES_DISABLE
        : PERMISSIONS.MATERIAL_CATEGORIES_ENABLE,
    );
  }
}
