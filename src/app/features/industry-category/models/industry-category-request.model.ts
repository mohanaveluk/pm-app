import { IndustryCategorySortField } from './industry-category.model';

/**
 * Mirrors CreateIndustryCategoryDto. `organizationId` is deliberately absent —
 * the backend resolves it from the authenticated user's token
 * (industry-category.controller.ts: `req.user.organizationId`).
 */
export interface CreateIndustryCategoryRequest {
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  remarks?: string;
}

/**
 * Mirrors UpdateIndustryCategoryDto = PartialType(OmitType(Create, ['code', 'isSystem'])).
 * `code` and `isSystem` are immutable after creation and are rejected by the API,
 * so they are structurally excluded here rather than merely ignored.
 */
export interface UpdateIndustryCategoryRequest {
  name?: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  remarks?: string;
}

/** Mirrors IndustryCategoryQueryDto — note `limit`/`sortOrder`, not pageSize/sortDirection. */
export interface IndustryCategoryQueryParams {
  page: number;
  limit: number;
  sortBy: IndustryCategorySortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  isActive?: boolean;
  isSystem?: boolean;
}
