import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { PermissionService } from '../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../core/rbac/permissions.const';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { countryName } from '../../../shared/reference/countries';
import { VendorService } from '../../vendor/services/vendor.service';
import {
  EVALUATION_STAGE_OPTIONS, EvaluationDecision, EvaluationStage, RiskCategory, Vendor,
  VendorClassification, VendorEvaluation, VendorStatus, enumLabel,
} from '../../vendor/models/vendor.model';
import {
  EvaluationDecisionDialogComponent, EvaluationDecisionDialogData, EvaluationDecisionDialogResult,
} from '../components/evaluation-decision-dialog/evaluation-decision-dialog.component';

/**
 * The Vendor Evaluation & Approval workspace — a business workflow screen,
 * deliberately separate from VendorWorkspaceComponent (Vendor Master).
 *
 * It never edits Vendor Master data (name, addresses, banking, technical,
 * documents, …): those fields render read-only here, and the only way to
 * change them is "Return for Clarification", which sends the vendor back to
 * whoever maintains its master record rather than letting an evaluator edit
 * it directly. Everything this screen DOES write goes through
 * POST /vendors/:id/evaluations (VendorService.addEvaluation) — an
 * append-only decision log — plus, on Approve, the same enable() transition
 * used elsewhere in Vendor Master.
 *
 * Built to generalise: swap the vendor load/save calls for another entity's
 * and this same stage → score/comments → decision → history shape covers
 * re-evaluation, renewal, material approval, RFQ/bid evaluation, etc. — see
 * the class-level note in vendor-evaluation.model equivalents when those land.
 */
@Component({
  selector: 'app-vendor-evaluation-workspace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatTooltipModule, MatProgressSpinnerModule, MatDividerModule, MatExpansionModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  templateUrl: './vendor-evaluation-workspace.component.html',
  styleUrl: './vendor-evaluation-workspace.component.scss',
})
export class VendorEvaluationWorkspaceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vendorService = inject(VendorService);
  private readonly permissionService = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly EvaluationDecision = EvaluationDecision;
  protected readonly VendorStatus = VendorStatus;
  protected readonly stageOptions = EVALUATION_STAGE_OPTIONS;

  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);

  protected readonly vendor = signal<Vendor | null>(null);
  protected readonly history = signal<VendorEvaluation[]>([]);
  protected readonly historyLoading = signal(true);

  protected readonly canEvaluate = computed(() => this.can(PERMISSIONS.VENDOR_EVALUATION_EVALUATE));
  protected readonly canApprove = computed(() => this.can(PERMISSIONS.VENDOR_EVALUATION_APPROVE));
  protected readonly canReject = computed(() => this.can(PERMISSIONS.VENDOR_EVALUATION_REJECT));
  protected readonly canReturn = computed(() => this.can(PERMISSIONS.VENDOR_EVALUATION_RETURN));
  protected readonly canDecideAny = computed(
    () => this.canEvaluate() || this.canApprove() || this.canReject() || this.canReturn(),
  );

  protected readonly form = this.fb.nonNullable.group({
    stage: [EvaluationStage.TECHNICAL, [Validators.required]],
    score: [null as number | null],
    referenceNumber: [''],
    comments: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
    else this.loadError.set('No vendor was specified.');
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const res = await lastValueFrom(this.vendorService.getVendorById(id));
      this.vendor.set(res.data);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.loadError.set(
        httpErr?.status === 404
          ? 'This vendor could not be found. It may have been deleted.'
          : 'Unable to load the vendor. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
    void this.loadHistory(id);
  }

  private async loadHistory(id: string): Promise<void> {
    this.historyLoading.set(true);
    try {
      const res = await lastValueFrom(this.vendorService.getEvaluations(id));
      this.history.set(res.data ?? []);
    } catch {
      // The record itself is what matters; history degrades to empty.
      this.history.set([]);
    } finally {
      this.historyLoading.set(false);
    }
  }

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  label(value: string | null | undefined): string {
    return enumLabel(value);
  }

  country(code: string | null | undefined): string {
    return code ? countryName(code) : '—';
  }

  addressLine(address: { addressLine1?: string; city?: string; state?: string; country?: string }): string {
    return [address.addressLine1, address.city, address.state, this.country(address.country)]
      .filter((part) => part && part !== '—')
      .join(', ');
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

  decisionClass(decision: EvaluationDecision): string {
    switch (decision) {
      case EvaluationDecision.APPROVED: return 'decision-chip decision-chip--approved';
      case EvaluationDecision.REJECTED: return 'decision-chip decision-chip--rejected';
      case EvaluationDecision.RETURNED: return 'decision-chip decision-chip--returned';
      case EvaluationDecision.ON_HOLD:  return 'decision-chip decision-chip--hold';
      default: return 'decision-chip';
    }
  }

  back(): void {
    void this.router.navigate(['/vendor-evaluation']);
  }

  viewFullRecord(): void {
    const id = this.vendor()?.id;
    if (id) window.open(`/vendors/${id}/view`, '_blank', 'noopener');
  }

  // ── Record a stage evaluation (no status change) ────────────────────

  async recordStageEvaluation(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const vendor = this.vendor();
    if (!vendor) return;

    const v = this.form.getRawValue();
    await this.submit(vendor.id, {
      stage: v.stage,
      decision: EvaluationDecision.SUBMITTED,
      score: v.score ?? undefined,
      referenceNumber: v.referenceNumber.trim() || undefined,
      comments: v.comments.trim() || undefined,
    }, `${vendor.code} — ${this.label(v.stage)} evaluation recorded.`);
  }

  // ── Approve / Reject / Return ────────────────────────────────────────

  async approve(): Promise<void> {
    await this.decide(EvaluationDecision.APPROVED);
  }

  async reject(): Promise<void> {
    await this.decide(EvaluationDecision.REJECTED);
  }

  async returnForClarification(): Promise<void> {
    await this.decide(EvaluationDecision.RETURNED);
  }

  private async decide(
    decision: EvaluationDecision.APPROVED | EvaluationDecision.REJECTED | EvaluationDecision.RETURNED,
  ): Promise<void> {
    const vendor = this.vendor();
    if (!vendor || this.saving()) return;

    const ref = this.dialog.open<EvaluationDecisionDialogComponent, EvaluationDecisionDialogData, EvaluationDecisionDialogResult>(
      EvaluationDecisionDialogComponent,
      {
        width: '620px',
        maxWidth: '95vw',
        data: {
          decision,
          vendorName: vendor.vendorName,
          vendorCode: vendor.code,
          defaultStage: this.form.controls.stage.value,
          defaultScore: this.form.controls.score.value,
        },
      },
    );
    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    if (decision === EvaluationDecision.APPROVED) {
      const approveRef = this.dialog.open(ConfirmDialogComponent, {
        width: '460px',
        maxWidth: '95vw',
        data: {
          title: 'Approve this vendor?',
          message: `${vendor.vendorName} (${vendor.code}) will become an approved, active vendor immediately.`,
          confirmText: 'Approve Vendor',
          color: 'primary',
          icon: 'check_circle',
        },
      });
      if (!(await firstValueFrom(approveRef.afterClosed()))) return;
    }

    const successMessage = decision === EvaluationDecision.APPROVED
      ? `${vendor.code} approved and activated.`
      : decision === EvaluationDecision.REJECTED
        ? `${vendor.code} marked Rejected.`
        : `${vendor.code} returned for clarification.`;

    await this.submit(vendor.id, { ...result, decision }, successMessage);
  }

  private async submit(
    vendorId: string,
    request: {
      stage: EvaluationStage; decision: EvaluationDecision; score?: number;
      referenceNumber?: string; comments?: string;
      riskCategory?: RiskCategory; vendorClassification?: VendorClassification;
    },
    successMessage: string,
  ): Promise<void> {
    this.saving.set(true);
    try {
      await lastValueFrom(this.vendorService.addEvaluation(vendorId, request));
      this.snack.open(successMessage, 'OK', { duration: 5000 });
      this.form.patchValue({ score: null, referenceNumber: '', comments: '' });
      // Vendor status/rolled-up fields and the history list both move as a
      // result of this call, so both are re-read rather than guessed at.
      await this.load(vendorId);
    } catch (err) {
      this.snack.open(this.messageFor(err as HttpErrorResponse), 'Close', {
        duration: 7000, panelClass: ['error-snackbar'],
      });
    } finally {
      this.saving.set(false);
    }
  }

  private messageFor(err: HttpErrorResponse): string {
    switch (err?.status) {
      case 0:   return 'Cannot reach the server. Check your connection and try again.';
      case 400: return err.error?.message || 'Comments are required for this decision.';
      case 401: return 'Your session has expired. Please sign in again.';
      case 403: return 'You do not have permission to record this decision.';
      case 404: return 'This vendor could not be found. It may have been deleted.';
      case 409: return err.error?.message || 'This vendor cannot be approved in its current state (it may be blacklisted or already active).';
      case 500: return 'Something went wrong. Please try again.';
      default:  return err?.error?.message || 'The evaluation could not be recorded.';
    }
  }
}
