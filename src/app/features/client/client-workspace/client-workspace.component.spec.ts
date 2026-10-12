import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../services';
import { ClientTypeService } from '../../client-type/services/client-type.service';
import { IndustryCategoryService } from '../../industry-category/services/industry-category.service';
import { ProjectTypeService } from '../../project-type/services/project-type.service';
import { ClientService } from '../services/client.service';
import { ClientWorkspaceComponent } from './client-workspace.component';
import {
  Client, ClientAddressType, ClientStatus,
} from '../models/client.model';

function clientFixture(overrides: Partial<Client> = {}): Client {
  return {
    id: 'c1', dguid: 'g1', organizationId: 'org-1',
    code: '0007', clientName: 'Acme Energy', displayName: null,
    clientTypeId: 't1', clientTypeName: 'Owner',
    industryCategoryId: null, industryCategoryName: null,
    parentClientId: null, parentClientName: null,
    countryCode: 'AE', website: null, description: null, notes: null,
    status: ClientStatus.ACTIVE, isActive: true,
    primaryContactName: null, primaryContactEmail: null, primaryContactPhone: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    version: 1,
    operationalAddressSameAsRegistered: true, timeZone: null, preferredLanguage: null,
    addresses: [], contacts: [], documents: [],
    commercial: {
      legalEntityName: null, legalEntityType: null, registrationNumber: null,
      taxRegistrationNumber: null, externalBusinessId: null, contractingEntityName: null,
      defaultCurrencyCode: null, defaultPaymentTerms: null, contractReferenceFormat: null,
      purchaseOrderReferenceFormat: null, defaultIncoterms: null, taxRegion: null, dateFormat: null,
    },
    projectDefaults: {
      defaultProjectTypeId: null, defaultProjectTypeName: null, defaultProjectCurrencyCode: null,
      measurementSystem: null, documentNumberingScheme: null, defaultWbsTemplate: null,
      defaultCostCodeScheme: null, defaultApprovalWorkflow: null, defaultProcurementTerms: null,
      documentPortalUrl: null, requiresClientApproval: false, requiresDocumentControl: false,
    },
    deactivatedBy: null, deactivatedAt: null, deactivationReason: null,
    createdBy: 'admin@example.com', updatedBy: 'admin@example.com',
    ...overrides,
  } as Client;
}

async function setup(mode: 'create' | 'edit', record?: Client) {
  let version = record?.version ?? 1;
  const clientService = {
    getActiveClients: vi.fn(() => of({ data: [] })),
    getClientById: vi.fn(() => of({ data: record ?? clientFixture() })),
    createClient: vi.fn((body: Record<string, unknown>) => {
      version = 1;
      return of({ data: clientFixture({ clientName: body['clientName'] as string, version }) });
    }),
    updateClient: vi.fn((_id: string, body: Record<string, unknown>) => {
      version += 1;
      return of({ data: clientFixture({ ...(record ?? {}), clientName: (body['clientName'] as string) ?? 'Acme Energy', version }) });
    }),
    getDocuments: vi.fn(() => of({ data: [] })),
  };
  const router = { navigate: vi.fn(async () => true) };

  TestBed.configureTestingModule({
    providers: [
      provideNoopAnimations(),
      { provide: ClientService, useValue: clientService },
      { provide: AuthService, useValue: { role: () => 'OrganizationAdmin' } },
      { provide: ClientTypeService, useValue: { getActiveClientTypes: () => of({ data: [{ id: 't1', name: 'Owner' }] }) } },
      { provide: IndustryCategoryService, useValue: { getActiveIndustryCategories: () => of({ data: [] }) } },
      { provide: ProjectTypeService, useValue: { getActiveProjectTypes: () => of({ data: [] }) } },
      { provide: Router, useValue: router },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { data: { mode }, paramMap: convertToParamMap(mode === 'edit' ? { id: 'c1' } : {}) },
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(ClientWorkspaceComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();

  // The workspace's state signals are protected members the template binds to.
  const cmp = fixture.componentInstance as any;
  return { fixture, cmp, clientService, router, form: cmp.formService };
}

function fillIdentity(form: any, extra: Record<string, unknown> = {}) {
  const general = form.group('general');
  general.patchValue({ clientName: 'Acme Energy', clientTypeId: 't1', ...extra });
  general.markAsDirty();
}

describe('ClientWorkspaceComponent — creating a client', () => {
  it('starts on step 1 with no code or status to fill in', async () => {
    const { cmp, form } = await setup('create');

    expect(cmp.selectedIndex()).toBe(0);
    expect(cmp.clientId()).toBeNull();
    expect(form.group('general').get('clientCode')).toBeNull();
    expect(form.group('general').get('status')).toBeNull();
  });

  it('does not create anything while the required fields are missing', async () => {
    const { cmp, clientService } = await setup('create');

    await cmp.next();

    expect(clientService.createClient).not.toHaveBeenCalled();
    expect(cmp.clientId()).toBeNull();
  });

  it('creates the client from step 1 with only its identity and shows the generated code', async () => {
    const { cmp, clientService, form } = await setup('create');
    fillIdentity(form);

    await cmp.next();

    expect(clientService.createClient).toHaveBeenCalledTimes(1);
    const body = clientService.createClient.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toMatchObject({ clientName: 'Acme Energy', clientTypeId: 't1' });
    expect(body).not.toHaveProperty('addresses');
    expect(body).not.toHaveProperty('contacts');
    expect(body).not.toHaveProperty('commercial');
    expect(body).not.toHaveProperty('code');
    expect(body).not.toHaveProperty('code');
    expect(body).not.toHaveProperty('status');

    expect(cmp.clientId()).toBe('c1');
    expect(cmp.client().code).toBe('0007');
  });

  it('saves each later step as its own section, with the version it last saw', async () => {
    const { cmp, clientService, form } = await setup('create');
    fillIdentity(form);
    await cmp.next();

    cmp.goToStep(2);
    form.addContact();
    form.contacts.at(0).patchValue({ contactName: 'Priya Raman', email: 'priya@acme.example' });
    await cmp.next();

    expect(clientService.updateClient).toHaveBeenCalledTimes(1);
    const [id, body] = clientService.updateClient.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe('c1');
    expect(Object.keys(body).sort()).toEqual(['contacts', 'version']);
    expect(body['version']).toBe(1);
    expect((body['contacts'] as Array<{ contactName: string }>)[0].contactName).toBe('Priya Raman');
  });

  it('skips the round trip for an optional step the user did not touch', async () => {
    const { cmp, clientService, form } = await setup('create');
    fillIdentity(form);
    await cmp.next();

    cmp.goToStep(3);
    await cmp.next();

    expect(clientService.updateClient).not.toHaveBeenCalled();
  });

  it('stays on the step and keeps the form when the save fails', async () => {
    const { cmp, clientService, form } = await setup('create');
    fillIdentity(form);
    clientService.createClient.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Client code already exists' } })),
    );

    await cmp.next();

    expect(cmp.clientId()).toBeNull();
    expect(cmp.saving()).toBe(false);
    expect(form.group('general').get('clientName').value).toBe('Acme Energy');
  });

  it('lets a clean form be left without a prompt', async () => {
    const { cmp } = await setup('create');
    expect(await cmp.canDeactivate()).toBe(true);
  });

  it('marks the form clean again once a step has been saved', async () => {
    const { cmp, form } = await setup('create');
    fillIdentity(form);
    expect(form.group('general').dirty).toBe(true);

    await cmp.next();

    expect(form.group('general').dirty).toBe(false);
  });
});

describe('ClientWorkspaceComponent — editing a client', () => {
  const record = () => clientFixture({
    version: 4,
    addresses: [{
      id: 'a1', addressType: ClientAddressType.REGISTERED, label: null, addressLine1: '1 Sheikh Zayed Rd',
      addressLine2: null, city: 'Dubai', state: null, postalCode: null, countryCode: 'AE', isActive: true,
    }],
  });

  it('loads the record into the form', async () => {
    const { cmp, clientService, form } = await setup('edit', record());

    expect(clientService.getClientById).toHaveBeenCalledWith('c1');
    expect(cmp.isEdit()).toBe(true);
    expect(form.value().general.clientName).toBe('Acme Energy');
    expect(form.value().addresses.registered.city).toBe('Dubai');
  });

  it('saves the whole record once, with the loaded version and without code or status', async () => {
    const { cmp, clientService, form } = await setup('edit', record());
    form.group('general').patchValue({ notes: 'Preferred supplier list applies' });
    form.group('general').markAsDirty();

    await cmp.save(false);

    expect(clientService.updateClient).toHaveBeenCalledTimes(1);
    const [id, body] = clientService.updateClient.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe('c1');
    expect(body['version']).toBe(4);
    expect(body['notes']).toBe('Preferred supplier list applies');
    expect(body).toHaveProperty('addresses');
    expect(body).toHaveProperty('commercial');
    expect(body).not.toHaveProperty('clientCode');
    expect(body).not.toHaveProperty('status');
    // The form picks up the new version for the next save.
    expect(cmp.client().version).toBe(5);
  });

  it('does not save while a step is invalid, and jumps to it', async () => {
    const { cmp, clientService, form } = await setup('edit', record());
    form.group('general').patchValue({ clientName: '' });

    await cmp.save(false);

    expect(clientService.updateClient).not.toHaveBeenCalled();
    expect(cmp.selectedIndex()).toBe(0);
  });

  it('leaves to the list after Save & Close', async () => {
    const { cmp, router } = await setup('edit', record());

    await cmp.save(true);

    expect(router.navigate).toHaveBeenCalledWith(['/admin/clients']);
  });

  it('reports a client that no longer exists', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        {
          provide: ClientService,
          useValue: {
            getActiveClients: () => of({ data: [] }),
            getClientById: () => throwError(() => new HttpErrorResponse({ status: 404 })),
          },
        },
        { provide: AuthService, useValue: { role: () => 'OrganizationAdmin' } },
        { provide: ClientTypeService, useValue: { getActiveClientTypes: () => of({ data: [] }) } },
        { provide: IndustryCategoryService, useValue: { getActiveIndustryCategories: () => of({ data: [] }) } },
        { provide: ProjectTypeService, useValue: { getActiveProjectTypes: () => of({ data: [] }) } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { mode: 'edit' }, paramMap: convertToParamMap({ id: 'gone' }) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(ClientWorkspaceComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    expect((fixture.componentInstance as any).loadError()).toContain('could not be found');
  });
});
