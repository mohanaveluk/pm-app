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
import { DepartmentStore } from './store/department.store';
import { Department, DepartmentData, DepartmentSortField } from './models/department.model';
import { DepartmentFormDialogComponent, DepartmentFormDialogData, DepartmentFormDialogResult } from './components/department-form-dialog/department-form-dialog.component';
import { DepartmentViewDialogComponent, DepartmentViewDialogData } from './components/department-view-dialog/department-view-dialog.component';
import { DepartmentDeleteDialogComponent, DepartmentDeleteDialogData } from './components/department-delete-dialog/department-delete-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  sortField?: DepartmentSortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'code', label: 'Code', alwaysVisible: true, sortField: 'code' },
  { key: 'name', label: 'Name', alwaysVisible: true, sortField: 'name' },
  { key: 'shortName', label: 'Short Name' },
  { key: 'description', label: 'Description' },
  { key: 'displayOrder', label: 'Display Order', sortField: 'displayOrder' },
  { key: 'organization', label: 'Organization' },
  { key: 'status', label: 'Status', alwaysVisible: true },
  { key: 'createdAt', label: 'Created Date', sortField: 'createdAt' },
  { key: 'updatedAt', label: 'Updated Date', sortField: 'updatedAt' },
];

const DEFAULT_HIDDEN_COLUMNS = new Set(['description']);

@Component({
  selector: 'app-department',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DepartmentStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule, MatDividerModule,
  ],
  templateUrl: './department.component.html',
  styleUrl: './department.component.scss',
})
export class DepartmentComponent {
  protected readonly store = inject(DepartmentStore);
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

  constructor() {}

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  trackByDepartmentId(_index: number, department: DepartmentData): string {
    return department.id;
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
    this.store.setSort(sort.active as DepartmentSortField, sort.direction);
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
    const rows = this.store.departments();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = ['Code', 'Name', 'Short Name', 'Display Order', 'Organization', 'Status', 'Created Date', 'Updated Date'];
    const lines = rows.map((d) => [
      d.code,
      d.name,
      d.shortName ?? '',
      String(d.displayOrder),
      d.organization?.name ?? d.organizationId,
      d.isActive ? 'Active' : 'Inactive',
      d.createdAt,
      d.updatedAt ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `departments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Exported current view to CSV', 'OK', { duration: 3000 });
  }

  exportComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  openCreateDialog(): void {
    this.openFormDialog({ mode: 'create' });
  }

  openEditDialog(department: DepartmentData, event?: Event): void {
    event?.stopPropagation();
    this.openFormDialog({ mode: 'edit', code: department.code, departmentId: department.id });
  }

  openDuplicateDialog(department: DepartmentData, event?: Event): void {
    event?.stopPropagation();
    const ref = this.dialog.open<DepartmentFormDialogComponent, DepartmentFormDialogData, DepartmentFormDialogResult>(
      DepartmentFormDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data: { mode: 'create' },
      },
    );
    ref.componentInstance.prefill({
      name: `${department.name} (Copy)`,
      shortName: department.shortName ?? '',
      displayOrder: department.displayOrder,
      isActive: department.isActive,
      description: department.description ?? '',
      remarks: department.remarks ?? '',
    });
  }

  copyDepartmentCode(department: DepartmentData, event?: Event): void {
    event?.stopPropagation();
    navigator.clipboard?.writeText(department.code).then(() => {
      this.snack.open(`Copied "${department.code}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  private openFormDialog(data: DepartmentFormDialogData): void {
    this.dialog.open<DepartmentFormDialogComponent, DepartmentFormDialogData, DepartmentFormDialogResult>(
      DepartmentFormDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data,
      },
    );
  }

  openViewDialog(department: DepartmentData, event?: Event): void {
    event?.stopPropagation();
    this.dialog.open<DepartmentViewDialogComponent, DepartmentViewDialogData>(DepartmentViewDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: { department },
    });
  }

  async deleteDepartment(department: DepartmentData, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<DepartmentDeleteDialogComponent, DepartmentDeleteDialogData, boolean>(
      DepartmentDeleteDialogComponent,
      { width: '440px', maxWidth: '95vw', data: { department } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.deleteDepartment(department);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async toggleActive(department: DepartmentData, event?: Event): Promise<void> {
    event?.stopPropagation();
    try {
      await this.store.toggleActive(department);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  onStatusChipClick(department: DepartmentData, event: Event): void {
    if (!this.can(PERMISSIONS.DEPARTMENTS_UPDATE)) return;
    this.toggleActive(department, event);
  }
}
