import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { VendorRfqAccessService } from '../../../../core/rbac/vendor-rfq-access.service';
import { RfqService } from '../../services/rfq.service';
import { RfqDocumentsComponent } from '../../components/rfq-documents/rfq-documents.component';
import { RFQ_STATUS_HINTS, RfqAcknowledgementForm, RfqDocument, RfqStatus, rfqStatusLabel } from '../../models/rfq.model';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The vendor's RFQ Acknowledgement Form (reached from the "Acknowledge"
 * button of the RFQ email, after signing in). The vendor uploads the
 * acknowledgement document, confirms participation, gives its contact
 * details and says whether it will quote. Name & Date show the vendor name
 * and the current date and time. Once submitted it is shown read-only.
 */
@Component({
  selector: 'app-rfq-acknowledgement',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, MatButtonModule, MatChipsModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule,
    MatRadioModule, MatTooltipModule, RfqDocumentsComponent,
  ],
  templateUrl: './rfq-acknowledgement.component.html',
  styleUrls: ['../../rfq-list/rfq-list.component.scss', './rfq-acknowledgement.component.scss'],
})
export class RfqAcknowledgementComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(RfqService);
  private readonly access = inject(VendorRfqAccessService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly attempted = signal(false);
  protected readonly now = signal(new Date());

  protected readonly form = signal<RfqAcknowledgementForm | null>(null);

  // The vendor's answers
  protected readonly documents = signal<RfqDocument[]>([]);
  protected readonly participate = signal<boolean | null>(null);
  protected readonly willSubmitQuotation = signal<boolean | null>(null);
  protected readonly vendorName = signal('');
  protected readonly contactPerson = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');

  protected readonly editable = computed(() => !!this.form()?.canAcknowledge);
  protected readonly done = computed(() => this.form()?.acknowledgement ?? null);

  protected readonly errors = computed(() => {
    const e: Record<string, string> = {};
    if (!this.documents().some((d) => d.section === 'ACKNOWLEDGEMENT')) e['documents'] = 'Upload the acknowledgement document';
    if (this.participate() == null) e['participate'] = 'Confirm whether you will participate';
    if (!this.vendorName().trim()) e['vendorName'] = 'Enter the vendor name';
    if (!this.contactPerson().trim()) e['contactPerson'] = 'Enter the contact person';
    if (!this.email().trim()) e['email'] = 'Enter the email';
    else if (!EMAIL.test(this.email().trim())) e['email'] = 'Enter a valid email';
    if (this.participate() === true && this.willSubmitQuotation() == null) e['willSubmitQuotation'] = 'Say whether you will submit a quotation';
    return e;
  });

  protected readonly shown = computed(() => (this.attempted() ? this.errors() : {} as Record<string, string>));

  ngOnInit(): void {
    const clock = setInterval(() => this.now.set(new Date()), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(clock));
    void this.load();
  }

  private async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading.set(true);
    try {
      const form = (await lastValueFrom(this.service.getAcknowledgementForm(id))).data;
      this.form.set(form);
      const a = form.acknowledgement;
      this.vendorName.set(a?.vendorName ?? form.defaults.vendorName);
      this.contactPerson.set(a?.contactPerson ?? form.defaults.contactPerson);
      this.email.set(a?.email ?? form.defaults.email);
      this.phone.set(a?.phone ?? form.defaults.phone ?? '');
      this.participate.set(a ? a.participate : null);
      this.willSubmitQuotation.set(a ? a.willSubmitQuotation : null);
      this.documents.set(a?.documents ?? []);
    } catch (err) {
      const e = err as HttpErrorResponse;
      this.loadError.set(e?.status === 403 || e?.status === 404
        ? 'This RFQ was not found, or it was not issued to your company.'
        : this.messageOf(err, 'Unable to load the RFQ.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected setParticipate(value: boolean): void {
    this.participate.set(value);
    // Not participating means no quotation.
    if (!value) this.willSubmitQuotation.set(false);
  }

  protected valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected async submit(): Promise<void> {
    const form = this.form();
    if (!form) return;
    this.attempted.set(true);
    const first = Object.values(this.errors())[0];
    if (first) {
      this.snack.open(first, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }
    const willQuote = this.participate() === true && this.willSubmitQuotation() === true;
    const data: ConfirmDialogData = willQuote
      ? {
        title: `Acknowledge RFQ ${form.rfqNumber}?`,
        message: 'You confirm your participation and that you will submit a quotation. The buyer is notified, and you can then prepare your response.',
        confirmText: 'Submit Acknowledgement', icon: 'task_alt',
      }
      : {
        title: `Decline RFQ ${form.rfqNumber}?`,
        message: 'You will not submit a quotation for this RFQ. The buyer is notified. This cannot be changed afterwards.',
        confirmText: 'Submit & Decline', icon: 'block', color: 'warn',
      };
    const ok = await lastValueFrom(this.dialog.open(ConfirmDialogComponent, { data, width: '460px' }).afterClosed());
    if (!ok) return;

    this.saving.set(true);
    try {
      const res = await lastValueFrom(this.service.acknowledge(form.rfqId, {
        participate: this.participate() === true,
        willSubmitQuotation: this.participate() ? this.willSubmitQuotation() : false,
        vendorName: this.vendorName().trim(),
        contactPerson: this.contactPerson().trim(),
        email: this.email().trim(),
        phone: this.phone().trim() || null,
        documents: this.documents().filter((d) => d.section === 'ACKNOWLEDGEMENT').map((d) => ({
          section: d.section, documentName: d.documentName, documentUrl: d.documentUrl, fileName: d.fileName,
          mimeType: d.mimeType, fileSizeBytes: d.fileSizeBytes,
        })),
      }));
      this.form.set(res.data);
      this.documents.set(res.data.acknowledgement?.documents ?? this.documents());
      this.attempted.set(false);
      // The RFQ menu entry appears once the vendor has acknowledged an RFQ.
      this.access.refresh();
      this.snack.open(willQuote ? 'RFQ acknowledged — you can now prepare your response' : 'RFQ declined', 'OK', { duration: 4000 });
      if (willQuote) void this.router.navigate(['/vendor-rfqs', form.rfqId]);
    } catch (err) {
      this.snack.open(this.messageOf(err, 'Unable to submit the acknowledgement.'), 'Close', { duration: 6000, panelClass: ['error-snackbar'] });
    } finally {
      this.saving.set(false);
    }
  }

  protected respond(): void {
    const form = this.form();
    if (form) void this.router.navigate(['/vendor-rfqs', form.rfqId]);
  }

  protected backToList(): void { void this.router.navigate(['/vendor-rfqs']); }

  protected statusText(s: RfqStatus): string { return rfqStatusLabel(s); }
  protected statusHint(s: RfqStatus): string { return RFQ_STATUS_HINTS[s]; }
  protected statusClass(s: RfqStatus): string { return `status-chip rfq-status rfq-status--${s.toLowerCase()}`; }

  private messageOf(err: unknown, fallback: string): string {
    const m = (err as HttpErrorResponse)?.error?.message;
    if (Array.isArray(m)) return m.join(' ');
    return typeof m === 'string' && m ? m : fallback;
  }
}
