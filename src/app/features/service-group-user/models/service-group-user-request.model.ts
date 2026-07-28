import { AssignmentType } from './service-group-user.model';

export interface AssignUserItem {
  userId: string;
  isPrimary?: boolean;
  assignmentType?: AssignmentType;
  effectiveFrom?: string;
  effectiveTo?: string;
  remarks?: string;
}

/** POST /service-group-users — additive batch-assign; duplicates are silently skipped server-side. */
export interface CreateServiceGroupUserRequest {
  serviceGroupId: string;
  users: AssignUserItem[];
}

/** PUT /service-group-users/service-group/:id/sync — full membership replacement. */
export interface SyncServiceGroupUsersRequest {
  users: AssignUserItem[];
}

export interface BulkAssignmentIdsRequest {
  assignmentIds: string[];
}

export interface ServiceGroupUserQueryParams {
  page: number;
  limit: number;
  /** Backend only accepts these three fields (service-group-user-query.dto.ts) — the grid's own
   * group-level sort ("Service Group" name, etc.) is applied client-side over the fetched batch. */
  sortBy: 'createdAt' | 'isPrimary' | 'assignmentType';
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  serviceGroupId?: string;
  userId?: string;
  assignmentType?: AssignmentType;
  isActive?: boolean;
  isPrimary?: boolean;
  createdFrom?: string;
  createdTo?: string;
}
