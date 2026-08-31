import { Material, MaterialDocument, MaterialListItem, MaterialOption } from './material.model';

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

/**
 * Mirrors MaterialListResponseDto. Note the array key is `data`, **not** `items` —
 * this differs from Material Category / Group / UOM, so the full envelope path to
 * the rows is `response.data.data`.
 */
export interface PagedMaterials {
  data: MaterialListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type MaterialResponse = ApiEnvelope<Material>;
export type PagedMaterialResponse = ApiEnvelope<PagedMaterials>;
export type MaterialOptionsResponse = ApiEnvelope<MaterialOption[]>;
export type MaterialDeleteResponse = ApiEnvelope<null>;

/** GET /materials/:id/documents */
export type MaterialDocumentsResponse = ApiEnvelope<MaterialDocument[]>;
/** POST /materials/:id/documents */
export type MaterialDocumentResponse = ApiEnvelope<MaterialDocument>;
/** DELETE /materials/:id/documents/:documentId */
export type MaterialDocumentDeleteResponse = ApiEnvelope<null>;
