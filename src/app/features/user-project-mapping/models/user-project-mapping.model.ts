/** ACTIVE when at least one user of the project is active. */
export type MappingStatus = 'ACTIVE' | 'INACTIVE';

/** One user assigned to a project. */
export interface MappedUser {
  mappingId: string;
  userId: string;
  name: string;
  email: string;
  position: string | null;
  status: MappingStatus;
  /** False when the user account was deactivated after being assigned. */
  userActive: boolean;
  assignedBy: string | null;
  assignedAt: string | null;
}

/** A project with every internal user assigned to it — one row of the list. */
export interface UserProjectMapping {
  projectId: string;
  projectCode: string;
  projectName: string;
  projectStatus: string;
  clientId: string;
  clientCode: string | null;
  clientName: string | null;
  status: MappingStatus;
  userCount: number;
  activeUserCount: number;
  users: MappedUser[];
  trackingId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}

/** One step of a project's assignment history (workflow_events). */
export interface MappingHistoryEvent {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorName: string | null;
  actorEmail: string | null;
  comments: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface UserProjectMappingDetail extends UserProjectMapping {
  history: MappingHistoryEvent[];
}

/** An active internal user who can be given projects. */
export interface EligibleUser {
  id: string;
  name: string;
  email: string;
  position: string | null;
  role: string | null;
}

export type MappingSortField = 'projectCode' | 'projectName' | 'clientName' | 'userCount' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface MappingFilter {
  search: string;
  projectId: string | null;
  clientId: string | null;
  userId: string | null;
  status: 'all' | MappingStatus;
}

export const DEFAULT_MAPPING_FILTER: MappingFilter = {
  search: '',
  projectId: null,
  clientId: null,
  userId: null,
  status: 'all',
};

export const MAPPING_STATUS_LABELS: Record<MappingStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

/** What each history step means to an administrator. */
export const HISTORY_ACTION_LABELS: Record<string, string> = {
  ASSIGNED: 'Users assigned',
  UNASSIGNED: 'Users removed',
  STATUS_CHANGED: 'Status changed',
  DELETED: 'Mapping deleted',
};

/** "Arjun Rao" → "AR", "maya@x.com" → "MA". */
export function initialsOf(name: string): string {
  const parts = String(name ?? '').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

/** Case-insensitive "contains" over any of the given fields. */
export function matchesTerm(term: string, ...fields: Array<string | null | undefined>): boolean {
  const t = term.trim().toLowerCase();
  return !t || fields.some((f) => (f ?? '').toLowerCase().includes(t));
}
