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
import { DepartmentDisciplineStore } from './store/department-discipline.store';
import { DepartmentDisciplineGroup, GroupSortField } from './models/department-discipline.model';
import { DepartmentDisciplineFormDialogComponent, DepartmentDisciplineFormDialogData, DepartmentDisciplineFormDialogResult } from './components/department-discipline-form-dialog/department-discipline-form-dialog.component';
import { DepartmentDisciplineViewDialogComponent, DepartmentDisciplineViewDialogData } from './components/department-discipline-view-dialog/department-discipline-view-dialog.component';
import { DepartmentDisciplineDeleteDialogComponent, DepartmentDisciplineDeleteDialogData } from './components/department-discipline-delete-dialog/department-discipline-delete-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  sortField?: GroupSortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'department', label: 'Department', alwaysVisible: true, sortField: 'departmentName' },
  { key: 'disciplines', label: 'Disciplines', alwaysVisible: true },
  { key: 'organization', label: 'Organization' },
  { key: 'status', label: 'Status', alwaysVisible: true },
  { key: 'createdAt', label: 'Created Date', sortField: 'createdAt' },
  { key: 'updatedAt', label: 'Updated Date', sortField: 'updatedAt' },
];

const DEFAULT_HIDDEN_COLUMNS = new Set<string>(['Organization']);

@Component({
  selector: 'app-department-discipline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DepartmentDisciplineStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule, MatDividerModule,
  ],
  templateUrl: './department-discipline.component.html',
  styleUrl: './department-discipline.component.scss',
})
export class DepartmentDisciplineComponent {
  protected readonly store = inject(DepartmentDisciplineStore);
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

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  trackByDepartmentId(_index: number, group: DepartmentDisciplineGroup): string {
    return group.departmentId;
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

  onDepartmentFilterChange(departmentId: string | null): void {
    this.store.setFilter({ departmentId: departmentId || null });
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
      this.store.setSort('departmentName', 'asc');
      return;
    }
    this.store.setSort(sort.active as GroupSortField, sort.direction);
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
    const rows = this.store.pagedGroups();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = ['Department', 'Disciplines', 'Organization', 'Status', 'Created Date', 'Updated Date'];
    const lines = rows.map((g) => [
      g.department?.name ?? g.departmentId,
      g.assignments.map((a) => a.discipline?.name ?? a.disciplineId).join('; '),
      this.store.organizationName(),
      `${this.activeCount(g)} Active / ${this.inactiveCount(g)} Inactive`,
      g.createdAt,
      g.updatedAt ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `department-discipline-mappings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Exported current view to CSV', 'OK', { duration: 3000 });
  }

  exportComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  activeCount(group: DepartmentDisciplineGroup): number {
    return group.assignments.filter((a) => a.isActive).length;
  }

  inactiveCount(group: DepartmentDisciplineGroup): number {
    return group.assignments.length - this.activeCount(group);
  }

  openCreateDialog(): void {
    this.openFormDialog({ mode: 'create' });
  }

  openEditDialog(group: DepartmentDisciplineGroup, event?: Event): void {
    event?.stopPropagation();
    this.openFormDialog({ mode: 'edit', departmentId: group.departmentId });
  }

  /** Copies this department's discipline set as a starting point for a different department. */
  openDuplicateDialog(group: DepartmentDisciplineGroup, event?: Event): void {
    event?.stopPropagation();
    const ref = this.dialog.open<DepartmentDisciplineFormDialogComponent, DepartmentDisciplineFormDialogData, DepartmentDisciplineFormDialogResult>(
      DepartmentDisciplineFormDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data: { mode: 'create' },
      },
    );
    ref.componentInstance.prefill({
      disciplineIds: group.assignments.map((a) => a.disciplineId),
      isActive: this.activeCount(group) >= this.inactiveCount(group),
    });
  }

  copyMappingReference(group: DepartmentDisciplineGroup, event?: Event): void {
    event?.stopPropagation();
    const disciplineCodes = group.assignments.map((a) => a.discipline?.code ?? a.disciplineId).join(', ');
    const text = `${group.department?.code ?? group.departmentId} -> ${disciplineCodes}`;
    navigator.clipboard?.writeText(text).then(() => {
      this.snack.open(`Copied "${text}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  private openFormDialog(data: DepartmentDisciplineFormDialogData): void {
    this.dialog.open<DepartmentDisciplineFormDialogComponent, DepartmentDisciplineFormDialogData, DepartmentDisciplineFormDialogResult>(
      DepartmentDisciplineFormDialogComponent,
      {
        width: '760px',
        maxWidth: '95vw',
        disableClose: true,
        viewContainerRef: this.viewContainerRef,
        data,
      },
    );
  }

  openViewDialog(group: DepartmentDisciplineGroup, event?: Event): void {
    event?.stopPropagation();
    this.dialog.open<DepartmentDisciplineViewDialogComponent, DepartmentDisciplineViewDialogData>(DepartmentDisciplineViewDialogComponent, {
      width: '680px',
      maxWidth: '95vw',
      data: { group, organizationName: this.store.organizationName() },
    });
  }

  async deleteGroup(group: DepartmentDisciplineGroup, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open<DepartmentDisciplineDeleteDialogComponent, DepartmentDisciplineDeleteDialogData, boolean>(
      DepartmentDisciplineDeleteDialogComponent,
      { width: '460px', maxWidth: '95vw', data: { group } },
    );
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.store.deleteGroup(group);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async toggleGroupActive(group: DepartmentDisciplineGroup, event?: Event): Promise<void> {
    event?.stopPropagation();
    try {
      await this.store.toggleGroupActive(group);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  onStatusChipClick(group: DepartmentDisciplineGroup, event: Event): void {
    if (!this.can(PERMISSIONS.DEPARTMENT_DISCIPLINES_UPDATE)) return;
    this.toggleGroupActive(group, event);
  }
}
