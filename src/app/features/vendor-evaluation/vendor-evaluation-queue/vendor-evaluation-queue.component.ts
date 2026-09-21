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
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { AuthService } from '../../../services';
import { PermissionService } from '../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../core/rbac/permissions.const';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MaterialCategoryService } from '../../material-category/services/material-category.service';
import { MaterialCategoryOption } from '../../material-category/models/material-category.model';
import { VendorService } from '../../vendor/services/vendor.service';
import { VendorListStore } from '../../vendor/store/vendor-list.store';
import {
  StatusChangeRequestType, VendorListItem, VendorSortField, VendorStatus, enumLabel,
} from '../../vendor/models/vendor.model';
import { VendorStatusChangeRequest } from '../../vendor/models/vendor-response.model';
import {
  BlacklistDecisionDialogComponent, BlacklistDecisionDialogData, BlacklistDecisionDialogResult,
} from '../components/blacklist-decision-dialog/blacklist-decision-dialog.component';

interface ColumnDef {
  key: string;
  label: string;
  sortField?: VendorSortField;
}

// Vendor Code / Name / Type / Material Categories / Submitted Date / Status /
// Actions — exactly the columns pm-api's vendor list can actually populate.
// "Assigned To", "Current Stage" and "Priority" from the original spec have
// no backing column anywhere (Vendor and VendorEvaluation carry neither an
// assignee nor a priority), so they are omitted here rather than faked —
// adding them is a backend change, not a template tweak.
const COLUMN_DEFS: ColumnDef[] = [
  { key: 'code', label: 'Vendor Code', sortField: 'code' },
  { key: 'vendorName', label: 'Vendor Name', sortField: 'vendorName' },
  { key: 'vendorType', label: 'Vendor Type', sortField: 'vendorTypeId' },
  { key: 'materialCategories', label: 'Material Categories' },
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
    MatPaginatorModule, MatChipsModule, MatProgressSpinnerModule, MatBadgeModule, MatTabsModule,
  ],
  templateUrl: './vendor-evaluation-queue.component.html',
  styleUrl: './vendor-evaluation-queue.component.scss',
})
export class VendorEvaluationQueueComponent implements OnInit {
  protected readonly store = inject(VendorListStore);
  private readonly permissionService = inject(PermissionService);
  private readonly materialCategoryService = inject(MaterialCategoryService);
  private readonly vendorService = inject(VendorService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly VendorStatus = VendorStatus;
  protected readonly columnDefs = COLUMN_DEFS;
  protected readonly displayedColumns = COLUMN_DEFS.map((c) => c.key);

  protected readonly searchTerm = signal('');
  protected readonly materialCategories = signal<MaterialCategoryOption[]>([]);

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

  // ── Blacklist / un-blacklist approval requests ──────────────────────
  // A separate list (GET /vendors/status-requests/pending), not the
  // VendorListStore above: this is request-centric (reason, requestedBy,
  // requestedAt), not vendor-centric, and pm-api does not paginate it.
  protected readonly StatusChangeRequestType = StatusChangeRequestType;
  protected readonly blacklistRequests = signal<VendorStatusChangeRequest[]>([]);
  protected readonly blacklistLoading = signal(true);
  protected readonly blacklistError = signal('');
  protected readonly blacklistBusyId = signal<string | null>(null);

  protected readonly pendingBlacklistCount = computed(() => this.blacklistRequests().length);

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

    this.materialCategoryService.getActiveMaterialCategories().subscribe({
      next: (res) => this.materialCategories.set(res.data ?? []),
      error: () => this.materialCategories.set([]),
    });

    void this.loadBlacklistRequests();
  }

  private async loadBlacklistRequests(): Promise<void> {
    this.blacklistLoading.set(true);
    this.blacklistError.set('');
    try {
      const res = await lastValueFrom(this.vendorService.getPendingStatusRequests());
      this.blacklistRequests.set(res.data ?? []);
    } catch (err) {
      this.blacklistError.set(this.messageForStatus(err as HttpErrorResponse));
      this.blacklistRequests.set([]);
    } finally {
      this.blacklistLoading.set(false);
    }
  }

  refreshBlacklistRequests(): void {
    void this.loadBlacklistRequests();
  }

  /** Only the person who raised a request may withdraw it — no token needed. */
  canCancel(request: VendorStatusChangeRequest): boolean {
    const email = this.auth.user()?.email;
    return !!email && request.requestedBy?.toLowerCase() === email.toLowerCase();
  }

  trackByRequestId(_index: number, request: VendorStatusChangeRequest): string {
    return request.id;
  }

  async decideBlacklistRequest(request: VendorStatusChangeRequest, decision: 'approve' | 'reject'): Promise<void> {
    const ref = this.dialog.open<BlacklistDecisionDialogComponent, BlacklistDecisionDialogData, BlacklistDecisionDialogResult>(
      BlacklistDecisionDialogComponent,
      {
        width: '520px',
        maxWidth: '95vw',
        data: {
          decision,
          vendorCode: request.vendorCode ?? '',
          vendorName: request.vendorName ?? '',
          requestType: request.requestType,
          reason: request.reason,
          requestedBy: request.requestedBy,
        },
      },
    );
    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    this.blacklistBusyId.set(request.id);
    try {
      const res = await lastValueFrom(
        decision === 'approve'
          ? this.vendorService.approveStatusChange(request.id, result)
          : this.vendorService.rejectStatusChange(request.id, result),
      );
      this.snack.open(
        decision === 'approve'
          ? `${res.data.code} approved — ${this.label(res.data.vendorStatus)}.`
          : `${res.data.code} request rejected — no change made.`,
        'OK',
        { duration: 5000 },
      );
      void this.loadBlacklistRequests();
      this.store.refresh();
    } catch (err) {
      this.snack.open(this.decisionErrorMessage(err as HttpErrorResponse, decision), 'Close', {
        duration: 7000, panelClass: ['error-snackbar'],
      });
    } finally {
      this.blacklistBusyId.set(null);
    }
  }

  async cancelBlacklistRequest(request: VendorStatusChangeRequest): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      data: {
        title: 'Withdraw This Request?',
        message: `Your ${request.requestType === StatusChangeRequestType.BLACKLIST ? 'blacklist' : 'un-blacklist'} ` +
          `request for ${request.vendorCode} — ${request.vendorName} will be withdrawn. No manager decision will be recorded.`,
        confirmText: 'Withdraw Request',
        color: 'warn',
        icon: 'undo',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;

    this.blacklistBusyId.set(request.id);
    try {
      await lastValueFrom(this.vendorService.cancelStatusChange(request.id));
      this.snack.open('Request withdrawn.', 'OK', { duration: 4000 });
      void this.loadBlacklistRequests();
    } catch (err) {
      this.snack.open(this.decisionErrorMessage(err as HttpErrorResponse, 'cancel'), 'Close', {
        duration: 6000, panelClass: ['error-snackbar'],
      });
    } finally {
      this.blacklistBusyId.set(null);
    }
  }

  private decisionErrorMessage(err: HttpErrorResponse, action: 'approve' | 'reject' | 'cancel'): string {
    switch (err?.status) {
      case 403: return err.error?.message || (action === 'cancel'
        ? 'Only the person who raised this request may withdraw it.'
        : 'You raised this request yourself, so you cannot decide it — a different manager must review it.');
      case 404: return 'This request could not be found. It may have already been decided.';
      case 409: return err.error?.message || 'This request has already been decided, or the approval link has expired.';
      default:  return err?.error?.message || `The request could not be ${action === 'cancel' ? 'withdrawn' : action + 'd'}.`;
    }
  }

  private messageForStatus(err: HttpErrorResponse): string {
    switch (err?.status) {
      case 0:   return 'Cannot reach the server. Check your connection and try again.';
      case 401: return 'Your session has expired. Please sign in again.';
      case 403: return 'You do not have permission to view pending approval requests.';
      default:  return err?.error?.message || 'Unable to load pending approval requests.';
    }
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

  onMaterialCategoryFilterChange(materialCategoryId: string | null): void {
    this.store.setFilter({ materialCategoryId });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.onStatusFilterChange(VendorStatus.UNDER_EVALUATION);
    this.store.setFilter({ materialCategoryId: null, search: '' });
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
