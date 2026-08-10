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
import { UnitOfMeasurementStore } from './store/unit-of-measurement.store';
import {
  UOM_TYPE_META, UnitOfMeasurement, UnitOfMeasurementSortField, UomType, uomTypeMeta,
} from './models/unit-of-measurement.model';
import {
  UnitOfMeasurementFormDialogComponent, UnitOfMeasurementFormDialogData, UnitOfMeasurementFormDialogResult,
} from './components/unit-of-measurement-form-dialog/unit-of-measurement-form-dialog.component';
import {
  UnitOfMeasurementViewDialogComponent, UnitOfMeasurementViewDialogData,
} from './components/unit-of-measurement-view-dialog/unit-of-measurement-view-dialog.component';
import {
  UnitOfMeasurementDeleteDialogComponent, UnitOfMeasurementDeleteDialogData,
} from './components/unit-of-measurement-delete-dialog/unit-of-measurement-delete-dialog.component';
import {
  UnitOfMeasurementStatusDialogComponent, UnitOfMeasurementStatusDialogData,
} from './components/unit-of-measurement-status-dialog/unit-of-measurement-status-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  /** Present only for the five fields the backend query DTO can actually sort on. */
  sortField?: UnitOfMeasurementSortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'code', label: 'Code', alwaysVisible: true, sortField: 'code' },
  { key: 'name', label: 'Name', alwaysVisible: true, sortField: 'name' },
  { key: 'symbol', label: 'Symbol', alwaysVisible: true },
  { key: 'uomType', label: 'Type', alwaysVisible: true, sortField: 'uomType' },
  { key: 'shortName', label: 'Short Name' },
  { key: 'description', label: 'Description' },
  { key: 'displayOrder', label: 'Display Order', sortField: 'displayOrder' },
  { key: 'status', label: 'Status', alwaysVisible: true },
  { key: 'createdBy', label: 'Created By' },
  { key: 'createdAt', label: 'Created Date', sortField: 'createdAt' },
  { key: 'updatedAt', label: 'Updated Date' },
];

const DEFAULT_HIDDEN_COLUMNS = new Set(['description', 'createdBy', 'updatedAt']);

@Component({
  selector: 'app-unit-of-measurement',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UnitOfMeasurementStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule, MatDividerModule,
  ],
  templateUrl: './unit-of-measurement.component.html',
  styleUrl: './unit-of-measurement.component.scss',
})
export class UnitOfMeasurementComponent {
  protected readonly store = inject(UnitOfMeasurementStore);
  private readonly permissionService = inject(PermissionService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly columnDefs = COLUMN_DEFS;
  protected readonly uomTypes = UOM_TYPE_META;
  protected readonly typeMeta = uomTypeMeta;

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

  trackByUomId(_index: number, uom: UnitOfMeasurement): string {
    return uom.id;
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

  onTypeFilterChange(uomType: UomType | null): void {
    this.store.setFilter({ uomType });
  }

  onStatusFilterChange(status: 'all' | 'active' | 'inactive'): void {
    this.store.setFilter({ status });
  }

  /** Quick-filter chips above the grid — clicking the active family clears it. */
  toggleTypeChip(uomType: UomType): void {
    const current = this.store.filter().uomType;
    this.store.setFilter({ uomType: current === uomType ? null : uomType });
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
    this.store.setSort(sort.active as UnitOfMeasurementSortField, sort.direction);
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
    const rows = this.store.unitsOfMeasurement();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = [
      'Code', 'Name', 'Symbol', 'Short Name', 'Type', 'Description',
      'Display Order', 'Status', 'Created By', 'Created At', 'Updated By', 'Updated At',
    ];
    const lines = rows.map((u) => [
      u.code,
      u.name,
      u.symbol ?? '',
      u.shortName ?? '',
      uomTypeMeta(u.uomType).label,
      u.description ?? '',
      String(u.displayOrder),
      u.isActive ? 'Active' : 'Inactive',
      u.createdBy ?? '',
      u.createdAt,
      u.updatedBy ?? '',
      u.updatedAt ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    // BOM keeps Excel from mangling symbols such as °C and m².
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `unit-of-measurements-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Exported current view to CSV', 'OK', { duration: 3000 });
  }

  exportComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  // ── Row actions ────────────────────────────────────────────────────

  openCreateDialog(): void {
    // Carry the active family filter through as the default type.
    this.openFormDialog({
      mode: 'create',
      uomType: this.store.filter().uomType ?? undefined,
    });
  }

  openEditDialog(uom: UnitOfMeasurement, event?: Event): void {
    event?.stopPropagation();
    this.openFormDialog({ mode: 'edit', unitOfMeasurementId: uom.id });
  }

  openDuplicateDialog(uom: UnitOfMeasurement, event?: Event): void {
    event?.stopPropagation();
    const ref = this.dialog.open<UnitOfMeasurementFormDialogComponent, UnitOfMeasurementFormDialogData, UnitOfMeasurementFormDialogResult>(
      UnitOfMeasurementFormDialogComponent,
      {
        width: '780px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data: { mode: 'create', uomType: uom.uomType },
      },
    );
    ref.componentInstance.prefill({
      name: `${uom.name} (Copy)`,
      symbol: uom.symbol ?? '',
      shortName: uom.shortName ?? '',
      uomType: uom.uomType,
      displayOrder: uom.displayOrder,
      isActive: uom.isActive,
      description: uom.description ?? '',
      remarks: uom.remarks ?? '',
    });
  }

  copyUomCode(uom: UnitOfMeasurement, event?: Event): void {
    event?.stopPropagation();
    navigator.clipboard?.writeText(uom.code).then(() => {
      this.snack.open(`Copied "${uom.code}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  private openFormDialog(data: UnitOfMeasurementFormDialogData): void {
    this.dialog.open<UnitOfMeasurementFormDialogComponent, UnitOfMeasurementFormDialogData, UnitOfMeasurementFormDialogResult>(
      UnitOfMeasurementFormDialogComponent,
      {
        width: '780px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data,
      },
    );
  }

  async openViewDialog(uom: UnitOfMeasurement, event?: Event): Promise<void> {
    event?.stopPropagation();
    // Re-fetch so the dialog shows the freshest record rather than a stale grid row.
    let full = uom;
    try {
      full = await this.store.getUnitOfMeasurementById(uom.id);
    } catch {
      // Fall back to the row we already have — the dialog is read-only either way.
    }
    this.dialog.open<UnitOfMeasurementViewDialogComponent, UnitOfMeasurementViewDialogData>(
      UnitOfMeasurementViewDialogComponent,
      { width: '640px', maxWidth: '95vw', data: { unitOfMeasurement: full } },
    );
  }

  async deleteUom(uom: UnitOfMeasurement, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<UnitOfMeasurementDeleteDialogComponent, UnitOfMeasurementDeleteDialogData, boolean>(
      UnitOfMeasurementDeleteDialogComponent,
      { width: '480px', maxWidth: '95vw', data: { unitOfMeasurement: uom } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.deleteUnitOfMeasurement(uom);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async setActive(uom: UnitOfMeasurement, activate: boolean, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<UnitOfMeasurementStatusDialogComponent, UnitOfMeasurementStatusDialogData, boolean>(
      UnitOfMeasurementStatusDialogComponent,
      { width: '480px', maxWidth: '95vw', data: { unitOfMeasurement: uom, activate } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.setActive(uom, activate);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  onStatusChipClick(uom: UnitOfMeasurement, event: Event): void {
    if (!this.can(PERMISSIONS.UOM_UPDATE)) return;
    this.setActive(uom, !uom.isActive, event);
  }
}
