/**
 * Material Requisition domain model. Mirrors MaterialRequisitionResponseDto
 * (pm-api/src/modules/material-requisition/dto/material-requisition-response.dto.ts).
 *
 * The client is never part of a requisition's own data: it is the client of the
 * project, read-only. The WBS / cost code likewise carries the area, system,
 * discipline, department, work package and activities.
 */

export enum MaterialRequisitionStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
  DISABLED = 'DISABLED',
  OBSOLETE = 'OBSOLETE',
}

/**
 * Where a submitted requisition can be moved by hand. Mirrors
 * REQUISITION_STATUS_TRANSITIONS on the API, which is what enforces it; a
 * draft is edited, submitted or deleted instead.
 */
export const REQUISITION_STATUS_TRANSITIONS: Record<MaterialRequisitionStatus, MaterialRequisitionStatus[]> = {
  [MaterialRequisitionStatus.DRAFT]: [],
  [MaterialRequisitionStatus.UNDER_REVIEW]: [
    MaterialRequisitionStatus.ON_HOLD, MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.APPROVED]: [
    MaterialRequisitionStatus.ON_HOLD, MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.REJECTED]: [MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE],
  [MaterialRequisitionStatus.CANCELLED]: [MaterialRequisitionStatus.OBSOLETE],
  [MaterialRequisitionStatus.ON_HOLD]: [
    MaterialRequisitionStatus.UNDER_REVIEW, MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.DISABLED]: [MaterialRequisitionStatus.UNDER_REVIEW, MaterialRequisitionStatus.OBSOLETE],
  [MaterialRequisitionStatus.OBSOLETE]: [],
};

/** Where a line came from. Every source feeds the same lines table. */
export enum RequisitionLineSource {
  MATERIAL_MASTER = 'MATERIAL_MASTER',
  EARLIER_MR = 'EARLIER_MR',
  BOM = 'BOM',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  PROJECT = 'PROJECT',
}

export enum RequisitionDocumentType {
  COVERING_DOCUMENT = 'COVERING_DOCUMENT',
  SPECIFICATION = 'SPECIFICATION',
  PROJECT_DOCUMENT = 'PROJECT_DOCUMENT',
}

// ── Server records ──────────────────────────────────────────────────────

export interface RequisitionItem {
  id: string;
  lineNumber: number;
  materialId: string;
  materialCode: string;
  materialDescription: string;
  uom: string | null;
  requestedQty: number;
  /** Not tracked yet — always 0. */
  stockOnHand: number;
  source: RequisitionLineSource;
  sourceReference: string | null;
}

export interface RequisitionDocument {
  id: string;
  documentType: RequisitionDocumentType;
  documentName: string;
  documentUrl: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  uploadedBy: string | null;
  uploadedAt: string;
}

/** The WBS / cost code's descriptive fields, read from it. */
export interface RequisitionWbs {
  id: string;
  code: string;
  /** WBS / cost name. */
  name: string;
  areaFacility: string | null;
  systemSubsystem: string | null;
  disciplineName: string | null;
  departmentName: string | null;
  workPackage: string | null;
  activities: string | null;
}

export interface MaterialRequisitionListItem {
  id: string;
  /** System-generated sequence ("0001"). */
  code: string;
  /** The number used on paper; the code when none was given. */
  mrNumber: string;
  status: MaterialRequisitionStatus;
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  clientCode: string | null;
  clientName: string | null;
  wbsCostCodeId: string | null;
  wbsName: string | null;
  budgetHead: string | null;
  /** YYYY-MM-DD */
  requiredOnSiteDate: string | null;
  itemCount: number;
  submittedBy: string | null;
  submittedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialRequisition extends MaterialRequisitionListItem {
  dguid: string;
  organizationId: string;
  wbs: RequisitionWbs | null;
  mtoReference: string | null;
  pidReference: string | null;
  isometricReference: string | null;
  areaUnit: string | null;
  remarks: string | null;
  items: RequisitionItem[];
  documents: RequisitionDocument[];
  updatedBy: string | null;
}

// ── Material sources ────────────────────────────────────────────────────

/** A material offered for selection, from any source. */
export interface RequisitionCandidate {
  materialId: string;
  code: string;
  description: string;
  categoryName: string | null;
  groupName: string | null;
  uom: string | null;
  stockOnHand: number;
  /** Quantity on the source line (earlier MR, BOM, project history …). */
  referenceQty: number | null;
}

export interface BomColumns {
  columns: string[];
  rowCount: number;
  sample: Array<Record<string, string>>;
  suggested: { codeColumn?: string; descriptionColumn?: string; quantityColumn?: string; uomColumn?: string };
}

export interface BomRowIssue {
  rowNumber: number;
  code: string | null;
  reason: string;
}

export interface BomPreview {
  matched: RequisitionCandidate[];
  issues: BomRowIssue[];
  totalRows: number;
}

/**
 * A line of the requisition being built. `requestedQty` stays null/0 until the
 * user types one; such a line is not part of the requisition.
 */
export interface RequisitionLine {
  materialId: string;
  code: string;
  description: string;
  uom: string | null;
  categoryName: string | null;
  requestedQty: number | null;
  stockOnHand: number;
  source: RequisitionLineSource;
  sourceReference: string | null;
}

/** A document of the requisition being built (already uploaded, URL known). */
export interface RequisitionDocumentDraft {
  /** Client-side key so the list can be edited before anything is saved. */
  key: string;
  documentType: RequisitionDocumentType;
  documentName: string;
  documentUrl: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
}

// ── List state ──────────────────────────────────────────────────────────

export type MaterialRequisitionSortField =
  | 'code' | 'mrNumber' | 'project' | 'status' | 'requiredOnSiteDate' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface MaterialRequisitionFilter {
  search: string;
  status: MaterialRequisitionStatus | null;
  projectId: string | null;
}

export const DEFAULT_MATERIAL_REQUISITION_FILTER: MaterialRequisitionFilter = {
  search: '',
  status: null,
  projectId: null,
};

// ── Option lists ────────────────────────────────────────────────────────

export const REQUISITION_STATUS_OPTIONS: readonly {
  value: MaterialRequisitionStatus; label: string; hint: string;
}[] = [
  { value: MaterialRequisitionStatus.DRAFT, label: 'Draft', hint: 'Saved, not yet submitted' },
  { value: MaterialRequisitionStatus.UNDER_REVIEW, label: 'Under Review', hint: 'Submitted, awaiting approval' },
  { value: MaterialRequisitionStatus.APPROVED, label: 'Approved', hint: 'Approved' },
  { value: MaterialRequisitionStatus.REJECTED, label: 'Rejected', hint: 'Not approved' },
  { value: MaterialRequisitionStatus.CANCELLED, label: 'Cancelled', hint: 'Withdrawn' },
  { value: MaterialRequisitionStatus.ON_HOLD, label: 'On Hold', hint: 'Paused until released' },
  { value: MaterialRequisitionStatus.DISABLED, label: 'Disabled', hint: 'Not available for use' },
  { value: MaterialRequisitionStatus.OBSOLETE, label: 'Obsolete', hint: 'Superseded or no longer needed' },
];

export interface SourceOption {
  value: RequisitionLineSource;
  label: string;
  description: string;
  icon: string;
  /** False when the source cannot be used yet. */
  available: boolean;
  unavailableReason?: string;
}

export const REQUISITION_SOURCE_OPTIONS: readonly SourceOption[] = [
  {
    value: RequisitionLineSource.MATERIAL_MASTER, label: 'Material Master', icon: 'inventory_2',
    description: 'Pick from every active material', available: true,
  },
  {
    value: RequisitionLineSource.EARLIER_MR, label: 'Earlier MR', icon: 'history',
    description: 'Reuse the lines of a previous requisition', available: true,
  },
  {
    value: RequisitionLineSource.BOM, label: 'BOM / MTO', icon: 'upload_file',
    description: 'Upload a bill of materials (Excel or CSV)', available: true,
  },
  {
    value: RequisitionLineSource.PURCHASE_ORDER, label: 'Purchase Order', icon: 'receipt_long',
    description: 'Import from a PO', available: false,
    unavailableReason: 'Purchase orders are not available yet',
  },
  {
    value: RequisitionLineSource.PROJECT, label: 'Project / WBS', icon: 'folder_open',
    description: 'Materials already used on this project', available: true,
  },
];

export const DOCUMENT_TYPE_LABELS: Record<RequisitionDocumentType, string> = {
  [RequisitionDocumentType.COVERING_DOCUMENT]: 'Covering Document',
  [RequisitionDocumentType.SPECIFICATION]: 'Specification',
  [RequisitionDocumentType.PROJECT_DOCUMENT]: 'Project Document',
};

export const SOURCE_LABELS: Record<RequisitionLineSource, string> = {
  [RequisitionLineSource.MATERIAL_MASTER]: 'Material Master',
  [RequisitionLineSource.EARLIER_MR]: 'Earlier MR',
  [RequisitionLineSource.BOM]: 'BOM / MTO',
  [RequisitionLineSource.PURCHASE_ORDER]: 'Purchase Order',
  [RequisitionLineSource.PROJECT]: 'Project / WBS',
};

export function requisitionStatusLabel(status: string | null | undefined): string {
  return REQUISITION_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? (status ?? '—');
}
