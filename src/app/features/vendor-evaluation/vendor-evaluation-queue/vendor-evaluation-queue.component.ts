import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { PermissionService } from '../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../core/rbac/permissions.const';
import { IndustryCategoryService } from '../../industry-category/services/industry-category.service';
import { IndustryCategoryOption } from '../../industry-category/models/industry-category.model';
import { VendorListStore } from '../../vendor/store/vendor-list.store';
import {
  VendorListItem, VendorSortField, VendorStatus, enumLabel,
} from '../../vendor/models/vendor.model';

interface ColumnDef {
  key: string;
  label: string;
  sortField?: VendorSortField;
}

// Vendor Code / Name / Type / Industry Category / Submitted Date / Status /
// Actions — exactly the columns pm-api's vendor list can actually populate.
// "Assigned To", "Current Stage" and "Priority" from the original spec have
// no backing column anywhere (Vendor and VendorEvaluation carry neither an
// assignee nor a priority), so they are omitted here rather than faked —
// adding them is a backend change, not a template tweak.
const COLUMN_DEFS: ColumnDef[] = [
  { key: 'code', label: 'Vendor Code', sortField: 'code' },
  { key: 'vendorName', label: 'Vendor Name', sortField: 'vendorName' },
  { key: 'vendorType', label: 'Vendor Type', sortField: 'vendorTypeId' },
  { key: 'industryCategory', label: 'Industry Category' },
  { key: 'submittedDate', label: 'Submitted Date', sortField: 'createdAt' },
  { key: 'status', label: 'Status', sortField: 'vendorStatus' },
  { key: 'actions', label: 'Actions' },
];

/**
 * Vendor Evaluation Queue — reuses VendorListStore wholesale (same paging /
 * search / sort / filter contract the Vendor Master list already drives),
 * just aimed at the vendors an evaluator actually needs to see rather than
 * the whole register. Vendor Master's own create/edit/delete actions are
 * absent here on purpose — see the class comment on VendorEvaluationWorkspaceComponent.
 */
@Component({
  selector: 'app-vendor-evaluation-queue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [VendorListStore],
  imports: [
    CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSortModule,
    MatPaginatorModule, MatChipsModule, MatProgressSpinnerModule, MatBadgeModule,
  ],
  templateUrl: './vendor-evaluation-queue.component.html',
  styleUrl: './vendor-evaluation-queue.component.scss',
})
export class VendorEvaluationQueueComponent implements OnInit {
  protected readonly store = inject(VendorListStore);
  private readonly permissionService = inject(PermissionService);
  private readonly industryCategoryService = inject(IndustryCategoryService);
  private readonly router = inject(Router);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly VendorStatus = VendorStatus;
  protected readonly columnDefs = COLUMN_DEFS;
  protected readonly displayedColumns = COLUMN_DEFS.map((c) => c.key);

  protected readonly searchTerm = signal('');
  protected readonly industryCategories = signal<IndustryCategoryOption[]>([]);

  /** Every status the queue can be scoped to — a real vendorStatus value, never a fabricated one. */
  protected readonly statusOptions: { value: VendorStatus | 'all'; label: string }[] = [
    { value: VendorStatus.UNDER_EVALUATION, label: 'Pending Evaluation' },
    { value: 'all', label: 'All' },
    { value: VendorStatus.ACTIVE, label: 'Approved (Active)' },
    { value: VendorStatus.INACTIVE, label: 'Inactive' },
    { value: VendorStatus.BLACKLISTED, label: 'Blacklisted' },
  ];

  protected readonly pendingCount = computed(() =>
    this.store.filter().vendorStatus === VendorStatus.UNDER_EVALUATION ? this.store.totalCount() : null,
  );

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  trackByVendorId(_index: number, vendor: VendorListItem): string {
    return vendor.id;
  }

  ngOnInit(): void {
    // Defaults the queue to what an evaluator actually opens it for: vendors
    // still waiting on a decision. includeBlacklisted has to be forced on
    // too, or the "All" / "Blacklisted" filters would silently come back
    // empty — the list endpoint hides blacklisted vendors unless asked.
    this.store.setFilter({ vendorStatus: VendorStatus.UNDER_EVALUATION, includeBlacklisted: true });

    this.industryCategoryService.getActiveIndustryCategories().subscribe({
      next: (res) => this.industryCategories.set(res.data ?? []),
      error: () => this.industryCategories.set([]),
    });
  }

  label(value: string | null | undefined): string {
    return enumLabel(value);
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

  onStatusFilterChange(status: VendorStatus | 'all'): void {
    this.store.setFilter({
      vendorStatus: status === 'all' ? null : status,
      includeBlacklisted: true,
    });
  }

  onIndustryFilterChange(industryCategoryId: string | null): void {
    this.store.setFilter({ industryCategoryId });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.onStatusFilterChange(VendorStatus.UNDER_EVALUATION);
    this.store.setFilter({ industryCategoryId: null, search: '' });
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

  // ── Row actions ────────────────────────────────────────────────────

  open(vendor: VendorListItem): void {
    void this.router.navigate(['/vendor-evaluation', vendor.id]);
  }
}
