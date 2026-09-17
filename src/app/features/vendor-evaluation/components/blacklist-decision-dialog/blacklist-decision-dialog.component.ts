import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StatusChangeRequestType } from '../../../vendor/models/vendor.model';

export interface BlacklistDecisionDialogData {
  decision: 'approve' | 'reject';
  vendorCode: string;
  vendorName: string;
  requestType: StatusChangeRequestType;
  reason: string;
  requestedBy: string;
}

export interface BlacklistDecisionDialogResult {
  token: string;
  comments?: string;
}

/**
 * Collects the single-use approval token for a blacklist / un-blacklist
 * decision made from the in-app queue rather than the emailed link.
 *
 * pm-api requires this token unconditionally — there is no in-app-only path
 * to approve/reject (see DecideVendorStatusChangeRequest) — so a manager
 * deciding from here has to have the token from their approval email open
 * alongside this dialog to paste in. This is a deliberate anti-mail-scanner
 * control on the backend, not an oversight here.
 */
@Component({
  selector: 'app-blacklist-decision-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTooltipModule,
  ],
  templateUrl: './blacklist-decision-dialog.component.html',
  styleUrl: './blacklist-decision-dialog.component.scss',
})
export class BlacklistDecisionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<BlacklistDecisionDialogComponent, BlacklistDecisionDialogResult>);
  protected readonly data = inject<BlacklistDecisionDialogData>(MAT_DIALOG_DATA);

  protected readonly isApprove = this.data.decision === 'approve';
  protected readonly StatusChangeRequestType = StatusChangeRequestType;

  protected readonly form = this.fb.nonNullable.group({
    token: ['', [Validators.required, Validators.minLength(32)]],
    comments: [''],
  });

  protected get title(): string {
    return this.isApprove ? 'Approve Request' : 'Reject Request';
  }

  protected err(): string {
    const control = this.form.controls.token;
    if (!control.touched || !control.errors) return '';
    if (control.errors['required']) return 'Paste the approval token from the request email.';
    if (control.errors['minlength']) return 'That does not look like a full approval token — check you copied all of it.';
    return '';
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close({ token: v.token.trim(), comments: v.comments.trim() || undefined });
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
