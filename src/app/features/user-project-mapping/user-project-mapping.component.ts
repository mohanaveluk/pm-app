import {
  ChangeDetectionStrategy, Component, HostListener, ViewContainerRef, computed, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { PermissionService } from '../../core/rbac/permission.service';
import { PERMISSIONS } from '../../core/rbac/permissions.const';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserProjectMappingStore } from './store/user-project-mapping.store';
import {
  MAPPING_STATUS_LABELS, MappingSortField, MappingStatus, UserProjectMapping, initialsOf, matchesTerm,
} from './models/user-project-mapping.model';
import {
  UserProjectMappingDrawerComponent, UserProjectMappingDrawerData,
} from './components/user-project-mapping-drawer/user-project-mapping-drawer.component';
import {
  UserProjectMappingViewDialogComponent, UserProjectMappingViewDialogData,
} from './components/user-project-mapping-view-dialog/user-project-mapping-view-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'project', label: 'Project Code / Name', alwaysVisible: true },
  { key: 'client', label: 'Client' },
  { key: 'users', label: 'Assigned Users', alwaysVisible: true },
  { key: 'userCount', label: 'No. of Users' },
  { key: 'status', label: 'Status', alwaysVisible: true },
  { key: 'createdBy', label: 'Created By' },
  { key: 'createdAt', label: 'Created On' },
  { key: 'updatedBy', label: 'Updated By' },
  { key: 'updatedAt', label: 'Updated On' },
];

const DEFAULT_HIDDEN = ['createdBy', 'updatedBy', 'updatedAt'];
const COLUMNS_STORAGE_KEY = 'upm.hiddenColumns';
/** Avatars shown in a row before "+N". */
const AVATAR_LIMIT = 4;

/**
 * User–Project Mapping Master: which internal users can see which projects.
 * One row per project; assigning and editing happen in a right-hand drawer
 * (full screen on phones).
 */
@Component({
  selector: 'app-user-project-mapping',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UserProjectMappingStore],
  imports: [
    DatePipe, FormsModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatProgressSpinnerModule, MatCheckboxModule, MatDividerModule,
  ],
  templateUrl: './user-project-mapping.component.html',
  styleUrl: './user-project-mapping.component.scss',
})
export class UserProjectMappingComponent {
  protected readonly store = inject(UserProjectMappingStore);
  private readonly permissionService = inject(PermissionService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly breakpoints = inject(BreakpointObserver);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly columnDefs = COLUMN_DEFS;
  protected readonly avatarLimit = AVATAR_LIMIT;
  protected readonly initialsOf = initialsOf;

  protected readonly searchTerm = signal('');
  protected readonly isFullscreen = signal(false);
  protected readonly compactDensity = signal(false);
  protected readonly hiddenColumns = signal<ReadonlySet<string>>(this.readHiddenColumns());

  // Search boxes inside the filter dropdowns.
  protected readonly projectFilterSearch = signal('');
  protected readonly clientFilterSearch = signal('');
  protected readonly userFilterSearch = signal('');

  private readonly isPhone = toSignal(
    this.breakpoints.observe('(max-width: 640px)').pipe(map((s) => s.matches)),
    { initialValue: false },
  );

  protected readonly displayedColumns = computed(() =>
    this.columnDefs.filter((c) => c.alwaysVisible || !this.hiddenColumns().has(c.key)).map((c) => c.key),
  );

  // The chosen value always stays in a filtered list, so the field never shows blank.
  protected readonly filterProjects = computed(() => {
    const term = this.projectFilterSearch();
    const chosen = this.store.filter().projectId;
    return this.store.projects().filter((p) => p.id === chosen || matchesTerm(term, p.code, p.projectName));
  });
  protected readonly filterClients = computed(() => {
    const term = this.clientFilterSearch();
    const chosen = this.store.filter().clientId;
    return this.store.clients().filter((c) => c.id === chosen || matchesTerm(term, c.code, c.clientName, c.displayName));
  });
  protected readonly filterUsers = computed(() => {
    const term = this.userFilterSearch();
    const chosen = this.store.filter().userId;
    return this.store.users().filter((u) => u.id === chosen || matchesTerm(term, u.name, u.email));
  });

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  statusLabel(status: MappingStatus): string {
    return MAPPING_STATUS_LABELS[status] ?? status;
  }

  /** Names of the users not shown as avatars, for the "+N" tooltip. */
  hiddenUserNames(m: UserProjectMapping): string {
    return m.users.slice(AVATAR_LIMIT).map((u) => u.name).join(', ');
  }

  // ── Search & filters ─────────────────────────────────────────────

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

  /** The search box is each dropdown's first option; picking it changes nothing. */
  onProjectFilter(value: string | null | undefined): void {
    if (value !== undefined) this.store.setFilter({ projectId: value || null });
  }

  onClientFilter(value: string | null | undefined): void {
    if (value !== undefined) this.store.setFilter({ clientId: value || null });
  }

  onUserFilter(value: string | null | undefined): void {
    if (value !== undefined) this.store.setFilter({ userId: value || null });
  }

  onStatusFilter(status: 'all' | MappingStatus): void {
    this.store.setFilter({ status });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.projectFilterSearch.set('');
    this.clientFilterSearch.set('');
    this.userFilterSearch.set('');
    this.store.resetFilters();
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.store.setSort('projectCode', 'asc');
      return;
    }
    this.store.setSort(sort.active as MappingSortField, sort.direction);
  }

  onPageChange(event: PageEvent): void {
    this.store.setPage(event.pageIndex, event.pageSize);
  }

  // ── Columns, density, fullscreen ─────────────────────────────────

  isColumnVisible(key: string): boolean {
    return !this.hiddenColumns().has(key);
  }

  toggleColumn(key: string): void {
    const next = new Set(this.hiddenColumns());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.hiddenColumns.set(next);
    this.writeHiddenColumns(next);
  }

  resetColumns(): void {
    const next = new Set(DEFAULT_HIDDEN);
    this.hiddenColumns.set(next);
    this.writeHiddenColumns(next);
  }

  toggleDensity(): void {
    this.compactDensity.update((v) => !v);
  }

  toggleFullscreen(): void {
    this.isFullscreen.update((v) => !v);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isFullscreen() && !this.dialog.openDialogs.length) this.isFullscreen.set(false);
  }

  // ── Drawer & dialogs ─────────────────────────────────────────────

  openAssign(): void {
    this.openDrawer({});
  }

  openEdit(mapping: UserProjectMapping, event?: Event): void {
    event?.stopPropagation();
    this.openDrawer({ mapping });
  }

  openView(mapping: UserProjectMapping, event?: Event): void {
    event?.stopPropagation();
    const ref = this.dialog.open<UserProjectMappingViewDialogComponent, UserProjectMappingViewDialogData, 'edit' | undefined>(
      UserProjectMappingViewDialogComponent, {
        width: '720px',
        maxWidth: '95vw',
        viewContainerRef: this.viewContainerRef,
        data: { mapping, canEdit: this.can(PERMISSIONS.USER_PROJECT_MAPPINGS_UPDATE) },
      },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === 'edit') this.openEdit(mapping);
    });
  }

  async toggleStatus(mapping: UserProjectMapping, event?: Event): Promise<void> {
    event?.stopPropagation();
    const next: MappingStatus = mapping.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmed = await this.confirm({
      title: next === 'ACTIVE' ? 'Activate mapping?' : 'Deactivate mapping?',
      message: next === 'ACTIVE'
        ? `All ${mapping.userCount} user(s) will see ${mapping.projectCode} — ${mapping.projectName} again.`
        : `${mapping.userCount} user(s) will no longer see ${mapping.projectCode} — ${mapping.projectName}. The assignments are kept and can be reactivated.`,
      confirmText: next === 'ACTIVE' ? 'Activate' : 'Deactivate',
      icon: next === 'ACTIVE' ? 'toggle_on' : 'toggle_off',
      color: next === 'ACTIVE' ? 'primary' : 'warn',
    });
    if (!confirmed) return;
    try {
      await this.store.setStatus(mapping, next);
    } catch {
      /* already surfaced */
    }
  }

  async remove(mapping: UserProjectMapping, event?: Event): Promise<void> {
    event?.stopPropagation();
    const confirmed = await this.confirm({
      title: 'Delete mapping?',
      message: `All ${mapping.userCount} user(s) will be removed from ${mapping.projectCode} — ${mapping.projectName} and will no longer see it. The assignment history is kept.`,
      confirmText: 'Delete',
      icon: 'delete',
      color: 'warn',
    });
    if (!confirmed) return;
    try {
      await this.store.remove(mapping);
    } catch {
      /* already surfaced */
    }
  }

  copyProjectCode(mapping: UserProjectMapping, event?: Event): void {
    event?.stopPropagation();
    void navigator.clipboard?.writeText(mapping.projectCode).then(
      () => this.snack.open(`Copied ${mapping.projectCode}`, 'OK', { duration: 2000 }),
      () => this.snack.open('Could not copy to the clipboard', 'Close', { duration: 3000 }),
    );
  }

  // ── Export ───────────────────────────────────────────────────────

  /** The current page as CSV — one line per project, users joined. */
  exportCsv(): void {
    const header = ['Project Code', 'Project Name', 'Client', 'Assigned Users', 'No. of Users', 'Status', 'Created By', 'Created On', 'Updated By', 'Updated On'];
    const rows = this.store.mappings().map((m) => [
      m.projectCode, m.projectName, m.clientName ?? '', m.users.map((u) => `${u.name} <${u.email}>`).join('; '),
      String(m.userCount), this.statusLabel(m.status), m.createdBy ?? '', m.createdAt, m.updatedBy ?? '', m.updatedAt,
    ]);
    const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-project-mappings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  print(): void {
    window.print();
  }

  // ── Internals ────────────────────────────────────────────────────

  private openDrawer(data: UserProjectMappingDrawerData): void {
    const phone = this.isPhone();
    this.dialog.open<UserProjectMappingDrawerComponent, UserProjectMappingDrawerData, boolean>(
      UserProjectMappingDrawerComponent, {
        data,
        viewContainerRef: this.viewContainerRef,
        panelClass: ['upm-drawer-panel', ...(phone ? ['upm-drawer-panel--full'] : [])],
        position: { right: '0', top: '0' },
        width: phone ? '100vw' : '560px',
        maxWidth: '100vw',
        height: '100%',
        maxHeight: '100vh',
        autoFocus: false,
        disableClose: true,
      },
    );
  }

  private confirm(data: ConfirmDialogData): Promise<boolean | undefined> {
    return firstValueFrom(this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent, { width: '440px', maxWidth: '95vw', data },
    ).afterClosed());
  }

  private readHiddenColumns(): ReadonlySet<string> {
    try {
      const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) return new Set(parsed.filter((k) => typeof k === 'string'));
    } catch {
      /* storage unavailable — use the defaults */
    }
    return new Set(DEFAULT_HIDDEN);
  }

  private writeHiddenColumns(hidden: ReadonlySet<string>): void {
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify([...hidden]));
    } catch {
      /* storage unavailable — the choice lasts for this visit */
    }
  }
}
