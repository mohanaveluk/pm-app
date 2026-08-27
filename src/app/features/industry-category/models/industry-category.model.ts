/** Lightweight organization reference embedded in a Industry Category record. */
export interface IndustryCategoryOrganization {
  id: string;
  name?: string;
  code?: string;
}

/**
 * Mirrors IndustryCategoryResponseDto exactly
 * (pm-api/src/modules/industry-category/dto/industry-category-response.dto.ts).
 */
export interface IndustryCategory {
  id: string;
  dguid: string;
  organizationId: string;
  organizationName?: string;
  organization?: IndustryCategoryOrganization;
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

/** Slim shape returned by GET /industry-categories/active — for dropdowns. */
export interface IndustryCategoryOption {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  displayOrder: number;
}

/**
 * Only these four are accepted by the backend's IndustryCategoryQueryDto.sortBy.
 * shortName / status / updatedAt are deliberately NOT sortable — the API would
 * reject them, so those columns are rendered without a sort header.
 */
export type IndustryCategorySortField = 'code' | 'name' | 'displayOrder' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface IndustryCategoryFilter {
  search: string;
  status: 'all' | 'active' | 'inactive';
  /** null = both system and user-defined categories. */
  isSystem: boolean | null;
}

export const DEFAULT_INDUSTRY_CATEGORY_FILTER: IndustryCategoryFilter = {
  search: '',
  status: 'all',
  isSystem: null,
};

/**
 * Backend code rule, kept in sync with CreateIndustryCategoryDto's @Matches:
 * letters, digits and underscore only — no spaces, hyphens, dots or slashes.
 */
export const INDUSTRY_CATEGORY_CODE_PATTERN = /^[A-Za-z0-9_]+$/;

/**
 * Downstream usage counts — the same modules the API checks before allowing a
 * disable or delete (Project, Department, Discipline, Activity, Supplier). No
 * endpoint exposes these counts yet, so the view dialog renders a "not yet
 * available" state rather than fabricating numbers. When a usage endpoint lands,
 * populate this shape from it — no UI changes will be required.
 */
export interface IndustryCategoryUsage {
  projects: number;
  departments: number;
  disciplines: number;
  activities: number;
  suppliers: number;
}
