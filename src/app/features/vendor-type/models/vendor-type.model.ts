/** Lightweight organization reference embedded in a Vendor Type record. */
export interface VendorTypeOrganization {
  id: string;
  name?: string;
  code?: string;
}

/**
 * Vendor Type master — the administrable classification of what a vendor IS
 * (manufacturer, supplier, contractor, consultant, service provider, …).
 * Mirrors VendorTypeResponseDto exactly
 * (pm-api/src/modules/vendor-type/dto/vendor-type-response.dto.ts).
 *
 * Organization-scoped: every org administers its own list, seeded with these
 * same five defaults on setup for continuity with the old fixed enum.
 */
export interface VendorType {
  id: string;
  dguid: string;
  organizationId: string;
  organizationName?: string;
  organization?: VendorTypeOrganization;
  /** Server-generated per-organization sequence (e.g. "0001") — never client-set. */
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  remarks?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Only these four are accepted by the backend's VendorTypeQueryDto.sortBy
 * (pm-api VendorTypeService's ALLOWED_SORT_FIELDS). Any other column is
 * rendered without a sort header.
 */
export type VendorTypeSortField = 'code' | 'name' | 'displayOrder' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface VendorTypeFilter {
  search: string;
  status: 'all' | 'active' | 'inactive';
}

export const DEFAULT_VENDOR_TYPE_FILTER: VendorTypeFilter = {
  search: '',
  status: 'all',
};
