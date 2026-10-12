import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ClientService } from '../../client/services/client.service';
import { ProjectTypeService } from '../../project-type/services/project-type.service';
import { PermissionService } from '../../../core/rbac/permission.service';
import { ProjectService } from '../services/project.service';
import { ProjectWorkspaceComponent } from './project-workspace.component';
import { ClientOption, MeasurementSystem } from '../../client/models/client.model';
import { Project, ProjectStatus } from '../models/project.model';

const CLIENTS: ClientOption[] = [
  {
    id: 'c1', code: '0007', clientName: 'Gulf Petrochemical Holdings', displayName: 'GPH',
    clientTypeId: 'ct1', countryCode: 'SA', defaultProjectCurrencyCode: 'USD',
    measurementSystem: MeasurementSystem.METRIC, defaultProjectTypeId: 'pt-epc',
  },
  { id: 'c2', code: '0008', clientName: 'Bare Client', displayName: null, clientTypeId: 'ct1', countryCode: null },
];

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1', dguid: 'g1', organizationId: 'org-1', code: '0001', projectName: 'Unit 4 Expansion',
    clientId: 'c1', clientCode: '0007', clientName: 'Gulf Petrochemical Holdings', clientDisplayName: 'GPH',
    projectTypeId: 'pt-epc', projectTypeName: 'EPC',
    status: ProjectStatus.PLANNED, statusReason: null, statusChangedBy: null, statusChangedAt: null,
    description: null, startDate: '2026-11-01', endDate: '2028-10-31',
    projectManagerId: null, projectManagerName: null,
    siteLocation: null, addressLine1: null, city: null, state: null, postalCode: null, countryCode: 'SA',
    contractNumber: null, clientProjectReference: null, currencyCode: 'USD',
    measurementSystem: null, timeZone: null,
    createdBy: 'pm@example.com', updatedBy: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

interface SetupOptions {
  mode: 'create' | 'edit';
  record?: Project;
  clients?: ClientOption[];
  refreshed?: ClientOption[];
  canCreateClient?: boolean;
}

async function setup(options: SetupOptions) {
  const clientsList = options.clients ?? CLIENTS;
  const projectService = {
    getProjectManagers: vi.fn(() => of({ data: [{ id: 'm1', name: 'Asha Nair', email: 'a@x.com' }] })),
    getProjectById: vi.fn(() => of({ data: options.record ?? projectFixture() })),
    createProject: vi.fn((body: Record<string, unknown>) =>
      of({ data: projectFixture({ projectName: body['projectName'] as string, code: '0042', id: 'new-1' }) })),
    updateProject: vi.fn((_id: string, body: Record<string, unknown>) =>
      of({ data: projectFixture({ projectName: (body['projectName'] as string) ?? 'Unit 4 Expansion' }) })),
  };
  const getActiveClients = vi
    .fn()
    .mockReturnValueOnce(of({ data: clientsList }))
    .mockReturnValue(of({ data: options.refreshed ?? clientsList }));
  const router = { navigate: vi.fn(async () => true) };

  TestBed.configureTestingModule({
    providers: [
      provideNoopAnimations(),
      provideRouter([]),
      { provide: ProjectService, useValue: projectService },
      { provide: ClientService, useValue: { getActiveClients } },
      {
        provide: ProjectTypeService,
        useValue: { getActiveProjectTypes: () => of({ data: [{ id: 'pt-epc', name: 'EPC' }, { id: 'pt-con', name: 'Construction' }] }) },
      },
      { provide: PermissionService, useValue: { hasPermission: () => options.canCreateClient ?? true } },
      { provide: Router, useValue: router },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            data: { mode: options.mode },
            paramMap: convertToParamMap(options.mode === 'edit' ? { id: 'p1' } : {}),
          },
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(ProjectWorkspaceComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();

  // The workspace's state signals are protected members the template binds to.
  const cmp = fixture.componentInstance as any;
  return { fixture, cmp, projectService, router, form: cmp.formService, getActiveClients };
}

function fillRequired(form: any, extra: Record<string, unknown> = {}) {
  form.group('info').patchValue({
    projectName: 'Unit 4 Expansion', clientId: 'c1', projectTypeId: 'pt-epc',
    startDate: new Date(2026, 10, 1), ...extra,
  });
  form.group('info').markAsDirty();
}

describe('ProjectWorkspaceComponent — creating a project', () => {
  it('starts Planned, with an auto-generated number and the status selectable', async () => {
    const { cmp, form } = await setup({ mode: 'create' });

    expect(cmp.isEdit()).toBe(false);
    expect(form.value().info.status).toBe(ProjectStatus.PLANNED);
    expect(form.group('info').get('status').enabled).toBe(true);
    expect(cmp.project()).toBeNull();
  });

  it('does not create anything while required fields are missing', async () => {
    const { cmp, projectService } = await setup({ mode: 'create' });

    await cmp.save(false);

    expect(projectService.createProject).not.toHaveBeenCalled();
  });

  it('creates the project with the client by id only, then opens it', async () => {
    const { cmp, projectService, router, form } = await setup({ mode: 'create' });
    fillRequired(form, { endDate: new Date(2028, 9, 31) });
    form.group('details').patchValue({ siteLocation: 'Jubail Plant 2', currencyCode: 'USD' });

    await cmp.save(false);

    expect(projectService.createProject).toHaveBeenCalledTimes(1);
    const body = projectService.createProject.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toMatchObject({
      projectName: 'Unit 4 Expansion', clientId: 'c1', projectTypeId: 'pt-epc',
      startDate: '2026-11-01', endDate: '2028-10-31', siteLocation: 'Jubail Plant 2',
      currencyCode: 'USD', status: ProjectStatus.PLANNED,
    });
    expect(body).not.toHaveProperty('clientName');
    expect(body).not.toHaveProperty('clientCode');
    expect(body).not.toHaveProperty('code');
    expect(router.navigate).toHaveBeenCalledWith(['/projects', 'new-1']);
  });

  it('sends the status chosen on the form', async () => {
    const { cmp, projectService, form } = await setup({ mode: 'create' });
    fillRequired(form, { status: ProjectStatus.ACTIVE });

    await cmp.save(false);

    expect(projectService.createProject.mock.calls[0][0]).toMatchObject({ status: ProjectStatus.ACTIVE });
  });

  it('refuses an end date before the start date', async () => {
    const { cmp, projectService, form } = await setup({ mode: 'create' });
    fillRequired(form, { startDate: new Date(2026, 10, 1), endDate: new Date(2026, 9, 1) });

    await cmp.save(false);

    expect(projectService.createProject).not.toHaveBeenCalled();
    expect(form.group('info').errors).toEqual({ endNotAfterStart: true });
  });

  it('refuses an end date equal to the start date', async () => {
    const { cmp, projectService, form } = await setup({ mode: 'create' });
    fillRequired(form, { startDate: new Date(2026, 10, 1), endDate: new Date(2026, 10, 1) });

    await cmp.save(false);

    expect(projectService.createProject).not.toHaveBeenCalled();
    // Saving touches every field, so the message is now shown on the end date.
    expect(cmp.endNotAfterStart).toBe(true);
  });

  describe('calendar', () => {
    it('opens a calendar from the start and end date fields and shows a toggle icon on each', async () => {
      const { fixture } = await setup({ mode: 'create' });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelectorAll('mat-datepicker-toggle')).toHaveLength(2);
      const inputs = el.querySelectorAll<HTMLInputElement>('input[aria-label="Start date"], input[aria-label="End date"]');
      expect(inputs).toHaveLength(2);
      inputs.forEach((i) => expect(i.readOnly).toBe(true));
    });

    it('opens the calendar when the box itself is clicked', async () => {
      const { fixture } = await setup({ mode: 'create' });
      const el = fixture.nativeElement as HTMLElement;
      const input = el.querySelector<HTMLInputElement>('input[aria-label="Start date"]')!;

      input.click();
      fixture.detectChanges();

      expect(document.querySelector('mat-calendar')).not.toBeNull();
    });

    it('offers end dates only from the day after the start date', async () => {
      const { cmp, form } = await setup({ mode: 'create' });
      expect(cmp.minEndDate()).toBeNull();

      form.group('info').get('startDate').setValue(new Date(2026, 10, 30));

      const min = cmp.minEndDate() as Date;
      expect([min.getFullYear(), min.getMonth(), min.getDate()]).toEqual([2026, 11, 1]);
    });

    it('clears an optional end date', async () => {
      const { cmp, form } = await setup({ mode: 'create' });
      fillRequired(form, { endDate: new Date(2028, 9, 31) });

      cmp.clearEndDate();

      expect(form.value().info.endDate).toBeNull();
      expect(form.group('info').valid).toBe(true);
    });
  });

  it('stays on the form and keeps the input when the save fails', async () => {
    const { cmp, projectService, router, form } = await setup({ mode: 'create' });
    fillRequired(form);
    projectService.createProject.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'Selected client is inactive' } })),
    );

    await cmp.save(false);

    expect(router.navigate).not.toHaveBeenCalled();
    expect(cmp.saving()).toBe(false);
    expect(form.value().info.projectName).toBe('Unit 4 Expansion');
  });

  describe('client selection', () => {
    it('lists active clients and finds them by code or name', async () => {
      const { cmp } = await setup({ mode: 'create' });

      expect(cmp.visibleClients().map((c: ClientOption) => c.id)).toEqual(['c1', 'c2']);

      cmp.clientSearch.set('0008');
      expect(cmp.visibleClients().map((c: ClientOption) => c.id)).toEqual(['c2']);

      cmp.clientSearch.set('petrochem');
      expect(cmp.visibleClients().map((c: ClientOption) => c.id)).toEqual(['c1']);

      cmp.clientSearch.set('gph');
      expect(cmp.visibleClients().map((c: ClientOption) => c.id)).toEqual(['c1']);
    });

    it('shows both code and name', async () => {
      const { cmp } = await setup({ mode: 'create' });

      expect(cmp.clientLabel(CLIENTS[0])).toBe('0007 — GPH');
      expect(cmp.clientLabel(CLIENTS[1])).toBe('0008 — Bare Client');
    });

    it('applies the client\'s defaults when one is chosen, without overwriting input', async () => {
      const { cmp, form } = await setup({ mode: 'create' });
      form.group('details').patchValue({ currencyCode: 'EUR' });

      form.group('info').get('clientId').setValue('c1');
      cmp.onClientSelected('c1');

      expect(form.value().details.currencyCode).toBe('EUR');
      expect(form.value().details.measurementSystem).toBe('METRIC');
      expect(form.value().info.projectTypeId).toBe('pt-epc');
      expect(form.appliedDefaultLabels()).toEqual(['project type', 'measurement system']);
    });

    it('shows the stored client reference once chosen', async () => {
      const { cmp, form } = await setup({ mode: 'create' });
      expect(cmp.selectedClient()).toBeNull();

      form.group('info').get('clientId').setValue('c2');

      expect(cmp.selectedClient()).toMatchObject({ id: 'c2', code: '0008' });
    });

    it('selects a client that was created elsewhere once the list is refreshed', async () => {
      const created: ClientOption = {
        id: 'c3', code: '0009', clientName: 'Fresh Client', displayName: null, clientTypeId: 'ct1', countryCode: null,
      };
      const { cmp, form } = await setup({ mode: 'create', refreshed: [...CLIENTS, created] });

      cmp.refreshClients();

      expect(form.value().info.clientId).toBe('c3');
      expect(cmp.visibleClients().map((c: ClientOption) => c.id)).toContain('c3');
    });

    it('leaves the selection alone when nothing new appeared', async () => {
      const { cmp, form } = await setup({ mode: 'create' });
      form.group('info').get('clientId').setValue('c1');

      cmp.refreshClients();

      expect(form.value().info.clientId).toBe('c1');
    });

    it('offers the create-client link only to someone who may create clients', async () => {
      const { fixture } = await setup({ mode: 'create', canCreateClient: false });
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ask an administrator');
    });
  });
});

describe('ProjectWorkspaceComponent — editing a project', () => {
  it('loads the record, showing its number and a locked status', async () => {
    const { cmp, form, projectService } = await setup({ mode: 'edit', record: projectFixture() });

    expect(projectService.getProjectById).toHaveBeenCalledWith('p1');
    expect(cmp.isEdit()).toBe(true);
    expect(cmp.project().code).toBe('0001');
    expect(form.value().info.projectName).toBe('Unit 4 Expansion');
    const start = form.value().info.startDate as Date;
    expect([start.getFullYear(), start.getMonth(), start.getDate()]).toEqual([2026, 10, 1]);
    expect(form.group('info').get('status').disabled).toBe(true);
  });

  it('keeps showing the client when it has since been deactivated', async () => {
    // The active list no longer contains c9, but the project still points at it.
    const { cmp } = await setup({
      mode: 'edit',
      clients: CLIENTS,
      record: projectFixture({ clientId: 'c9', clientCode: '0099', clientName: 'Retired Client', clientDisplayName: null }),
    });

    expect(cmp.visibleClients().map((c: ClientOption) => c.id)).toContain('c9');
    expect(cmp.selectedClient()).toMatchObject({ id: 'c9', code: '0099', clientName: 'Retired Client' });
  });

  it('saves without a status and without applying client defaults over loaded values', async () => {
    const { cmp, projectService, form } = await setup({ mode: 'edit', record: projectFixture() });
    form.group('details').patchValue({ siteLocation: 'Yanbu' });
    form.group('details').markAsDirty();

    await cmp.save(false);

    const [id, body] = projectService.updateProject.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe('p1');
    expect(body['siteLocation']).toBe('Yanbu');
    expect(body['currencyCode']).toBe('USD');
    expect(body).not.toHaveProperty('status');
    expect(body).not.toHaveProperty('clientName');
    expect(body).not.toHaveProperty('code');
  });

  it('opens the project after Save & Close', async () => {
    const { cmp, router } = await setup({ mode: 'edit', record: projectFixture() });

    await cmp.save(true);

    expect(router.navigate).toHaveBeenCalledWith(['/projects', 'p1']);
  });

  it('lets a clean form be left without a prompt', async () => {
    const { cmp } = await setup({ mode: 'edit', record: projectFixture() });
    expect(await cmp.canDeactivate()).toBe(true);
  });

  it('reports a project that no longer exists', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        {
          provide: ProjectService,
          useValue: {
            getProjectManagers: () => of({ data: [] }),
            getProjectById: () => throwError(() => new HttpErrorResponse({ status: 404 })),
          },
        },
        { provide: ClientService, useValue: { getActiveClients: () => of({ data: [] }) } },
        { provide: ProjectTypeService, useValue: { getActiveProjectTypes: () => of({ data: [] }) } },
        { provide: PermissionService, useValue: { hasPermission: () => true } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { mode: 'edit' }, paramMap: convertToParamMap({ id: 'gone' }) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(ProjectWorkspaceComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    expect((fixture.componentInstance as any).loadError()).toContain('could not be found');
  });
});
