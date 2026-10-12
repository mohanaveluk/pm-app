import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ClientService } from '../../client/services/client.service';
import { ProjectTypeService } from '../../project-type/services/project-type.service';
import { ProjectService } from './project.service';
import { ProjectFormService } from './project-form.service';
import { ClientOption, MeasurementSystem } from '../../client/models/client.model';

const GPH: ClientOption = {
  id: 'c1', code: '0007', clientName: 'Gulf Petrochemical Holdings', displayName: 'GPH',
  clientTypeId: 'ct1', countryCode: 'SA',
  defaultCurrencyCode: 'SAR', defaultProjectCurrencyCode: 'USD',
  defaultProjectTypeId: 'pt-epc', measurementSystem: MeasurementSystem.METRIC, timeZone: 'Asia/Riyadh',
};

const BARE: ClientOption = {
  id: 'c2', code: '0008', clientName: 'Bare Client', displayName: null, clientTypeId: 'ct1', countryCode: null,
};

function setup(options: { clients?: ClientOption[]; failClients?: boolean; refreshed?: ClientOption[] } = {}) {
  const clients = options.clients ?? [GPH, BARE];
  const getActiveClients = vi
    .fn()
    .mockReturnValueOnce(options.failClients ? throwError(() => new Error('boom')) : of({ data: clients }))
    .mockReturnValue(of({ data: options.refreshed ?? clients }));

  TestBed.configureTestingModule({
    providers: [
      ProjectFormService,
      { provide: ClientService, useValue: { getActiveClients } },
      {
        provide: ProjectTypeService,
        useValue: { getActiveProjectTypes: () => of({ data: [{ id: 'pt-epc', name: 'EPC' }, { id: 'pt-con', name: 'Construction' }] }) },
      },
      { provide: ProjectService, useValue: { getProjectManagers: () => of({ data: [{ id: 'm1', name: 'Asha Nair', email: 'a@x.com' }] }) } },
    ],
  });
  return { service: TestBed.inject(ProjectFormService), getActiveClients };
}

describe('ProjectFormService', () => {
  describe('reference data', () => {
    it('loads clients, project types and managers', () => {
      const { service } = setup();

      expect(service.referenceLoading()).toBe(false);
      expect(service.clients().map((c) => c.id)).toEqual(['c1', 'c2']);
      expect(service.projectTypes()).toHaveLength(2);
      expect(service.managers()[0].name).toBe('Asha Nair');
    });

    it('reports a failure instead of leaving the form loading', () => {
      const { service } = setup({ failClients: true });

      expect(service.referenceLoading()).toBe(false);
      expect(service.referenceError()).toContain('Unable to load');
    });
  });

  describe('validation', () => {
    it('requires name, client, project type and start date', () => {
      const { service } = setup();
      const info = service.group('info');

      expect(info.invalid).toBe(true);
      info.patchValue({ projectName: 'Unit 4', clientId: 'c1', projectTypeId: 'pt-epc', startDate: new Date(2026, 10, 1) });
      expect(info.valid).toBe(true);
    });

    it('leaves the details section entirely optional', () => {
      const { service } = setup();
      expect(service.group('details').valid).toBe(true);
    });

    it('requires the end date to be later than the start date', () => {
      const { service } = setup();
      const info = service.group('info');
      info.patchValue({ projectName: 'Unit 4', clientId: 'c1', projectTypeId: 'pt-epc', startDate: new Date(2026, 10, 1) });

      info.patchValue({ endDate: new Date(2026, 9, 31) });
      expect(info.errors).toEqual({ endNotAfterStart: true });
      expect(info.valid).toBe(false);

      info.patchValue({ endDate: new Date(2026, 10, 2) });
      expect(info.errors).toBeNull();
      expect(info.valid).toBe(true);
    });

    it('rejects an end date on the same day as the start, whatever the time of day', () => {
      const { service } = setup();
      const info = service.group('info');
      info.patchValue({ startDate: new Date(2026, 10, 1, 0, 0), endDate: new Date(2026, 10, 1, 18, 30) });

      expect(info.errors).toEqual({ endNotAfterStart: true });
    });

    it('does not check the order while either date is missing', () => {
      const { service } = setup();
      const info = service.group('info');

      info.patchValue({ startDate: new Date(2026, 10, 1), endDate: null });
      expect(info.errors).toBeNull();

      info.patchValue({ startDate: null, endDate: new Date(2026, 9, 1) });
      expect(info.errors).toBeNull();
    });

    it('re-checks the order when the start date moves past an unchanged end date', () => {
      const { service } = setup();
      const info = service.group('info');
      info.patchValue({ startDate: new Date(2026, 10, 1), endDate: new Date(2026, 11, 1) });
      expect(info.errors).toBeNull();

      info.patchValue({ startDate: new Date(2027, 0, 1) });
      expect(info.errors).toEqual({ endNotAfterStart: true });
    });
  });

  describe('applyClientDefaults', () => {
    it('fills currency, measurement system, time zone and project type from the client', () => {
      const { service } = setup();

      const applied = service.applyClientDefaults(GPH);

      expect(applied).toEqual({
        currencyCode: true, measurementSystem: true, timeZone: true, projectTypeId: true,
      });
      expect(service.value().details).toMatchObject({
        currencyCode: 'USD', measurementSystem: 'METRIC', timeZone: 'Asia/Riyadh',
      });
      expect(service.value().info.projectTypeId).toBe('pt-epc');
      expect(service.appliedDefaultLabels()).toEqual([
        'project type', 'currency', 'measurement system', 'time zone',
      ]);
    });

    it('prefers the client\'s project currency over its general currency, and falls back to it', () => {
      const { service } = setup();

      service.applyClientDefaults({ ...GPH, defaultProjectCurrencyCode: null });

      expect(service.value().details.currencyCode).toBe('SAR');
    });

    it('never overwrites what the user has already chosen', () => {
      const { service } = setup();
      service.group('details').patchValue({ currencyCode: 'EUR', timeZone: 'Europe/Paris' });
      service.group('info').patchValue({ projectTypeId: 'pt-con' });

      const applied = service.applyClientDefaults(GPH);

      expect(applied).toEqual({ measurementSystem: true });
      expect(service.value().details.currencyCode).toBe('EUR');
      expect(service.value().details.timeZone).toBe('Europe/Paris');
      expect(service.value().info.projectTypeId).toBe('pt-con');
    });

    it('ignores a default project type that is no longer selectable', () => {
      const { service } = setup();

      service.applyClientDefaults({ ...GPH, defaultProjectTypeId: 'pt-retired' });

      expect(service.value().info.projectTypeId).toBe('');
    });

    it('does nothing for a client that defines no defaults', () => {
      const { service } = setup();

      expect(service.applyClientDefaults(BARE)).toEqual({});
      expect(service.appliedDefaults()).toBeNull();
      expect(service.value().details.currencyCode).toBe('');
    });

    it('clears the note when no client is selected', () => {
      const { service } = setup();
      service.applyClientDefaults(GPH);

      service.applyClientDefaults(undefined);

      expect(service.appliedDefaultLabels()).toEqual([]);
    });
  });

  describe('refreshClients', () => {
    it('reports only the clients that were not there before', () => {
      const created: ClientOption = { ...BARE, id: 'c3', code: '0009', clientName: 'Fresh Client' };
      const { service } = setup({ refreshed: [GPH, BARE, created] });
      const onDone = vi.fn();

      service.refreshClients(onDone);

      expect(onDone).toHaveBeenCalledWith([created]);
      expect(service.clients().map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
      expect(service.clientsRefreshing()).toBe(false);
    });

    it('reports nothing new when the list did not change', () => {
      const { service } = setup();
      const onDone = vi.fn();

      service.refreshClients(onDone);

      expect(onDone).toHaveBeenCalledWith([]);
    });
  });

  describe('patch / reset', () => {
    it('loads a record and leaves the form pristine', () => {
      const { service } = setup();
      const value = service.value();
      value.info.projectName = 'Unit 4';
      value.info.clientId = 'c1';

      service.patch(value);

      expect(service.value().info.projectName).toBe('Unit 4');
      expect(service.form.pristine).toBe(true);
    });

    it('reset returns to an empty Planned form and clears the applied note', () => {
      const { service } = setup();
      service.applyClientDefaults(GPH);
      service.group('info').patchValue({ projectName: 'Unit 4' });

      service.reset();

      expect(service.value().info.projectName).toBe('');
      expect(service.value().details.currencyCode).toBe('');
      expect(service.appliedDefaults()).toBeNull();
    });
  });

  it('can lock the status for an existing project', () => {
    const { service } = setup();

    service.setStatusEditable(false);
    expect(service.group('info').get('status')!.disabled).toBe(true);

    service.setStatusEditable(true);
    expect(service.group('info').get('status')!.enabled).toBe(true);
  });
});
