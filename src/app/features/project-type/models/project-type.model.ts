/** Lightweight organization reference embedded in a Project Type record. */
export interface ProjectTypeOrganization {
  id: string;
  name?: string;
  code?: string;
}

/**
 * Project Type master — the administrable classification of what kind of project it is
 * (construction, maintenance, turnaround, fabrication, …).
 * Mirrors ProjectTypeResponseDto exactly
 * (pm-api/src/modules/project-type/dto/project-type-response.dto.ts).
 *
 * Organization-scoped: every org administers its own list, seeded with these
 * same five defaults on setup for continuity with the old fixed enum.
 */
export interface ProjectType {
  id: string;
  dguid: string;
  organizationId: string;
  organizationName?: string;
  organization?: ProjectTypeOrganization;
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
 * Only these four are accepted by the backend's ProjectTypeQueryDto.sortBy
 * (pm-api ProjectTypeService's ALLOWED_SORT_FIELDS). Any other column is
 * rendered without a sort header.
 */
export type ProjectTypeSortField = 'code' | 'name' | 'displayOrder' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ProjectTypeFilter {
  search: string;
  status: 'all' | 'active' | 'inactive';
}

export const DEFAULT_PROJECT_TYPE_FILTER: ProjectTypeFilter = {
  search: '',
  status: 'all',
};
