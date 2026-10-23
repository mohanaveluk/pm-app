import { MappingSortField, MappingStatus, UserProjectMapping } from './user-project-mapping.model';

/** POST /user-project-mappings — assigns a project that has no mapping yet. */
export interface CreateUserProjectMappingRequest {
  projectId: string;
  userIds: string[];
}

/** PUT /user-project-mappings/:projectId — the project's complete user list. */
export interface UpdateUserProjectMappingRequest {
  userIds: string[];
}

export interface UserProjectMappingQueryParams {
  page: number;
  limit: number;
  sortBy: MappingSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  projectId?: string;
  clientId?: string;
  userId?: string;
  status?: MappingStatus;
}

export interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PagedUserProjectMappings {
  items: UserProjectMapping[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
