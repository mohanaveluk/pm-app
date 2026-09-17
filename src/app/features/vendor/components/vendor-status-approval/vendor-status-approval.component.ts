import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { PermissionService } from '../../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../../core/rbac/permissions.const';
import { VendorService } from '../../services/vendor.service';
import { StatusChangeRequestType, Vendor } from '../../models/vendor.model';
import { VendorStatusChangeRequest } from '../../models/vendor-response.model';

type PageState = 'loading' | 'ready' | 'approved' | 'rejected' | 'error';

/**
 * The page the emailed approval link actually opens
 * (`${FRONTEND_URL}/vendors/status-approval?requestId=&token=`, generated in
 * pm-api's VendorService.sendApprovalEmail). The token is a single-use
 * credential burned on decision — there is deliberately no other way to
 * approve or reject a blacklist / un-blacklist request from the UI, so a
 * mail scanner pre-fetching the link cannot decide anything on the manager's
 * behalf. See vendor.controller.ts's "Manager decisions" section.
 *
 * The requestId is looked up against GET /vendors/status-requests/pending
 * purely for display context (vendor name, reason, who asked) — no dedicated
 * "get one request" endpoint exists, and none is needed since the decision
 * itself only requires the id + token already in the URL.
 */
@Component({
  selector: 'app-vendor-status-approval',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatFormFieldModule, MatInputModule,
  ],
  templateUrl: './vendor-status-approval.component.html',
  styleUrl: './vendor-status-approval.component.scss',
})
export class VendorStatusApprovalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vendorService = inject(VendorService);
  private readonly permissionService = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly StatusChangeRequestType = StatusChangeRequestType;

  protected readonly state = signal<PageState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly request = signal<VendorStatusChangeRequest | null>(null);
  protected readonly decidedVendor = signal<Vendor | null>(null);
  protected readonly deciding = signal(false);

  private requestId = '';
  private token = '';

  protected readonly canApprove = computed(() => this.can(PERMISSIONS.VENDOR_EVALUATION_APPROVE));
  protected readonly canReject = computed(() => this.can(PERMISSIONS.VENDOR_EVALUATION_REJECT));

  protected readonly form = this.fb.nonNullable.group({
    comments: [''],
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.requestId = params.get('requestId') ?? '';
    this.token = params.get('token') ?? '';

    if (!this.requestId || !this.token) {
      this.state.set('error');
      this.errorMessage.set(
        'This approval link is incomplete. Open the link from the approval email again, or ' +
        'ask the manager who raised the request to resend it.',
      );
      return;
    }

    void this.loadContext();
  }

  /** Best-effort — a failure here still lets the decision itself go through. */
  private async loadContext(): Promise<void> {
    debugger;
    try {
      const res = await lastValueFrom(this.vendorService.getPendingStatusRequests());
      const match = (res.data ?? []).find((r) => r.id === this.requestId) ?? null;
      this.request.set(match);
    } catch {
      this.request.set(null);
    } finally {
      this.state.set('ready');
    }
  }

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  actionLabel(type: StatusChangeRequestType | undefined): string {
    return type === StatusChangeRequestType.BLACKLIST ? 'Blacklist' : 'Remove Blacklist';
  }

  async approve(): Promise<void> {
    await this.decide('approve');
  }

  async reject(): Promise<void> {
    await this.decide('reject');
  }

  private async decide(action: 'approve' | 'reject'): Promise<void> {
    if (this.deciding()) return;
    this.deciding.set(true);
    try {
      const dto = { token: this.token, comments: this.form.controls.comments.value.trim() || undefined };
      const res = await lastValueFrom(
        action === 'approve'
          ? this.vendorService.approveStatusChange(this.requestId, dto)
          : this.vendorService.rejectStatusChange(this.requestId, dto),
      );
      this.decidedVendor.set(res.data);
      this.state.set(action === 'approve' ? 'approved' : 'rejected');
    } catch (err) {
      this.state.set('error');
      this.errorMessage.set(this.messageFor(err as HttpErrorResponse, action));
    } finally {
      this.deciding.set(false);
    }
  }

  private messageFor(err: HttpErrorResponse, action: 'approve' | 'reject'): string {
    switch (err?.status) {
      case 401: return 'Your session has expired. Please sign in again and reopen the approval link.';
      case 403: return err.error?.message || 'You raised this request yourself, so you cannot decide it — a different manager must review it.';
      case 404: return 'This request could not be found. It may have already been decided or withdrawn.';
      case 409: return err.error?.message || 'This request has already been decided, or the approval link has expired.';
      default:  return err?.error?.message || `The request could not be ${action === 'approve' ? 'approved' : 'rejected'}. Please try again.`;
    }
  }

  viewVendor(): void {
    const id = this.decidedVendor()?.id;
    if (id) void this.router.navigate(['/vendors', id, 'view']);
  }

  backToQueue(): void {
    void this.router.navigate(['/vendor-evaluation']);
  }
}
