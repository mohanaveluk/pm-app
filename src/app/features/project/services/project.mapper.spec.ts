import { MeasurementSystem, Project, ProjectStatus } from '../models/project.model';
import {
  blankProjectFormValue, parseIsoDate, toIsoDate, toProjectFormValue, toProjectRequest,
} from './project.mapper';

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1', dguid: 'g1', organizationId: 'org-1', code: '0001', projectName: 'Unit 4 Expansion',
    clientId: 'c1', clientCode: '0007', clientName: 'Gulf Petrochemical Holdings', clientDisplayName: 'GPH',
    projectTypeId: 't1', projectTypeName: 'Construction',
    status: ProjectStatus.PLANNED, statusReason: null, statusChangedBy: null, statusChangedAt: null,
    description: null, startDate: '2026-11-01', endDate: '2028-10-31',
    projectManagerId: 'm1', projectManagerName: 'Asha Nair',
    siteLocation: 'Jubail Plant 2', addressLine1: null, city: 'Jubail', state: null, postalCode: null,
    countryCode: 'SA', contractNumber: 'C-2026-14', clientProjectReference: null,
    currencyCode: 'USD', measurementSystem: MeasurementSystem.METRIC, timeZone: 'Asia/Riyadh',
    createdBy: 'admin@example.com', updatedBy: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('project.mapper', () => {
  describe('toProjectFormValue', () => {
    it('turns nulls into empty strings so the form never holds null', () => {
      const v = toProjectFormValue(project());

      expect(v.details.description).toBe('');
      expect(v.details.addressLine1).toBe('');
      expect(v.details.clientProjectReference).toBe('');
    });

    it('carries the ids and dates the form edits', () => {
      const v = toProjectFormValue(project());

      expect(v.info).toMatchObject({
        projectName: 'Unit 4 Expansion', clientId: 'c1', projectTypeId: 't1',
        startDate: new Date(2026, 10, 1), endDate: new Date(2028, 9, 31), status: ProjectStatus.PLANNED,
      });
      expect(v.details).toMatchObject({
        projectManagerId: 'm1', countryCode: 'SA', currencyCode: 'USD', measurementSystem: 'METRIC',
      });
    });

    it('never puts the client name into the form', () => {
      const v = toProjectFormValue(project());
      expect(JSON.stringify(v)).not.toContain('Gulf Petrochemical Holdings');
    });
  });

  describe('toProjectRequest', () => {
    it('round-trips a record without losing or inventing data', () => {
      const request = toProjectRequest(toProjectFormValue(project()));

      expect(request).toMatchObject({
        projectName: 'Unit 4 Expansion', clientId: 'c1', projectTypeId: 't1',
        startDate: '2026-11-01', endDate: '2028-10-31', projectManagerId: 'm1',
        siteLocation: 'Jubail Plant 2', countryCode: 'SA', contractNumber: 'C-2026-14',
        currencyCode: 'USD', measurementSystem: 'METRIC', timeZone: 'Asia/Riyadh',
      });
    });

    it('stores the client by id only — no client name, code or number in the request', () => {
      const request = toProjectRequest(toProjectFormValue(project()), { includeStatus: true });

      expect(request.clientId).toBe('c1');
      expect(request).not.toHaveProperty('clientName');
      expect(request).not.toHaveProperty('clientCode');
      expect(request).not.toHaveProperty('code');
    });

    it('sends null — not undefined — for cleared optional fields so an update clears them', () => {
      const v = toProjectFormValue(project());
      v.details.contractNumber = '   ';
      v.details.projectManagerId = '';
      v.info.endDate = null;

      const request = toProjectRequest(v);

      expect(request.contractNumber).toBeNull();
      expect(request.projectManagerId).toBeNull();
      expect(request.endDate).toBeNull();
      expect(request.measurementSystem).toBe('METRIC');
    });

    it('trims the project name and text fields', () => {
      const v = blankProjectFormValue();
      v.info.projectName = '  Unit 4  ';
      v.details.city = ' Jubail ';

      const request = toProjectRequest(v);

      expect(request.projectName).toBe('Unit 4');
      expect(request.city).toBe('Jubail');
    });

    it('only includes the status when asked — an update changes it by action', () => {
      const v = toProjectFormValue(project({ status: ProjectStatus.ACTIVE }));

      expect(toProjectRequest(v)).not.toHaveProperty('status');
      expect(toProjectRequest(v, { includeStatus: true }).status).toBe(ProjectStatus.ACTIVE);
    });
  });

  describe('calendar dates', () => {
    it('reads an API date as the same calendar day, whatever the time zone', () => {
      const d = parseIsoDate('2026-11-01')!;

      expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 1]);
      expect([d.getHours(), d.getMinutes()]).toEqual([0, 0]);
    });

    it('writes a picked date back as the same calendar day', () => {
      expect(toIsoDate(new Date(2026, 10, 1))).toBe('2026-11-01');
      expect(toIsoDate(new Date(2028, 0, 9, 23, 59))).toBe('2028-01-09');
    });

    it('round-trips every day of a leap year without shifting', () => {
      for (let day = 0; day < 366; day++) {
        const date = new Date(2028, 0, 1 + day);
        expect(parseIsoDate(toIsoDate(date))!.getTime()).toBe(date.getTime());
      }
    });

    it('handles an empty or malformed value', () => {
      expect(parseIsoDate(null)).toBeNull();
      expect(parseIsoDate('')).toBeNull();
      expect(parseIsoDate('soon')).toBeNull();
      expect(toIsoDate(null)).toBe('');
      expect(toIsoDate(new Date('nope'))).toBe('');
    });

    it('sends the chosen dates as YYYY-MM-DD', () => {
      const v = toProjectFormValue(project());
      v.info.startDate = new Date(2026, 10, 1);
      v.info.endDate = new Date(2028, 9, 31);

      const request = toProjectRequest(v);

      expect(request.startDate).toBe('2026-11-01');
      expect(request.endDate).toBe('2028-10-31');
    });
  });

  describe('blankProjectFormValue', () => {
    it('starts Planned with nothing chosen', () => {
      const v = blankProjectFormValue();

      expect(v.info.status).toBe(ProjectStatus.PLANNED);
      expect(v.info.clientId).toBe('');
      expect(v.info.startDate).toBeNull();
      expect(v.info.endDate).toBeNull();
    });
  });
});
