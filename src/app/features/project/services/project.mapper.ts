import { MeasurementSystem, Project, ProjectStatus } from '../models/project.model';
import { CreateProjectRequest } from '../models/project-request.model';

/**
 * The Project API is symmetric and flat, so the only translation needed is
 * between the record and a form whose blanks are '' rather than null, and
 * back again with those blanks sent as null — which on an update is how a
 * cleared field is told apart from an omitted one.
 *
 *   API detail --toProjectFormValue--> form --toProjectRequest--> API create/update
 */

/** Shape of the workspace form's `getRawValue()`. */
export interface ProjectFormValue {
  info: {
    projectName: string;
    clientId: string;
    projectTypeId: string;
    status: ProjectStatus;
    /** Chosen in the calendar; null until picked. */
    startDate: Date | null;
    endDate: Date | null;
  };
  details: {
    description: string;
    siteLocation: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    countryCode: string;
    projectManagerId: string;
    contractNumber: string;
    clientProjectReference: string;
    currencyCode: string;
    measurementSystem: MeasurementSystem | '';
    timeZone: string;
  };
}

export function blankProjectFormValue(): ProjectFormValue {
  return {
    info: {
      projectName: '', clientId: '', projectTypeId: '', status: ProjectStatus.PLANNED,
      startDate: null, endDate: null,
    },
    details: {
      description: '', siteLocation: '', addressLine1: '', city: '', state: '', postalCode: '',
      countryCode: '', projectManagerId: '', contractNumber: '', clientProjectReference: '',
      currencyCode: '', measurementSystem: '', timeZone: '',
    },
  };
}

const s = (value: string | null | undefined): string => value ?? '';

/**
 * 'YYYY-MM-DD' → a Date at local midnight. The API's dates are calendar dates,
 * not instants, so they are built from their parts rather than through
 * `new Date('2026-11-01')`, which is UTC and shows up a day early in any
 * time zone west of Greenwich.
 */
export function parseIsoDate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A Date → 'YYYY-MM-DD' from its local parts ('' when there is none). */
export function toIsoDate(date: Date | null | undefined): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toProjectFormValue(p: Project): ProjectFormValue {
  return {
    info: {
      projectName: p.projectName,
      clientId: p.clientId,
      projectTypeId: p.projectTypeId,
      status: p.status,
      startDate: parseIsoDate(p.startDate),
      endDate: parseIsoDate(p.endDate),
    },
    details: {
      description: s(p.description),
      siteLocation: s(p.siteLocation),
      addressLine1: s(p.addressLine1),
      city: s(p.city),
      state: s(p.state),
      postalCode: s(p.postalCode),
      countryCode: s(p.countryCode),
      projectManagerId: s(p.projectManagerId),
      contractNumber: s(p.contractNumber),
      clientProjectReference: s(p.clientProjectReference),
      currencyCode: s(p.currencyCode),
      measurementSystem: p.measurementSystem ?? '',
      timeZone: s(p.timeZone),
    },
  };
}

/** '' → null (and trimmed) so a cleared field reaches the server as a clear. */
const n = (value: string | null | undefined): string | null => {
  const t = (value ?? '').trim();
  return t ? t : null;
};

/**
 * Builds the request from the form. The client name is never part of it: the
 * client is referenced by id only. The status is included only when asked —
 * create takes one, but an update changes status through its own endpoint.
 */
export function toProjectRequest(v: ProjectFormValue, options: { includeStatus?: boolean } = {}): CreateProjectRequest {
  const i = v.info;
  const d = v.details;

  const request: CreateProjectRequest = {
    projectName: i.projectName.trim(),
    clientId: i.clientId,
    projectTypeId: i.projectTypeId,
    startDate: toIsoDate(i.startDate),
    endDate: toIsoDate(i.endDate) || null,

    description: n(d.description),
    siteLocation: n(d.siteLocation),
    addressLine1: n(d.addressLine1),
    city: n(d.city),
    state: n(d.state),
    postalCode: n(d.postalCode),
    countryCode: n(d.countryCode),
    projectManagerId: n(d.projectManagerId),
    contractNumber: n(d.contractNumber),
    clientProjectReference: n(d.clientProjectReference),
    currencyCode: n(d.currencyCode),
    measurementSystem: d.measurementSystem || null,
    timeZone: n(d.timeZone),
  };

  if (options.includeStatus) request.status = i.status;
  return request;
}
