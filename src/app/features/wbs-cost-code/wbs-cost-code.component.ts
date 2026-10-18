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
import { WbsCostCodeStore } from './store/wbs-cost-code.store';
import { WbsCostCode, WbsCostCodeSortField } from './models/wbs-cost-code.model';
import {
  WbsCostCodeFormDialogComponent, WbsCostCodeFormDialogData, WbsCostCodeFormDialogResult,
} from './components/wbs-cost-code-form-dialog/wbs-cost-code-form-dialog.component';
import {
  WbsCostCodeViewDialogComponent, WbsCostCodeViewDialogData,
} from './components/wbs-cost-code-view-dialog/wbs-cost-code-view-dialog.component';
import {
  WbsCostCodeDeleteDialogComponent, WbsCostCodeDeleteDialogData,
} from './components/wbs-cost-code-delete-dialog/wbs-cost-code-delete-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  /** Present only for the fields the backend query DTO can actually sort on. */
  sortField?: WbsCostCodeSortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'code', label: 'Code', alwaysVisible: true, sortField: 'code' },
  { key: 'projectDetails', label: 'WBS Name', alwaysVisible: true, sortField: 'projectDetails' },
  { key: 'project', label: 'Project', sortField: 'project' },
  { key: 'client', label: 'Client' },
  { key: 'areaFacility', label: 'Area / Facility', sortField: 'areaFacility' },
  { key: 'systemSubsystem', label: 'System / Sub-system', sortField: 'systemSubsystem' },
  { key: 'discipline', label: 'Discipline', sortField: 'discipline' },
  { key: 'workPackage', label: 'Work Package', sortField: 'workPackage' },
  { key: 'activities', label: 'Activities' },
  { key: 'status', label: 'Status', alwaysVisible: true },
  { key: 'createdBy', label: 'Created By' },
  { key: 'createdAt', label: 'Created At', sortField: 'createdAt' },
  { key: 'updatedBy', label: 'Updated By' },
  { key: 'updatedAt', label: 'Updated At' },
];

const DEFAULT_HIDDEN_COLUMNS = new Set(['areaFacility', 'systemSubsystem','workPackage','createdBy', 'updatedBy', 'updatedAt']);

/**
 * WBS master — the work-breakdown / cost-code entries of a
 * project: area / facility, system / sub-system, discipline, work package and
 * schedule-level activities.
 *
 * Same page chrome, toolbar, filters, table, dialogs, RBAC and error-handling
 * conventions as the Vendor Type and Project Type masters — only the fields and
 * the discipline lookup differ, as dictated by WbsCostCodeController.
 */
@Component({
  selector: 'app-wbs-cost-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [WbsCostCodeStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule, MatDividerModule,
  ],
  templateUrl: './wbs-cost-code.component.html',
  styleUrl: './wbs-cost-code.component.scss',
})
export class WbsCostCodeComponent {
  protected readonly store = inject(WbsCostCodeStore);
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

  trackByWbsCostCodeId(_index: number, wbsCostCode: WbsCostCode): string {
    return wbsCostCode.id;
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

  onDisciplineFilterChange(disciplineId: string | null): void {
    this.store.setFilter({ disciplineId: disciplineId || null });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.store.resetFilters();
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.store.setSort('code', 'asc');
      return;
    }
    this.store.setSort(sort.active as WbsCostCodeSortField, sort.direction);
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
  // page), same as the other masters — no export API exists yet.

  exportCsv(): void {
    const rows = this.store.wbsCostCodes();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = [
      'Code', 'WBS / Cost Name', 'Project No.', 'Project', 'Client', 'Area / Facility',
      'System / Sub-system', 'Discipline', 'Department', 'Work Package', 'Activities', 'Status', 'Created By', 'Created At', 'Updated By', 'Updated At',
    ];
    const lines = rows.map((w) => [
      w.code,
      w.projectDetails,
      w.projectCode ?? '',
      w.projectName ?? '',
      w.clientName ?? '',
      w.areaFacility ?? '',
      w.systemSubsystem ?? '',
      w.disciplineName ?? '',
      w.departmentName ?? '',
      w.workPackage ?? '',
      w.activities ?? '',
      w.isActive ? 'Active' : 'Inactive',
      w.createdBy ?? '',
      w.createdAt,
      w.updatedBy ?? '',
      w.updatedAt ?? '',
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wbs-cost-codes-${new Date().toISOString().slice(0, 10)}.csv`;
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

  openEditDialog(wbsCostCode: WbsCostCode, event?: Event): void {
    event?.stopPropagation();
    this.openFormDialog({ mode: 'edit', wbsCostCodeId: wbsCostCode.id });
  }

  openDuplicateDialog(wbsCostCode: WbsCostCode, event?: Event): void {
    event?.stopPropagation();
    const ref = this.dialog.open<WbsCostCodeFormDialogComponent, WbsCostCodeFormDialogData, WbsCostCodeFormDialogResult>(
      WbsCostCodeFormDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data: { mode: 'create' },
      },
    );
    ref.componentInstance.prefill({
      projectDetails: `${wbsCostCode.projectDetails} (Copy)`.slice(0, 255),
      projectId: wbsCostCode.projectId ?? '',
      areaFacility: wbsCostCode.areaFacility ?? '',
      systemSubsystem: wbsCostCode.systemSubsystem ?? '',
      disciplineId: wbsCostCode.disciplineId ?? '',
      workPackage: wbsCostCode.workPackage ?? '',
      activities: wbsCostCode.activities ?? '',
      isActive: wbsCostCode.isActive,
    });
  }

  copyWbsCostCodeCode(wbsCostCode: WbsCostCode, event?: Event): void {
    event?.stopPropagation();
    navigator.clipboard?.writeText(wbsCostCode.code).then(() => {
      this.snack.open(`Copied "${wbsCostCode.code}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  private openFormDialog(data: WbsCostCodeFormDialogData): void {
    this.dialog.open<WbsCostCodeFormDialogComponent, WbsCostCodeFormDialogData, WbsCostCodeFormDialogResult>(
      WbsCostCodeFormDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data,
      },
    );
  }

  async openViewDialog(wbsCostCode: WbsCostCode, event?: Event): Promise<void> {
    event?.stopPropagation();
    // Re-fetch so the dialog shows the freshest record rather than a stale grid row.
    let full = wbsCostCode;
    try {
      full = await this.store.getWbsCostCodeById(wbsCostCode.id);
    } catch {
      // Fall back to the row we already have — the dialog is read-only either way.
    }
    this.dialog.open<WbsCostCodeViewDialogComponent, WbsCostCodeViewDialogData>(
      WbsCostCodeViewDialogComponent,
      { width: '640px', maxWidth: '95vw', data: { wbsCostCode: full } },
    );
  }

  async deleteWbsCostCode(wbsCostCode: WbsCostCode, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<WbsCostCodeDeleteDialogComponent, WbsCostCodeDeleteDialogData, boolean>(
      WbsCostCodeDeleteDialogComponent,
      { width: '460px', maxWidth: '95vw', data: { wbsCostCode } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.deleteWbsCostCode(wbsCostCode);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async toggleActive(wbsCostCode: WbsCostCode, event?: Event): Promise<void> {
    event?.stopPropagation();
    try {
      await this.store.toggleActive(wbsCostCode);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  onStatusChipClick(wbsCostCode: WbsCostCode, event: Event): void {
    if (!this.can(PERMISSIONS.WBS_COST_CODES_UPDATE)) return;
    this.toggleActive(wbsCostCode, event);
  }
}
