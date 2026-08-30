import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface VendorBlacklistDialogData {
  vendorName: string;
  vendorCode: string;
  /** 'blacklist' requests a ban; 'unblacklist' requests that one be lifted. */
  mode: 'blacklist' | 'unblacklist';
}

export interface VendorBlacklistDialogResult {
  reason: string;
}

/**
 * Confirmation for both blacklist request types.
 *
 * Neither endpoint applies the change directly any more: they raise a request
 * that a manager must approve, and both reject the call with 400 without a
 * reason — so the dialog cannot be confirmed without one, and its wording says
 * "request" rather than implying the status has already moved.
 */
@Component({
  selector: 'app-vendor-blacklist-dialog',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule,
  ],
  templateUrl: './vendor-blacklist-dialog.component.html',
  styleUrl: './vendor-blacklist-dialog.component.scss',
})
export class VendorBlacklistDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<VendorBlacklistDialogComponent, VendorBlacklistDialogResult>);
  protected readonly data = inject<VendorBlacklistDialogData>(MAT_DIALOG_DATA);

  protected readonly isBlacklist = this.data.mode !== 'unblacklist';

  protected readonly copy = computed(() =>
    this.isBlacklist
      ? {
          title: 'Request Blacklisting',
          icon: 'block',
          confirm: 'Submit Blacklist Request',
          lead: 'blacklisted',
          note:
            'The vendor is not blacklisted yet. A manager is notified and must approve the '
            + 'request; until then the vendor keeps its current status. Once approved it is '
            + 'excluded from future procurement activities, and its history stays intact.',
          placeholder: 'e.g. Repeated quality non-conformances on PO-2025-0912',
        }
      : {
          title: 'Request Removal from Blacklist',
          icon: 'restart_alt',
          confirm: 'Submit Un-blacklist Request',
          lead: 'removed from the blacklist',
          note:
            'A manager must approve this request. On approval the vendor returns to Under '
            + 'Evaluation rather than straight to Active — re-qualification is a separate step.',
          placeholder: 'e.g. Corrective actions verified and closed out on 12 Aug',
        },
  );

  protected readonly form = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]],
  });

  protected error(): string {
    const control = this.form.controls.reason;
    if (!control.touched || !control.errors) return '';
    if (control.errors['required']) return 'A reason is required — it is quoted in the approval email';
    if (control.errors['minlength']) return 'Give at least a few words of context';
    return 'Reason is too long';
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ reason: this.form.controls.reason.value.trim() });
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
