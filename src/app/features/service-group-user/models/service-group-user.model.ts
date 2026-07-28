/** Mirrors the backend AssignmentType enum (service-group-user/enums/assignment-type.enum.ts). */
export enum AssignmentType {
  MANUAL = 'MANUAL',
  AD_SYNC = 'AD_SYNC',
  API = 'API',
}

/** A single Service Group ↔ User assignment (flat row as returned by the API). */
export interface ServiceGroupUserAssignment {
  id: string;
  dguid: string;
  organizationId: string;
  serviceGroupId: string;
  serviceGroupCode: string;
  serviceGroupName: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userPosition?: string;
  assignmentType: AssignmentType;
  effectiveFrom?: string;
  effectiveTo?: string;
  isPrimary: boolean;
  isActive: boolean;
  remarks?: string;
  disabledAt?: string;
  disabledBy?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

/** GET /service-group-users/service-group/:id member row. */
export interface ServiceGroupMember {
  assignmentId: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userPosition?: string;
  assignmentType: AssignmentType;
  isPrimary: boolean;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
}

/** GET /service-group-users/user/:id — the service groups a given user belongs to. */
export interface UserServiceGroup {
  assignmentId: string;
  serviceGroupId: string;
  serviceGroupCode: string;
  serviceGroupName: string;
  serviceGroupDescription?: string;
  groupType: string;
  assignmentType: AssignmentType;
  isPrimary: boolean;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  activityCount: number;
  createdAt: string;
}

/** Reference option for the Service Group picker (from GET /service-groups). */
export interface ServiceGroupOption {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  activityCount: number;
}

/** User picker option / profile-preview shape, adapted from the real
 * `GET /User/organization/:organizationId` response (snake_case entity fields
 * mapped to camelCase here). The backend User entity has no employeeId,
 * department, or discipline columns, so the profile preview only surfaces
 * fields that genuinely exist. */
export interface AvailableUserOption {
  id: string;
  fullName: string;
  email: string;
  mobile?: string;
  position?: string;
  profileImage?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  roleName?: string;
  createdAt?: string;
}

/** Client-side aggregation: one Service Group row with all of its assigned users.
 * No grouped-list endpoint exists server-side, so this is built by combining the
 * Service Group list with the flat assignment list — see the store for details. */
export interface ServiceGroupMembershipGroup {
  serviceGroupId: string;
  serviceGroupCode: string;
  serviceGroupName: string;
  serviceGroupDescription?: string;
  activityCount: number;
  isServiceGroupActive: boolean;
  members: ServiceGroupUserAssignment[];
  createdAt: string;
  updatedAt?: string;
}

export type ServiceGroupUserSortField = 'serviceGroupName' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface ServiceGroupUserFilter {
  search: string;
  serviceGroupId: string | null;
  assignmentType: AssignmentType | null;
  status: 'all' | 'active' | 'inactive';
  primaryOnly: boolean;
  /** ISO date strings (yyyy-MM-dd) — matched against each member's own createdAt.
   * Department/Role filters are intentionally omitted: the real API's query DTO
   * has no such fields and this module doesn't join against department/role data. */
  createdFrom: string | null;
  createdTo: string | null;
}

export const DEFAULT_SERVICE_GROUP_USER_FILTER: ServiceGroupUserFilter = {
  search: '',
  serviceGroupId: null,
  assignmentType: null,
  status: 'all',
  primaryOnly: false,
  createdFrom: null,
  createdTo: null,
};
