import { ServiceGroupMember, ServiceGroupUserAssignment, UserServiceGroup } from './service-group-user.model';

export interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateAssignmentResult {
  created: ServiceGroupUserAssignment[];
  skipped: number;
  skippedIds: string[];
}

export interface SyncResult {
  added: number;
  removed: number;
  reEnabled: number;
  unchanged: number;
  assignments: ServiceGroupUserAssignment[];
}

export interface BulkOperationResult {
  succeeded: number;
  failed: number;
  failedIds: string[];
}

export interface ServiceGroupMembersResult {
  serviceGroup: { id: string; name: string; code: string; isActive: boolean };
  members: ServiceGroupMember[];
}

export interface UserServiceGroupsResult {
  user: { id: string; first_name: string; last_name?: string; email: string; position?: string };
  serviceGroups: UserServiceGroup[];
}

export type ServiceGroupUserResponse = ApiEnvelope<ServiceGroupUserAssignment>;
export type PagedServiceGroupUserResponse = ApiEnvelope<PagedResult<ServiceGroupUserAssignment>>;
export type CreateAssignmentResponse = ApiEnvelope<CreateAssignmentResult>;
export type SyncResponse = ApiEnvelope<SyncResult>;
export type BulkOperationResponse = ApiEnvelope<BulkOperationResult>;
export type ServiceGroupMembersResponse = ApiEnvelope<ServiceGroupMembersResult>;
export type UserServiceGroupsResponse = ApiEnvelope<UserServiceGroupsResult>;
