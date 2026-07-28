import { GroupType, PermissionType, ServiceGroupSortField } from './service-group.model';

export interface ActivityPermissionInput {
  activityId: string;
  permissions: PermissionType[];
  displayOrder?: number;
}

export interface CreateServiceGroupRequest {
  code: string;
  name: string;
  description?: string;
  remarks?: string;
  isDefault?: boolean;
  isActive?: boolean;
  activities?: ActivityPermissionInput[];
}

/** code and name are permanently immutable — never send them here. */
export interface UpdateServiceGroupRequest {
  description?: string;
  remarks?: string;
  isDefault?: boolean;
  isActive?: boolean;
  activities?: ActivityPermissionInput[];
}

export interface CloneServiceGroupRequest {
  code: string;
  name: string;
  description?: string;
}

export interface CopyPermissionsRequest {
  sourceServiceGroupId: string;
}

export interface ServiceGroupQueryParams {
  page: number;
  limit: number;
  sortBy: ServiceGroupSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  groupType?: GroupType;
  isActive?: boolean;
}
