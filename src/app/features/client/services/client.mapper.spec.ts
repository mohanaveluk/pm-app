import {
  Client, ClientAddressType, ClientContactRole, ClientStatus, MeasurementSystem,
  PreferredContactMethod,
} from '../models/client.model';
import {
  blankClientFormValue, blankContact, pickClientSection, toClientFormValue, toClientRequest,
} from './client.mapper';

function client(overrides: Partial<Client> = {}): Client {
  return {
    id: 'c1', dguid: 'g1', organizationId: 'org-1',
    code: '0001', clientName: 'Gulf Petrochemical Holdings', displayName: 'GPH',
    clientTypeId: 'type-1', clientTypeName: 'Owner',
    industryCategoryId: 'ind-1', industryCategoryName: 'Oil & Gas',
    parentClientId: null, parentClientName: null,
    countryCode: 'AE', website: 'www.gph.example', description: null, notes: 'Key account',
    status: ClientStatus.ACTIVE, isActive: true,
    primaryContactName: null, primaryContactEmail: null, primaryContactPhone: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z',
    version: 3,
    operationalAddressSameAsRegistered: false, timeZone: 'Asia/Dubai', preferredLanguage: 'en',
    addresses: [
      { id: 'a1', addressType: ClientAddressType.REGISTERED, label: null, addressLine1: '1 Sheikh Zayed Rd',
        addressLine2: null, city: 'Dubai', state: null, postalCode: null, countryCode: 'AE', isActive: true },
      { id: 'a2', addressType: ClientAddressType.OPERATIONAL, label: 'Abu Dhabi Office', addressLine1: 'Corniche',
        addressLine2: null, city: 'Abu Dhabi', state: null, postalCode: null, countryCode: 'AE', isActive: true },
    ],
    contacts: [
      { id: 'k1', contactName: 'Priya Raman', jobTitle: 'Procurement Lead', department: null,
        contactRole: ClientContactRole.PROCUREMENT_MANAGER, email: 'priya@gph.example',
        phone: '+971 4 123 4567', mobile: '+971 50 123 4567',
        preferredContactMethod: PreferredContactMethod.EMAIL, isPrimary: true,
        isProjectContact: false, isProcurementContact: true, isFinanceContact: false, isActive: true },
    ],
    documents: [],
    commercial: {
      legalEntityName: 'Gulf Petrochemical LLC', legalEntityType: null, registrationNumber: null,
      taxRegistrationNumber: '100234567', externalBusinessId: null, contractingEntityName: null,
      defaultCurrencyCode: 'AED', defaultPaymentTerms: 'NET_30', contractReferenceFormat: null,
      purchaseOrderReferenceFormat: null, defaultIncoterms: 'DAP', taxRegion: null, dateFormat: null,
    },
    projectDefaults: {
      defaultProjectTypeId: 'pt-1', defaultProjectTypeName: 'Construction',
      defaultProjectCurrencyCode: 'USD', measurementSystem: MeasurementSystem.METRIC,
      documentNumberingScheme: null, defaultWbsTemplate: null, defaultCostCodeScheme: null,
      defaultApprovalWorkflow: null, defaultProcurementTerms: null, documentPortalUrl: null,
      requiresClientApproval: true, requiresDocumentControl: false,
    },
    deactivatedBy: null, deactivatedAt: null, deactivationReason: null,
    createdBy: 'admin@example.com', updatedBy: 'admin@example.com',
    ...overrides,
  } as Client;
}

describe('client.mapper', () => {
  describe('toClientFormValue', () => {
    it('turns nulls into empty strings so the form never holds null', () => {
      const v = toClientFormValue(client());

      expect(v.general.description).toBe('');
      expect(v.general.parentClientId).toBe('');
      expect(v.commercial.legalEntityType).toBe('');
      expect(v.defaults.documentPortalUrl).toBe('');
    });

    it('splits the registered address from the operational ones', () => {
      const v = toClientFormValue(client());

      expect(v.addresses.registered).toMatchObject({ id: 'a1', city: 'Dubai' });
      expect(v.addresses.operational).toHaveLength(1);
      expect(v.addresses.operational[0]).toMatchObject({ id: 'a2', label: 'Abu Dhabi Office' });
    });

    it('splits stored phone numbers into dial code and local number', () => {
      const [contact] = toClientFormValue(client()).contacts.items;

      expect(contact).toMatchObject({
        phoneCode: '+971', phoneNumber: '4 123 4567', mobileCode: '+971', mobileNumber: '50 123 4567',
      });
    });

    it('uses a blank registered address when the client has none', () => {
      const v = toClientFormValue(client({ addresses: [] }));
      expect(v.addresses.registered.id).toBe('');
      expect(v.addresses.operational).toEqual([]);
    });
  });

  describe('toClientRequest', () => {
    it('round-trips a record without losing or inventing data', () => {
      const original = client();
      const request = toClientRequest(toClientFormValue(original));

      expect(request.clientName).toBe(original.clientName);
      expect(request.displayName).toBe('GPH');
      expect(request.parentClientId).toBeNull();
      expect(request.commercial).toMatchObject({
        legalEntityName: 'Gulf Petrochemical LLC', defaultCurrencyCode: 'AED', defaultIncoterms: 'DAP',
      });
      expect(request.projectDefaults).toMatchObject({
        defaultProjectTypeId: 'pt-1', measurementSystem: MeasurementSystem.METRIC, requiresClientApproval: true,
      });
      expect(request.contacts?.[0]).toMatchObject({
        id: 'k1', phone: '+971 4 123 4567', mobile: '+971 50 123 4567', isPrimary: true,
      });
    });

    it('sends null — not undefined — for cleared optional fields so an update clears them', () => {
      const v = toClientFormValue(client());
      v.general.notes = '   ';
      v.general.displayName = '';

      const request = toClientRequest(v);

      expect(request.notes).toBeNull();
      expect(request.displayName).toBeNull();
    });

    it('carries ids for existing children and omits them for new ones', () => {
      const v = toClientFormValue(client());
      v.addresses.operational.push({ ...v.addresses.operational[0], id: '', label: 'Sharjah Office' });

      const operational = toClientRequest(v).addresses!.filter((a) => a.addressType === 'OPERATIONAL');

      expect(operational[0].id).toBe('a2');
      expect(operational[1].id).toBeUndefined();
    });

    it('drops operational offices while "same as registered" is on, so the server removes them', () => {
      const v = toClientFormValue(client());
      v.addresses.operationalAddressSameAsRegistered = true;

      const request = toClientRequest(v);

      expect(request.addresses!.every((a) => a.addressType === 'REGISTERED')).toBe(true);
    });

    it('omits a registered address with no content, and blank operational rows', () => {
      const v = blankClientFormValue();
      v.addresses.operationalAddressSameAsRegistered = false;
      v.addresses.operational.push({ ...v.addresses.registered });

      expect(toClientRequest(v).addresses).toEqual([]);
    });

    it('drops contacts that have no name', () => {
      const v = blankClientFormValue();
      v.contacts.items.push({ ...blankContact(), email: 'orphan@example.com' });
      v.contacts.items.push({ ...blankContact(), contactName: ' Sam ' });

      expect(toClientRequest(v).contacts).toHaveLength(1);
      expect(toClientRequest(v).contacts![0].contactName).toBe('Sam');
    });

    it('joins dial code and number, and sends null when there is no number', () => {
      const v = blankClientFormValue();
      v.contacts.items.push({
        ...blankContact(), contactName: 'Sam', phoneCode: '+44', phoneNumber: '20 7946 0000',
        mobileCode: '+44', mobileNumber: '',
      });

      const [contact] = toClientRequest(v).contacts!;

      expect(contact.phone).toBe('+44 20 7946 0000');
      expect(contact.mobile).toBeNull();
    });

    it('never sends a code or a status — the server generates the one and starts Active', () => {
      const v = toClientFormValue(client());

      const request = toClientRequest(v);

      expect(request).not.toHaveProperty('code');
      expect(request).not.toHaveProperty('clientCode');
      expect(request).not.toHaveProperty('status');
    });

    it('has no code or status in the form value', () => {
      const v = toClientFormValue(client());

      expect(v.general).not.toHaveProperty('code');
      expect(v.general).not.toHaveProperty('status');
    });
  });

  describe('pickClientSection', () => {
    const full = () => toClientRequest(toClientFormValue(client()));

    it('narrows to the identity fields for the general step', () => {
      const picked = pickClientSection(full(), 'general');

      expect(Object.keys(picked).sort()).toEqual([
        'clientName', 'clientTypeId', 'countryCode', 'description', 'displayName',
        'industryCategoryId', 'notes', 'parentClientId', 'website',
      ]);
    });

    it('carries the regional settings with the addresses', () => {
      const picked = pickClientSection(full(), 'addresses');

      expect(Object.keys(picked).sort()).toEqual([
        'addresses', 'operationalAddressSameAsRegistered', 'preferredLanguage', 'timeZone',
      ]);
    });

    it('narrows the other sections to themselves', () => {
      expect(Object.keys(pickClientSection(full(), 'contacts'))).toEqual(['contacts']);
      expect(Object.keys(pickClientSection(full(), 'commercial'))).toEqual(['commercial']);
      expect(Object.keys(pickClientSection(full(), 'defaults'))).toEqual(['projectDefaults']);
    });

    it('contributes nothing for the documents step', () => {
      expect(pickClientSection(full(), 'documents')).toEqual({});
    });
  });
});
