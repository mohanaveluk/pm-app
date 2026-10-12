import {
  MaterialRequisitionSortField, MaterialRequisitionStatus, RequisitionDocumentType,
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
  /** true saves and submits — the requisition goes to Under Review. */
  submit?: boolean;
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
