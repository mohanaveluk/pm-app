import { ProjectOption } from '../../project/models/project.model';

/** Lightweight discipline reference embedded in a WBS record. */
export interface WbsCostCodeDiscipline {
  id: string;
  name?: string;
  code?: string;
}

/**
 * WBS master — one entry of a project's work breakdown / cost-code
 * structure. Mirrors WbsCostCodeResponseDto exactly
 * (pm-api/src/modules/wbs-cost-code/dto/wbs-cost-code-response.dto.ts).
 *
 * Organization-scoped: every org administers its own list.
 */
export interface WbsCostCode {
  id: string;
  dguid: string;
  organizationId: string;
  /** Server-generated per-organization sequence (e.g. "0001") — never client-set. */
  code: string;
  /** The WBS. */
  projectDetails: string;
  /** The project this entry belongs to; its number, name and client are read from it. */
  projectId?: string | null;
  projectCode?: string | null;
  projectName?: string | null;
  clientId?: string | null;
  clientCode?: string | null;
  clientName?: string | null;
  areaFacility?: string | null;
  systemSubsystem?: string | null;
  disciplineId?: string | null;
  disciplineName?: string | null;
  /** The discipline's department. */
  departmentName?: string | null;
  discipline?: WbsCostCodeDiscipline | null;
  workPackage?: string | null;
  /** Activities (schedule level). */
  activities?: string | null;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * An entry of the discipline dropdown — GET /disciplines/active
 * (DisciplineController.findActive), the organization's active disciplines.
 */
export interface DisciplineOption {
  id: string;
  code: string;
  name: string;
  /** The one department the discipline belongs to. */
  department?: { id: string; name?: string; code?: string } | null;
}

export type { ProjectOption };

/**
 * Only these are accepted by the backend's WbsCostCodeQueryDto.sortBy
 * (pm-api WbsCostCodeService's SORT_COLUMNS). Any other column is rendered
 * without a sort header.
 */
export type WbsCostCodeSortField =
  | 'code' | 'projectDetails' | 'areaFacility' | 'systemSubsystem'
  | 'discipline' | 'project' | 'workPackage' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface WbsCostCodeFilter {
  search: string;
  status: 'all' | 'active' | 'inactive';
  /** Discipline id, or null for "all disciplines". */
  disciplineId: string | null;
}

export const DEFAULT_WBS_COST_CODE_FILTER: WbsCostCodeFilter = {
  search: '',
  status: 'all',
  disciplineId: null,
};
