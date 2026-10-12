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
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { PermissionService } from '../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../core/rbac/permissions.const';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { COUNTRIES, countryName } from '../../../shared/reference/countries';
import { ClientListStore } from '../store/client-list.store';
import {
  CLIENT_STATUS_OPTIONS, ClientListItem, ClientSortField, ClientStatus,
} from '../models/client.model';
import {
  ClientDeactivateDialogComponent, ClientDeactivateDialogData, ClientDeactivateDialogResult,
} from '../components/client-deactivate-dialog/client-deactivate-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  sortField?: ClientSortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'code', label: 'Client Code', alwaysVisible: true, sortField: 'code' },
  { key: 'name', label: 'Client Name', alwaysVisible: true, sortField: 'clientName' },
  { key: 'type', label: 'Client Type', sortField: 'clientType' },
  { key: 'industry', label: 'Industry', sortField: 'industryCategory' },
  { key: 'country', label: 'Country', sortField: 'countryCode' },
  { key: 'parent', label: 'Parent Client' },
  { key: 'contact', label: 'Primary Contact' },
  { key: 'status', label: 'Status', alwaysVisible: true, sortField: 'status' },
  { key: 'updatedAt', label: 'Updated At', sortField: 'updatedAt' },
];

const DEFAULT_HIDDEN_COLUMNS = new Set(['parent', 'updatedAt']);
const COLUMN_PREF_KEY = 'pm_client_columns';

/** Client Master list — the entry point into the workspace. */
@Component({
  selector: 'app-client-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ClientListStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule,
    MatPaginatorModule, MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule,
    MatDividerModule, MatBadgeModule,
  ],
  templateUrl: './client-list.component.html',
  styleUrl: './client-list.component.scss',
})
export class ClientListComponent {
  protected readonly store = inject(ClientListStore);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly columnDefs = COLUMN_DEFS;
  protected readonly statusOptions = CLIENT_STATUS_OPTIONS;
  protected readonly countries = COUNTRIES;
  protected readonly ClientStatus = ClientStatus;

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

  trackByClientId(_index: number, client: ClientListItem): string {
    return client.id;
  }

  protected countryLabel(code: string | null): string {
    return code ? countryName(code) : '—';
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
    this.store.setSort(sort.active as ClientSortField, sort.direction);
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
    const rows = this.store.clients();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = [
      'Client Code', 'Client Name', 'Display Name', 'Client Type', 'Industry', 'Country',
      'Parent Client', 'Primary Contact', 'Contact Email', 'Contact Phone', 'Status',
      'Created At', 'Updated At',
    ];
    const lines = rows.map((c) => [
      c.code,
      c.clientName,
      c.displayName ?? '',
      c.clientTypeName ?? '',
      c.industryCategoryName ?? '',
      c.countryCode ? countryName(c.countryCode) : '',
      c.parentClientName ?? '',
      c.primaryContactName ?? '',
      c.primaryContactEmail ?? '',
      c.primaryContactPhone ?? '',
      c.status,
      c.createdAt,
      c.updatedAt ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Exported current view to CSV', 'OK', { duration: 3000 });
  }

  exportComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  // ── Navigation ─────────────────────────────────────────────────────

  createClient(): void {
    void this.router.navigate(['/admin/clients/create']);
  }

  viewClient(client: ClientListItem, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/admin/clients', client.id]);
  }

  editClient(client: ClientListItem, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/admin/clients', client.id, 'edit']);
  }

  copyCode(client: ClientListItem, event?: Event): void {
    event?.stopPropagation();
    navigator.clipboard?.writeText(client.code).then(() => {
      this.snack.open(`Copied "${client.code}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  /** Opens the Project Master filtered to this client's projects. */
  viewProjects(client: ClientListItem, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/projects'], { queryParams: { clientId: client.id } });
  }

  // ── Lifecycle actions ──────────────────────────────────────────────

  async activate(client: ClientListItem, event?: Event): Promise<void> {
    event?.stopPropagation();

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        title: 'Activate Client?',
        message: `Make "${client.clientName}" (${client.code}) available for new projects again?`,
        confirmText: 'Activate',
        color: 'primary' as const,
        icon: 'toggle_on',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;

    try {
      await this.store.activate(client);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async deactivate(client: ClientListItem, event?: Event): Promise<void> {
    event?.stopPropagation();

    const ref = this.dialog.open<
      ClientDeactivateDialogComponent, ClientDeactivateDialogData, ClientDeactivateDialogResult
    >(ClientDeactivateDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: { code: client.code, clientName: client.clientName },
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    try {
      await this.store.deactivate(client, result.reason || undefined);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async deleteClient(client: ClientListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        title: 'Delete Client?',
        message: `Are you sure you want to delete "${client.clientName}" (${client.code})? ` +
          'Prefer Deactivate for a client that has been used — a deleted client is no longer available for selection.',
        confirmText: 'Delete',
        color: 'warn',
        icon: 'warning',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;

    try {
      await this.store.deleteClient(client);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  // ── Display helpers ────────────────────────────────────────────────

  statusClass(status: ClientStatus): string {
    return status === ClientStatus.ACTIVE
      ? 'status-chip status-chip--active'
      : 'status-chip status-chip--inactive';
  }

  statusLabel(status: ClientStatus): string {
    return status === ClientStatus.ACTIVE ? 'Active' : 'Inactive';
  }
}
