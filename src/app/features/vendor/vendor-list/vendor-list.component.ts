import { ChangeDetectionStrategy, Component, OnInit, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatBadgeModule } from '@angular/material/badge';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { PermissionService } from '../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../core/rbac/permissions.const';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { COUNTRIES, countryName } from '../../../shared/reference/countries';
import { IndustryCategoryService } from '../../industry-category/services/industry-category.service';
import { IndustryCategoryOption } from '../../industry-category/models/industry-category.model';
import { VendorListStore } from '../store/vendor-list.store';
import {
  EnumOption, PENDING_STATUS_OPTIONS, PendingStatusChange, RISK_CATEGORY_OPTIONS,
  RiskCategory, VENDOR_CLASSIFICATION_OPTIONS, VENDOR_STATUS_OPTIONS,
  VENDOR_TYPE_OPTIONS, VendorClassification, VendorListItem, VendorSortField,
  VendorStatus, VendorType, enumLabel,
} from '../models/vendor.model';
import {
  VendorBlacklistDialogComponent, VendorBlacklistDialogData, VendorBlacklistDialogResult,
} from '../components/vendor-blacklist-dialog/vendor-blacklist-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  /** Present only for the fields VendorQueryDto.sortBy actually accepts. */
  sortField?: VendorSortField;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'actions', label: 'Actions', alwaysVisible: true },
  { key: 'code', label: 'Vendor Code', alwaysVisible: true, sortField: 'code' },
  { key: 'vendorName', label: 'Vendor Name', alwaysVisible: true, sortField: 'vendorName' },
  { key: 'tradeName', label: 'Trade Name', sortField: 'tradeName' },
  { key: 'vendorType', label: 'Vendor Type', sortField: 'vendorType' },
  // Not sortable: VendorQueryDto.sortBy does not accept productCategories.
  { key: 'productCategories', label: 'Material Categories' },
  { key: 'countryOfRegistration', label: 'Country' },
  { key: 'primaryContactPerson', label: 'Primary Contact' },
  { key: 'email', label: 'Email' },
  { key: 'mobileNumber', label: 'Mobile' },
  { key: 'vendorStatus', label: 'Status', alwaysVisible: true, sortField: 'vendorStatus' },
  { key: 'riskCategory', label: 'Risk' },
  { key: 'vendorClassification', label: 'Classification', sortField: 'vendorClassification' },
  { key: 'createdAt', label: 'Created Date', sortField: 'createdAt' },
  { key: 'updatedAt', label: 'Updated Date', sortField: 'updatedAt' },
];

const DEFAULT_HIDDEN_COLUMNS = ['tradeName', 'countryOfRegistration', 'mobileNumber', 'updatedAt'];
const COLUMN_PREFERENCE_KEY = 'pm-app.vendor-list.hidden-columns';

/**
 * Vendor Master list.
 *
 * Server-side paging, sorting, searching and filtering throughout — the child
 * collections of a vendor are never loaded here, only when the user opens the
 * view or edit screen.
 */
@Component({
  selector: 'app-vendor-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [VendorListStore],
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule,
    MatPaginatorModule, MatChipsModule, MatProgressSpinnerModule, MatCheckboxModule,
    MatDividerModule, MatSlideToggleModule, MatToolbarModule, MatBadgeModule, FormsModule,
  ],
  templateUrl: './vendor-list.component.html',
  styleUrl: './vendor-list.component.scss',
})
export class VendorListComponent implements OnInit {
  protected readonly store = inject(VendorListStore);
  private readonly permissionService = inject(PermissionService);
  private readonly industryCategoryService = inject(IndustryCategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly columnDefs = COLUMN_DEFS;
  protected readonly countries = COUNTRIES;
  protected readonly typeOptions = VENDOR_TYPE_OPTIONS;
  protected readonly statusOptions = VENDOR_STATUS_OPTIONS;
  protected readonly classificationOptions = VENDOR_CLASSIFICATION_OPTIONS;
  protected readonly riskOptions = RISK_CATEGORY_OPTIONS;
  protected readonly pendingOptions = PENDING_STATUS_OPTIONS;
  protected readonly VendorStatus = VendorStatus;

  protected readonly searchTerm = signal('');
  protected readonly showFilters = signal(false);
  protected readonly compactDensity = signal(false);
  protected readonly industryCategories = signal<IndustryCategoryOption[]>([]);
  protected readonly hiddenColumns = signal(new Set(this.loadColumnPreference()));

  /**
   * Per-dropdown search terms, keyed by filter. One signal keeps the template
   * bindings uniform instead of a signal per select.
   */
  private readonly filterSearchTerms = signal<Record<string, string>>({});

  protected readonly filteredIndustryCategories = computed(() => {
    const term = this.filterSearch('industry').trim().toLowerCase();
    const options = this.industryCategories();
    if (!term) return options;
    return options.filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(term));
  });

  protected readonly filteredCountries = computed(() => {
    const term = this.filterSearch('country').trim().toLowerCase();
    if (!term) return this.countries;
    return this.countries.filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(term));
  });

  protected readonly displayedColumns = computed(() =>
    this.columnDefs.filter((c) => !this.hiddenColumns().has(c.key)).map((c) => c.key),
  );

  /** Placeholder rows for the skeleton loading state. */
  protected readonly skeletonRows = Array.from({ length: 6 });

  ngOnInit(): void {
    // Only needed to label the Industry Category filter — the list endpoint
    // already returns the joined name for each row.
    this.industryCategoryService.getActiveIndustryCategories().subscribe({
      next: (res) => this.industryCategories.set(res.data ?? []),
      error: () => this.industryCategories.set([]),
    });
  }

  // ── Permissions ────────────────────────────────────────────────────
  // Each action checks its own grant plus the coarser `vendors.manage` that
  // predates the per-action permissions, so existing grants keep working.

  can(permission: string): boolean {
    return this.permissionService.hasAnyPermission([permission, PERMISSIONS.VENDORS_MANAGE]);
  }

  trackByVendorId(_index: number, vendor: VendorListItem): string {
    return vendor.id;
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

  onTypeFilter(vendorType: VendorType | null): void {
    this.store.setFilter({ vendorType });
  }

  onStatusFilter(vendorStatus: VendorStatus | null): void {
    // Asking for blacklisted vendors implies including them in the result set,
    // which the API otherwise suppresses.
    this.store.setFilter({
      vendorStatus,
      includeBlacklisted: vendorStatus === VendorStatus.BLACKLISTED ? true : this.store.filter().includeBlacklisted,
    });
  }

  onClassificationFilter(vendorClassification: VendorClassification | null): void {
    this.store.setFilter({ vendorClassification });
  }

  onRiskFilter(riskCategory: RiskCategory | null): void {
    this.store.setFilter({ riskCategory });
  }

  onPendingFilter(pendingStatusChange: PendingStatusChange | null): void {
    this.store.setFilter({ pendingStatusChange });
  }

  // ── Dropdown search ────────────────────────────────────────────────

  filterSearch(key: string): string {
    return this.filterSearchTerms()[key] ?? '';
  }

  setFilterSearch(key: string, value: string): void {
    this.filterSearchTerms.update((terms) => ({ ...terms, [key]: value }));
  }

  /** Filters a short enum option list by its label. */
  filterOptions<T extends string>(key: string, options: readonly EnumOption<T>[]): readonly EnumOption<T>[] {
    const term = this.filterSearch(key).trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }

  onIndustryFilter(industryCategoryId: string | null): void {
    this.store.setFilter({ industryCategoryId });
  }

  onCountryFilter(countryOfRegistration: string | null): void {
    this.store.setFilter({ countryOfRegistration });
  }

  onActiveFilter(isActive: boolean | null): void {
    this.store.setFilter({ isActive });
  }

  onIncludeBlacklisted(includeBlacklisted: boolean): void {
    this.store.setFilter({ includeBlacklisted });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.store.resetFilters();
  }

  toggleFilters(): void {
    this.showFilters.update((v) => !v);
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.store.setSort('createdAt', 'desc');
      return;
    }
    this.store.setSort(sort.active as VendorSortField, sort.direction);
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
      this.saveColumnPreference(next);
      return next;
    });
  }

  isColumnVisible(key: string): boolean {
    return !this.hiddenColumns().has(key);
  }

  resetColumns(): void {
    const next = new Set(DEFAULT_HIDDEN_COLUMNS);
    this.hiddenColumns.set(next);
    this.saveColumnPreference(next);
  }

  toggleDensity(): void {
    this.compactDensity.update((v) => !v);
  }

  /**
   * Column visibility is a per-browser convenience, so it lives in
   * localStorage rather than being round-tripped to the server.
   */
  private loadColumnPreference(): string[] {
    try {
      const raw = localStorage.getItem(COLUMN_PREFERENCE_KEY);
      if (!raw) return DEFAULT_HIDDEN_COLUMNS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : DEFAULT_HIDDEN_COLUMNS;
    } catch {
      return DEFAULT_HIDDEN_COLUMNS;
    }
  }

  private saveColumnPreference(hidden: Set<string>): void {
    try {
      localStorage.setItem(COLUMN_PREFERENCE_KEY, JSON.stringify([...hidden]));
    } catch {
      // A browser refusing storage is not worth interrupting the user for.
    }
  }

  // ── Export ─────────────────────────────────────────────────────────

  /**
   * Exports exactly what the current view holds — same filters, search and
   * sort. Banking and tax identifiers are deliberately absent: the list payload
   * never carries them, and they must not leave the app in a spreadsheet.
   */
  exportCsv(): void {
    const rows = this.store.vendors();
    if (!rows.length) {
      this.snack.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    const header = [
      'Vendor Code', 'Vendor Name', 'Trade Name', 'Vendor Type', 'Material Categories',
      'Country', 'Primary Contact', 'Email', 'Mobile', 'Status', 'Approval Pending',
      'Active', 'Risk Category', 'Classification', 'Evaluation Score', 'Created At', 'Updated At',
    ];
    const lines = rows.map((v) => [
      v.code,
      v.vendorName,
      v.tradeName ?? '',
      enumLabel(v.vendorType),
      v.productCategories?.join('; ') ?? '',
      countryName(v.countryOfRegistration),
      v.primaryContactPerson ?? '',
      v.email ?? '',
      v.mobileNumber ?? '',
      enumLabel(v.vendorStatus),
      v.pendingStatusChange ? enumLabel(v.pendingStatusChange) : '',
      v.isActive ? 'Yes' : 'No',
      v.riskCategory ?? '',
      enumLabel(v.vendorClassification),
      v.vendorEvaluationScore != null ? String(v.vendorEvaluationScore) : '',
      v.createdAt,
      v.updatedAt,
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vendors-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Exported current view to CSV', 'OK', { duration: 3000 });
  }

  exportComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  print(): void {
    window.print();
  }

  // ── Row actions ────────────────────────────────────────────────────

  createVendor(): void {
    void this.router.navigate(['/vendors/new']);
  }

  viewVendor(vendor: VendorListItem): void {
    void this.router.navigate(['/vendors', vendor.id, 'view']);
  }

  editVendor(vendor: VendorListItem, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/vendors', vendor.id, 'edit']);
  }

  copyCode(vendor: VendorListItem, event?: Event): void {
    event?.stopPropagation();
    navigator.clipboard?.writeText(vendor.code).then(() => {
      this.snack.open(`Copied "${vendor.code}" to clipboard`, 'OK', { duration: 2000 });
    });
  }

  async cloneVendor(vendor: VendorListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    try {
      await this.store.cloneVendor(vendor);
    } catch {
      // The store already surfaced a snackbar with the failure reason.
    }
  }

  async setActive(vendor: VendorListItem, activate: boolean, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        title: activate ? 'Enable Vendor?' : 'Disable Vendor?',
        message: activate
          ? `${vendor.vendorName} (${vendor.code}) will become selectable for new transactions.`
          : `${vendor.vendorName} (${vendor.code}) will be excluded from new transactions. Existing records are unaffected.`,
        confirmText: activate ? 'Enable' : 'Disable',
        color: activate ? 'primary' : 'warn',
        icon: activate ? 'toggle_on' : 'toggle_off',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;
    try {
      await this.store.setActive(vendor, activate);
    } catch {
      // The store already surfaced a snackbar with the failure reason.
    }
  }

  /**
   * Raises a blacklist REQUEST. The API rejects the call without a reason, and
   * the ban only lands once a manager approves it.
   */
  async blacklist(vendor: VendorListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    const reason = await this.askForReason(vendor, 'blacklist');
    if (!reason) return;
    try {
      await this.store.blacklist(vendor, reason);
    } catch {
      // The store already surfaced a snackbar with the failure reason.
    }
  }

  /** Un-blacklisting is equally approval-gated, and equally needs a reason. */
  async removeBlacklist(vendor: VendorListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    const reason = await this.askForReason(vendor, 'unblacklist');
    if (!reason) return;
    try {
      await this.store.removeBlacklist(vendor, reason);
    } catch {
      // The store already surfaced a snackbar with the failure reason.
    }
  }

  private async askForReason(
    vendor: VendorListItem,
    mode: 'blacklist' | 'unblacklist',
  ): Promise<string | null> {
    const ref = this.dialog.open<VendorBlacklistDialogComponent, VendorBlacklistDialogData, VendorBlacklistDialogResult>(
      VendorBlacklistDialogComponent,
      {
        width: '520px',
        maxWidth: '95vw',
        viewContainerRef: this.viewContainerRef,
        data: { vendorName: vendor.vendorName, vendorCode: vendor.code, mode },
      },
    );
    const result = await firstValueFrom(ref.afterClosed());
    return result?.reason ?? null;
  }

  async deleteVendor(vendor: VendorListItem, event?: Event): Promise<void> {
    event?.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        title: 'Delete Vendor?',
        message: `${vendor.vendorName} (${vendor.code}) will be removed from normal vendor selection. Historical procurement records are not affected.`,
        confirmText: 'Delete',
        color: 'warn',
        icon: 'warning',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;
    try {
      await this.store.deleteVendor(vendor);
    } catch {
      // The store already surfaced a snackbar with the failure reason.
    }
  }

  // ── Display helpers ────────────────────────────────────────────────

  label(value: string | null | undefined): string {
    return enumLabel(value);
  }

  country(code: string | null | undefined): string {
    return code ? countryName(code) : '—';
  }

  /** How many category chips fit on one row before collapsing into "+n". */
  private static readonly MAX_VISIBLE_CATEGORIES = 2;

  visibleCategories(categories: string[] | undefined): string[] {
    return (categories ?? []).slice(0, VendorListComponent.MAX_VISIBLE_CATEGORIES);
  }

  /** Returns 0 when nothing is hidden, so the template's @if skips the chip. */
  hiddenCategoryCount(categories: string[] | undefined): number {
    return Math.max(0, (categories?.length ?? 0) - VendorListComponent.MAX_VISIBLE_CATEGORIES);
  }

  /** Spells out what a pending flag means — the ban has not landed yet. */
  pendingTooltip(pending: PendingStatusChange): string {
    return pending === PendingStatusChange.PENDING_BLACKLIST
      ? 'Blacklisting has been requested and is awaiting manager approval. The vendor is not blacklisted yet.'
      : 'Removal from the blacklist has been requested and is awaiting manager approval. The vendor is still blacklisted.';
  }

  statusClass(status: VendorStatus): string {
    switch (status) {
      case VendorStatus.ACTIVE:           return 'status-chip status-chip--active';
      case VendorStatus.INACTIVE:         return 'status-chip status-chip--inactive';
      case VendorStatus.BLACKLISTED:      return 'status-chip status-chip--blacklisted';
      case VendorStatus.UNDER_EVALUATION: return 'status-chip status-chip--evaluation';
      default: return 'status-chip';
    }
  }

  riskClass(risk: RiskCategory | undefined): string {
    switch (risk) {
      case RiskCategory.LOW:    return 'risk-chip risk-chip--low';
      case RiskCategory.MEDIUM: return 'risk-chip risk-chip--medium';
      case RiskCategory.HIGH:   return 'risk-chip risk-chip--high';
      default: return 'risk-chip';
    }
  }

  classificationClass(value: VendorClassification | undefined): string {
    switch (value) {
      case VendorClassification.PREFERRED:   return 'class-chip class-chip--preferred';
      case VendorClassification.APPROVED:    return 'class-chip class-chip--approved';
      case VendorClassification.CONDITIONAL: return 'class-chip class-chip--conditional';
      case VendorClassification.REJECTED:    return 'class-chip class-chip--rejected';
      default: return 'class-chip';
    }
  }
}
