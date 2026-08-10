import { MaterialGroup, MaterialGroupOption } from './material-group.model';

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

/** Mirrors MaterialGroupListResponseDto. */
export interface PagedMaterialGroups {
  items: MaterialGroup[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type MaterialGroupResponse = ApiEnvelope<MaterialGroup>;
export type PagedMaterialGroupResponse = ApiEnvelope<PagedMaterialGroups>;
export type MaterialGroupOptionsResponse = ApiEnvelope<MaterialGroupOption[]>;
export type MaterialGroupDeleteResponse = ApiEnvelope<null>;
