import { ChangeDetectionStrategy, Component, OnInit, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { PermissionService } from '../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../core/rbac/permissions.const';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { countryName } from '../../../shared/reference/countries';
import { VendorService } from '../services/vendor.service';
import {
  PendingStatusChange, RiskCategory, Vendor, VendorClassification, VendorEvaluation,
  VendorPerformance, VendorStatus, enumLabel,
} from '../models/vendor.model';
import {
  VendorBlacklistDialogComponent, VendorBlacklistDialogData, VendorBlacklistDialogResult,
} from '../components/vendor-blacklist-dialog/vendor-blacklist-dialog.component';

/**
 * Read-only vendor detail.
 *
 * A summary header carrying the status, risk and AVL badges, then one tab per
 * child collection. The detail endpoint already returns contacts, addresses,
 * bank accounts, certifications, documents, materials and turnovers, so only
 * performance and evaluations need their own calls.
 *
 * Audit history has no endpoint yet. The tab is rendered with an explicit
 * "not available" state and its data comes from a signal, so wiring a future
 * endpoint means filling that signal — not redesigning the screen.
 */
@Component({
  selector: 'app-vendor-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatTabsModule, MatButtonModule, MatIconModule, MatMenuModule,
    MatTooltipModule, MatDividerModule, MatProgressSpinnerModule,
  ],
  templateUrl: './vendor-view.component.html',
  styleUrl: './vendor-view.component.scss',
})
export class VendorViewComponent implements OnInit {
  private readonly vendorService = inject(VendorService);
  private readonly permissionService = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly VendorStatus = VendorStatus;

  protected readonly vendor = signal<Vendor | null>(null);
  protected readonly performance = signal<VendorPerformance[]>([]);
  protected readonly evaluations = signal<VendorEvaluation[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  /** No audit endpoint exists yet — see the class comment. */
  protected readonly auditHistory = signal<unknown[]>([]);

  protected readonly hasBlacklist = computed(() => this.vendor()?.vendorStatus === VendorStatus.BLACKLISTED);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await lastValueFrom(this.vendorService.getVendorById(id));
      this.vendor.set(res.data);

      // Loaded alongside, not blocking: the record renders even if these fail.
      const [performance, evaluations] = await Promise.allSettled([
        lastValueFrom(this.vendorService.getPerformance(id)),
        lastValueFrom(this.vendorService.getEvaluations(id)),
      ]);
      if (performance.status === 'fulfilled') this.performance.set(performance.value.data ?? []);
      if (evaluations.status === 'fulfilled') this.evaluations.set(evaluations.value.data ?? []);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.error.set(
        httpErr?.status === 404
          ? 'This vendor could not be found. It may have been deleted.'
          : 'Unable to load the vendor. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  can(permission: string): boolean {
    return this.permissionService.hasAnyPermission([permission, PERMISSIONS.VENDORS_MANAGE]);
  }

  // ── Navigation ─────────────────────────────────────────────────────

  back(): void {
    void this.router.navigate(['/vendors']);
  }

  edit(): void {
    const id = this.vendor()?.id;
    if (id) void this.router.navigate(['/vendors', id, 'edit']);
  }

  open(url: string | undefined): void {
    if (url) window.open(url, '_blank', 'noopener');
  }

  // ── Status actions ─────────────────────────────────────────────────

  async setActive(activate: boolean): Promise<void> {
    const vendor = this.vendor();
    if (!vendor) return;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        title: activate ? 'Enable Vendor?' : 'Disable Vendor?',
        message: activate
          ? `${vendor.vendorName} will become selectable for new transactions.`
          : `${vendor.vendorName} will be excluded from new transactions. Existing records are unaffected.`,
        confirmText: activate ? 'Enable' : 'Disable',
        color: activate ? 'primary' : 'warn',
        icon: activate ? 'toggle_on' : 'toggle_off',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;

    await this.run(
      () => lastValueFrom(activate
        ? this.vendorService.enableVendor(vendor.id)
        : this.vendorService.disableVendor(vendor.id)),
      activate ? 'Vendor enabled' : 'Vendor disabled',
      {
        400: `This vendor is already ${activate ? 'active' : 'inactive'}.`,
        409: activate
          ? 'A blacklisted vendor must be removed from the blacklist before it can be enabled.'
          : 'This vendor cannot be disabled in its current state.',
      },
    );
  }

  /**
   * Raises a blacklist REQUEST. The vendor is flagged pending and a manager
   * decides; nothing about its status changes here, so the record is reloaded
   * rather than patched from an assumed outcome.
   */
  async blacklist(): Promise<void> {
    await this.requestStatusChange('blacklist');
  }

  async removeBlacklist(): Promise<void> {
    await this.requestStatusChange('unblacklist');
  }

  private async requestStatusChange(mode: 'blacklist' | 'unblacklist'): Promise<void> {
    const vendor = this.vendor();
    if (!vendor) return;

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
    if (!result?.reason) return;

    const isBlacklist = mode === 'blacklist';
    this.busy.set(true);
    try {
      const res = await lastValueFrom(
        isBlacklist
          ? this.vendorService.blacklistVendor(vendor.id, { reason: result.reason })
          : this.vendorService.removeBlacklist(vendor.id, { reason: result.reason }),
      );
      const kind = isBlacklist ? 'Blacklist' : 'Un-blacklist';
      const accepted = res.data;
      const detail = accepted?.notificationSent
        ? `${accepted.approversNotified ?? 0} approver(s) notified.`
        : 'The approval email could not be sent; the request still stands.';
      this.snack.open(`${kind} request raised — awaiting manager approval. ${detail}`, 'OK', { duration: 6000 });

      // The API decides nothing here, so re-read rather than guess the new state.
      await this.load(vendor.id);
    } catch (err) {
      this.snack.open(
        this.messageFor(err as HttpErrorResponse, `Unable to raise the ${isBlacklist ? 'blacklist' : 'un-blacklist'} request`, {
          400: 'A reason is required for this request.',
          409: isBlacklist
            ? 'This vendor is already blacklisted, or another request is already pending.'
            : 'This vendor is not blacklisted, or another request is already pending.',
          422: 'No manager is available to approve this request in your organization.',
        }),
        'Close',
        { duration: 6000, panelClass: ['error-snackbar'] },
      );
    } finally {
      this.busy.set(false);
    }
  }

  async remove(): Promise<void> {
    const vendor = this.vendor();
    if (!vendor) return;

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

    this.busy.set(true);
    try {
      await lastValueFrom(this.vendorService.deleteVendor(vendor.id));
      this.snack.open(`${vendor.code} deleted`, 'OK', { duration: 3000 });
      void this.router.navigate(['/vendors']);
    } catch (err) {
      this.snack.open(this.messageFor(err as HttpErrorResponse, 'Unable to delete this vendor', {
        409: 'This vendor is referenced by existing procurement records and cannot be deleted.',
      }), 'Close', { duration: 6000, panelClass: ['error-snackbar'] });
    } finally {
      this.busy.set(false);
    }
  }

  /** Runs a status transition and refreshes the record from the response. */
  private async run(
    action: () => Promise<{ data: Vendor }>,
    successMessage: string,
    statusMessages: Record<number, string>,
  ): Promise<void> {
    this.busy.set(true);
    try {
      const res = await action();
      this.vendor.set(res.data);
      this.snack.open(successMessage, 'OK', { duration: 3000 });
    } catch (err) {
      this.snack.open(
        this.messageFor(err as HttpErrorResponse, 'The action could not be completed', statusMessages),
        'Close',
        { duration: 6000, panelClass: ['error-snackbar'] },
      );
    } finally {
      this.busy.set(false);
    }
  }

  private messageFor(err: HttpErrorResponse, fallback: string, statusMessages: Record<number, string> = {}): string {
    const status = err?.status;
    if (status && statusMessages[status]) return statusMessages[status];
    switch (status) {
      case 0:   return 'Cannot reach the server. Check your connection and try again.';
      case 401: return 'Your session has expired. Please sign in again.';
      case 403: return 'You do not have permission to perform this operation.';
      case 404: return 'This vendor could not be found. It may have been deleted.';
      default:  return err?.error?.message || fallback;
    }
  }

  // ── Display helpers ────────────────────────────────────────────────

  label(value: string | null | undefined): string {
    return enumLabel(value);
  }

  country(code: string | null | undefined): string {
    return code ? countryName(code) : '—';
  }

  /** Spells out that a pending flag is a request, not an applied change. */
  pendingTooltip(pending: PendingStatusChange): string {
    return pending === PendingStatusChange.PENDING_BLACKLIST
      ? 'Blacklisting has been requested and is awaiting manager approval. The vendor is not blacklisted yet.'
      : 'Removal from the blacklist has been requested and is awaiting manager approval. The vendor is still blacklisted.';
  }

  statusClass(status: VendorStatus | undefined): string {
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

  addressLine(address: { addressLine1?: string; addressLine2?: string; city?: string; state?: string; postalCode?: string; country?: string }): string {
    return [
      address.addressLine1, address.addressLine2, address.city,
      address.state, address.postalCode, this.country(address.country),
    ].filter((part) => part && part !== '—').join(', ');
  }

  fileSize(bytes: number | undefined): string {
    if (!bytes) return '';
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}
