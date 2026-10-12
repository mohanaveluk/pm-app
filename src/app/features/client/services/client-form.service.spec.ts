import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ClientTypeService } from '../../client-type/services/client-type.service';
import { IndustryCategoryService } from '../../industry-category/services/industry-category.service';
import { ProjectTypeService } from '../../project-type/services/project-type.service';
import { ClientService } from './client.service';
import { ClientFormService } from './client-form.service';
import { blankClientFormValue, blankContact } from './client.mapper';

function setup(options: { failTypes?: boolean } = {}) {
  const types = options.failTypes
    ? throwError(() => new Error('boom'))
    : of({ data: [{ id: 't1', name: 'Owner' }, { id: 't2', name: 'Operator' }] });

  TestBed.configureTestingModule({
    providers: [
      ClientFormService,
            { provide: ClientTypeService, useValue: { getActiveClientTypes: vi.fn(() => types) } },
      { provide: IndustryCategoryService, useValue: { getActiveIndustryCategories: vi.fn(() => of({ data: [{ id: 'i1', name: 'Oil & Gas' }] })) } },
      { provide: ProjectTypeService, useValue: { getActiveProjectTypes: vi.fn(() => of({ data: [{ id: 'p1', name: 'Construction' }] })) } },
      { provide: ClientService, useValue: { getActiveClients: vi.fn(() => of({ data: [{ id: 'c1', clientName: 'Acme', displayName: 'ACM', code: '0001' }] })) } },
    ],
  });
  return TestBed.inject(ClientFormService);
}

describe('ClientFormService', () => {
  describe('reference data', () => {
    it('loads the lookups and resolves labels', () => {
      const service = setup();

      expect(service.referenceLoading()).toBe(false);
      expect(service.clientTypeLabel('t2')).toBe('Operator');
      expect(service.industryLabel('i1')).toBe('Oil & Gas');
      expect(service.parentLabel('c1')).toBe('ACM');
      expect(service.clientTypeLabel('missing')).toBe('—');
    });

    it('reports a failure instead of leaving the form loading', () => {
      const service = setup({ failTypes: true });

      expect(service.referenceLoading()).toBe(false);
      expect(service.referenceError()).toContain('Unable to load');
    });
  });

  describe('identity', () => {
    it('has no client code or status field to fill in — both are set by the server', () => {
      const general = setup().group('general');

      expect(general.get('clientCode')).toBeNull();
      expect(general.get('code')).toBeNull();
      expect(general.get('status')).toBeNull();
    });
  });

  describe('validation', () => {
    it('requires only the name and the client type', () => {
      const service = setup();
      const general = service.group('general');

      expect(general.invalid).toBe(true);
      general.patchValue({ clientName: 'Acme', clientTypeId: 't1' });
      expect(general.valid).toBe(true);
    });

    it('treats the website and the tax number as optional but format-checked', () => {
      const service = setup();
      const website = service.group('general').get('website')!;
      const tax = service.group('commercial').get('taxRegistrationNumber')!;

      website.setValue('');
      tax.setValue('');
      expect(website.valid && tax.valid).toBe(true);

      website.setValue('not a url');
      tax.setValue('!!');
      expect(website.valid).toBe(false);
      expect(tax.valid).toBe(false);

      website.setValue('www.example.com');
      tax.setValue('100234567');
      expect(website.valid && tax.valid).toBe(true);
    });
  });

  describe('contacts', () => {
    it('makes the first contact the primary and later ones not', () => {
      const service = setup();

      service.addContact();
      service.addContact();

      expect(service.contacts.at(0).get('isPrimary')!.value).toBe(true);
      expect(service.contacts.at(1).get('isPrimary')!.value).toBe(false);
    });

    it('keeps exactly one primary when another is chosen', () => {
      const service = setup();
      service.addContact();
      service.addContact();
      service.addContact();

      service.setPrimaryContact(2);

      expect(service.contacts.controls.map((c) => c.get('isPrimary')!.value)).toEqual([false, false, true]);
    });

    it('requires a contact name', () => {
      const service = setup();
      service.addContact();
      const name = service.contacts.at(0).get('contactName')!;

      expect(name.invalid).toBe(true);
      name.setValue('Priya Raman');
      expect(name.valid).toBe(true);
    });

    it('needs a country code whenever a phone or mobile number is given', () => {
      const service = setup();
      service.addContact({ ...blankContact(), contactName: 'Priya' });
      const contact = service.contacts.at(0);

      contact.patchValue({ mobileNumber: '50 123 4567' });
      expect(contact.errors).toEqual({ mobileCodeRequired: true });

      contact.patchValue({ mobileCode: '+971', phoneNumber: '4 123 4567' });
      expect(contact.errors).toEqual({ phoneCodeRequired: true });

      contact.patchValue({ phoneCode: '+971' });
      expect(contact.errors).toBeNull();
    });

    it('rejects a malformed email and local number', () => {
      const service = setup();
      service.addContact({ ...blankContact(), contactName: 'Priya', phoneCode: '+971' });
      const contact = service.contacts.at(0);

      contact.patchValue({ email: 'nope', phoneNumber: 'abc' });
      expect(contact.get('email')!.valid).toBe(false);
      expect(contact.get('phoneNumber')!.valid).toBe(false);

      contact.patchValue({ email: 'p@example.com', phoneNumber: '4 123 4567' });
      expect(contact.valid).toBe(true);
    });
  });

  describe('patch / reset', () => {
    it('rebuilds the repeating groups from a record and leaves the form pristine', () => {
      const service = setup();
      service.addContact();
      service.addOperationalAddress();

      const value = blankClientFormValue();
      value.general.clientName = 'Acme';
      value.general.clientTypeId = 't1';
      value.addresses.operationalAddressSameAsRegistered = false;
      value.addresses.operational = [
        { id: 'a1', label: 'Dubai', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', countryCode: '', isActive: true },
        { id: 'a2', label: 'Abu Dhabi', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', countryCode: '', isActive: true },
      ];
      value.contacts.items = [{ ...blankContact(), id: 'k1', contactName: 'Priya' }];

      service.patch(value);

      expect(service.operationalAddresses.length).toBe(2);
      expect(service.contacts.length).toBe(1);
      expect(service.contacts.at(0).get('id')!.value).toBe('k1');
      expect(service.value().general.clientName).toBe('Acme');
      expect(service.form.pristine).toBe(true);
    });

    it('reset returns to an empty form', () => {
      const service = setup();
      service.addContact();
      service.group('general').patchValue({ clientName: 'Acme' });

      service.reset();

      expect(service.contacts.length).toBe(0);
      expect(service.value().general.clientName).toBe('');
    });
  });

  describe('step helpers', () => {
    it('finds the first invalid step', () => {
      const service = setup();
      expect(service.firstInvalidStepIndex()).toBe(0);

      service.group('general').patchValue({ clientName: 'Acme', clientTypeId: 't1' });
      expect(service.firstInvalidStepIndex()).toBe(-1);

      service.addContact();
      expect(service.steps[service.firstInvalidStepIndex()].key).toBe('contacts');
    });
  });
});
