import { IndustryCategory, IndustryCategoryOption } from './industry-category.model';

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

/** Mirrors IndustryCategoryListResponseDto. */
export interface PagedIndustryCategories {
  items: IndustryCategory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type IndustryCategoryResponse = ApiEnvelope<IndustryCategory>;
export type PagedIndustryCategoryResponse = ApiEnvelope<PagedIndustryCategories>;
export type IndustryCategoryOptionsResponse = ApiEnvelope<IndustryCategoryOption[]>;
export type IndustryCategoryDeleteResponse = ApiEnvelope<null>;
