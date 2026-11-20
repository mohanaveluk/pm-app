import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { RequisitionHistoryComponent } from '../../material-requisition/components/requisition-history/requisition-history.component';
import { ProjectService } from '../../project/services/project.service';
import { ProjectOption } from '../../project/models/project.model';
import { ClientService } from '../../client/services/client.service';
import { ClientOption } from '../../client/models/client.model';
import { RfqService } from '../services/rfq.service';
import { RfqDocumentsComponent, RfqPickableDocument } from '../components/rfq-documents/rfq-documents.component';
import { RfqDeviationTableComponent, deviationIssues } from '../components/rfq-deviation-table/rfq-deviation-table.component';
import {
  COMMERCIAL_FIELDS, OTHER_CHARGE_SUGGESTIONS, RFQ_DEFAULT_CHECKLIST, fromIsoDay, toIsoDay, RFQ_NDA_LABELS, RFQ_STATUS_HINTS, Rfq, RfqChecklistItem, RfqCompliance,
  RfqDeviation, RfqDocument, RfqDocumentSection, RfqNdaScope, RfqOtherCharge, RfqPermissions, RfqRequisitionOption,
  RfqSaveRequest, RfqSourceDeviation, RfqSourceDocument, RfqSourceItem, RfqStatus, RfqTextField, RfqTextFields,
  RfqVendorDocument, RfqVendorOption, RfqVendorResponseRequest, SCOPE_FIELDS, TECHNICAL_FIELDS, rfqStatusLabel, today,
} from '../models/rfq.model';
import { canDownloadRfqPdf, pdfErrorMessage } from '../models/rfq-pdf';

type Mode = 'create' | 'edit' | 'view';

/** The buyer's header (RFQ Letter tab) plus every free-text field. */
interface HeaderState extends RfqTextFields {
  rfqNumber: string;
  revisionNo: number;
  projectId: string | null;
  clientId: string | null;
  bidClosingDate: string | null;
  sealedBid: boolean;
  ndaScope: RfqNdaScope | null;
  vendorId: string | null;
}

/** One price-schedule line. Quantities come from the requisition; prices from the vendor. */
interface ScheduleRow {
  /** The requisition line it quotes. */
  key: string;
  id: string | null;
  requisitionId: string;
  mrNumber: string;
  lineNumber: number;
  itemCode: string;
  description: string;
  uom: string | null;
  mrQuantity: number;
  /** In other RFQs / still open (known while the buyer edits). */
  quotedElsewhere: number | null;
  balance: number | null;
  rfqQuantity: number | null;
  unitPrice: number | null;
  exchangeRate: number | null;
  deliveryDuration: string | null;
  remarks: string | null;
}

const BUYER_SECTIONS: RfqDocumentSection[] = [
  'TERMS_AND_CONDITIONS', 'NON_DISCLOSURE_AGREEMENT', 'INSTRUCTIONS_TO_BIDDERS', 'SCOPE_ASSOCIATED',
  'TECHNICAL_SPECIFICATION', 'DRAWING_DATASHEET', 'VENDOR_QUALIFICATION',
];

const TEXT_KEYS: RfqTextField[] = [
  'subject', 'content', 'instructionsToBidders',
  ...SCOPE_FIELDS.map((f) => f.key), ...TECHNICAL_FIELDS.map((f) => f.key), ...COMMERCIAL_FIELDS.map((f) => f.key),
];

const emptyHeader = (): HeaderState => ({
  rfqNumber: '', revisionNo: 0, projectId: null, clientId: null, bidClosingDate: null, sealedBid: false,
  ndaScope: null, vendorId: null,
  ...(Object.fromEntries(TEXT_KEYS.map((k) => [k, null])) as unknown as RfqTextFields),
});

const BUYER_PERMISSIONS: RfqPermissions = {
  viewer: 'BUYER', canEditBuyer: true, canEditCompliance: true, canEditVendor: false, canIssue: true,
  allowedStatuses: [], canDelete: false,
};

const num = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const round = (v: number, places = 4) => Math.round(v * 10 ** places) / 10 ** places;

/**
 * The Request for Quotation workspace — create, edit and view share it.
 *
 * The buyer writes the package (RFQ Letter … Price Schedule, Compliance
 * requirements) while it is a draft; once issued only the compliance
 * requirements can still change. The vendor answers on the same screen:
 * prices, other charges, qualification documents, checklist, compliance
 * answers and deviations. What can be edited comes from the server's
 * `permissions` for the signed-in user.
 */
@Component({
  selector: 'app-rfq-workspace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, DecimalPipe, NgTemplateOutlet, FormsModule, MatButtonModule, MatCheckboxModule, MatChipsModule, MatDatepickerModule,
    MatFormFieldModule, MatIconModule, MatInputModule, MatMenuModule, MatProgressSpinnerModule, MatRadioModule,
    MatSelectModule, MatSlideToggleModule, MatTabsModule, MatTooltipModule,
    RfqDocumentsComponent, RfqDeviationTableComponent, RequisitionHistoryComponent,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './rfq-workspace.component.html',
  styleUrls: ['../components/rfq-grid.shared.scss', './rfq-workspace.component.scss'],
})
export class RfqWorkspaceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(RfqService);
  private readonly projectService = inject(ProjectService);
  private readonly clientService = inject(ClientService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly scopeFields = SCOPE_FIELDS;
  protected readonly technicalFields = TECHNICAL_FIELDS;
  protected readonly commercialFields = COMMERCIAL_FIELDS;
  protected readonly chargeSuggestions = OTHER_CHARGE_SUGGESTIONS;
  protected readonly ndaOptions = Object.entries(RFQ_NDA_LABELS).map(([value, label]) => ({ value: value as RfqNdaScope, label }));
  protected readonly minDate = today();
  protected readonly minDay = fromIsoDay(today());
  /** The issue date shown until the RFQ is issued (it is fixed then). */
  protected readonly now = signal(new Date());

  protected readonly mode = signal<Mode>('view');
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly tabIndex = signal(0);

  protected readonly rfq = signal<Rfq | null>(null);
  protected readonly header = signal<HeaderState>(emptyHeader());
  protected readonly requisitionIds = signal<string[]>([]);
  protected readonly schedule = signal<ScheduleRow[]>([]);
  protected readonly compliances = signal<RfqCompliance[]>([]);
  protected readonly deviations = signal<RfqDeviation[]>([]);
  protected readonly documents = signal<RfqDocument[]>([]);
  protected readonly otherCharges = signal<RfqOtherCharge[]>([]);
  protected readonly checklist = signal<RfqChecklistItem[]>([]);
  protected readonly quotedCurrency = signal<string>('');

  // Editor sources
  protected readonly projects = signal<ProjectOption[]>([]);
  protected readonly clients = signal<ClientOption[]>([]);
  protected readonly vendors = signal<RfqVendorOption[]>([]);
  protected readonly requisitionOptions = signal<RfqRequisitionOption[]>([]);
  protected readonly sourceDocuments = signal<RfqSourceDocument[]>([]);
  protected readonly sourceDeviations = signal<RfqSourceDeviation[]>([]);
  protected readonly vendorDocuments = signal<RfqVendorDocument[]>([]);
  protected readonly contentLoading = signal(false);

  protected readonly projectSearch = signal('');
  protected readonly vendorSearch = signal('');
  protected readonly requisitionSearch = signal('');

  /** The buyer tried to save / issue, or the vendor to save / submit: every error shows. */
  protected readonly attempted = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly showVendorColumns = signal(false);

  // ── Who may do what ──────────────────────────────────────────────

  protected readonly permissions = computed<RfqPermissions>(() =>
    this.mode() === 'create' ? BUYER_PERMISSIONS : this.rfq()?.permissions ?? {
      viewer: 'READER', canEditBuyer: false, canEditCompliance: false, canEditVendor: false, canIssue: false,
      allowedStatuses: [], canDelete: false,
    });
  protected readonly viewer = computed(() => this.permissions().viewer);
  protected readonly isVendor = computed(() => this.viewer() === 'VENDOR');
  protected readonly buyerEditable = computed(() => this.mode() !== 'view' && this.permissions().canEditBuyer);
  protected readonly complianceEditable = computed(() => this.mode() !== 'view' && this.permissions().canEditCompliance);
  protected readonly vendorEditable = computed(() => this.permissions().canEditVendor);
  protected readonly status = computed<RfqStatus>(() => this.rfq()?.status ?? 'DRAFT');

  // ── Derived ──────────────────────────────────────────────────────

  protected readonly bidClosingDay = computed(() => fromIsoDay(this.header().bidClosingDate));

  protected readonly selectedProject = computed(() => this.projects().find((p) => p.id === this.header().projectId) ?? null);
  protected readonly selectedVendor = computed(() => this.vendors().find((v) => v.id === this.header().vendorId) ?? null);

  protected readonly visibleProjects = computed(() => {
    const term = this.projectSearch().trim().toLowerCase();
    const list = this.projects();
    return term ? list.filter((p) => `${p.code} ${p.projectName} ${p.clientName ?? ''}`.toLowerCase().includes(term)) : list;
  });

  protected readonly visibleVendors = computed(() => {
    const term = this.vendorSearch().trim().toLowerCase();
    const list = this.vendors();
    return term
      ? list.filter((v) => `${v.code} ${v.vendorName} ${v.email ?? ''} ${v.address ?? ''}`.toLowerCase().includes(term))
      : list;
  });

  protected readonly visibleRequisitions = computed(() => {
    const term = this.requisitionSearch().trim().toLowerCase();
    const list = this.requisitionOptions();
    return term ? list.filter((r) => `${r.mrNumber} ${r.shortDescription ?? ''}`.toLowerCase().includes(term)) : list;
  });

  /** The selected requisitions as chips (names from the options, or from the saved RFQ). */
  protected readonly selectedRequisitions = computed(() => {
    const options = new Map(this.requisitionOptions().map((o) => [o.id, o]));
    const saved = new Map((this.rfq()?.requisitions ?? []).map((r) => [r.requisitionId, r]));
    return this.requisitionIds().map((id) => {
      const o = options.get(id);
      const s = saved.get(id);
      return {
        id, mrNumber: o?.mrNumber ?? s?.mrNumber ?? id, shortDescription: o?.shortDescription ?? s?.shortDescription ?? null,
        itemCount: o?.itemCount ?? null,
      };
    });
  });

  /** Requisition documents, offered as "MR title | document name". */
  protected readonly pickableMrDocuments = computed<RfqPickableDocument[]>(() =>
    this.sourceDocuments().map((d) => ({
      id: d.id,
      label: `${d.shortDescription || d.mrNumber} | ${d.documentName}`,
      documentName: d.documentName,
      documentUrl: d.documentUrl,
      fileName: d.fileName,
      mimeType: d.mimeType,
      fileSizeBytes: d.fileSizeBytes,
      sourceRequisitionId: d.requisitionId,
    })));

  protected readonly vendorDocumentsLoading = signal(false);

  /** For the vendor, qualification documents the buyer attached are read-only. */
  protected readonly qualificationLocked = (d: RfqDocument): boolean =>
    this.isVendor() && !!d.uploadedBy && d.uploadedBy !== this.permissions().viewerEmail;

  protected readonly scheduleRows = computed(() => this.schedule().map((r) => {
    const qty = r.rfqQuantity ?? 0;
    const total = r.unitPrice != null ? round(r.unitPrice * qty) : null;
    const usd = total != null && r.exchangeRate != null ? round(total * r.exchangeRate) : null;
    const over = r.balance != null && r.rfqQuantity != null && r.rfqQuantity > r.balance + 1e-9;
    return { ...r, total, usd, over };
  }));

  protected readonly includedLines = computed(() => this.scheduleRows().filter((r) => (r.rfqQuantity ?? 0) > 0));

  protected readonly totals = computed(() => {
    const rows = this.includedLines();
    const items = rows.reduce((s, r) => s + (r.total ?? 0), 0);
    const usd = rows.reduce((s, r) => s + (r.usd ?? 0), 0);
    const charges = this.otherCharges().reduce((s, c) => s + (c.amount ?? 0), 0);
    return { items: round(items), usd: round(usd), charges: round(charges), grand: round(items + charges) };
  });

  /** Deviations: the RFQ's (once saved) or, for a new RFQ, a preview of what the requisitions bring. */
  protected readonly deviationRows = computed<RfqDeviation[]>(() =>
    this.rfq() || this.deviations().length ? this.deviations() : this.sourceDeviations().map((d) => ({
      clauseNo: d.clauseNo, rfqRequirement: d.rfqRequirement, vendorDeviation: d.vendorDeviation, justification: d.justification,
    })));

  /** The RFQ's checklist, or — before it is saved — the checklist it will start with. */
  protected readonly checklistView = computed<RfqChecklistItem[]>(() => this.checklist().length
    ? this.checklist()
    : RFQ_DEFAULT_CHECKLIST.map((c, i) => ({ ...c, id: '', sequence: i + 1, provided: null, reason: null })));
  protected readonly checklistTechnical = computed(() => this.checklistView().filter((c) => c.section === 'TECHNICAL'));
  protected readonly checklistCommercial = computed(() => this.checklistView().filter((c) => c.section === 'COMMERCIAL'));
  protected readonly checklistAnswered = computed(() => this.checklistView().filter((c) => c.provided != null).length);

  /** What still stops the buyer from issuing (shown on the last tab). */
  protected readonly issueBlockers = computed(() => {
    const h = this.header();
    const out: string[] = [];
    if (!h.projectId) out.push('Choose the project (RFQ Letter)');
    if (!h.vendorId) out.push('Choose the vendor (RFQ Letter)');
    else if (this.selectedVendor() && !this.selectedVendor()!.email) out.push('The vendor has no email address in the Vendor Master');
    if (!h.bidClosingDate) out.push('Set the bid closing date (RFQ Letter)');
    else if (h.bidClosingDate < today()) out.push('Move the bid closing date to today or later (RFQ Letter)');
    if (!h.subject?.trim()) out.push('Enter the subject (RFQ Letter)');
    if (!this.requisitionIds().length) out.push('Select at least one material requisition (RFQ Letter or Price Schedule)');
    if (!this.includedLines().length) out.push('Add at least one item with an RFQ quantity (Price Schedule)');
    if (!this.hasDocument('TERMS_AND_CONDITIONS')) out.push('Attach the terms and conditions (RFQ Letter)');
    if (h.ndaScope && !this.hasDocument('NON_DISCLOSURE_AGREEMENT')) out.push('Attach the non-disclosure agreement (RFQ Letter)');
    if (!this.hasDocument('TECHNICAL_SPECIFICATION')) out.push('Upload or select the technical specification documents (Technical Specifications)');
    return [...out, ...this.buyerIssues()];
  });

  protected readonly canIssue = computed(() => !this.issueBlockers().length);

  private hasDocument(section: RfqDocumentSection): boolean {
    return this.documents().some((d) => d.section === section);
  }

  /** Field problems in what the buyer entered. */
  protected readonly buyerIssues = computed(() => {
    const out: string[] = [];
    const h = this.header();
    if (h.bidClosingDate && h.bidClosingDate < today()) out.push('The bid closing date must be today or later.');
    for (const r of this.scheduleRows()) {
      if (r.over) out.push(`${r.mrNumber} line ${r.lineNumber}: the RFQ quantity is more than the ${r.balance} still open.`);
      if (r.rfqQuantity != null && r.rfqQuantity < 0) out.push(`${r.mrNumber} line ${r.lineNumber}: the RFQ quantity cannot be negative.`);
    }
    this.compliances().forEach((c, i) => {
      if (!c.requirement.trim()) out.push(`Compliance item ${i + 1}: enter the requirement.`);
    });
    return out;
  });

  /** Field problems in the vendor's answers (`submit` also needs every answer). */
  protected vendorIssues(submit: boolean): string[] {
    const out: string[] = [];
    if (submit && !this.quotedCurrency().trim()) out.push('Price Schedule: enter the quoted currency.');
    if (submit) {
      const unpriced = this.schedule().filter((r) => r.unitPrice == null).length;
      if (unpriced) out.push(`Price Schedule: enter the unit price of ${unpriced} item${unpriced === 1 ? '' : 's'}.`);
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

  protected readonly title = computed(() => {
    const r = this.rfq();
    if (!r) return 'New Request for Quotation';
    return `RFQ ${r.rfqNumber}${r.revisionNo ? ` · Rev ${r.revisionNo}` : ''}`;
  });

  // ── Lifecycle ────────────────────────────────────────────────────

  ngOnInit(): void {
    const clock = setInterval(() => this.now.set(new Date()), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(clock));
    const mode = (this.route.snapshot.data['mode'] as Mode | undefined) ?? 'view';
    this.mode.set(mode);
    const id = this.route.snapshot.paramMap.get('id');
    void (mode === 'create' || !id ? this.startNew() : this.load(id));
  }

  private async startNew(): Promise<void> {
    try {
      const [defaults] = await Promise.all([lastValueFrom(this.service.getDefaults()), this.loadBuyerSources()]);
      const d = defaults.data;
      this.header.update((h) => ({
        ...h, subject: d.subject, content: d.content, instructionsToBidders: d.instructionsToBidders,
      }));
      this.contact.set({ name: d.contactName, email: d.contactEmail, phone: d.contactPhone });
    } catch (err) {
      this.loadError.set(this.messageOf(err, 'Unable to start a new RFQ.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly contact = signal<{ name: string | null; email: string | null; phone: string | null }>({
    name: null, email: null, phone: null,
  });

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const rfq = (await lastValueFrom(this.service.getRfq(id))).data;
      if (rfq.permissions?.viewer === 'VENDOR') {
        // Vendors answer on their own screen.
        void this.router.navigate(['/vendor-rfqs', rfq.id], { replaceUrl: true });
        return;
      }
      this.applyRfq(rfq);
      if (this.mode() === 'edit' && !rfq.permissions?.canEditBuyer && !rfq.permissions?.canEditCompliance) {
        this.mode.set('view');
      }
      if (this.buyerEditable()) {
        await this.loadBuyerSources();
        await this.loadRequisitionOptions();
        await this.loadContent(true);
      }
      this.loadVendorDocuments();
    } catch (err) {
      this.loadError.set(this.messageOf(err, 'Unable to load the RFQ.'));
    } finally {
      this.loading.set(false);
    }
  }

  private applyRfq(rfq: Rfq): void {
    this.rfq.set(rfq);
    const h = emptyHeader();
    for (const k of TEXT_KEYS) (h as unknown as Record<string, string | null>)[k] = rfq[k] ?? null;
    this.header.set({
      ...h,
      rfqNumber: rfq.rfqNumber, revisionNo: rfq.revisionNo, projectId: rfq.projectId, clientId: rfq.clientId,
      bidClosingDate: rfq.bidClosingDate, sealedBid: rfq.sealedBid, ndaScope: rfq.ndaScope, vendorId: rfq.vendorId,
    });
    this.contact.set({ name: rfq.contactName, email: rfq.contactEmail, phone: rfq.contactPhone });
    this.requisitionIds.set(rfq.requisitions.map((r) => r.requisitionId));
    this.schedule.set(rfq.items.map((i) => ({
      key: i.requisitionItemId, id: i.id, requisitionId: i.requisitionId, mrNumber: i.mrNumber, lineNumber: i.lineNumber,
      itemCode: i.itemCode, description: i.description, uom: i.uom, mrQuantity: i.mrQuantity,
      quotedElsewhere: null, balance: null, rfqQuantity: i.rfqQuantity, unitPrice: i.unitPrice,
      exchangeRate: i.exchangeRate, deliveryDuration: i.deliveryDuration, remarks: i.remarks,
    })));
    this.compliances.set(rfq.compliances.map((c) => ({ ...c })));
    this.deviations.set(rfq.deviations.map((d) => ({ ...d })));
    this.documents.set(rfq.documents.map((d) => ({ ...d })));
    this.otherCharges.set(rfq.otherCharges.map((c) => ({ ...c })));
    this.checklist.set(rfq.checklist.map((c) => ({ ...c })));
    this.quotedCurrency.set(rfq.quotedCurrency ?? '');
    this.showVendorColumns.set(rfq.permissions?.viewer !== 'BUYER');
    // Vendors on the select: the saved one at least, so its name shows even before the list loads.
    if (rfq.vendorId && !this.vendors().some((v) => v.id === rfq.vendorId)) {
      this.vendors.set([{
        id: rfq.vendorId, code: rfq.vendorCode ?? '', vendorName: rfq.vendorName ?? '', email: rfq.vendorEmail, address: rfq.vendorAddress,
      }]);
    }
  }

  /** The chosen vendor's Vendor Master documents (Vendor Qualification tab). */
  private loadVendorDocuments(): void {
    const vendorId = this.header().vendorId;
    const rfq = this.rfq();
    if (!vendorId) { this.vendorDocuments.set([]); return; }
    // The buyer may be choosing a vendor the saved RFQ does not have yet.
    const source = this.buyerEditable() || !rfq || rfq.vendorId !== vendorId
      ? this.service.getVendorMasterDocuments(vendorId)
      : this.service.getVendorDocuments(rfq.id);
    this.vendorDocumentsLoading.set(true);
    source.subscribe({
      next: (res) => { this.vendorDocuments.set(res.data ?? []); this.vendorDocumentsLoading.set(false); },
      error: () => { this.vendorDocuments.set([]); this.vendorDocumentsLoading.set(false); },
    });
  }

  protected onVendorChange(vendorId: string | null | undefined): void {
    if (vendorId === undefined || vendorId === this.header().vendorId) return;
    this.patch({ vendorId });
    this.loadVendorDocuments();
  }

  protected onBidClosing(date: Date | null): void {
    this.patch({ bidClosingDate: toIsoDay(date) });
  }

  private async loadBuyerSources(): Promise<void> {
    const [projects, clients, vendors] = await Promise.all([
      lastValueFrom(this.projectService.getActiveProjects()),
      lastValueFrom(this.clientService.getActiveClients()),
      lastValueFrom(this.service.getVendorOptions()),
    ]);
    this.projects.set(projects.data ?? []);
    this.clients.set(clients.data ?? []);
    this.vendors.set(vendors.data ?? []);
  }

  private async loadRequisitionOptions(): Promise<void> {
    const projectId = this.header().projectId;
    if (!projectId) { this.requisitionOptions.set([]); return; }
    try {
      this.requisitionOptions.set((await lastValueFrom(this.service.getRequisitionOptions(projectId))).data ?? []);
    } catch (err) {
      this.toast(this.messageOf(err, 'Unable to load the approved requisitions.'), true);
    }
  }

  /**
   * Brings in the selected requisitions' lines, compliance items, deviations
   * and documents. `initial` keeps the saved RFQ as it is (only the open
   * quantities are filled in); otherwise lines, compliance items and picked
   * documents follow the selection.
   */
  private async loadContent(initial = false): Promise<void> {
    const ids = this.requisitionIds();
    this.contentLoading.set(true);
    try {
      const content = ids.length
        ? (await lastValueFrom(this.service.getRequisitionContent(ids, this.rfq()?.id ?? null))).data
        : { items: [], compliances: [], deviations: [], documents: [] };
      this.sourceDocuments.set(content.documents);
      this.sourceDeviations.set(content.deviations);
      this.mergeSchedule(content.items, initial);
      if (!initial) {
        this.syncCompliances(content.compliances);
        const keep = new Set(ids);
        this.documents.update((list) => list.filter((d) => !d.sourceRequisitionId || keep.has(d.sourceRequisitionId)));
      }
    } catch (err) {
      this.toast(this.messageOf(err, 'Unable to load the requisitions\' content.'), true);
    } finally {
      this.contentLoading.set(false);
    }
  }

  private mergeSchedule(items: RfqSourceItem[], initial: boolean): void {
    const current = new Map(this.schedule().map((r) => [r.key, r]));
    this.schedule.set(items.map((i) => {
      const had = current.get(i.requisitionItemId);
      return {
        key: i.requisitionItemId,
        id: had?.id ?? null,
        requisitionId: i.requisitionId,
        mrNumber: i.mrNumber,
        lineNumber: i.lineNumber,
        itemCode: i.itemCode,
        description: i.description,
        uom: i.uom,
        mrQuantity: i.mrQuantity,
        quotedElsewhere: i.quotedElsewhere,
        balance: i.balance,
        // A line already on the RFQ keeps its quantity; a new one starts at what is still open.
        rfqQuantity: had ? had.rfqQuantity : initial ? null : (i.balance > 0 ? i.balance : null),
        unitPrice: had?.unitPrice ?? null,
        exchangeRate: had?.exchangeRate ?? null,
        deliveryDuration: had?.deliveryDuration ?? null,
        remarks: had?.remarks ?? null,
      };
    }));
  }

  /** Keeps typed items and those of requisitions still selected; adds the newly selected requisitions' items. */
  private syncCompliances(source: Array<{ id: string; requisitionId: string; mrNumber: string; requirement: string }>): void {
    const sourceIds = new Set(source.map((s) => s.id));
    const kept = this.compliances().filter((c) => !c.sourceComplianceId || sourceIds.has(c.sourceComplianceId));
    const have = new Set(kept.map((c) => c.sourceComplianceId).filter(Boolean));
    const added: RfqCompliance[] = source.filter((s) => !have.has(s.id)).map((s) => ({
      id: null, sequence: 0, sourceComplianceId: s.id, sourceRequisitionId: s.requisitionId, sourceMrNumber: s.mrNumber,
      requirement: s.requirement, vendorResponse: null, compliant: null, remarks: null,
    }));
    this.compliances.set([...kept, ...added]);
  }

  // ── Buyer edits ──────────────────────────────────────────────────

  protected patch(p: Partial<HeaderState>): void {
    this.header.update((h) => ({ ...h, ...p }));
  }

  protected text(key: RfqTextField): string {
    return this.header()[key] ?? '';
  }

  protected setText(key: RfqTextField, value: string): void {
    this.patch({ [key]: value } as Partial<HeaderState>);
  }

  protected async onProjectChange(projectId: string | null): Promise<void> {
    if (!projectId || projectId === this.header().projectId) return;
    const project = this.projects().find((p) => p.id === projectId);
    // Requisitions belong to one project: changing it starts the selection over.
    this.patch({ projectId, clientId: project?.clientId ?? null });
    this.requisitionIds.set([]);
    await this.loadRequisitionOptions();
    await this.loadContent();
  }

  protected async onRequisitionsChange(ids: Array<string | null | undefined>): Promise<void> {
    const clean = ids.filter((v): v is string => !!v);
    this.requisitionIds.set(clean);
    await this.loadContent();
  }

  protected async removeRequisition(id: string): Promise<void> {
    await this.onRequisitionsChange(this.requisitionIds().filter((x) => x !== id));
  }

  protected setScheduleQty(key: string, value: string): void {
    const qty = num(value);
    this.schedule.update((rows) => rows.map((r) => (r.key === key ? { ...r, rfqQuantity: qty } : r)));
  }

  protected fillOpenQuantities(): void {
    this.schedule.update((rows) => rows.map((r) => ({ ...r, rfqQuantity: r.balance && r.balance > 0 ? r.balance : null })));
  }

  protected addCompliance(): void {
    this.attempted.set(false);
    this.compliances.update((list) => [...list, {
      id: null, sequence: 0, sourceComplianceId: null, sourceRequisitionId: null, sourceMrNumber: null,
      requirement: '', vendorResponse: null, compliant: null, remarks: null,
    }]);
  }

  protected readonly canAddCompliance = computed(() => {
    const list = this.compliances();
    return !list.length || !!list[list.length - 1].requirement.trim();
  });

  protected setCompliance(index: number, patch: Partial<RfqCompliance>): void {
    this.compliances.update((list) => list.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  protected removeCompliance(index: number): void {
    this.compliances.update((list) => list.filter((_, i) => i !== index));
  }

  // ── Vendor edits ─────────────────────────────────────────────────

  protected setPrice(key: string, patch: Partial<Pick<ScheduleRow, 'unitPrice' | 'exchangeRate' | 'deliveryDuration' | 'remarks'>>): void {
    this.schedule.update((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  protected numberOf(event: Event): number | null {
    return num((event.target as HTMLInputElement).value);
  }

  protected valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected addCharge(): void {
    this.otherCharges.update((list) => [...list, { title: '', amount: null }]);
  }

  protected setCharge(index: number, patch: Partial<RfqOtherCharge>): void {
    this.otherCharges.update((list) => list.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  protected removeCharge(index: number): void {
    this.otherCharges.update((list) => list.filter((_, i) => i !== index));
  }

  protected setChecklist(key: string, patch: Partial<RfqChecklistItem>): void {
    this.checklist.update((list) => list.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  // ── Saving ───────────────────────────────────────────────────────

  private buyerRequest(): RfqSaveRequest {
    const h = this.header();
    const texts = Object.fromEntries(TEXT_KEYS.map((k) => [k, h[k]?.trim() ? h[k] : null])) as Partial<RfqTextFields>;
    return {
      ...texts,
      rfqNumber: h.rfqNumber.trim() || null,
      revisionNo: h.revisionNo ?? 0,
      projectId: h.projectId ?? undefined,
      clientId: h.clientId,
      bidClosingDate: h.bidClosingDate || null,
      sealedBid: h.sealedBid,
      ndaScope: h.ndaScope,
      vendorId: h.vendorId,
      requisitionIds: this.requisitionIds(),
      items: this.includedLines().map((r) => ({ requisitionItemId: r.key, rfqQuantity: r.rfqQuantity! })),
      compliances: this.complianceRequest(),
      documents: this.documents()
        .filter((d) => BUYER_SECTIONS.includes(d.section))
        .map((d) => ({
          section: d.section, documentName: d.documentName, documentUrl: d.documentUrl, fileName: d.fileName,
          mimeType: d.mimeType, fileSizeBytes: d.fileSizeBytes, sourceRequisitionId: d.sourceRequisitionId,
          sourceDocumentId: d.sourceDocumentId,
        })),
    };
  }

  private complianceRequest(): RfqSaveRequest['compliances'] {
    return this.compliances().map((c) => ({
      ...(c.id ? { id: c.id } : {}), requirement: c.requirement.trim(), sourceComplianceId: c.sourceComplianceId,
    }));
  }

  /** Saves the draft (or, once issued, the compliance requirements). Returns the saved RFQ. */
  protected async save(quiet = false): Promise<Rfq | null> {
    this.attempted.set(true);
    if (this.buyerEditable() && !this.header().projectId) {
      this.tabIndex.set(0);
      this.toast('Choose the project first (RFQ Letter).', true);
      return null;
    }
    const issues = this.buyerIssues();
    if (issues.length) {
      this.toast(issues[0], true);
      return null;
    }
    this.saving.set(true);
    try {
      const current = this.rfq();
      const request = this.buyerEditable() ? this.buyerRequest() : { compliances: this.complianceRequest() };
      const saved = current
        ? (await lastValueFrom(this.service.update(current.id, request))).data
        : (await lastValueFrom(this.service.create(request))).data;
      this.applyRfq(saved);
      this.attempted.set(false);
      if (!current) {
        // Stay in the editor, now on the saved RFQ's URL.
        this.mode.set('edit');
        void this.router.navigate(['/rfqs', saved.id, 'edit'], { replaceUrl: true });
      }
      if (this.buyerEditable()) await this.loadContent(true);
      if (!quiet) this.toast(current ? 'RFQ saved' : `RFQ ${saved.rfqNumber} saved as a draft`);
      return saved;
    } catch (err) {
      this.toast(this.messageOf(err, 'Unable to save the RFQ.'), true);
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  protected async issue(): Promise<void> {
    this.attempted.set(true);
    const blockers = this.issueBlockers();
    if (blockers.length) {
      this.tabIndex.set(this.tabCount - 1);
      this.toast(blockers[0], true);
      return;
    }
    const vendor = this.selectedVendor();
    const ok = await this.confirm({
      title: 'Issue RFQ to the vendor?',
      message: `The RFQ will be emailed to ${vendor?.vendorName ?? 'the vendor'}${vendor?.email ? ` (${vendor.email})` : ''} with links to acknowledge and view it. After issuing, only the compliance requirements can still change.`,
      confirmText: 'Issue RFQ',
      icon: 'send',
    });
    if (!ok) return;
    const saved = await this.save(true);
    if (!saved) return;
    this.saving.set(true);
    try {
      const issued = (await lastValueFrom(this.service.issue(saved.id))).data;
      this.toast(`RFQ ${issued.rfqNumber} issued to ${issued.vendorName}`);
      void this.router.navigate(['/rfqs', issued.id]);
    } catch (err) {
      this.toast(this.messageOf(err, 'Unable to issue the RFQ.'), true);
    } finally {
      this.saving.set(false);
    }
  }

  protected async saveQuotation(submit: boolean): Promise<void> {
    const rfq = this.rfq();
    if (!rfq) return;
    this.submitAttempted.set(submit);
    this.attempted.set(true);
    const issues = this.vendorIssues(submit);
    if (issues.length) {
      this.toast(issues[0], true);
      return;
    }
    if (submit) {
      const ok = await this.confirm({
        title: 'Submit the quotation?',
        message: 'The buyer is told your quotation is in. You can still correct it until the RFQ is completed or approved.',
        confirmText: 'Submit Quotation',
        icon: 'send',
      });
      if (!ok) return;
    }
    const request: RfqVendorResponseRequest = {
      quotedCurrency: this.quotedCurrency().trim().toUpperCase() || null,
      items: this.schedule().filter((r) => r.id).map((r) => ({
        id: r.id!, unitPrice: r.unitPrice, exchangeRate: r.exchangeRate,
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
      qualificationDocuments: this.documents().filter((d) => d.section === 'VENDOR_QUALIFICATION' && !this.qualificationLocked(d)).map((d) => ({
        section: d.section, documentName: d.documentName, documentUrl: d.documentUrl, fileName: d.fileName,
        mimeType: d.mimeType, fileSizeBytes: d.fileSizeBytes, vendorDocumentId: d.vendorDocumentId,
      })),
      submit,
    };
    this.saving.set(true);
    try {
      const saved = (await lastValueFrom(this.service.saveVendorResponse(rfq.id, request))).data;
      this.applyRfq(saved);
      this.attempted.set(false);
      this.toast(submit ? 'Quotation submitted' : 'Quotation saved');
    } catch (err) {
      this.toast(this.messageOf(err, 'Unable to save the quotation.'), true);
    } finally {
      this.saving.set(false);
    }
  }

  protected async changeStatus(status: RfqStatus): Promise<void> {
    const rfq = this.rfq();
    if (!rfq) return;
    const label = rfqStatusLabel(status);
    const ok = await this.confirm({
      title: `${label === 'Cancelled' ? 'Cancel' : `Mark as ${label}`} — RFQ ${rfq.rfqNumber}?`,
      message: status === 'CANCELLED'
        ? 'The RFQ is cancelled and its quantities are open again for another RFQ. This cannot be undone.'
        : `${RFQ_STATUS_HINTS[status]}.`,
      confirmText: status === 'CANCELLED' ? 'Cancel RFQ' : `Mark ${label}`,
      cancelText: 'Keep as is',
      color: status === 'CANCELLED' ? 'warn' : 'primary',
      icon: status === 'CANCELLED' ? 'cancel' : 'task_alt',
    });
    if (!ok) return;
    this.saving.set(true);
    try {
      this.applyRfq((await lastValueFrom(this.service.changeStatus(rfq.id, status))).data);
      this.toast(`RFQ ${rfq.rfqNumber} is now ${label}`);
    } catch (err) {
      this.toast(this.messageOf(err, 'Unable to change the status.'), true);
    } finally {
      this.saving.set(false);
    }
  }

  // ── Navigation ───────────────────────────────────────────────────

  protected readonly tabCount = 12;

  protected next(): void { this.tabIndex.update((i) => Math.min(i + 1, this.tabCount - 1)); }
  protected previous(): void { this.tabIndex.update((i) => Math.max(i - 1, 0)); }

  protected backToList(): void { void this.router.navigate(['/rfqs']); }

  protected edit(): void {
    const rfq = this.rfq();
    if (rfq) void this.router.navigate(['/rfqs', rfq.id, 'edit']);
  }

  // ── Helpers ──────────────────────────────────────────────────────

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

  protected statusText(s: RfqStatus): string { return rfqStatusLabel(s); }
  protected statusHint(s: RfqStatus): string { return RFQ_STATUS_HINTS[s]; }
  protected statusClass(s: RfqStatus): string { return `status-chip rfq-status rfq-status--${s.toLowerCase()}`; }
  protected ndaLabel(v: RfqNdaScope | null): string { return v ? RFQ_NDA_LABELS[v] : '—'; }

  protected humanize(v: string): string {
    return v.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** '0002 - Short description - 3 items' */
  protected requisitionLabel(mrNumber: string, shortDescription: string | null, itemCount: number): string {
    return `${mrNumber} - ${shortDescription?.trim() || 'No short description'} - ${itemCount} item${itemCount === 1 ? '' : 's'}`;
  }

    protected stop(event: Event): void { event.stopPropagation(); }

  protected answerError(c: { provided?: boolean | null; compliant?: boolean | null }, value: 'provided' | 'compliant'): boolean {
    return this.attempted() && this.submitAttempted() && c[value] == null;
  }

  private async confirm(data: ConfirmDialogData): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, { data, width: '460px' });
    return !!(await lastValueFrom(ref.afterClosed()));
  }

  private toast(message: string, error = false): void {
    this.snack.open(message, error ? 'Close' : 'OK', {
      duration: error ? 6000 : 3500, ...(error ? { panelClass: ['error-snackbar'] } : {}),
    });
  }

  private messageOf(err: unknown, fallback: string): string {
    const e = err as HttpErrorResponse;
    const m = e?.error?.message;
    if (Array.isArray(m)) return m.join(' ');
    if (typeof m === 'string' && m) return m;
    if (e?.status === 403) return 'You do not have access to this RFQ.';
    if (e?.status === 404) return 'The RFQ could not be found.';
    if (e?.status === 0) return 'Cannot reach the server. Check your connection and try again.';
    return fallback;
  }
}
