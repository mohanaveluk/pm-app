import { MaterialCategorySortField } from './material-category.model';

/**
 * Mirrors CreateMaterialCategoryDto. `organizationId` is deliberately absent —
 * the backend resolves it from the authenticated user's token
 * (material-category.controller.ts: `req.user.organizationId`).
 */
export interface CreateMaterialCategoryRequest {
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  remarks?: string;
}

/**
 * Mirrors UpdateMaterialCategoryDto = PartialType(OmitType(Create, ['code', 'isSystem'])).
 * `code` and `isSystem` are immutable after creation and are rejected by the API,
 * so they are structurally excluded here rather than merely ignored.
 */
export interface UpdateMaterialCategoryRequest {
  name?: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  remarks?: string;
}

/** Mirrors MaterialCategoryQueryDto — note `limit`/`sortOrder`, not pageSize/sortDirection. */
export interface MaterialCategoryQueryParams {
  page: number;
  limit: number;
  sortBy: MaterialCategorySortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  isActive?: boolean;
  isSystem?: boolean;
}
