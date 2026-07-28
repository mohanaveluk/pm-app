/** Mirrors the backend PermissionType enum (service-group/enums/permission-type.enum.ts). */
export enum PermissionType {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  MODIFY = 'MODIFY',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  PRINT = 'PRINT',
  SHARE = 'SHARE',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',
  EXECUTE = 'EXECUTE',
  CONFIGURE = 'CONFIGURE',
  ASSIGN = 'ASSIGN',
  PUBLISH = 'PUBLISH',
}

/** The 5 permissions surfaced first in pickers; the rest remain selectable but secondary. */
export const CORE_PERMISSIONS: PermissionType[] = [
  PermissionType.VIEW,
  PermissionType.CREATE,
  PermissionType.MODIFY,
  PermissionType.DELETE,
  PermissionType.APPROVE,
];

export const ALL_PERMISSIONS: PermissionType[] = Object.values(PermissionType);

export type GroupType = 'SYSTEM' | 'CUSTOM';

export interface ServiceGroupPermission {
  id: string;
  permissionType: PermissionType;
  isAllowed: boolean;
}

export interface ServiceGroupActivity {
  id: string;
  activityId: string;
  activityCode: string;
  activityName: string;
  activityShortName?: string;
  moduleGroup?: string;
  icon?: string;
  routeUrl?: string;
  featureKey?: string;
  displayOrder: number;
  isActive: boolean;
  permissions: ServiceGroupPermission[];
}

/** Full detail shape — returned by GET /:id, create, update, clone, copy. */
export interface ServiceGroup {
  id: string;
  dguid: string;
  organizationId: string;
  code: string;
  name: string;
  description?: string;
  groupType: GroupType;
  isSystem: boolean;
  isDefault: boolean;
  isActive: boolean;
  remarks?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
  activities: ServiceGroupActivity[];
}

/** Paginated list row — activities are NOT included here (performance), only a count.
 * The grid lazy-loads full activity/permission detail per row on expand. */
export interface ServiceGroupListItem {
  id: string;
  dguid: string;
  organizationId: string;
  code: string;
  name: string;
  description?: string;
  groupType: GroupType;
  isSystem: boolean;
  isDefault: boolean;
  isActive: boolean;
  remarks?: string;
  activityCount: number;
  createdAt: string;
  updatedAt?: string;
}

/** GET /service-groups/activities item — the org's available Activities for assignment. */
export interface AvailableActivityOption {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  moduleGroup?: string;
  icon?: string;
  displayOrder: number;
}

export interface PermissionMatrixRow {
  activityId: string;
  activityCode: string;
  activityName: string;
  moduleGroup?: string;
  permissions: Record<PermissionType, boolean>;
}

export interface PermissionMatrix {
  serviceGroupId: string;
  serviceGroupName: string;
  columns: PermissionType[];
  rows: PermissionMatrixRow[];
}

export type ServiceGroupSortField = 'name' | 'code' | 'createdAt' | 'groupType';
export type SortDirection = 'asc' | 'desc';

export interface ServiceGroupFilter {
  search: string;
  groupType: GroupType | null;
  status: 'all' | 'active' | 'inactive';
}

export const DEFAULT_SERVICE_GROUP_FILTER: ServiceGroupFilter = {
  search: '',
  groupType: null,
  status: 'all',
};
