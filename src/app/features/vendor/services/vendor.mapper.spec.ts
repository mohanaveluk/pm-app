import { toCreateRequest, toUpdateRequest, toVendorFormValue } from './vendor.mapper';
import { Vendor } from '../models/vendor.model';

const row = (over: Record<string, unknown> = {}) => ({
  contactPerson: '', designation: '', email: '',
  mobileDialCode: '', mobileNumber: '', landlineDialCode: '', landlineNumber: '',
  isPrimary: false, ...over,
});

const form = (contacts: unknown[]): any => ({
  identification: { vendorName: 'ABC', vendorTypeId: 'vt', productCategories: [] },
  contact: { contacts, website: '', countryOfRegistration: '', addresses: [] },
});

describe('vendor mapper — contacts', () => {
  it('sends every named contact, joining dial code and number', () => {
    const req = toCreateRequest(form([
      row({ contactPerson: 'Asha', email: 'ASHA@V.EXAMPLE', mobileDialCode: '+971', mobileNumber: '50 111 2222', isPrimary: true }),
      row({ contactPerson: 'Ravi', landlineDialCode: '+971', landlineNumber: '4 123 4567' }),
    ]));

    expect(req.contacts).toHaveLength(2);
    expect(req.contacts![0]).toMatchObject({ contactPerson: 'Asha', email: 'asha@v.example', isPrimary: true });
    expect(req.contacts![0].mobileNumber).toContain('50 111 2222');
    expect(req.contacts![1].landlineNumber).toContain('4 123 4567');
    expect(req.contacts![1].isPrimary).toBe(false);
  });

  it('skips blank rows and flags the first contact primary when none is', () => {
    const req = toCreateRequest(form([row(), row({ contactPerson: 'Ravi' }), row({ contactPerson: 'Asha' })]));

    expect(req.contacts!.map((c) => c.contactPerson)).toEqual(['Ravi', 'Asha']);
    expect(req.contacts!.map((c) => c.isPrimary)).toEqual([true, false]);
  });

  it('sends an empty list on update so removed contacts are cleared', () => {
    expect(toUpdateRequest(form([row()])).contacts).toEqual([]);
  });

  it('rehydrates one row per stored contact', () => {
    const vendor = {
      vendorName: 'ABC',
      contacts: [
        { id: '1', contactPerson: 'Asha', isPrimary: true, isActive: true },
        { id: '2', contactPerson: 'Ravi', isPrimary: false, isActive: true },
        { id: '3', contactPerson: 'Gone', isPrimary: false, isActive: false },
      ],
    } as unknown as Vendor;

    const rows = toVendorFormValue(vendor).contact.contacts;

    expect(rows.map((r: any) => r.contactPerson)).toEqual(['Asha', 'Ravi']);
  });

  it('falls back to the vendor primary-contact fields when there are no rows', () => {
    const vendor = { vendorName: 'ABC', primaryContactPerson: 'Legacy', email: 'l@v.example' } as unknown as Vendor;

    const rows = toVendorFormValue(vendor).contact.contacts;

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ contactPerson: 'Legacy', email: 'l@v.example', isPrimary: true });
  });
});
