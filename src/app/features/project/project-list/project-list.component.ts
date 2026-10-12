import { ChangeDetectionStrategy, Component, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
import { ProjectListStore } from '../store/project-list.store';
import {
  DELETABLE_PROJECT_STATUSES, PROJECT_STATUS_OPTIONS, PROJECT_STATUS_TRANSITIONS, Project,
  ProjectSortField, ProjectStatus, projectStatusLabel,
} from '../models/project.model';
import {
  ProjectStatusDialogComponent, ProjectStatusDialogData, ProjectStatusDialogResult,
} from '../components/project-status-dialog/project-status-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  sortField?: ProjectSortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'code', label: 'Project No.', alwaysVisible: true, sortField: 'code' },
  { key: 'name', label: 'Project Name', alwaysVisible: true, sortField: 'projectName' },
  { key: 'client', label: 'Client', sortField: 'client' },
  { key: 'type', label: 'Project Type', sortField: 'projectType' },
  { key: 'status', label: 'Status', alwaysVisible: true, sortField: 'status' },
  { key: 'manager', label: 'Project Manager' },
  { key: 'startDate', label: 'Start Date', sortField: 'startDate' },
  { key: 'endDate', label: 'End Date', sortField: 'endDate' },
  { key: 'site', label: 'Site' },
  { key: 'country', label: 'Country' },
  { key: 'updatedAt', label: 'Updated At', sortField: 'updatedAt' },
];

const DEFAULT_HIDDEN_COLUMNS = new Set(['site', 'country', 'updatedAt']);
const COLUMN_PREF_KEY = 'pm_project_columns';

/** Project Master list — the entry point into the project screens. */
@Component({
  selector: 'app-project-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProjectListStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule,
    MatPaginatorModule, MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule,
    MatDividerModule, MatBadgeModule,
  ],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss',
})
export class ProjectListComponent {
  protected readonly store = inject(ProjectListStore);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly columnDefs = COLUMN_DEFS;
  protected readonly statusOptions = PROJECT_STATUS_OPTIONS;
  protected readonly countries = COUNTRIES;

  protected readonly searchTerm = signal('');
  protected readonly isFullscreen = signal(false);
  protected readonly compactDensity = signal(false);
  protected readonly filtersOpen = signal(false);
  protected readonly hiddenColumns = signal(this.loadColumnPrefs());

  protected readonly displayedColumns = computed(() =>
    this.columnDefs.filter((c) => !this.hiddenColumns().has(c.key)).map((c) => c.key),
  );

  protected readonly skeletonRows = Array.from({ length: 6 });

  constructor() {
    // Arriving from a client ("View Projects") narrows the list to that client
    // and opens the filter panel so the narrowing is visible and removable.
    const clientId = this.route.snapshot.queryParamMap.get('clientId');
    if (clientId) {
      this.store.setFilter({ clientId });
      this.filtersOpen.set(true);
    }
  }

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  trackByProjectId(_index: number, project: Project): string {
    return project.id;
  }

  protected countryLabel(code: string | null): string {
    return code ? countryName(code) : '—';
  }

  /** Whether a status change is possible at all from the project's current status. */
  protected canChangeStatus(project: Project): boolean {
    return PROJECT_STATUS_TRANSITIONS[project.status].length > 0;
  }

  protected canDelete(project: Project): boolean {
    return DELETABLE_PROJECT_STATUSES.includes(project.status);
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
    this.store.setSort(sort.active as ProjectSortField, sort.direction);
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
    const rows = this.store.projects();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = [
      'Project No.', 'Project Name', 'Client Code', 'Client', 'Project Type', 'Status',
      'Project Manager', 'Start Date', 'End Date', 'Site', 'Country', 'Currency',
      'Contract Number', 'Client Project Reference', 'Created At', 'Updated At',
    ];
    const lines = rows.map((p) => [
      p.code,
      p.projectName,
      p.clientCode ?? '',
      p.clientName ?? '',
      p.projectTypeName ?? '',
      projectStatusLabel(p.status),
      p.projectManagerName ?? '',
      p.startDate,
      p.endDate ?? '',
      p.siteLocation ?? '',
      p.countryCode ? countryName(p.countryCode) : '',
      p.currencyCode ?? '',
      p.contractNumber ?? '',
      p.clientProjectReference ?? '',
      p.createdAt,
      p.updatedAt ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `projects-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Exported current view to CSV', 'OK', { duration: 3000 });
  }

  exportComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  // ── Navigation ─────────────────────────────────────────────────────

  createProject(): void {
    void this.router.navigate(['/projects/create']);
  }

  viewProject(project: Project, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/projects', project.id]);
  }

  editProject(project: Project, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/projects', project.id, 'edit']);
  }

  copyCode(project: Project, event?: Event): void {
    event?.stopPropagation();
    navigator.clipboard?.writeText(project.code).then(() => {
      this.snack.open(`Copied "${project.code}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  // ── Actions ────────────────────────────────────────────────────────

  async changeStatus(project: Project, event?: Event): Promise<void> {
    event?.stopPropagation();

    const ref = this.dialog.open<
      ProjectStatusDialogComponent, ProjectStatusDialogData, ProjectStatusDialogResult
    >(ProjectStatusDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: { code: project.code, projectName: project.projectName, current: project.status },
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    try {
      await this.store.changeStatus(project, result.status, result.reason);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  async deleteProject(project: Project, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        title: 'Delete Project?',
        message: `Are you sure you want to delete "${project.projectName}" (${project.code})? ` +
          'It will no longer be available for selection.',
        confirmText: 'Delete',
        color: 'warn',
        icon: 'warning',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;

    try {
      await this.store.deleteProject(project);
    } catch {
      // Store already surfaced a snackbar with the failure reason.
    }
  }

  // ── Display helpers ────────────────────────────────────────────────

  statusClass(status: ProjectStatus): string {
    return `status-chip status-chip--${status.toLowerCase().replace('_', '-')}`;
  }

  statusLabel(status: ProjectStatus): string {
    return projectStatusLabel(status);
  }

  /** "CL-001 — Name": the client's code and name, both read from the Client Master. */
  clientText(project: Project): string {
    const name = project.clientDisplayName || project.clientName;
    if (!name) return '—';
    return project.clientCode ? `${project.clientCode} — ${name}` : name;
  }
}
