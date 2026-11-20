import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { RfqService } from '../../services/rfq.service';
import { RfqDocumentsComponent } from '../../components/rfq-documents/rfq-documents.component';
import { RfqDeviationTableComponent, deviationIssues } from '../../components/rfq-deviation-table/rfq-deviation-table.component';
import {
  COMMERCIAL_FIELDS, OTHER_CHARGE_SUGGESTIONS, RFQ_NDA_LABELS, RFQ_STATUS_HINTS, Rfq, RfqChecklistItem, RfqCompliance,
  RfqDeviation, RfqDocument, RfqItem, RfqOtherCharge, RfqStatus, RfqTextFieldDef, RfqVendorDocument,
  RfqVendorResponseRequest, SCOPE_FIELDS, TECHNICAL_FIELDS, rfqStatusLabel,
} from '../../models/rfq.model';
import { canDownloadRfqPdf, pdfErrorMessage } from '../../models/rfq-pdf';

type PriceRow = Pick<RfqItem, 'id' | 'lineNumber' | 'mrNumber' | 'itemCode' | 'description' | 'uom' | 'rfqQuantity'
  | 'unitPrice' | 'exchangeRate' | 'deliveryDuration' | 'remarks'>;

/** A Vendor Master document and what the vendor did with it for this RFQ. */
interface MasterRow {
  master: RfqVendorDocument;
  /** The RFQ's qualification document that points at it, if any. */
  linked: RfqDocument | null;
  state: 'pending' | 'confirmed' | 'updated';
}

const num = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const round = (v: number, places = 4) => Math.round(v * 10 ** places) / 10 ** places;
const humanize = (v: string) => v.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * The vendor's view of an RFQ and its response (external users). Every tab of
 * the RFQ package is shown read-only; the vendor edits only its own parts —
 * Price Schedule, Vendor Qualification, Checklist, Compliance answers and
 * Deviations — and submits the response, which emails the buyer and marks the
 * RFQ "Response Submitted". It can revise the response until the buyer
 * completes or approves the RFQ.
 */
@Component({
  selector: 'app-rfq-vendor-response',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, DecimalPipe, NgTemplateOutlet, MatButtonModule, MatCheckboxModule, MatChipsModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatProgressSpinnerModule, MatRadioModule, MatTabsModule, MatTooltipModule,
    RfqDocumentsComponent, RfqDeviationTableComponent,
  ],
  templateUrl: './rfq-vendor-response.component.html',
  styleUrls: [
    '../../components/rfq-grid.shared.scss',
    '../../rfq-workspace/rfq-workspace.component.scss',
    './rfq-vendor-response.component.scss',
  ],
})
export class RfqVendorResponseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(RfqService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly scopeFields = SCOPE_FIELDS;
  protected readonly technicalFields = TECHNICAL_FIELDS;
  protected readonly commercialFields = COMMERCIAL_FIELDS;
  protected readonly chargeSuggestions = OTHER_CHARGE_SUGGESTIONS;
  protected readonly humanize = humanize;
  protected readonly tabCount = 12;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly uploading = signal<string | null>(null);
  protected readonly tabIndex = signal(0);
  protected readonly attempted = signal(false);
  protected readonly submitAttempted = signal(false);

  protected readonly rfq = signal<Rfq | null>(null);
  protected readonly prices = signal<PriceRow[]>([]);
  protected readonly otherCharges = signal<RfqOtherCharge[]>([]);
  protected readonly checklist = signal<RfqChecklistItem[]>([]);
  protected readonly compliances = signal<RfqCompliance[]>([]);
  protected readonly deviations = signal<RfqDeviation[]>([]);
  protected readonly documents = signal<RfqDocument[]>([]);
  protected readonly quotedCurrency = signal('');
  protected readonly vendorDocuments = signal<RfqVendorDocument[]>([]);

  protected readonly editable = computed(() => !!this.rfq()?.permissions?.canEditVendor);
  protected readonly viewerEmail = computed(() => this.rfq()?.permissions?.viewerEmail ?? '');
  protected readonly currencyLabel = computed(() => this.quotedCurrency().trim() || 'quoted currency');

  // ── Price schedule ───────────────────────────────────────────────

  protected readonly priceRows = computed(() => this.prices().map((r) => {
    const total = r.unitPrice != null ? round(r.unitPrice * r.rfqQuantity) : null;
    const usd = total != null && r.exchangeRate != null ? round(total * r.exchangeRate) : null;
    return { ...r, total, usd };
  }));

  protected readonly totals = computed(() => {
    const rows = this.priceRows();
    const items = rows.reduce((s, r) => s + (r.total ?? 0), 0);
    const usd = rows.reduce((s, r) => s + (r.usd ?? 0), 0);
    const charges = this.otherCharges().reduce((s, c) => s + (c.amount ?? 0), 0);
    return { items: round(items), usd: round(usd), charges: round(charges), grand: round(items + charges) };
  });

  // ── Qualification ────────────────────────────────────────────────

  /** Buyer's qualification documents are read-only for the vendor. */
  protected readonly othersDocument = (d: RfqDocument): boolean =>
    !!d.uploadedBy && d.uploadedBy.toLowerCase() !== this.viewerEmail().toLowerCase();
  /** The "additional documents" list leaves out the ones linked to a Vendor Master document. */
  protected readonly additionalOnly = (d: RfqDocument): boolean => !d.vendorDocumentId;

  protected readonly masterRows = computed<MasterRow[]>(() => this.vendorDocuments().map((m) => {
    const linked = this.documents().find((d) => d.section === 'VENDOR_QUALIFICATION' && d.vendorDocumentId === m.id) ?? null;
    const state = !linked ? 'pending' : linked.documentUrl === m.documentUrl ? 'confirmed' : 'updated';
    return { master: m, linked, state };
  }));

  // ── Checklist ────────────────────────────────────────────────────

  protected readonly checklistTechnical = computed(() => this.checklist().filter((c) => c.section === 'TECHNICAL'));
  protected readonly checklistCommercial = computed(() => this.checklist().filter((c) => c.section === 'COMMERCIAL'));

  // ── Progress ─────────────────────────────────────────────────────

  protected readonly progress = computed(() => {
    const items = this.prices();
    return {
      priced: items.filter((r) => r.unitPrice != null).length,
      items: items.length,
      documents: this.masterRows().filter((m) => m.state !== 'pending').length,
      masters: this.masterRows().length,
      checklist: this.checklist().filter((c) => c.provided != null).length,
      checklistTotal: this.checklist().length,
      compliance: this.compliances().filter((c) => c.compliant != null).length,
      complianceTotal: this.compliances().length,
      deviations: this.deviations().length,
    };
  });

  /** What still stops the vendor from submitting (shown on the last tab). */
  protected readonly submitIssues = computed(() => this.issues(true));

  // ── Lifecycle ────────────────────────────────────────────────────

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const rfq = (await lastValueFrom(this.service.getRfq(id))).data;
      if (rfq.permissions?.viewer !== 'VENDOR') {
        // Company users use the buyer's screen.
        void this.router.navigate(['/rfqs', rfq.id], { replaceUrl: true });
        return;
      }
      this.apply(rfq);
      this.service.getVendorDocuments(rfq.id).subscribe({
        next: (res) => this.vendorDocuments.set(res.data ?? []),
        error: () => this.vendorDocuments.set([]),
      });
    } catch (err) {
      const e = err as HttpErrorResponse;
      this.loadError.set(e?.status === 403 || e?.status === 404
        ? 'This RFQ was not found, or it was not issued to your company.'
        : this.messageOf(err, 'Unable to load the RFQ.'));
    } finally {
      this.loading.set(false);
    }
  }

  private apply(rfq: Rfq): void {
    this.rfq.set(rfq);
    this.prices.set(rfq.items.slice().sort((a, b) => a.lineNumber - b.lineNumber).map((i) => ({
      id: i.id, lineNumber: i.lineNumber, mrNumber: i.mrNumber, itemCode: i.itemCode, description: i.description, uom: i.uom,
      rfqQuantity: i.rfqQuantity, unitPrice: i.unitPrice, exchangeRate: i.exchangeRate,
      deliveryDuration: i.deliveryDuration, remarks: i.remarks,
    })));
    this.otherCharges.set(rfq.otherCharges.map((c) => ({ ...c })));
    this.checklist.set(rfq.checklist.map((c) => ({ ...c })));
    this.compliances.set(rfq.compliances.map((c) => ({ ...c })));
    this.deviations.set(rfq.deviations.map((d) => ({ ...d })));
    this.documents.set(rfq.documents.map((d) => ({ ...d })));
    this.quotedCurrency.set(rfq.quotedCurrency ?? '');
  }

  // ── Read-only package helpers ────────────────────────────────────

  protected text(key: RfqTextFieldDef['key']): string {
    return this.rfq()?.[key] ?? '';
  }

  protected docsOf(...sections: RfqDocument['section'][]): RfqDocument[] {
    return this.documents().filter((d) => sections.includes(d.section));
  }

  protected ndaLabel(): string {
    const v = this.rfq()?.ndaScope;
    return v ? RFQ_NDA_LABELS[v] : 'Not required';
  }

  // ── Vendor edits ─────────────────────────────────────────────────

  protected valueOf(event: Event): string { return (event.target as HTMLInputElement).value; }
  protected numberOf(event: Event): number | null { return num(this.valueOf(event)); }

  protected setPrice(id: string, patch: Partial<PriceRow>): void {
    this.prices.update((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  /** One exchange rate for every line (typed once at the top). */
  protected applyRateToAll(value: string): void {
    const rate = num(value);
    if (rate == null) return;
    this.prices.update((rows) => rows.map((r) => ({ ...r, exchangeRate: rate })));
  }

  protected addCharge(): void { this.otherCharges.update((l) => [...l, { title: '', amount: null }]); }
  protected setCharge(i: number, patch: Partial<RfqOtherCharge>): void {
    this.otherCharges.update((l) => l.map((c, x) => (x === i ? { ...c, ...patch } : c)));
  }
  protected removeCharge(i: number): void { this.otherCharges.update((l) => l.filter((_, x) => x !== i)); }

  protected setChecklist(key: string, patch: Partial<RfqChecklistItem>): void {
    this.checklist.update((l) => l.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  protected setCompliance(index: number, patch: Partial<RfqCompliance>): void {
    this.compliances.update((l) => l.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  /** "This document is OK for this RFQ" — links the Vendor Master document as it is. */
  protected confirmMaster(row: MasterRow, checked: boolean): void {
    if (checked) {
      if (row.linked) return;
      const m = row.master;
      this.documents.update((list) => [...list, {
        section: 'VENDOR_QUALIFICATION', documentName: humanize(m.documentType), documentUrl: m.documentUrl,
        fileName: m.fileName, mimeType: m.mimeType, fileSizeBytes: m.fileSizeBytes, sourceRequisitionId: null,
        sourceDocumentId: null, sourceMrNumber: null, vendorDocumentId: m.id,
      }]);
    } else {
      this.documents.update((list) => list.filter((d) => d !== row.linked));
    }
  }

  /** Upload a newer version of a Vendor Master document for this RFQ. */
  protected async updateMaster(row: MasterRow, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploading.set(row.master.id);
    try {
      const url = (await lastValueFrom(this.service.uploadDocument(file))).url;
      const doc: RfqDocument = {
        section: 'VENDOR_QUALIFICATION', documentName: `${humanize(row.master.documentType)} (updated)`, documentUrl: url,
        fileName: file.name, mimeType: file.type || null, fileSizeBytes: file.size, sourceRequisitionId: null,
        sourceDocumentId: null, sourceMrNumber: null, vendorDocumentId: row.master.id,
      };
      this.documents.update((list) => [...list.filter((d) => d !== row.linked), doc]);
      this.snack.open(`${humanize(row.master.documentType)} updated with ${file.name}`, 'OK', { duration: 3000 });
    } catch (err) {
      this.snack.open(this.messageOf(err, `${file.name}: upload failed`), 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
    } finally {
      this.uploading.set(null);
    }
  }

  // ── Validation & saving ──────────────────────────────────────────

  private issues(submit: boolean): string[] {
    const out: string[] = [];
    if (submit && !this.quotedCurrency().trim()) out.push('Price Schedule: enter the quoted currency.');
    if (submit) {
      const unpriced = this.prices().filter((r) => r.unitPrice == null).length;
      if (unpriced) out.push(`Price Schedule: enter the unit price of ${unpriced} item${unpriced === 1 ? '' : 's'}.`);
      const pending = this.masterRows().filter((m) => m.state === 'pending').length;
      if (pending) out.push(`Vendor Qualification: confirm or update ${pending} document${pending === 1 ? '' : 's'}.`);
    }
    this.otherCharges().forEach((c, i) => {
      if (!c.title.trim() || c.amount == null) out.push(`Other charge ${i + 1}: enter the title and the amount.`);
    });
    for (const c of this.checklist()) {
      if (c.provided === false && !c.reason?.trim()) out.push(`Checklist — ${c.label}: give the reason it is not provided.`);
      else if (submit && c.provided == null) out.push(`Checklist — ${c.label}: answer Yes or No.`);
    }
    this.compliances().forEach((c, i) => {
      if (c.compliant === false && !c.remarks?.trim()) out.push(`Compliance item ${i + 1}: say why it is not compliant in the remarks.`);
      else if (submit && c.compliant == null) out.push(`Compliance item ${i + 1}: answer Compliant Yes or No.`);
    });
    return [...out, ...deviationIssues(this.deviations())];
  }

  protected answerMissing(value: boolean | null): boolean {
    return this.attempted() && this.submitAttempted() && value == null;
  }

  protected async save(submit: boolean): Promise<void> {
    const rfq = this.rfq();
    if (!rfq) return;
    this.attempted.set(true);
    this.submitAttempted.set(submit);
    const issues = this.issues(submit);
    if (issues.length) {
      if (submit) this.tabIndex.set(this.tabCount - 1);
      this.snack.open(issues[0], 'Close', { duration: 6000, panelClass: ['error-snackbar'] });
      return;
    }
    if (submit) {
      const data: ConfirmDialogData = {
        title: rfq.status === 'QUOTED' ? 'Submit the updated response?' : 'Submit your response?',
        message: `Your response to RFQ ${rfq.rfqNumber} is sent to the buyer, who is emailed. You can still update it until the buyer completes or approves the RFQ.`,
        confirmText: 'Submit Response',
        icon: 'send',
      };
      const ok = await lastValueFrom(this.dialog.open(ConfirmDialogComponent, { data, width: '460px' }).afterClosed());
      if (!ok) return;
    }
    const request: RfqVendorResponseRequest = {
      quotedCurrency: this.quotedCurrency().trim().toUpperCase() || null,
      items: this.prices().map((r) => ({
        id: r.id, unitPrice: r.unitPrice, exchangeRate: r.exchangeRate,
        deliveryDuration: r.deliveryDuration?.trim() || null, remarks: r.remarks?.trim() || null,
      })),
      otherCharges: this.otherCharges().map((c) => ({ title: c.title.trim(), amount: c.amount ?? 0 })),
      checklist: this.checklist().map((c) => ({ key: c.key, provided: c.provided, reason: c.reason?.trim() || null })),
      compliances: this.compliances().filter((c) => c.id).map((c) => ({
        id: c.id!, vendorResponse: c.vendorResponse?.trim() || null, compliant: c.compliant, remarks: c.remarks?.trim() || null,
      })),
      deviations: this.deviations().map((d) => ({
        clauseNo: d.clauseNo.trim(), rfqRequirement: d.rfqRequirement.trim(), vendorDeviation: d.vendorDeviation,
        justification: d.justification?.trim() || null,
      })),
      // Only the vendor's own documents: the buyer's stay as they are.
      qualificationDocuments: this.documents()
        .filter((d) => d.section === 'VENDOR_QUALIFICATION' && !this.othersDocument(d))
        .map((d) => ({
          section: d.section, documentName: d.documentName, documentUrl: d.documentUrl, fileName: d.fileName,
          mimeType: d.mimeType, fileSizeBytes: d.fileSizeBytes, vendorDocumentId: d.vendorDocumentId,
        })),
      submit,
    };
    this.saving.set(true);
    try {
      const saved = (await lastValueFrom(this.service.saveVendorResponse(rfq.id, request))).data;
      this.apply(saved);
      this.attempted.set(false);
      this.snack.open(submit ? 'Response submitted — the buyer has been notified' : 'Response saved as draft', 'OK', { duration: 4000 });
    } catch (err) {
      this.snack.open(this.messageOf(err, 'Unable to save your response.'), 'Close', { duration: 6000, panelClass: ['error-snackbar'] });
    } finally {
      this.saving.set(false);
    }
  }

  // ── Navigation & helpers ─────────────────────────────────────────

  protected readonly downloading = signal<string | null>(null);

  protected canDownload(status: RfqStatus | null | undefined): boolean { return canDownloadRfqPdf(status); }

  /** Downloads the RFQ as a PDF. */
  protected async downloadPdf(rfq: { id: string; rfqNumber: string; revisionNo: number }, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (this.downloading()) return;
    this.downloading.set(rfq.id);
    try {
      await this.service.downloadPdf(rfq);
    } catch (err) {
      this.snack.open(await pdfErrorMessage(err), 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
    } finally {
      this.downloading.set(null);
    }
  }

  protected next(): void { this.tabIndex.update((i) => Math.min(i + 1, this.tabCount - 1)); }
  protected previous(): void { this.tabIndex.update((i) => Math.max(i - 1, 0)); }
  protected backToList(): void { void this.router.navigate(['/vendor-rfqs']); }
  protected acknowledge(): void {
    const r = this.rfq();
    if (r) void this.router.navigate(['/vendor-rfqs', r.id, 'acknowledge']);
  }

  protected statusText(s: RfqStatus): string { return rfqStatusLabel(s); }
  protected statusHint(s: RfqStatus): string { return RFQ_STATUS_HINTS[s]; }
  protected statusClass(s: RfqStatus): string { return `status-chip rfq-status rfq-status--${s.toLowerCase()}`; }

  private messageOf(err: unknown, fallback: string): string {
    const m = (err as HttpErrorResponse)?.error?.message;
    if (Array.isArray(m)) return m.join(' ');
    return typeof m === 'string' && m ? m : fallback;
  }
}
