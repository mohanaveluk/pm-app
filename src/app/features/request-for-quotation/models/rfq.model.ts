/**
 * Request for Quotation — mirrors pm-api/src/modules/request-for-quotation
 * (dto/rfq-request.dto.ts, dto/rfq-response.dto.ts, enums/rfq.enums.ts).
 */

import { WorkflowEvent } from '../../material-requisition/models/material-requisition.model';

export interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

export type RfqStatus = 'DRAFT' | 'ISSUED' | 'ACKNOWLEDGED' | 'DECLINED' | 'QUOTED' | 'COMPLETED' | 'APPROVED' | 'CANCELLED';
export type RfqNdaScope = 'TECHNICAL' | 'COMMERCIAL' | 'TECHNICAL_AND_COMMERCIAL';
export type RfqDocumentSection =
  | 'TERMS_AND_CONDITIONS' | 'NON_DISCLOSURE_AGREEMENT' | 'INSTRUCTIONS_TO_BIDDERS' | 'SCOPE_ASSOCIATED'
  | 'TECHNICAL_SPECIFICATION' | 'DRAWING_DATASHEET' | 'VENDOR_QUALIFICATION' | 'ACKNOWLEDGEMENT';
export type RfqViewer = 'BUYER' | 'VENDOR' | 'READER';
export type RfqSortField = 'rfqNumber' | 'issueDate' | 'bidClosingDate' | 'status' | 'createdAt' | 'updatedAt';

export const RFQ_STATUS_LABELS: Record<RfqStatus, string> = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  ACKNOWLEDGED: 'Acknowledged',
  DECLINED: 'Declined',
  QUOTED: 'Response Submitted',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  CANCELLED: 'Cancelled',
};

export const RFQ_STATUS_HINTS: Record<RfqStatus, string> = {
  DRAFT: 'Being prepared by the buyer — not yet sent to the vendor',
  ISSUED: 'Sent to the vendor, waiting for its acknowledgement',
  ACKNOWLEDGED: 'The vendor will participate and quote — its response is in progress',
  DECLINED: 'The vendor will not participate or quote',
  QUOTED: 'The vendor has submitted its response',
  COMPLETED: 'Evaluation completed',
  APPROVED: 'Approved — no further changes',
  CANCELLED: 'Cancelled — its quantities are open again for another RFQ',
};

export const RFQ_NDA_LABELS: Record<RfqNdaScope, string> = {
  TECHNICAL: 'Technical',
  COMMERCIAL: 'Commercial',
  TECHNICAL_AND_COMMERCIAL: 'Technical and Commercial',
};

export const rfqStatusLabel = (s: RfqStatus): string => RFQ_STATUS_LABELS[s] ?? s;

export interface RfqRequisitionRef {
  requisitionId: string;
  mrNumber: string;
  shortDescription: string | null;
}

export interface RfqItem {
  id: string;
  lineNumber: number;
  requisitionId: string;
  mrNumber: string;
  requisitionItemId: string;
  materialId: string | null;
  itemCode: string;
  description: string;
  uom: string | null;
  mrQuantity: number;
  rfqQuantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  exchangeRate: number | null;
  totalPriceUsd: number | null;
  deliveryDuration: string | null;
  remarks: string | null;
}

export interface RfqDocument {
  id?: string;
  section: RfqDocumentSection;
  documentName: string;
  documentUrl: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  sourceRequisitionId: string | null;
  sourceDocumentId: string | null;
  sourceMrNumber: string | null;
  vendorDocumentId: string | null;
  uploadedBy?: string | null;
  uploadedAt?: string | null;
}

export interface RfqOtherCharge {
  id?: string;
  sequence?: number;
  title: string;
  amount: number | null;
}

export interface RfqChecklistItem {
  id: string;
  section: 'TECHNICAL' | 'COMMERCIAL';
  key: string;
  label: string;
  sequence: number;
  provided: boolean | null;
  reason: string | null;
}

export interface RfqCompliance {
  id: string | null;
  sequence: number;
  sourceComplianceId: string | null;
  sourceRequisitionId: string | null;
  sourceMrNumber: string | null;
  requirement: string;
  vendorResponse: string | null;
  compliant: boolean | null;
  remarks: string | null;
}

export interface RfqDeviation {
  id?: string;
  sequence?: number;
  sourceDeviationId?: string | null;
  clauseNo: string;
  rfqRequirement: string;
  vendorDeviation: boolean;
  justification: string | null;
}

export interface RfqPermissions {
  viewer: RfqViewer;
  canEditBuyer: boolean;
  canEditCompliance: boolean;
  canEditVendor: boolean;
  canIssue: boolean;
  allowedStatuses: RfqStatus[];
  canDelete: boolean;
  /** The signed-in user: documents they uploaded are theirs to change. */
  viewerEmail?: string;
}

/** A workflow step (same shape as the requisition timeline). */
export type RfqHistoryEntry = WorkflowEvent;

export interface RfqListItem {
  id: string;
  code: string;
  rfqNumber: string;
  revisionNo: number;
  issueDate: string | null;
  status: RfqStatus;
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  vendorId: string | null;
  vendorCode: string | null;
  vendorName: string | null;
  vendorEmail: string | null;
  subject: string | null;
  bidClosingDate: string | null;
  sealedBid: boolean;
  requisitions: RfqRequisitionRef[];
  itemCount: number;
  trackingId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string | null;
}

/** The buyer's free-text fields, in the order the tabs show them. */
export interface RfqTextFields {
  subject: string | null;
  content: string | null;
  instructionsToBidders: string | null;
  scopeDescription: string | null;
  scopeQuantityNotes: string | null;
  deliveryLocation: string | null;
  deliverySchedule: string | null;
  materialGradeStandards: string | null;
  designConditions: string | null;
  dimensionalRequirements: string | null;
  applicableCodes: string | null;
  qualityRequirements: string | null;
  regulatoryCompliance: string | null;
  inspectionTesting: string | null;
  documentationRequirements: string | null;
  pricingFormat: string | null;
  incoterms: string | null;
  paymentTerms: string | null;
  taxesDuties: string | null;
  warranty: string | null;
  liquidatedDamages: string | null;
  performanceGuarantee: string | null;
  insuranceRequirements: string | null;
  packingMarking: string | null;
  commercialDocumentation: string | null;
}

export type RfqTextField = keyof RfqTextFields;

export interface Rfq extends RfqListItem, RfqTextFields {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  ndaScope: RfqNdaScope | null;
  vendorAddress: string | null;
  quotedCurrency: string | null;
  quotedAt: string | null;
  quotedBy: string | null;
  issuedAt: string | null;
  issuedBy: string | null;
  items: RfqItem[];
  documents: RfqDocument[];
  otherCharges: RfqOtherCharge[];
  checklist: RfqChecklistItem[];
  compliances: RfqCompliance[];
  deviations: RfqDeviation[];
  quotedTotal: number | null;
  quotedTotalUsd: number | null;
  history: RfqHistoryEntry[];
  permissions: RfqPermissions | null;
  acknowledgement: RfqAcknowledgement | null;
  updatedBy: string | null;
}

export interface RfqListPage {
  items: RfqListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** With groupBy: each group's totals across every page. */
  groups?: RfqGroupSummary[];
}

export type RfqGroupBy = 'vendor' | 'project';

export interface RfqGroupSummary {
  key: string | null;
  total: number;
  open: number;
}

// ── RFQ Acknowledgement Form ─────────────────────────────────────

export interface RfqAcknowledgement {
  id: string;
  participate: boolean;
  willSubmitQuotation: boolean;
  vendorName: string;
  contactPerson: string;
  email: string;
  phone: string | null;
  acknowledgedBy: string;
  acknowledgedAt: string;
  documents: RfqDocument[];
}

export interface RfqAcknowledgementForm {
  rfqId: string;
  rfqNumber: string;
  revisionNo: number;
  subject: string | null;
  status: RfqStatus;
  issueDate: string | null;
  issuedAt: string | null;
  bidClosingDate: string | null;
  sealedBid: boolean;
  projectCode: string | null;
  projectName: string | null;
  clientName: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  vendorName: string | null;
  canAcknowledge: boolean;
  defaults: { vendorName: string; contactPerson: string; email: string; phone: string | null };
  acknowledgement: RfqAcknowledgement | null;
}

export interface RfqAcknowledgementRequest {
  participate: boolean;
  willSubmitQuotation: boolean | null;
  vendorName: string;
  contactPerson: string;
  email: string;
  phone: string | null;
  documents: RfqDocumentRequest[];
}

// ── Editor sources ─────────────────────────────────────────────────

export interface RfqRequisitionOption {
  id: string;
  mrNumber: string;
  shortDescription: string | null;
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  clientName: string | null;
  itemCount: number;
  documentCount: number;
  approvedAt: string | null;
}

export interface RfqSourceItem {
  requisitionId: string;
  mrNumber: string;
  requisitionItemId: string;
  lineNumber: number;
  materialId: string | null;
  itemCode: string;
  description: string;
  uom: string | null;
  mrQuantity: number;
  /** Already in other (not cancelled) RFQs. */
  quotedElsewhere: number;
  /** Still open for an RFQ. */
  balance: number;
}

export interface RfqSourceCompliance {
  id: string;
  requisitionId: string;
  mrNumber: string;
  sequence: number;
  requirement: string;
}

export interface RfqSourceDeviation {
  id: string;
  requisitionId: string;
  mrNumber: string;
  clauseNo: string;
  rfqRequirement: string;
  vendorDeviation: boolean;
  justification: string | null;
}

export interface RfqSourceDocument {
  id: string;
  requisitionId: string;
  mrNumber: string;
  shortDescription: string | null;
  documentType: string;
  documentName: string;
  documentUrl: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
}

export interface RfqRequisitionContent {
  items: RfqSourceItem[];
  compliances: RfqSourceCompliance[];
  deviations: RfqSourceDeviation[];
  documents: RfqSourceDocument[];
}

export interface RfqVendorOption {
  id: string;
  code: string;
  vendorName: string;
  email: string | null;
  address: string | null;
}

export interface RfqVendorDocument {
  id: string;
  documentType: string;
  documentUrl: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  expiryDate: string | null;
}

export interface RfqDefaults {
  subject: string;
  content: string;
  instructionsToBidders: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  otherChargeTypes: string[];
}

// ── Requests ───────────────────────────────────────────────────────

export interface RfqDocumentRequest {
  section: RfqDocumentSection;
  documentName: string;
  documentUrl: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  sourceRequisitionId?: string | null;
  sourceDocumentId?: string | null;
  vendorDocumentId?: string | null;
}

export interface RfqSaveRequest extends Partial<RfqTextFields> {
  rfqNumber?: string | null;
  revisionNo?: number;
  projectId?: string;
  clientId?: string | null;
  bidClosingDate?: string | null;
  sealedBid?: boolean;
  ndaScope?: RfqNdaScope | null;
  vendorId?: string | null;
  requisitionIds?: string[];
  items?: Array<{ requisitionItemId: string; rfqQuantity: number }>;
  compliances?: Array<{ id?: string; requirement: string; sourceComplianceId?: string | null }>;
  documents?: RfqDocumentRequest[];
}

export interface RfqVendorResponseRequest {
  quotedCurrency?: string | null;
  items?: Array<{ id: string; unitPrice: number | null; exchangeRate: number | null; deliveryDuration: string | null; remarks: string | null }>;
  otherCharges?: Array<{ title: string; amount: number }>;
  checklist?: Array<{ key: string; provided: boolean | null; reason: string | null }>;
  compliances?: Array<{ id: string; vendorResponse: string | null; compliant: boolean | null; remarks: string | null }>;
  deviations?: Array<{ clauseNo: string; rfqRequirement: string; vendorDeviation: boolean; justification: string | null }>;
  qualificationDocuments?: RfqDocumentRequest[];
  submit?: boolean;
}

export interface RfqQueryParams {
  page: number;
  limit: number;
  sortBy: RfqSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  status?: RfqStatus;
  projectId?: string;
  groupBy?: RfqGroupBy;
}

// ── Tab field metadata ─────────────────────────────────────────────

export interface RfqTextFieldDef {
  key: RfqTextField;
  label: string;
  /** Shown as a placeholder only — never saved. */
  placeholder: string;
  rows?: number;
}

export const SCOPE_FIELDS: RfqTextFieldDef[] = [
  { key: 'scopeDescription', label: 'Description of Items / Services', placeholder: 'Describe the items or services to be supplied', rows: 4 },
  { key: 'scopeQuantityNotes', label: 'Quantity & Unit of Measurement', placeholder: 'e.g. As per the price schedule; quantities are indicative', rows: 2 },
  { key: 'deliveryLocation', label: 'Delivery Location', placeholder: 'e.g. Project site, Plot 12, Jebel Ali Industrial Area', rows: 2 },
  { key: 'deliverySchedule', label: 'Delivery Schedule', placeholder: 'e.g. Within 8 weeks from purchase order', rows: 2 },
];

export const TECHNICAL_FIELDS: RfqTextFieldDef[] = [
  { key: 'materialGradeStandards', label: 'Material Grade & Standards', placeholder: 'e.g. ASTM, ASME, IS, EN', rows: 3 },
  { key: 'designConditions', label: 'Design Conditions', placeholder: 'Pressure, temperature, load, etc.', rows: 3 },
  { key: 'dimensionalRequirements', label: 'Dimensional Requirements', placeholder: 'Sizes, tolerances, schedules', rows: 3 },
  { key: 'applicableCodes', label: 'Applicable Codes', placeholder: 'e.g. ASME B31.3, API 650, IS 2062', rows: 3 },
  { key: 'qualityRequirements', label: 'Quality Requirements', placeholder: 'e.g. ISO 9001, QAP, ITP', rows: 3 },
  { key: 'regulatoryCompliance', label: 'Regulatory Compliance', placeholder: 'e.g. IBR, PESO, CE marking', rows: 3 },
  { key: 'inspectionTesting', label: 'Inspection & Testing', placeholder: 'e.g. TPI, FAT, hydrotest, NDT', rows: 3 },
  { key: 'documentationRequirements', label: 'Documentation Requirements', placeholder: 'e.g. MTCs, test reports, manuals', rows: 3 },
];

export const COMMERCIAL_FIELDS: RfqTextFieldDef[] = [
  { key: 'pricingFormat', label: 'Pricing Format', placeholder: 'e.g. Lump sum / unit rate, currency to be quoted', rows: 3 },
  { key: 'incoterms', label: 'Incoterms', placeholder: 'e.g. EXW, FOB, CIF, DDP', rows: 2 },
  { key: 'paymentTerms', label: 'Payment Terms', placeholder: 'e.g. 30 days from invoice, milestones', rows: 3 },
  { key: 'taxesDuties', label: 'Taxes & Duties', placeholder: 'e.g. Prices exclusive of VAT; duties by the buyer', rows: 3 },
  { key: 'warranty', label: 'Warranty Terms', placeholder: 'e.g. 12 months from commissioning or 18 months from delivery', rows: 3 },
  { key: 'liquidatedDamages', label: 'Liquidated Damages (LD)', placeholder: 'e.g. 0.5% per week, capped at 10%', rows: 2 },
  { key: 'performanceGuarantee', label: 'Performance Guarantee', placeholder: 'e.g. 10% of the order value', rows: 2 },
  { key: 'insuranceRequirements', label: 'Insurance Requirements', placeholder: 'e.g. Transit insurance by the vendor', rows: 2 },
  { key: 'packingMarking', label: 'Packing & Marking', placeholder: 'e.g. Seaworthy packing, marking as per specification', rows: 2 },
  { key: 'commercialDocumentation', label: 'Documentation', placeholder: 'e.g. Invoice, packing list, certificate of origin', rows: 2 },
];

/** The checklist every RFQ starts with (mirrors RFQ_DEFAULT_CHECKLIST on the server). */
export const RFQ_DEFAULT_CHECKLIST: ReadonlyArray<Pick<RfqChecklistItem, 'section' | 'key' | 'label'>> = [
  { section: 'TECHNICAL', key: 'DATASHEETS', label: 'Datasheets' },
  { section: 'TECHNICAL', key: 'COMPLIANCE_MATRIX', label: 'Compliance matrix' },
  { section: 'TECHNICAL', key: 'QAP_ITP', label: 'QAP / ITP' },
  { section: 'TECHNICAL', key: 'DELIVERY_SCHEDULE', label: 'Delivery schedule' },
  { section: 'TECHNICAL', key: 'DEVIATIONS_LIST', label: 'Deviations list' },
  { section: 'TECHNICAL', key: 'WARRANTY_DETAILS', label: 'Warranty details' },
  { section: 'COMMERCIAL', key: 'PRICE_SCHEDULE', label: 'Price schedule' },
  { section: 'COMMERCIAL', key: 'TAXES_DUTIES', label: 'Taxes & duties' },
  { section: 'COMMERCIAL', key: 'PAYMENT_TERMS', label: 'Payment terms' },
  { section: 'COMMERCIAL', key: 'DELIVERY_TERMS', label: 'Delivery terms' },
  { section: 'COMMERCIAL', key: 'VALIDITY_PERIOD', label: 'Validity period' },
  { section: 'COMMERCIAL', key: 'COMMERCIAL_DEVIATIONS', label: 'Commercial deviations' },
];

/** "2026-11-25" ↔ a local Date (calendar days, no time-zone shift). */
export function toIsoDay(d: Date | null | undefined): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromIsoDay(v: string | null | undefined): Date | null {
  if (!v) return null;
  const [y, m, d] = v.slice(0, 10).split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

export const OTHER_CHARGE_SUGGESTIONS = [
  'Testing charges', 'Packing charges', 'Documentation charges', 'FCA charges', 'FOB charges', 'Freight charges',
];

/** Document sections and how the tabs name them. */
export const DOCUMENT_SECTION_LABELS: Record<RfqDocumentSection, string> = {
  TERMS_AND_CONDITIONS: 'Terms and Conditions',
  NON_DISCLOSURE_AGREEMENT: 'Non-Disclosure Agreement',
  INSTRUCTIONS_TO_BIDDERS: 'Instructions to Bidders',
  SCOPE_ASSOCIATED: 'Associated Documents',
  TECHNICAL_SPECIFICATION: 'Technical Specification Documents',
  DRAWING_DATASHEET: 'Drawings & Datasheets',
  VENDOR_QUALIFICATION: 'Vendor Qualification Documents',
  ACKNOWLEDGEMENT: 'Acknowledgement Documents',
};

export const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
