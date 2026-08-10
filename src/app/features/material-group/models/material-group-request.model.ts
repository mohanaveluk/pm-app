import { MaterialGroupSortField } from './material-group.model';

/**
 * Mirrors CreateMaterialGroupDto. `organizationId` is deliberately absent —
 * the backend resolves it from the authenticated user's token
 * (material-group.controller.ts: `req.user.organizationId`).
 */
export interface CreateMaterialGroupRequest {
  /** Required; the parent category must exist and be active or the API returns 400/404. */
  materialCategoryId: string;
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  remarks?: string;
}

/**
 * Mirrors UpdateMaterialGroupDto =
 * PartialType(OmitType(Create, ['code', 'materialCategoryId', 'isSystem'])).
 * All three are immutable after creation and are rejected by the API, so they
 * are structurally excluded here rather than merely ignored.
 */
export interface UpdateMaterialGroupRequest {
  name?: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  remarks?: string;
}

/** Mirrors MaterialGroupQueryDto — note `limit`/`sortOrder`, not pageSize/sortDirection. */
export interface MaterialGroupQueryParams {
  page: number;
  limit: number;
  sortBy: MaterialGroupSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  materialCategoryId?: string;
  isActive?: boolean;
  isSystem?: boolean;
}
