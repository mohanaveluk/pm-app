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
import { IndustryCategoryStore } from './store/industry-category.store';
import { IndustryCategory, IndustryCategorySortField } from './models/industry-category.model';
import {
  IndustryCategoryFormDialogComponent, IndustryCategoryFormDialogData, IndustryCategoryFormDialogResult,
} from './components/industry-category-form-dialog/industry-category-form-dialog.component';
import {
  IndustryCategoryViewDialogComponent, IndustryCategoryViewDialogData,
} from './components/industry-category-view-dialog/industry-category-view-dialog.component';
import {
  IndustryCategoryDeleteDialogComponent, IndustryCategoryDeleteDialogData,
} from './components/industry-category-delete-dialog/industry-category-delete-dialog.component';
import {
  IndustryCategoryStatusDialogComponent, IndustryCategoryStatusDialogData,
} from './components/industry-category-status-dialog/industry-category-status-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  /** Present only for the four fields the backend query DTO can actually sort on. */
  sortField?: IndustryCategorySortField;
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
  selector: 'app-industry-category',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [IndustryCategoryStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule, MatDividerModule,
  ],
  templateUrl: './industry-category.component.html',
  styleUrl: './industry-category.component.scss',
})
export class IndustryCategoryComponent {
  protected readonly store = inject(IndustryCategoryStore);
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

  trackByCategoryId(_index: number, category: IndustryCategory): string {
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
    this.store.setSort(sort.active as IndustryCategorySortField, sort.direction);
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
    const rows = this.store.industryCategories();
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
    link.download = `industry-categories-${new Date().toISOString().slice(0, 10)}.csv`;
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

  openEditDialog(category: IndustryCategory, event?: Event): void {
    event?.stopPropagation();
    this.openFormDialog({ mode: 'edit', industryCategoryId: category.id });
  }

  openDuplicateDialog(category: IndustryCategory, event?: Event): void {
    event?.stopPropagation();
    const ref = this.dialog.open<IndustryCategoryFormDialogComponent, IndustryCategoryFormDialogData, IndustryCategoryFormDialogResult>(
      IndustryCategoryFormDialogComponent,
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

  copyCategoryCode(category: IndustryCategory, event?: Event): void {
    event?.stopPropagation();
    navigator.clipboard?.writeText(category.code).then(() => {
      this.snack.open(`Copied "${category.code}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  private openFormDialog(data: IndustryCategoryFormDialogData): void {
    this.dialog.open<IndustryCategoryFormDialogComponent, IndustryCategoryFormDialogData, IndustryCategoryFormDialogResult>(
      IndustryCategoryFormDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data,
      },
    );
  }

  async openViewDialog(category: IndustryCategory, event?: Event): Promise<void> {
    event?.stopPropagation();
    // Re-fetch so the dialog shows the freshest record rather than a stale grid row.
    let full = category;
    try {
      full = await this.store.getIndustryCategoryById(category.id);
    } catch {
      // Fall back to the row we already have — the dialog is read-only either way.
    }
    this.dialog.open<IndustryCategoryViewDialogComponent, IndustryCategoryViewDialogData>(
      IndustryCategoryViewDialogComponent,
      { width: '640px', maxWidth: '95vw', data: { industryCategory: full } },
    );
  }

  async deleteCategory(category: IndustryCategory, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<IndustryCategoryDeleteDialogComponent, IndustryCategoryDeleteDialogData, boolean>(
      IndustryCategoryDeleteDialogComponent,
      { width: '460px', maxWidth: '95vw', data: { industryCategory: category } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.deleteIndustryCategory(category);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async setActive(category: IndustryCategory, activate: boolean, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<IndustryCategoryStatusDialogComponent, IndustryCategoryStatusDialogData, boolean>(
      IndustryCategoryStatusDialogComponent,
      { width: '460px', maxWidth: '95vw', data: { industryCategory: category, activate } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.setActive(category, activate);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  onStatusChipClick(category: IndustryCategory, event: Event): void {
    const needed = category.isActive
      ? PERMISSIONS.INDUSTRY_CATEGORIES_DISABLE
      : PERMISSIONS.INDUSTRY_CATEGORIES_ENABLE;
    if (!this.can(needed)) return;
    this.setActive(category, !category.isActive, event);
  }

  /** True when the row's status can be toggled by the current user. */
  canToggle(category: IndustryCategory): boolean {
    return this.can(
      category.isActive
        ? PERMISSIONS.INDUSTRY_CATEGORIES_DISABLE
        : PERMISSIONS.INDUSTRY_CATEGORIES_ENABLE,
    );
  }
}
