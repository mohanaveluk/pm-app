import { WbsCostCodeSortField } from './wbs-cost-code.model';

/**
 * Mirrors CreateWbsCostCodeDto. `code` is deliberately absent — it is
 * server-generated as a per-organization sequence starting at 0001.
 *
 * Optional fields accept `null`: on update it is how a value is cleared
 * (omitting a key means "leave unchanged").
 */
export interface CreateWbsCostCodeRequest {
  /** The WBS / cost name. */
  projectDetails: string;
  /** The project this entry belongs to (an open project). */
  projectId: string;
  areaFacility?: string | null;
  systemSubsystem?: string | null;
  disciplineId?: string | null;
  workPackage?: string | null;
  activities?: string | null;
  isActive?: boolean;
}

/** Mirrors UpdateWbsCostCodeDto = PartialType(CreateWbsCostCodeDto). Code stays immutable. */
export type UpdateWbsCostCodeRequest = Partial<CreateWbsCostCodeRequest>;

/** Mirrors WbsCostCodeQueryDto — note `limit`/`sortOrder`, not pageSize/sortDirection. */
export interface WbsCostCodeQueryParams {
  page: number;
  limit: number;
  sortBy: WbsCostCodeSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  isActive?: boolean;
  disciplineId?: string;
}
