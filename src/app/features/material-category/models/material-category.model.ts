/** Lightweight organization reference embedded in a Material Category record. */
export interface MaterialCategoryOrganization {
  id: string;
  name?: string;
  code?: string;
}

/**
 * Mirrors MaterialCategoryResponseDto exactly
 * (pm-api/src/modules/material-category/dto/material-category-response.dto.ts).
 */
export interface MaterialCategory {
  id: string;
  dguid: string;
  organizationId: string;
  organizationName?: string;
  organization?: MaterialCategoryOrganization;
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder: number;
  /** Platform-seeded categories: cannot be deleted, and the flag is not editable. */
  isSystem: boolean;
  isActive: boolean;
  remarks?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Slim shape returned by GET /material-categories/active — for dropdowns. */
export interface MaterialCategoryOption {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  displayOrder: number;
}

/**
 * Only these four are accepted by the backend's MaterialCategoryQueryDto.sortBy.
 * shortName / status / updatedAt are deliberately NOT sortable — the API would
 * reject them, so those columns are rendered without a sort header.
 */
export type MaterialCategorySortField = 'code' | 'name' | 'displayOrder' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface MaterialCategoryFilter {
  search: string;
  status: 'all' | 'active' | 'inactive';
  /** null = both system and user-defined categories. */
  isSystem: boolean | null;
}

export const DEFAULT_MATERIAL_CATEGORY_FILTER: MaterialCategoryFilter = {
  search: '',
  status: 'all',
  isSystem: null,
};

/**
 * Backend code rule, kept in sync with CreateMaterialCategoryDto's @Matches:
 * letters, digits and underscore only — no spaces, hyphens, dots or slashes.
 */
export const MATERIAL_CATEGORY_CODE_PATTERN = /^[A-Za-z0-9_]+$/;

/**
 * Downstream usage counts (Material Master, PRs, Inventory, …). The API does not
 * expose these yet, so the view dialog renders a "not yet available" state rather
 * than fabricating numbers. When a usage endpoint lands, populate this shape from
 * it — no UI changes will be required.
 */
export interface MaterialCategoryUsage {
  materialMaster: number;
  purchaseRequisitions: number;
  inventoryItems: number;
}
