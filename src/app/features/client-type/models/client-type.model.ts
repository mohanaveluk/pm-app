/** Lightweight organization reference embedded in a Client Type record. */
export interface ClientTypeOrganization {
  id: string;
  name?: string;
  code?: string;
}

/**
 * Client Type master — the administrable classification of what kind of organization a client is
 * (owner, operator, EPC contractor, consultant, government, …).
 * Mirrors ClientTypeResponseDto exactly
 * (pm-api/src/modules/client-type/dto/client-type-response.dto.ts).
 *
 * Organization-scoped: every org administers its own list, seeded with these
 * same five defaults on setup for continuity with the old fixed enum.
 */
export interface ClientType {
  id: string;
  dguid: string;
  organizationId: string;
  organizationName?: string;
  organization?: ClientTypeOrganization;
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
 * Only these four are accepted by the backend's ClientTypeQueryDto.sortBy
 * (pm-api ClientTypeService's ALLOWED_SORT_FIELDS). Any other column is
 * rendered without a sort header.
 */
export type ClientTypeSortField = 'code' | 'name' | 'displayOrder' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ClientTypeFilter {
  search: string;
  status: 'all' | 'active' | 'inactive';
}

export const DEFAULT_CLIENT_TYPE_FILTER: ClientTypeFilter = {
  search: '',
  status: 'all',
};
