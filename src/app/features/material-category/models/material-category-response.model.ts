import { MaterialCategory, MaterialCategoryOption } from './material-category.model';

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

/** Mirrors MaterialCategoryListResponseDto. */
export interface PagedMaterialCategories {
  items: MaterialCategory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type MaterialCategoryResponse = ApiEnvelope<MaterialCategory>;
export type PagedMaterialCategoryResponse = ApiEnvelope<PagedMaterialCategories>;
export type MaterialCategoryOptionsResponse = ApiEnvelope<MaterialCategoryOption[]>;
export type MaterialCategoryDeleteResponse = ApiEnvelope<null>;
