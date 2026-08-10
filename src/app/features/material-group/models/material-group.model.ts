/** Lightweight organization reference embedded in a Material Group record. */
export interface MaterialGroupOrganization {
  id: string;
  name?: string;
  code?: string;
}

/**
 * Mirrors MaterialGroupResponseDto exactly
 * (pm-api/src/modules/material-group/dto/material-group-response.dto.ts).
 *
 * Material Group is the second level of the classification hierarchy:
 *   Material Category → Material Group → Material Subcategory → Material Master
 */
export interface MaterialGroup {
  id: string;
  dguid: string;
  organizationId: string;
  organizationName?: string;
  organization?: MaterialGroupOrganization;
  /** Mandatory parent. Immutable after creation (FK is ON DELETE RESTRICT). */
  materialCategoryId: string;
  materialCategoryCode: string;
  materialCategoryName: string;
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder: number;
  /** Platform-seeded groups: cannot be deleted, and the flag is not editable. */
  isSystem: boolean;
  isActive: boolean;
  remarks?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Slim shape returned by GET /material-groups/active — for cascading dropdowns. */
export interface MaterialGroupOption {
  id: string;
  materialCategoryId: string;
  materialCategoryCode: string;
  code: string;
  name: string;
  shortName?: string;
  displayOrder: number;
}

/**
 * Only these four are accepted by the backend's MaterialGroupQueryDto.sortBy.
 * shortName / category / status / updatedAt are deliberately NOT sortable — the
 * API would reject them, so those columns render without a sort header.
 */
export type MaterialGroupSortField = 'code' | 'name' | 'displayOrder' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface MaterialGroupFilter {
  search: string;
  /** null = all parent categories. */
  materialCategoryId: string | null;
  status: 'all' | 'active' | 'inactive';
  /** null = both system and user-defined groups. */
  isSystem: boolean | null;
}

export const DEFAULT_MATERIAL_GROUP_FILTER: MaterialGroupFilter = {
  search: '',
  materialCategoryId: null,
  status: 'all',
  isSystem: null,
};

/**
 * Backend code rule, kept in sync with CreateMaterialGroupDto's @Matches:
 * letters, digits and underscore only. Note the uniqueness scope differs from
 * Material Category — a group code must be unique within (organization, category),
 * so the same code may legitimately exist under two different categories.
 */
export const MATERIAL_GROUP_CODE_PATTERN = /^[A-Za-z0-9_]+$/;

/**
 * Downstream usage counts (Material Subcategory, Material Master, PRs, Inventory).
 * The API exposes no usage endpoint yet, so the view dialog renders a
 * "not yet available" state rather than fabricating numbers.
 */
export interface MaterialGroupUsage {
  materialSubcategories: number;
  materialMaster: number;
  purchaseRequisitions: number;
  inventoryItems: number;
}
