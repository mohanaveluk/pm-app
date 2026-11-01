import { RequisitionComplianceResponse, RequisitionDeviationResponse } from './requisition-checklist.model';
/**
 * Material Requisition domain model. Mirrors MaterialRequisitionResponseDto
 * (pm-api/src/modules/material-requisition/dto/material-requisition-response.dto.ts).
 *
 * The client is never part of a requisition's own data: it is the client of the
 * project, read-only. The WBS likewise carries the area, system,
 * discipline, department, work package and activities.
 */

export enum MaterialRequisitionStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  RETURNED = 'RETURNED',
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
  [MaterialRequisitionStatus.REVIEWED]: [
    MaterialRequisitionStatus.ON_HOLD, MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.APPROVED]: [
    MaterialRequisitionStatus.ON_HOLD, MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
  ],
  [MaterialRequisitionStatus.RETURNED]: [MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE],
  [MaterialRequisitionStatus.REJECTED]: [MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE],
  [MaterialRequisitionStatus.CANCELLED]: [MaterialRequisitionStatus.OBSOLETE],
  [MaterialRequisitionStatus.ON_HOLD]: [
    MaterialRequisitionStatus.UNDER_REVIEW, MaterialRequisitionStatus.REVIEWED, MaterialRequisitionStatus.APPROVED,
    MaterialRequisitionStatus.DISABLED, MaterialRequisitionStatus.OBSOLETE,
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

/** The two parts an internal user can play on a requisition. */
export enum RequisitionParticipantRole {
  REVIEWER = 'REVIEWER',
  APPROVER = 'APPROVER',
}

/** A reviewer's or approver's decision for the current round. */
export enum RequisitionDecision {
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  RETURNED = 'RETURNED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
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

/** The WBS descriptive fields, read from it. */
export interface RequisitionWbs {
  id: string;
  code: string;
  /** WBS */
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
  /** Short item description — what is being requisitioned. */
  shortDescription: string | null;
  /** YYYY-MM-DD */
  requiredOnSiteDate: string | null;
  itemCount: number;
  /** Reviewers in order, with their decision this round. */
  reviewers: RequisitionParticipantSummary[];
  /** Approvers in order, with their decision this round. */
  approvers: RequisitionParticipantSummary[];
  /** Ties the requisition to every document raised from it (TRK-XXXXXXXX-XXXXXXXX-XXXXXXXX). */
  trackingId: string | null;
  /** 1 for the first submission; +1 on every resubmission. */
  reviewRound: number;
  reviewedAt: string | null;
  approvedAt: string | null;
  /** Where an on-hold requisition returns to when released. */
  statusBeforeHold: MaterialRequisitionStatus | null;
  /** Set once a purchase order is raised — no further edits. */
  lockedAt: string | null;
  lockedReason: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A reviewer or approver as the list shows them. */
/** A project to copy materials from (Other Projects source). */
export interface SourceProject {
  id: string;
  code: string;
  projectName: string;
  clientName: string | null;
  status: string;
  /** Distinct materials requisitioned on it. */
  materialCount: number;
  requisitionCount: number;
}

export interface RequisitionParticipantSummary {
  userId: string;
  name: string;
  email: string;
  decision: RequisitionDecision | null;
}

/** A reviewer or approver, with their decision in the current round. */
export interface RequisitionParticipant {
  id: string;
  role: RequisitionParticipantRole;
  userId: string;
  userName: string;
  userEmail: string;
  sequence: number;
  decision: RequisitionDecision | null;
  decisionComments: string | null;
  decidedAt: string | null;
  /** A reviewer who changed the requisition this round. */
  editedInRound: boolean;
}

/** One step on the workflow timeline (mirrors WorkflowEventResponseDto). */
export interface WorkflowEvent {
  id: string;
  trackingId: string;
  entityType: string;
  entityId: string;
  entityReference: string | null;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  round: number | null;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  comments: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** What the signed-in user may do on the requisition right now (from the API). */
export interface RequisitionPermissions {
  canEdit: boolean;
  canSubmit: boolean;
  canReview: boolean;
  canApprove: boolean;
  /** Reviewers can still be changed (until reviewed) by this user. */
  canEditReviewers: boolean;
  /** Approvers can still be changed (until approved) by this user. */
  canEditApprovers: boolean;
  myRoles: RequisitionParticipantRole[];
}

/** An internal user who can be assigned as reviewer or approver. */
export interface RequisitionUserOption {
  id: string;
  name: string;
  email: string;
  position: string | null;
  role: string | null;
}

export interface MaterialRequisition extends MaterialRequisitionListItem {
  compliances: RequisitionComplianceResponse[];
  deviations: RequisitionDeviationResponse[];
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
  participants: RequisitionParticipant[];
  /** Every step taken on the requisition — all rounds — oldest first. */
  history: WorkflowEvent[];
  permissions: RequisitionPermissions | null;
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
  { value: MaterialRequisitionStatus.UNDER_REVIEW, label: 'Under Review', hint: 'Submitted, waiting for the reviewers' },
  { value: MaterialRequisitionStatus.REVIEWED, label: 'Reviewed', hint: 'Reviewed, waiting for the approvers' },
  { value: MaterialRequisitionStatus.APPROVED, label: 'Approved', hint: 'Approved' },
  { value: MaterialRequisitionStatus.RETURNED, label: 'Returned', hint: 'Sent back to the requester for changes' },
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
    value: RequisitionLineSource.PROJECT, label: 'OTHER PROJECTS', icon: 'folder_open',
    description: 'Materials requisitioned on another project', available: true,
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
  [RequisitionLineSource.PROJECT]: 'Other Project',
};

/**
 * Statuses whose content can still be edited (mirrors the API): reviewers edit
 * while Under Review, approvers while Reviewed; Approved is locked.
 */
export const EDITABLE_REQUISITION_STATUSES: readonly MaterialRequisitionStatus[] = [
  MaterialRequisitionStatus.DRAFT, MaterialRequisitionStatus.UNDER_REVIEW,
  MaterialRequisitionStatus.REVIEWED, MaterialRequisitionStatus.RETURNED,
];

/** Reviewers can be changed until the requisition is reviewed (mirrors the API). */
export const REVIEWER_EDITABLE_STATUSES: readonly MaterialRequisitionStatus[] = [
  MaterialRequisitionStatus.DRAFT, MaterialRequisitionStatus.RETURNED, MaterialRequisitionStatus.UNDER_REVIEW,
];

/** Approvers can be changed until the requisition is approved (mirrors the API). */
export const APPROVER_EDITABLE_STATUSES: readonly MaterialRequisitionStatus[] = [
  ...REVIEWER_EDITABLE_STATUSES, MaterialRequisitionStatus.REVIEWED,
];

/** Statuses from which a requisition is (re)submitted for review. */
export const SUBMITTABLE_REQUISITION_STATUSES: readonly MaterialRequisitionStatus[] = [
  MaterialRequisitionStatus.DRAFT, MaterialRequisitionStatus.RETURNED,
];

export interface DecisionOption {
  value: RequisitionDecision;
  label: string;
  hint: string;
  icon: string;
  /** Comments are mandatory for this decision. */
  needsComments: boolean;
  tone: 'positive' | 'neutral' | 'negative';
}

export const REVIEW_DECISION_OPTIONS: readonly DecisionOption[] = [
  {
    value: RequisitionDecision.REVIEWED, label: 'Reviewed', icon: 'task_alt', tone: 'positive', needsComments: false,
    hint: 'Ready for the approvers. Add anything they should know.',
  },
  {
    value: RequisitionDecision.RETURNED, label: 'Return for Clarification', icon: 'undo', tone: 'neutral', needsComments: true,
    hint: 'Back to the requester to change and resubmit. Say what needs changing.',
  },
  {
    value: RequisitionDecision.REJECTED, label: 'Reject', icon: 'block', tone: 'negative', needsComments: true,
    hint: 'Closes the requisition. Explain why.',
  },
  {
    value: RequisitionDecision.CANCELLED, label: 'Cancel', icon: 'cancel', tone: 'negative', needsComments: true,
    hint: 'Withdraws the requisition. Explain why.',
  },
];

export const APPROVAL_DECISION_OPTIONS: readonly DecisionOption[] = [
  {
    value: RequisitionDecision.APPROVED, label: 'Approve', icon: 'verified', tone: 'positive', needsComments: false,
    hint: 'Approves the requisition. Comments are optional.',
  },
  {
    value: RequisitionDecision.RETURNED, label: 'Return for Clarification', icon: 'undo', tone: 'neutral', needsComments: true,
    hint: 'Back to the requester to change and resubmit. Say what needs changing.',
  },
  {
    value: RequisitionDecision.REJECTED, label: 'Reject', icon: 'block', tone: 'negative', needsComments: true,
    hint: 'Closes the requisition. Explain why.',
  },
  {
    value: RequisitionDecision.CANCELLED, label: 'Cancel', icon: 'cancel', tone: 'negative', needsComments: true,
    hint: 'Withdraws the requisition. Explain why.',
  },
];

export const DECISION_LABELS: Record<RequisitionDecision, string> = {
  [RequisitionDecision.REVIEWED]: 'Reviewed',
  [RequisitionDecision.APPROVED]: 'Approved',
  [RequisitionDecision.RETURNED]: 'Returned for clarification',
  [RequisitionDecision.REJECTED]: 'Rejected',
  [RequisitionDecision.CANCELLED]: 'Cancelled',
};

/** Timeline wording for each workflow action. */
export const WORKFLOW_ACTION_LABELS: Record<string, string> = {
  CREATED: 'Created',
  UPDATED: 'Updated',
  SUBMITTED: 'Submitted for review',
  RESUBMITTED: 'Resubmitted for review',
  EDITED_IN_REVIEW: 'Edited during review',
  REVIEWED: 'Reviewed',
  REVIEW_COMPLETED: 'Review completed',
  APPROVED: 'Approved',
  APPROVAL_COMPLETED: 'Approval completed',
  RETURNED: 'Returned for clarification',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  STATUS_CHANGED: 'Status changed',
  LOCKED: 'Locked by purchase order',
};

export function isRequisitionEditable(status: MaterialRequisitionStatus | string | null | undefined): boolean {
  return EDITABLE_REQUISITION_STATUSES.includes(status as MaterialRequisitionStatus);
}

export function requisitionStatusLabel(status: string | null | undefined): string {
  return REQUISITION_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? (status ?? '—');
}
