import { ProjectTypeSortField } from './project-type.model';

/**
 * Mirrors CreateProjectTypeDto. `code` is deliberately absent — it is
 * server-generated as a per-organization sequence starting at 0001
 * (project-type.controller.ts: "Supplying it has no effect").
 */
export interface CreateProjectTypeRequest {
  name: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  remarks?: string;
}

/** Mirrors UpdateProjectTypeDto = PartialType(CreateProjectTypeDto). Code stays immutable. */
export type UpdateProjectTypeRequest = Partial<CreateProjectTypeRequest>;

/** Mirrors ProjectTypeQueryDto — note `limit`/`sortOrder`, not pageSize/sortDirection. */
export interface ProjectTypeQueryParams {
  page: number;
  limit: number;
  sortBy: ProjectTypeSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  isActive?: boolean;
}
