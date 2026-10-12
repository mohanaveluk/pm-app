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
import { MaterialRequisitionListStore } from '../store/material-requisition-list.store';
import {
  MaterialRequisitionListItem, MaterialRequisitionSortField, MaterialRequisitionStatus,
  REQUISITION_STATUS_OPTIONS, REQUISITION_STATUS_TRANSITIONS, requisitionStatusLabel,
} from '../models/material-requisition.model';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  sortField?: MaterialRequisitionSortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'mrNumber', label: 'MR Number', alwaysVisible: true, sortField: 'mrNumber' },
  { key: 'project', label: 'Project', sortField: 'project' },
  { key: 'client', label: 'Client' },
  { key: 'wbs', label: 'WBS / Cost Code' },
  { key: 'status', label: 'Status', alwaysVisible: true, sortField: 'status' },
  { key: 'ros', label: 'Required on Site', sortField: 'requiredOnSiteDate' },
  { key: 'items', label: 'Items' },
  { key: 'createdAt', label: 'Created', sortField: 'createdAt' },
  { key: 'updatedAt', label: 'Updated', sortField: 'updatedAt' },
];

const DEFAULT_HIDDEN_COLUMNS = new Set(['updatedAt']);
const COLUMN_PREF_KEY = 'pm_material_requisition_columns';

/** Material Requisition list — entry point into the requisition screens. */
@Component({
  selector: 'app-material-requisition-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MaterialRequisitionListStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule,
    MatPaginatorModule, MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule,
    MatDividerModule, MatBadgeModule,
  ],
  templateUrl: './material-requisition-list.component.html',
  styleUrl: './material-requisition-list.component.scss',
})
export class MaterialRequisitionListComponent {
  protected readonly store = inject(MaterialRequisitionListStore);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly Status = MaterialRequisitionStatus;
  protected readonly columnDefs = COLUMN_DEFS;
  protected readonly statusOptions = REQUISITION_STATUS_OPTIONS;

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

  trackById(_index: number, item: MaterialRequisitionListItem): string {
    return item.id;
  }

  protected isDraft(item: MaterialRequisitionListItem): boolean {
    return item.status === MaterialRequisitionStatus.DRAFT;
  }

  /** Whether the requisition can be moved to `status` from where it is now. */
  protected canMoveTo(item: MaterialRequisitionListItem, status: MaterialRequisitionStatus): boolean {
    return REQUISITION_STATUS_TRANSITIONS[item.status].includes(status);
  }

  protected isOnHold(item: MaterialRequisitionListItem): boolean {
    return item.status === MaterialRequisitionStatus.ON_HOLD;
  }

  protected isDisabled(item: MaterialRequisitionListItem): boolean {
    return item.status === MaterialRequisitionStatus.DISABLED;
  }

  /** A draft is deleted; a submitted requisition is put on hold (or released). */
  protected canDeleteOrHold(item: MaterialRequisitionListItem): boolean {
    return this.isDraft(item)
      || this.canMoveTo(item, MaterialRequisitionStatus.ON_HOLD)
      || this.isOnHold(item);
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
    this.store.setSort(sort.active as MaterialRequisitionSortField, sort.direction);
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
      // Storage unavailable — preferences simply don't persist.
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
    const rows = this.store.requisitions();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = [
      'MR Number', 'Code', 'Project No.', 'Project', 'Client Code', 'Client', 'WBS / Cost Code',
      'Budget Head', 'Status', 'Required on Site', 'Items', 'Created By', 'Created At', 'Updated At',
    ];
    const lines = rows.map((r) => [
      r.mrNumber, r.code, r.projectCode ?? '', r.projectName ?? '', r.clientCode ?? '', r.clientName ?? '',
      r.wbsName ?? '', r.budgetHead ?? '', requisitionStatusLabel(r.status), r.requiredOnSiteDate ?? '',
      r.itemCount, r.createdBy ?? '', r.createdAt, r.updatedAt ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `material-requisitions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Exported current view to CSV', 'OK', { duration: 3000 });
  }

  exportComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  // ── Navigation ─────────────────────────────────────────────────────

  create(): void {
    void this.router.navigate(['/material-requisitions/create']);
  }

  /** Import = start a requisition from a BOM / MTO file. */
  importBom(): void {
    void this.router.navigate(['/material-requisitions/create'], { queryParams: { source: 'bom' } });
  }

  view(item: MaterialRequisitionListItem, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/material-requisitions', item.id]);
  }

  edit(item: MaterialRequisitionListItem, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/material-requisitions', item.id, 'edit']);
  }

  copyNumber(item: MaterialRequisitionListItem, event?: Event): void {
    event?.stopPropagation();
    navigator.clipboard?.writeText(item.mrNumber).then(() => {
      this.snack.open(`Copied "${item.mrNumber}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  // ── Actions ────────────────────────────────────────────────────────

  async submit(item: MaterialRequisitionListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        title: 'Submit for Approval?',
        message: `Submit ${item.mrNumber}? It will move to Under Review and can no longer be edited.`,
        confirmText: 'Submit',
        icon: 'send',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;

    try {
      await this.store.submit(item);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async clone(item: MaterialRequisitionListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    try {
      const copy = await this.store.clone(item);
      void this.router.navigate(['/material-requisitions', copy.id, 'edit']);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  /** Obsolete, Disable / Enable, Hold / Release — each confirmed before it is applied. */
  async changeStatus(
    item: MaterialRequisitionListItem,
    status: MaterialRequisitionStatus,
    event?: Event,
  ): Promise<void> {
    event?.stopPropagation();

    const releasing = this.isOnHold(item);
    const texts: Partial<Record<MaterialRequisitionStatus, {
      title: string; message: string; confirm: string; icon: string;
    }>> = {
      [MaterialRequisitionStatus.OBSOLETE]: {
        title: 'Mark Obsolete?',
        message: `Mark ${item.mrNumber} as obsolete? This is final — it cannot be changed again.`,
        confirm: 'Mark Obsolete', icon: 'event_busy',
      },
      [MaterialRequisitionStatus.DISABLED]: {
        title: 'Disable Requisition?',
        message: `Disable ${item.mrNumber}? It can be enabled again later and will return to review.`,
        confirm: 'Disable', icon: 'toggle_off',
      },
      [MaterialRequisitionStatus.ON_HOLD]: {
        title: 'Put on Hold?',
        message: `Put ${item.mrNumber} on hold? It stays paused until you release it.`,
        confirm: 'Hold', icon: 'pause_circle',
      },
      [MaterialRequisitionStatus.UNDER_REVIEW]: {
        title: releasing ? 'Release Hold?' : 'Enable Requisition?',
        message: `${item.mrNumber} will return to Under Review.`,
        confirm: releasing ? 'Release' : 'Enable', icon: 'play_circle',
      },
    };
    const text = texts[status];
    if (!text) return;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        title: text.title,
        message: text.message,
        confirmText: text.confirm,
        color: status === MaterialRequisitionStatus.OBSOLETE ? 'warn' : undefined,
        icon: text.icon,
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;

    try {
      await this.store.changeStatus(item, status);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async deleteRequisition(item: MaterialRequisitionListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        title: 'Delete Requisition?',
        message: `Are you sure you want to delete draft ${item.mrNumber}? This cannot be undone.`,
        confirmText: 'Delete',
        color: 'warn',
        icon: 'warning',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;

    try {
      await this.store.deleteRequisition(item);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  // ── Display helpers ────────────────────────────────────────────────

  statusClass(status: MaterialRequisitionStatus): string {
    return `status-chip status-chip--${status.toLowerCase().replace('_', '-')}`;
  }

  statusLabel(status: MaterialRequisitionStatus): string {
    return requisitionStatusLabel(status);
  }

  projectText(item: MaterialRequisitionListItem): string {
    if (!item.projectName) return '—';
    return item.projectCode ? `${item.projectCode} — ${item.projectName}` : item.projectName;
  }

  clientText(item: MaterialRequisitionListItem): string {
    if (!item.clientName) return '—';
    return item.clientCode ? `${item.clientCode} — ${item.clientName}` : item.clientName;
  }
}
