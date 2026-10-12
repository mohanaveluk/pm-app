import { MeasurementSystem } from '../../client/models/client.model';

/**
 * Project Master domain model. Mirrors ProjectResponseDto
 * (pm-api/src/modules/project/dto/project-response.dto.ts) exactly.
 *
 * A project references its client by `clientId`. `clientCode` / `clientName`
 * are read-only, derived on the server from that relationship — they are never
 * sent back and never the source of truth.
 */

export enum ProjectStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export { MeasurementSystem };

export interface Project {
  id: string;
  dguid: string;
  organizationId: string;
  /** Project number — server-generated per-organization sequence ("0001"). */
  code: string;
  projectName: string;

  clientId: string;
  /** Read from the client relationship; display only. */
  clientCode: string | null;
  clientName: string | null;
  clientDisplayName: string | null;

  projectTypeId: string;
  projectTypeName: string | null;

  status: ProjectStatus;
  statusReason: string | null;
  statusChangedBy: string | null;
  statusChangedAt: string | null;

  description: string | null;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string | null;

  projectManagerId: string | null;
  projectManagerName: string | null;

  siteLocation: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  /** ISO 3166-1 alpha-2. */
  countryCode: string | null;

  contractNumber: string | null;
  clientProjectReference: string | null;
  currencyCode: string | null;
  measurementSystem: MeasurementSystem | null;
  timeZone: string | null;

  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** An entry of the open-projects dropdown — GET /projects/active. */
export interface ProjectOption {
  id: string;
  code: string;
  projectName: string;
  clientId: string;
  clientCode?: string | null;
  clientName: string | null;
  status: ProjectStatus;
  currencyCode: string | null;
}

/** An entry of the project-manager dropdown — GET /projects/project-managers. */
export interface ProjectManagerOption {
  id: string;
  name: string;
  email: string;
}

/** GET /projects/:id/summary */
export interface ProjectSummary {
  project: Project;
  client: {
    id: string;
    code: string;
    clientName: string;
    displayName: string | null;
    clientTypeName: string | null;
    industryCategoryName: string | null;
    countryCode: string | null;
    status: string;
    defaultCurrencyCode: string | null;
    primaryContactName: string | null;
    primaryContactEmail: string | null;
    primaryContactPhone: string | null;
  };
  schedule: {
    durationDays: number | null;
    daysToEnd: number | null;
    isOverdue: boolean;
  };
  /** The statuses this project may move to next. */
  allowedStatuses: ProjectStatus[];
}

// ── List state ──────────────────────────────────────────────────────────

/** Only these are accepted by the backend's ProjectQueryDto.sortBy. */
export type ProjectSortField =
  | 'code' | 'projectName' | 'client' | 'projectType' | 'status'
  | 'startDate' | 'endDate' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface ProjectFilter {
  search: string;
  status: ProjectStatus | null;
  clientId: string | null;
  projectTypeId: string | null;
  projectManagerId: string | null;
  countryCode: string | null;
}

export const DEFAULT_PROJECT_FILTER: ProjectFilter = {
  search: '',
  status: null,
  clientId: null,
  projectTypeId: null,
  projectManagerId: null,
  countryCode: null,
};

// ── Option lists ────────────────────────────────────────────────────────

export interface StatusOption {
  value: ProjectStatus;
  label: string;
  hint: string;
  icon: string;
}

export const PROJECT_STATUS_OPTIONS: readonly StatusOption[] = [
  { value: ProjectStatus.PLANNED, label: 'Planned', hint: 'Set up, not yet started', icon: 'event' },
  { value: ProjectStatus.ACTIVE, label: 'Active', hint: 'In execution', icon: 'play_circle' },
  { value: ProjectStatus.ON_HOLD, label: 'On Hold', hint: 'Paused, expected to resume', icon: 'pause_circle' },
  { value: ProjectStatus.COMPLETED, label: 'Completed', hint: 'Finished', icon: 'check_circle' },
  { value: ProjectStatus.CANCELLED, label: 'Cancelled', hint: 'Stopped and will not resume', icon: 'cancel' },
];

/**
 * Where a project may go from each status — the same table the API enforces,
 * kept here so menus and dialogs only offer moves that will be accepted.
 * COMPLETED can be reopened and CANCELLED reinstated as planned.
 */
export const PROJECT_STATUS_TRANSITIONS: Readonly<Record<ProjectStatus, readonly ProjectStatus[]>> = {
  [ProjectStatus.PLANNED]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
  [ProjectStatus.ACTIVE]: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  [ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
  [ProjectStatus.COMPLETED]: [ProjectStatus.ACTIVE],
  [ProjectStatus.CANCELLED]: [ProjectStatus.PLANNED],
};

/** Statuses a project can be deleted in — before any work has started. */
export const DELETABLE_PROJECT_STATUSES: readonly ProjectStatus[] = [
  ProjectStatus.PLANNED, ProjectStatus.CANCELLED,
];

export const PROJECT_MEASUREMENT_OPTIONS: readonly { value: MeasurementSystem; label: string }[] = [
  { value: MeasurementSystem.METRIC, label: 'Metric (SI)' },
  { value: MeasurementSystem.IMPERIAL, label: 'Imperial' },
  { value: MeasurementSystem.US_CUSTOMARY, label: 'US Customary' },
];

export function projectStatusLabel(status: string | null | undefined): string {
  return PROJECT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? (status ?? '—');
}

export function measurementLabel(value: string | null | undefined): string {
  return PROJECT_MEASUREMENT_OPTIONS.find((o) => o.value === value)?.label ?? '';
}
