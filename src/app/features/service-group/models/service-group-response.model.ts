import { PermissionMatrix, ServiceGroup, ServiceGroupListItem } from './service-group.model';

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

export type ServiceGroupResponse = ApiEnvelope<ServiceGroup>;
export type PagedServiceGroupResponse = ApiEnvelope<PagedResult<ServiceGroupListItem>>;
export type PermissionMatrixResponse = ApiEnvelope<PermissionMatrix>;
