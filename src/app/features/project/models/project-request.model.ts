import { MeasurementSystem, ProjectSortField, ProjectStatus } from './project.model';

/**
 * Mirrors CreateProjectDto. There is deliberately no `code` (the server
 * generates the project number) and no client name (the client is referenced
 * by `clientId` and its name is read through that relationship).
 *
 * Optional fields accept `null`: on update that is how a value is cleared
 * (omitting a key means "leave unchanged").
 */
export interface CreateProjectRequest {
  projectName: string;
  clientId: string;
  projectTypeId: string;
  status?: ProjectStatus;
  description?: string | null;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD; must not precede the start date. */
  endDate?: string | null;
  projectManagerId?: string | null;
  siteLocation?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  contractNumber?: string | null;
  clientProjectReference?: string | null;
  currencyCode?: string | null;
  measurementSystem?: MeasurementSystem | null;
  timeZone?: string | null;
}

/** Mirrors UpdateProjectDto: any subset, never the status. */
export type UpdateProjectRequest = Partial<Omit<CreateProjectRequest, 'status'>>;

/** Mirrors UpdateProjectStatusDto. */
export interface UpdateProjectStatusRequest {
  status: ProjectStatus;
  reason?: string;
}

/** Mirrors ProjectQueryDto — note `limit`/`sortOrder`, not pageSize/sortDirection. */
export interface ProjectQueryParams {
  page: number;
  limit: number;
  sortBy: ProjectSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  status?: ProjectStatus;
  clientId?: string;
  projectTypeId?: string;
  projectManagerId?: string;
  countryCode?: string;
}
