import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { PermissionService } from '../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../core/rbac/permissions.const';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../services';
import { MaterialRequisitionService } from '../services/material-requisition.service';
import {
  MaterialRequisition, MaterialRequisitionStatus, requisitionStatusLabel,
} from '../models/material-requisition.model';
import { RequisitionDetailsComponent } from '../components/requisition-details/requisition-details.component';
import { RequisitionParticipantsComponent } from '../components/requisition-participants/requisition-participants.component';
import { RequisitionHistoryComponent } from '../components/requisition-history/requisition-history.component';

/**
 * Read-only presentation of one requisition: its details, reviewers and
 * approvers with their decisions, and its full history. The actions offered
 * (edit, submit / resubmit, review, approve, delete) are the ones the API says
 * the signed-in user may take now.
 */
@Component({
  selector: 'app-material-requisition-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatChipsModule, MatTooltipModule, MatProgressSpinnerModule,
    RequisitionDetailsComponent, RequisitionParticipantsComponent, RequisitionHistoryComponent,
  ],
  templateUrl: './material-requisition-view.component.html',
  styleUrls: ['../components/requisition-step.shared.scss', './material-requisition-view.component.scss'],
})
export class MaterialRequisitionViewComponent implements OnInit {
  private readonly service = inject(MaterialRequisitionService);
  private readonly permissionService = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly myEmail = computed(() => this.auth.user()?.email ?? null);

  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly busy = signal(false);
  protected readonly mr = signal<MaterialRequisition | null>(null);

  protected readonly isDraft = computed(() => this.mr()?.status === MaterialRequisitionStatus.DRAFT);
  protected readonly isReturned = computed(() => this.mr()?.status === MaterialRequisitionStatus.RETURNED);
  /** What the API says the signed-in user may do on this requisition. */
  protected readonly perms = computed(() => this.mr()?.permissions ?? null);

  /** Why it came back: the return(s) recorded in the last round. */
  protected readonly returnNotes = computed(() => {
    const mr = this.mr();
    if (!mr) return [];
    return mr.history.filter((e) => e.action === 'RETURNED' && e.round === mr.reviewRound && e.comments);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
  }

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const res = await lastValueFrom(this.service.getRequisitionById(id));
      this.mr.set(res.data);
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

  protected backToList(): void {
    void this.router.navigate(['/material-requisitions']);
  }

  protected openReview(): void {
    const id = this.mr()?.id;
    if (id) void this.router.navigate(['/material-requisitions', 'reviews', id]);
  }

  protected openApproval(): void {
    const id = this.mr()?.id;
    if (id) void this.router.navigate(['/material-requisitions', 'approvals', id]);
  }

  protected edit(): void {
    const id = this.mr()?.id;
    if (!id) return;
    // While reviewed only an approver can edit: saving takes them back to their approval screen.
    const returnTo = this.mr()?.status === MaterialRequisitionStatus.REVIEWED ? { returnTo: 'approval' } : undefined;
    void this.router.navigate(['/material-requisitions', id, 'edit'], { queryParams: returnTo });
  }

  protected async submit(): Promise<void> {
    const mr = this.mr();
    if (!mr || this.busy()) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      data: {
        title: this.isReturned() ? 'Resubmit for Review?' : 'Submit for Review?',
        message: this.isReturned()
          ? `Resubmit ${mr.mrNumber}? A new review round starts and every reviewer is notified that the requested changes have been made.`
          : `Submit ${mr.mrNumber}? It moves to Under Review and every reviewer is notified.`,
        confirmText: this.isReturned() ? 'Resubmit' : 'Submit',
        icon: 'send',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;

    this.busy.set(true);
    try {
      const res = await lastValueFrom(this.service.submitRequisition(mr.id));
      this.mr.set(res.data);
      this.snack.open(`${res.data.mrNumber} submitted — the reviewers have been notified`, 'OK', { duration: 4000 });
    } catch (err) {
      this.fail(err, 'The requisition could not be submitted.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const mr = this.mr();
    if (!mr || this.busy()) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      data: {
        title: 'Delete Requisition?',
        message: `Are you sure you want to delete draft ${mr.mrNumber}? This cannot be undone.`,
        confirmText: 'Delete',
        color: 'warn',
        icon: 'warning',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;

    this.busy.set(true);
    try {
      await lastValueFrom(this.service.deleteRequisition(mr.id));
      this.snack.open('Requisition deleted successfully', 'OK', { duration: 3000 });
      this.backToList();
    } catch (err) {
      this.fail(err, 'The requisition could not be deleted.');
    } finally {
      this.busy.set(false);
    }
  }

  private fail(err: unknown, fallback: string): void {
    const e = err as HttpErrorResponse;
    const m = e?.error?.message;
    const text = Array.isArray(m) ? m.join(' ') : m;
    this.snack.open(typeof text === 'string' && text ? text : fallback, 'Close', {
      duration: 6000, panelClass: ['error-snackbar'],
    });
  }

  protected statusClass(status: string): string {
    return `status-chip status-chip--${status.toLowerCase().replace('_', '-')}`;
  }

  protected statusText(status: string): string {
    return requisitionStatusLabel(status);
  }

}
