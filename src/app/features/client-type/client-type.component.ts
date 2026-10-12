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
import { ClientTypeStore } from './store/client-type.store';
import { ClientType, ClientTypeSortField } from './models/client-type.model';
import {
  ClientTypeFormDialogComponent, ClientTypeFormDialogData, ClientTypeFormDialogResult,
} from './components/client-type-form-dialog/client-type-form-dialog.component';
import {
  ClientTypeViewDialogComponent, ClientTypeViewDialogData,
} from './components/client-type-view-dialog/client-type-view-dialog.component';
import {
  ClientTypeDeleteDialogComponent, ClientTypeDeleteDialogData,
} from './components/client-type-delete-dialog/client-type-delete-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  /** Present only for the four fields the backend query DTO can actually sort on. */
  sortField?: ClientTypeSortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'code', label: 'Code', alwaysVisible: true, sortField: 'code' },
  { key: 'name', label: 'Name', alwaysVisible: true, sortField: 'name' },
  { key: 'shortName', label: 'Short Name' },
  { key: 'description', label: 'Description' },
  { key: 'displayOrder', label: 'Display Order', sortField: 'displayOrder' },
  { key: 'status', label: 'Status', alwaysVisible: true },
  { key: 'createdBy', label: 'Created By' },
  { key: 'createdAt', label: 'Created At', sortField: 'createdAt' },
  { key: 'updatedBy', label: 'Updated By' },
  { key: 'updatedAt', label: 'Updated At' },
];

const DEFAULT_HIDDEN_COLUMNS = new Set(['description', 'createdBy', 'updatedBy', 'updatedAt']);

/**
 * Client Type Master — the administrable classification of what kind of organization a client is
 * (owner, operator, EPC contractor, consultant, government, …).
 *
 * Built as a natural extension of the Department/Industry Category masters:
 * same page chrome, toolbar, filters, table, dialogs, RBAC and error-handling
 * conventions — only the fields and API contract differ, exactly as dictated
 * by ClientTypeController/ClientTypeService.
 */
@Component({
  selector: 'app-client-type',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ClientTypeStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule, MatDividerModule,
  ],
  templateUrl: './client-type.component.html',
  styleUrl: './client-type.component.scss',
})
export class ClientTypeComponent {
  protected readonly store = inject(ClientTypeStore);
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

  trackByClientTypeId(_index: number, clientType: ClientType): string {
    return clientType.id;
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

  resetFilters(): void {
    this.searchTerm.set('');
    this.store.resetFilters();
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.store.setSort('displayOrder', 'asc');
      return;
    }
    this.store.setSort(sort.active as ClientTypeSortField, sort.direction);
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

  /** Escape leaves fullscreen — matches keyboard expectations for a full-page overlay. */
  onEscape(): void {
    if (this.isFullscreen()) this.isFullscreen.set(false);
  }

  print(): void {
    window.print();
  }

  // ── Export ─────────────────────────────────────────────────────────
  // CSV export runs client-side against the rows already loaded (the current
  // page), same as Department/Industry Category — no export API exists yet.
  // Wiring one later only changes this method, not the toolbar or RBAC gate.

  exportCsv(): void {
    const rows = this.store.clientTypes();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = [
      'Code', 'Name', 'Short Name', 'Description', 'Display Order',
      'Status', 'Created By', 'Created At', 'Updated By', 'Updated At',
    ];
    const lines = rows.map((v) => [
      v.code,
      v.name,
      v.shortName ?? '',
      v.description ?? '',
      String(v.displayOrder),
      v.isActive ? 'Active' : 'Inactive',
      v.createdBy ?? '',
      v.createdAt,
      v.updatedBy ?? '',
      v.updatedAt ?? '',
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client-types-${new Date().toISOString().slice(0, 10)}.csv`;
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

  openEditDialog(clientType: ClientType, event?: Event): void {
    event?.stopPropagation();
    this.openFormDialog({ mode: 'edit', clientTypeId: clientType.id });
  }

  openDuplicateDialog(clientType: ClientType, event?: Event): void {
    event?.stopPropagation();
    const ref = this.dialog.open<ClientTypeFormDialogComponent, ClientTypeFormDialogData, ClientTypeFormDialogResult>(
      ClientTypeFormDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data: { mode: 'create' },
      },
    );
    ref.componentInstance.prefill({
      name: `${clientType.name} (Copy)`,
      shortName: clientType.shortName ?? '',
      displayOrder: clientType.displayOrder,
      isActive: clientType.isActive,
      description: clientType.description ?? '',
      remarks: clientType.remarks ?? '',
    });
  }

  copyClientTypeCode(clientType: ClientType, event?: Event): void {
    event?.stopPropagation();
    navigator.clipboard?.writeText(clientType.code).then(() => {
      this.snack.open(`Copied "${clientType.code}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  private openFormDialog(data: ClientTypeFormDialogData): void {
    this.dialog.open<ClientTypeFormDialogComponent, ClientTypeFormDialogData, ClientTypeFormDialogResult>(
      ClientTypeFormDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data,
      },
    );
  }

  async openViewDialog(clientType: ClientType, event?: Event): Promise<void> {
    event?.stopPropagation();
    // Re-fetch so the dialog shows the freshest record rather than a stale grid row.
    let full = clientType;
    try {
      full = await this.store.getClientTypeById(clientType.id);
    } catch {
      // Fall back to the row we already have — the dialog is read-only either way.
    }
    this.dialog.open<ClientTypeViewDialogComponent, ClientTypeViewDialogData>(
      ClientTypeViewDialogComponent,
      { width: '600px', maxWidth: '95vw', data: { clientType: full } },
    );
  }

  async deleteClientType(clientType: ClientType, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<ClientTypeDeleteDialogComponent, ClientTypeDeleteDialogData, boolean>(
      ClientTypeDeleteDialogComponent,
      { width: '460px', maxWidth: '95vw', data: { clientType } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.deleteClientType(clientType);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async toggleActive(clientType: ClientType, event?: Event): Promise<void> {
    event?.stopPropagation();
    try {
      await this.store.toggleActive(clientType);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  onStatusChipClick(clientType: ClientType, event: Event): void {
    if (!this.can(PERMISSIONS.CLIENT_TYPES_UPDATE)) return;
    this.toggleActive(clientType, event);
  }
}
