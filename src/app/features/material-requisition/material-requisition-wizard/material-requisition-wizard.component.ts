import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MaterialRequisitionService } from '../services/material-requisition.service';
import { RequisitionFormService } from '../services/requisition-form.service';
import {
  MaterialRequisition, MaterialRequisitionStatus, RequisitionLineSource, isRequisitionEditable,
  requisitionStatusLabel,
} from '../models/material-requisition.model';
import { HasUnsavedRequisitionChanges } from '../guards/unsaved-requisition.guard';
import { RequisitionHeaderStepComponent } from '../components/requisition-header-step/requisition-header-step.component';
import { RequisitionMaterialsStepComponent } from '../components/requisition-materials-step/requisition-materials-step.component';
import { RequisitionChecklistStepComponent } from '../components/requisition-checklist-step/requisition-checklist-step.component';
import { RequisitionSummaryStepComponent } from '../components/requisition-summary-step/requisition-summary-step.component';

/**
 * The create / edit-draft wizard: Header & Documents → Materials → Review.
 *
 * Save Draft writes the requisition as it stands and keeps the user here;
 * Submit sends it to Under Review and shows the number. A draft that has been
 * saved once keeps its id, so a second save updates rather than duplicates.
 */
@Component({
  selector: 'app-material-requisition-wizard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RequisitionFormService],
  imports: [
    CommonModule, MatStepperModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatTooltipModule, MatProgressSpinnerModule, RequisitionHeaderStepComponent,
    RequisitionMaterialsStepComponent, RequisitionSummaryStepComponent, RequisitionChecklistStepComponent,
  ],
  templateUrl: './material-requisition-wizard.component.html',
  styleUrls: ['../components/requisition-step.shared.scss', './material-requisition-wizard.component.scss'],
})
export class MaterialRequisitionWizardComponent implements OnInit, HasUnsavedRequisitionChanges {
  protected readonly form = inject(RequisitionFormService);
  private readonly service = inject(MaterialRequisitionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly steps = this.form.steps;
  protected readonly stepIndex = signal(0);
  protected readonly isLast = computed(() => this.stepIndex() === this.steps.length - 1);

  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);

  /** The saved requisition (after the first save, or when editing). */
  protected readonly saved = signal<MaterialRequisition | null>(null);
  /** Set once the requisition has been submitted: shows the confirmation screen. */
  protected readonly submitted = signal<MaterialRequisition | null>(null);

  protected readonly initialSource = signal(RequisitionLineSource.MATERIAL_MASTER);
  protected readonly isEdit = computed(() => this.route.snapshot.data['mode'] === 'edit');

  /**
   * Already submitted and waiting for review or approval: it is corrected in
   * place — no Save Draft, no Submit — and keeps its status.
   */
  protected readonly isUnderReview = computed(() => {
    const status = this.saved()?.status;
    return status === MaterialRequisitionStatus.UNDER_REVIEW || status === MaterialRequisitionStatus.REVIEWED;
  });

  /** Sent back for changes: edited, then resubmitted for a new review round. */
  protected readonly isReturned = computed(
    () => this.saved()?.status === MaterialRequisitionStatus.RETURNED,
  );

  /** A reviewer / approver editing from their decision screen goes back there after saving. */
  protected readonly fromReview = computed(() => this.route.snapshot.queryParamMap.get('returnTo') === 'review');
  protected readonly fromApproval = computed(() => this.route.snapshot.queryParamMap.get('returnTo') === 'approval');

  /** What the header says while editing a requisition that is already submitted. */
  protected readonly inPlaceLabel = computed(() => {
    if (this.fromReview()) return 'Editing as reviewer — changes are saved in place';
    if (this.fromApproval()) return 'Editing as approver — changes are saved in place';
    return this.saved()?.status === MaterialRequisitionStatus.REVIEWED
      ? 'Reviewed — changes are saved in place'
      : 'Under review — changes are saved in place';
  });

  /** Where saving or cancelling returns to: the decision screen the edit started from, if any. */
  private decisionScreen(id: string): string[] | null {
    if (this.fromReview()) return ['/material-requisitions', 'reviews', id];
    if (this.fromApproval()) return ['/material-requisitions', 'approvals', id];
    return null;
  }

  /** What was asked for when it was returned (the last round's return comments). */
  protected readonly returnNotes = computed(() => {
    const mr = this.saved();
    if (!mr || mr.status !== MaterialRequisitionStatus.RETURNED) return [];
    return (mr.history ?? []).filter((e) => e.action === 'RETURNED' && e.round === mr.reviewRound && e.comments);
  });

  /** The requisition this new one was imported from (Import on the list). */
  protected readonly importedFrom = signal<string | null>(null);

  private bypassGuard = false;

  ngOnInit(): void {
    this.form.loadReferenceData();

    if (this.route.snapshot.queryParamMap.get('source') === 'bom') {
      this.initialSource.set(RequisitionLineSource.BOM);
    }

    if (this.isEdit()) {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) void this.loadDraft(id);
    } else {
      const params = this.route.snapshot.queryParamMap;
      const sourceId = params.get('id');
      if (params.get('importFrom') === 'mr' && sourceId) void this.loadImport(sourceId);
    }
  }

  private async loadDraft(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const res = await lastValueFrom(this.service.getRequisitionById(id));
      if (!isRequisitionEditable(res.data.status) || res.data.permissions?.canEdit === false) {
        this.snack.open(
          res.data.lockedAt
            ? 'This requisition is locked — a purchase order has been raised against it.'
            : res.data.status === MaterialRequisitionStatus.APPROVED
              ? 'This requisition is approved and locked — it can no longer be edited.'
              : 'You cannot edit this requisition in its current status.',
          'OK', { duration: 4000 },
        );
        this.leaveTo(['/material-requisitions', id]);
        return;
      }
      this.saved.set(res.data);
      this.form.load(res.data);
    } catch (err) {
      this.loadError.set(
        (err as HttpErrorResponse)?.status === 404
          ? 'This requisition could not be found. It may have been deleted.'
          : 'Unable to load the requisition. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  /** Import: a new requisition pre-filled from an earlier one. */
  private async loadImport(sourceId: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const [res, people] = await Promise.all([
        lastValueFrom(this.service.getRequisitionById(sourceId)),
        lastValueFrom(this.service.getParticipantOptions()),
      ]);
      const dropped = this.form.importFrom(res.data, people.data ?? []);
      this.importedFrom.set(res.data.mrNumber);
      this.snack.open(
        dropped.length
          ? `Imported from ${res.data.mrNumber}. ${dropped.join(', ')} ${dropped.length === 1 ? 'is' : 'are'} no longer an active user and ${dropped.length === 1 ? 'was' : 'were'} left out of the reviewers / approvers.`
          : `Imported from ${res.data.mrNumber}. Change anything you need, then save it as a new requisition.`,
        'OK', { duration: dropped.length ? 8000 : 5000 },
      );
    } catch (err) {
      this.loadError.set(
        (err as HttpErrorResponse)?.status === 404
          ? 'The requisition to import from could not be found. It may have been deleted.'
          : 'Unable to load the requisition to import from. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  // ── Stepping ────────────────────────────────────────────────────────

  protected onStepChange(index: number): void {
    this.stepIndex.set(index);
  }

  /** Why the user cannot move past a step yet, or '' when they can. */
  private blocker(fromIndex: number): string {
    if (fromIndex === 0) {
      this.form.header.markAllAsTouched();
      if (this.form.header.invalid) return 'Complete the project, WBS and required-on-site date.';
    }
    if (fromIndex === 1) {
      const missing = this.form.incompleteLines().length;
      if (missing > 0) {
        return `Enter a quantity for all the selected materials — ${missing} ${missing === 1 ? 'is' : 'are'} missing one.`;
      }
      if (this.form.lineCount() === 0) return 'Select at least one material and enter its quantity.';
    }
    // Compliance (2) and Deviation (3): every row must be complete before moving on.
    const kind = fromIndex === 2 ? 'compliance' : fromIndex === 3 ? 'deviation' : null;
    if (kind) {
      const issues = this.form.checklistIssues(kind);
      if (issues.length) {
        this.form.markChecklistAttempted(kind);
        return issues[0];
      }
    }
    return '';
  }

  protected next(stepper: { next(): void; selectedIndex: number }): void {
    const reason = this.blocker(stepper.selectedIndex);
    if (reason) {
      this.snack.open(reason, 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
      return;
    }
    stepper.next();
  }

  // ── Save / submit ───────────────────────────────────────────────────

  protected async saveDraft(): Promise<void> {
    if (this.saving()) return;
    this.form.header.markAllAsTouched();
    if (!this.form.header.get('projectId')!.value) {
      this.snack.open('Select a project before saving a draft.', 'Close', {
        duration: 4000, panelClass: ['error-snackbar'],
      });
      return;
    }
    this.saving.set(true);
    try {
      const mr = await this.persist();
      this.snack.open(`Draft ${mr.mrNumber} saved.`, 'OK', { duration: 3000 });
    } catch (err) {
      this.fail(err);
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Saves corrections to a requisition under review (by its requester, or by a
   * reviewer — who then returns to their review screen), or to a returned one.
   */
  protected async saveChanges(): Promise<void> {
    if (this.saving()) return;
    // Corrections under review must leave it submittable; a returned one is resubmitted separately.
    const issues = this.isUnderReview() ? this.form.submitIssues() : [];
    if (issues.length) {
      this.form.header.markAllAsTouched();
      this.snack.open(issues[0], 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }
    this.saving.set(true);
    try {
      const mr = await this.persist();
      this.snack.open(
        this.fromReview()
          ? `${mr.mrNumber} updated — describe your changes in your review comments.`
          : this.fromApproval()
            ? `${mr.mrNumber} updated — describe your changes in your approval comments.`
            : `${mr.mrNumber} updated.`,
        'OK', { duration: 4000 },
      );
      this.leaveTo(this.decisionScreen(mr.id) ?? ['/material-requisitions', mr.id]);
    } catch (err) {
      this.fail(err);
    } finally {
      this.saving.set(false);
    }
  }

  protected async submit(): Promise<void> {
    if (this.saving()) return;
    const issues = this.form.submitIssues();
    if (issues.length) {
      this.form.header.markAllAsTouched();
      this.snack.open(issues[0], 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }
    this.saving.set(true);
    try {
      const draft = await this.persist();
      const res = await lastValueFrom(this.service.submitRequisition(draft.id));
      this.saved.set(res.data);
      this.submitted.set(res.data);
      this.form.markSaved();
    } catch (err) {
      this.fail(err);
    } finally {
      this.saving.set(false);
    }
  }

  /** Creates the draft the first time, updates it afterwards. */
  private async persist(): Promise<MaterialRequisition> {
    const { submit: _submit, ...body } = this.form.toRequest(false);
    const existing = this.saved();
    const res = existing
      ? await lastValueFrom(this.service.updateRequisition(existing.id, body))
      : await lastValueFrom(this.service.createRequisition(body));
    this.saved.set(res.data);
    this.form.markSaved();
    return res.data;
  }

  private fail(err: unknown): void {
    const e = err as HttpErrorResponse;
    const message = (() => {
      switch (e?.status) {
        case 0: return 'Cannot reach the server. Check your connection and try again.';
        case 400: return e.error?.message || 'Some information is invalid. Please review the form.';
        case 403: return e.error?.message || 'You do not have permission to do this.';
        case 409: return e.error?.message || 'A requisition with this number already exists.';
        default: return e?.error?.message || 'The requisition could not be saved.';
      }
    })();
    this.snack.open(Array.isArray(message) ? message.join(' ') : message, 'Close', {
      duration: 6000, panelClass: ['error-snackbar'],
    });
  }

  // ── Confirmation screen ─────────────────────────────────────────────

  protected viewSubmitted(): void {
    const id = this.submitted()?.id;
    if (id) this.leaveTo(['/material-requisitions', id]);
  }

  protected createAnother(): void {
    this.submitted.set(null);
    this.saved.set(null);
    this.form.reset();
    this.stepIndex.set(0);
    if (this.isEdit()) this.leaveTo(['/material-requisitions/create']);
  }

  protected statusText(status: string): string {
    return requisitionStatusLabel(status);
  }

  protected statusClass(status: string | null): string {
    return `status-chip status-chip--${(status ?? 'draft').toLowerCase().replace('_', '-')}`;
  }

  // ── Navigation / unsaved changes ────────────────────────────────────

  protected backToList(): void {
    const id = this.saved()?.id;
    const back = id ? this.decisionScreen(id) : null;
    if (back) {
      void this.router.navigate(back);
      return;
    }
    void this.router.navigate(['/material-requisitions']);
  }

  private leaveTo(commands: string[]): void {
    this.bypassGuard = true;
    void this.router.navigate(commands);
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  private hasUnsavedChanges(): boolean {
    return !this.bypassGuard && !this.submitted() && this.form.hasUnsavedChanges();
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.hasUnsavedChanges()) return true;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        title: 'Unsaved Changes',
        message: 'You have unsaved changes to this requisition. Leave without saving?',
        confirmText: 'Leave',
        cancelText: 'Stay',
        color: 'warn',
        icon: 'warning',
      },
    });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }
}
