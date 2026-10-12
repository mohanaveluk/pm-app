import {
  BomColumns, BomPreview, MaterialRequisition, MaterialRequisitionListItem, RequisitionCandidate,
} from './material-requisition.model';

/**
 * Every pm-api endpoint wraps its payload in ResponseDto
 * (pm-api/src/common/dto/response.dto.ts).
 */
export interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type MaterialRequisitionResponse = ApiEnvelope<MaterialRequisition>;
export type PagedMaterialRequisitionResponse = ApiEnvelope<Paged<MaterialRequisitionListItem>>;
export type CandidateListResponse = ApiEnvelope<Paged<RequisitionCandidate>>;
export type CandidatesResponse = ApiEnvelope<RequisitionCandidate[]>;
export type BomColumnsResponse = ApiEnvelope<BomColumns>;
export type BomPreviewResponse = ApiEnvelope<BomPreview>;
export type DeleteResponse = ApiEnvelope<null>;

/** POST /material-requisitions/documents/upload (not wrapped in ResponseDto). */
export interface DocumentUploadResponse {
  message: string;
  url: string;
}
