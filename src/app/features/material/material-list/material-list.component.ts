import { ChangeDetectionStrategy, Component, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { PermissionService } from '../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../core/rbac/permissions.const';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MaterialListStore } from '../store/material-list.store';
import {
  CRITICALITY_OPTIONS, CriticalityLevel, MATERIAL_STATUS_OPTIONS,
  MaterialListItem, MaterialSortField, MaterialStatus,
} from '../models/material.model';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  sortField?: MaterialSortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'code', label: 'Material Code', alwaysVisible: true, sortField: 'code' },
  { key: 'shortDescription', label: 'Short Description', alwaysVisible: true, sortField: 'shortDescription' },
  { key: 'category', label: 'Category' },
  { key: 'group', label: 'Material Group' },
  { key: 'uom', label: 'UOM' },
  { key: 'status', label: 'Status', alwaysVisible: true, sortField: 'status' },
  { key: 'criticality', label: 'Criticality', sortField: 'criticalityLevel' },
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'updatedAt', label: 'Updated At', sortField: 'updatedAt' },
];

const DEFAULT_HIDDEN_COLUMNS = new Set(['manufacturer']);
const COLUMN_PREF_KEY = 'pm_material_columns';

/** Material Master list — the entry point into the workspace. */
@Component({
  selector: 'app-material-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MaterialListStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule,
    MatPaginatorModule, MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule,
    MatDividerModule, MatExpansionModule, MatBadgeModule,
  ],
  templateUrl: './material-list.component.html',
  styleUrl: './material-list.component.scss',
})
export class MaterialListComponent {
  protected readonly store = inject(MaterialListStore);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly columnDefs = COLUMN_DEFS;
  protected readonly statusOptions = MATERIAL_STATUS_OPTIONS;
  protected readonly criticalityOptions = CRITICALITY_OPTIONS;
  protected readonly MaterialStatus = MaterialStatus;

  protected readonly searchTerm = signal('');
  protected readonly isFullscreen = signal(false);
  protected readonly compactDensity = signal(false);
  protected readonly filtersOpen = signal(false);
  protected readonly hiddenColumns = signal(this.loadColumnPrefs());

  protected readonly displayedColumns = computed(() =>
    this.columnDefs.filter((c) => !this.hiddenColumns().has(c.key)).map((c) => c.key),
  );

  protected readonly skeletonRows = Array.from({ length: 6 });

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  trackByMaterialId(_index: number, material: MaterialListItem): string {
    return material.id;
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

  resetFilters(): void {
    this.searchTerm.set('');
    this.store.resetFilters();
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.store.setSort('createdAt', 'desc');
      return;
    }
    this.store.setSort(sort.active as MaterialSortField, sort.direction);
  }

  onPageChange(event: PageEvent): void {
    this.store.setPage(event.pageIndex, event.pageSize);
  }

  toggleFilters(): void {
    this.filtersOpen.update((v) => !v);
  }

  // ── Table chrome ───────────────────────────────────────────────────

  private loadColumnPrefs(): Set<string> {
    try {
      const raw = localStorage.getItem(COLUMN_PREF_KEY);
      if (raw) return new Set<string>(JSON.parse(raw) as string[]);
    } catch {
      // Corrupt preference — fall through to defaults.
    }
    return new Set(DEFAULT_HIDDEN_COLUMNS);
  }

  private persistColumnPrefs(hidden: Set<string>): void {
    try {
      localStorage.setItem(COLUMN_PREF_KEY, JSON.stringify([...hidden]));
    } catch {
      // Storage unavailable (private mode) — preferences simply don't persist.
    }
  }

  toggleColumn(key: string): void {
    this.hiddenColumns.update((hidden) => {
      const next = new Set(hidden);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      this.persistColumnPrefs(next);
      return next;
    });
  }

  isColumnVisible(key: string): boolean {
    return !this.hiddenColumns().has(key);
  }

  resetColumns(): void {
    const next = new Set(DEFAULT_HIDDEN_COLUMNS);
    this.hiddenColumns.set(next);
    this.persistColumnPrefs(next);
  }

  toggleDensity(): void {
    this.compactDensity.update((v) => !v);
  }

  toggleFullscreen(): void {
    this.isFullscreen.update((v) => !v);
  }

  onEscape(): void {
    if (this.isFullscreen()) this.isFullscreen.set(false);
  }

  print(): void {
    window.print();
  }

  exportCsv(): void {
    const rows = this.store.materials();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = [
      'Material Code', 'Short Description', 'Category', 'Material Group', 'UOM',
      'Status', 'Criticality', 'Manufacturer', 'Stock Item', 'Created At', 'Updated At',
    ];
    const lines = rows.map((m) => [
      m.code,
      m.shortDescription,
      m.materialCategoryName ?? '',
      m.materialGroupName ?? '',
      m.uomSymbol ?? '',
      m.status,
      m.criticalityLevel,
      m.manufacturerName ?? '',
      m.isStockItem ? 'Yes' : 'No',
      m.createdAt,
      m.updatedAt ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `materials-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Exported current view to CSV', 'OK', { duration: 3000 });
  }

  exportComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  // ── Navigation ─────────────────────────────────────────────────────

  createMaterial(): void {
    void this.router.navigate(['/admin/materials/create']);
  }

  viewMaterial(material: MaterialListItem, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/admin/materials', material.id]);
  }

  editMaterial(material: MaterialListItem, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/admin/materials', material.id, 'edit']);
  }

  copyCode(material: MaterialListItem, event?: Event): void {
    event?.stopPropagation();
    navigator.clipboard?.writeText(material.code).then(() => {
      this.snack.open(`Copied "${material.code}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  async cloneMaterial(material: MaterialListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    try {
      await this.store.cloneMaterial(material);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  // ── Lifecycle actions ──────────────────────────────────────────────

  async setStatus(material: MaterialListItem, status: MaterialStatus, event?: Event): Promise<void> {
    event?.stopPropagation();

    const copy = {
      [MaterialStatus.ACTIVE]: {
        title: 'Enable Material?',
        message: `Make "${material.shortDescription}" (${material.code}) available for new transactions?`,
        confirmText: 'Enable',
        color: 'primary' as const,
        icon: 'toggle_on',
      },
      [MaterialStatus.INACTIVE]: {
        title: 'Disable Material?',
        message: `Exclude "${material.shortDescription}" (${material.code}) from new transactions? Existing history is kept.`,
        confirmText: 'Disable',
        color: 'warn' as const,
        icon: 'toggle_off',
      },
      [MaterialStatus.OBSOLETE]: {
        title: 'Mark Material Obsolete?',
        message: `"${material.shortDescription}" (${material.code}) will be permanently retired and cannot be re-activated. Existing history is kept.`,
        confirmText: 'Mark Obsolete',
        color: 'warn' as const,
        icon: 'block',
      },
    }[status];

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: copy,
    });
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;

    try {
      await this.store.setStatus(material, status);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async deleteMaterial(material: MaterialListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        title: 'Delete Material?',
        message: `Are you sure you want to delete "${material.shortDescription}" (${material.code})? This record will be soft-deleted and will no longer be available for selection.`,
        confirmText: 'Delete',
        color: 'warn',
        icon: 'warning',
      },
    });
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;

    try {
      await this.store.deleteMaterial(material);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  // ── Display helpers ────────────────────────────────────────────────

  statusClass(status: MaterialStatus): string {
    switch (status) {
      case MaterialStatus.ACTIVE:   return 'status-chip status-chip--active';
      case MaterialStatus.INACTIVE: return 'status-chip status-chip--inactive';
      case MaterialStatus.OBSOLETE: return 'status-chip status-chip--obsolete';
      default: return 'status-chip';
    }
  }

  criticalityClass(level: CriticalityLevel): string {
    switch (level) {
      case CriticalityLevel.HIGH:   return 'crit-chip crit-chip--high';
      case CriticalityLevel.MEDIUM: return 'crit-chip crit-chip--medium';
      case CriticalityLevel.LOW:    return 'crit-chip crit-chip--low';
      default: return 'crit-chip';
    }
  }
}
