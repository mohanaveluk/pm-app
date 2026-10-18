import {
  MaterialRequisitionSortField, MaterialRequisitionStatus, RequisitionDecision, RequisitionDocumentType,
  RequisitionLineSource,
} from './material-requisition.model';

/**
 * Mirrors CreateMaterialRequisitionDto. There is no `code` (server-generated),
 * no client (read from the project) and no WBS details (read from the WBS).
 * Optional fields accept `null`, which on update clears the value.
 */
export interface RequisitionItemRequest {
  materialId: string;
  requestedQty: number;
  source?: RequisitionLineSource;
  sourceReference?: string | null;
}

export interface RequisitionDocumentRequest {
  documentType: RequisitionDocumentType;
  documentName: string;
  documentUrl: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
}

export interface CreateMaterialRequisitionRequest {
  projectId: string;
  wbsCostCodeId?: string | null;
  budgetHead?: string | null;
  /** YYYY-MM-DD */
  requiredOnSiteDate?: string | null;
  /** Leave out (or null) to use the generated code. */
  mrNumber?: string | null;
  mtoReference?: string | null;
  pidReference?: string | null;
  isometricReference?: string | null;
  areaUnit?: string | null;
  remarks?: string | null;
  /** The complete set of lines. */
  items?: RequisitionItemRequest[];
  /** The complete set of documents. */
  documents?: RequisitionDocumentRequest[];
  /** true saves and (re)submits — the requisition goes to Under Review. */
  submit?: boolean;
  /** Internal users who review it, in order — the complete set. */
  reviewerIds?: string[];
  /** Internal users who approve it once reviewed — the complete set. */
  approverIds?: string[];
}

/** PUT /material-requisitions/:id/participants — each list, when given, is the complete set. */
export interface UpdateRequisitionParticipantsRequest {
  reviewerIds?: string[];
  approverIds?: string[];
}

/** POST /material-requisitions/:id/review and /:id/approval. */
export interface RequisitionDecisionRequest {
  decision: RequisitionDecision;
  comments?: string;
}

/** GET /material-requisitions/my-reviews and /my-approvals. */
export interface AssignedRequisitionQueryParams {
  page: number;
  limit: number;
  search?: string;
  /** Default true: only those still waiting for my decision. */
  pendingOnly?: boolean;
  status?: MaterialRequisitionStatus;
}

export type UpdateMaterialRequisitionRequest = Partial<CreateMaterialRequisitionRequest>;

/** Mirrors MaterialRequisitionQueryDto — note `limit`/`sortOrder`. */
export interface MaterialRequisitionQueryParams {
  page: number;
  limit: number;
  sortBy: MaterialRequisitionSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  status?: MaterialRequisitionStatus;
  projectId?: string;
}

/** Mirrors RequisitionMaterialQueryDto. */
export interface RequisitionMaterialQueryParams {
  page: number;
  limit: number;
  search?: string;
  materialCategoryId?: string;
  materialGroupId?: string;
  unitOfMeasurementId?: string;
}
