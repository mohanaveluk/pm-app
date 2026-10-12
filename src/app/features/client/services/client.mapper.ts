import { joinPhone, splitPhone } from '../../../shared/reference/countries';
import {
  Client, ClientAddress, ClientAddressType, ClientContact, ClientContactRole,
  LegalEntityType, MeasurementSystem, PreferredContactMethod,
} from '../models/client.model';
import {
  ClientAddressRequest, ClientContactRequest, CreateClientRequest, UpdateClientRequest,
} from '../models/client-request.model';

/**
 * Unlike the Material API, the Client API is symmetric: a client is read with
 * the same nested sections it is written with. The only translation needed is
 * between those sections and the form, whose phone numbers are split into a
 * dial code and a local number, whose blanks are '' rather than null, and whose
 * addresses are a registered group plus a list of operational ones.
 *
 *   API detail --toClientFormValue--> form --toClientRequest--> API create/update
 */

export interface AddressFormValue {
  /** Server id of an existing address; '' for one not saved yet. */
  id: string;
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  isActive: boolean;
}

export interface ContactFormValue {
  id: string;
  contactName: string;
  jobTitle: string;
  department: string;
  contactRole: ClientContactRole | '';
  email: string;
  phoneCode: string;
  phoneNumber: string;
  mobileCode: string;
  mobileNumber: string;
  preferredContactMethod: PreferredContactMethod | '';
  isPrimary: boolean;
  isProjectContact: boolean;
  isProcurementContact: boolean;
  isFinanceContact: boolean;
  isActive: boolean;
}

/** Shape of the workspace form's `getRawValue()`. */
export interface ClientFormValue {
  general: {
    clientName: string;
    displayName: string;
    clientTypeId: string;
    industryCategoryId: string;
    parentClientId: string;
    countryCode: string;
    website: string;
    description: string;
    notes: string;
  };
  addresses: {
    operationalAddressSameAsRegistered: boolean;
    timeZone: string;
    preferredLanguage: string;
    registered: AddressFormValue;
    operational: AddressFormValue[];
  };
  contacts: {
    items: ContactFormValue[];
  };
  commercial: {
    legalEntityName: string;
    legalEntityType: LegalEntityType | '';
    registrationNumber: string;
    taxRegistrationNumber: string;
    externalBusinessId: string;
    contractingEntityName: string;
    defaultCurrencyCode: string;
    defaultPaymentTerms: string;
    contractReferenceFormat: string;
    purchaseOrderReferenceFormat: string;
    defaultIncoterms: string;
    taxRegion: string;
    dateFormat: string;
  };
  defaults: {
    defaultProjectTypeId: string;
    defaultProjectCurrencyCode: string;
    measurementSystem: MeasurementSystem | '';
    documentNumberingScheme: string;
    defaultWbsTemplate: string;
    defaultCostCodeScheme: string;
    defaultApprovalWorkflow: string;
    defaultProcurementTerms: string;
    documentPortalUrl: string;
    requiresClientApproval: boolean;
    requiresDocumentControl: boolean;
  };
}

export type ClientSectionKey = 'general' | 'addresses' | 'contacts' | 'commercial' | 'defaults' | 'documents';

// ── Defaults ────────────────────────────────────────────────────────────

export function blankAddress(): AddressFormValue {
  return {
    id: '', label: '', addressLine1: '', addressLine2: '', city: '', state: '',
    postalCode: '', countryCode: '', isActive: true,
  };
}

export function blankContact(): ContactFormValue {
  return {
    id: '', contactName: '', jobTitle: '', department: '', contactRole: '', email: '',
    phoneCode: '', phoneNumber: '', mobileCode: '', mobileNumber: '',
    preferredContactMethod: '', isPrimary: false, isProjectContact: false,
    isProcurementContact: false, isFinanceContact: false, isActive: true,
  };
}

export function blankClientFormValue(): ClientFormValue {
  return {
    general: {
      clientName: '', displayName: '', clientTypeId: '', industryCategoryId: '',
      parentClientId: '', countryCode: '', website: '', description: '', notes: '',
    },
    addresses: {
      operationalAddressSameAsRegistered: true, timeZone: '', preferredLanguage: '',
      registered: blankAddress(), operational: [],
    },
    contacts: { items: [] },
    commercial: {
      legalEntityName: '', legalEntityType: '', registrationNumber: '', taxRegistrationNumber: '',
      externalBusinessId: '', contractingEntityName: '', defaultCurrencyCode: '',
      defaultPaymentTerms: '', contractReferenceFormat: '', purchaseOrderReferenceFormat: '',
      defaultIncoterms: '', taxRegion: '', dateFormat: '',
    },
    defaults: {
      defaultProjectTypeId: '', defaultProjectCurrencyCode: '', measurementSystem: '',
      documentNumberingScheme: '', defaultWbsTemplate: '', defaultCostCodeScheme: '',
      defaultApprovalWorkflow: '', defaultProcurementTerms: '', documentPortalUrl: '',
      requiresClientApproval: false, requiresDocumentControl: false,
    },
  };
}

// ── API → form ──────────────────────────────────────────────────────────

const s = (value: string | null | undefined): string => value ?? '';

function toAddressForm(a: ClientAddress): AddressFormValue {
  return {
    id: a.id,
    label: s(a.label),
    addressLine1: s(a.addressLine1),
    addressLine2: s(a.addressLine2),
    city: s(a.city),
    state: s(a.state),
    postalCode: s(a.postalCode),
    countryCode: s(a.countryCode),
    isActive: a.isActive,
  };
}

function toContactForm(c: ClientContact): ContactFormValue {
  const phone = splitPhone(c.phone);
  const mobile = splitPhone(c.mobile);
  return {
    id: c.id,
    contactName: c.contactName,
    jobTitle: s(c.jobTitle),
    department: s(c.department),
    contactRole: c.contactRole ?? '',
    email: s(c.email),
    phoneCode: phone.dialCode,
    phoneNumber: phone.number,
    mobileCode: mobile.dialCode,
    mobileNumber: mobile.number,
    preferredContactMethod: c.preferredContactMethod ?? '',
    isPrimary: c.isPrimary,
    isProjectContact: c.isProjectContact,
    isProcurementContact: c.isProcurementContact,
    isFinanceContact: c.isFinanceContact,
    isActive: c.isActive,
  };
}

export function toClientFormValue(client: Client): ClientFormValue {
  const registered = client.addresses.find((a) => a.addressType === ClientAddressType.REGISTERED);
  const operational = client.addresses.filter((a) => a.addressType === ClientAddressType.OPERATIONAL);
  const c = client.commercial;
  const d = client.projectDefaults;

  return {
    general: {
      clientName: client.clientName,
      displayName: s(client.displayName),
      clientTypeId: client.clientTypeId,
      industryCategoryId: s(client.industryCategoryId),
      parentClientId: s(client.parentClientId),
      countryCode: s(client.countryCode),
      website: s(client.website),
      description: s(client.description),
      notes: s(client.notes),
    },
    addresses: {
      operationalAddressSameAsRegistered: client.operationalAddressSameAsRegistered,
      timeZone: s(client.timeZone),
      preferredLanguage: s(client.preferredLanguage),
      registered: registered ? toAddressForm(registered) : blankAddress(),
      operational: operational.map(toAddressForm),
    },
    contacts: { items: client.contacts.map(toContactForm) },
    commercial: {
      legalEntityName: s(c.legalEntityName),
      legalEntityType: c.legalEntityType ?? '',
      registrationNumber: s(c.registrationNumber),
      taxRegistrationNumber: s(c.taxRegistrationNumber),
      externalBusinessId: s(c.externalBusinessId),
      contractingEntityName: s(c.contractingEntityName),
      defaultCurrencyCode: s(c.defaultCurrencyCode),
      defaultPaymentTerms: s(c.defaultPaymentTerms),
      contractReferenceFormat: s(c.contractReferenceFormat),
      purchaseOrderReferenceFormat: s(c.purchaseOrderReferenceFormat),
      defaultIncoterms: s(c.defaultIncoterms),
      taxRegion: s(c.taxRegion),
      dateFormat: s(c.dateFormat),
    },
    defaults: {
      defaultProjectTypeId: s(d.defaultProjectTypeId),
      defaultProjectCurrencyCode: s(d.defaultProjectCurrencyCode),
      measurementSystem: d.measurementSystem ?? '',
      documentNumberingScheme: s(d.documentNumberingScheme),
      defaultWbsTemplate: s(d.defaultWbsTemplate),
      defaultCostCodeScheme: s(d.defaultCostCodeScheme),
      defaultApprovalWorkflow: s(d.defaultApprovalWorkflow),
      defaultProcurementTerms: s(d.defaultProcurementTerms),
      documentPortalUrl: s(d.documentPortalUrl),
      requiresClientApproval: d.requiresClientApproval,
      requiresDocumentControl: d.requiresDocumentControl,
    },
  };
}

// ── form → API ──────────────────────────────────────────────────────────

/** '' → null: on update that is how a cleared field is told apart from an omitted one. */
const n = (value: string | null | undefined): string | null => {
  const t = (value ?? '').trim();
  return t ? t : null;
};

function hasAddressContent(a: AddressFormValue): boolean {
  return !!(a.label.trim() || a.addressLine1.trim() || a.addressLine2.trim() || a.city.trim()
    || a.state.trim() || a.postalCode.trim() || a.countryCode.trim());
}

function toAddressRequest(a: AddressFormValue, addressType: ClientAddressType): ClientAddressRequest {
  return {
    ...(a.id ? { id: a.id } : {}),
    addressType,
    label: n(a.label),
    addressLine1: n(a.addressLine1),
    addressLine2: n(a.addressLine2),
    city: n(a.city),
    state: n(a.state),
    postalCode: n(a.postalCode),
    countryCode: n(a.countryCode),
    isActive: a.isActive,
  };
}

function toContactRequest(c: ContactFormValue): ClientContactRequest {
  return {
    ...(c.id ? { id: c.id } : {}),
    contactName: c.contactName.trim(),
    jobTitle: n(c.jobTitle),
    department: n(c.department),
    contactRole: c.contactRole || null,
    email: n(c.email),
    phone: n(joinPhone(c.phoneCode, c.phoneNumber)),
    mobile: n(joinPhone(c.mobileCode, c.mobileNumber)),
    preferredContactMethod: c.preferredContactMethod || null,
    isPrimary: c.isPrimary,
    isProjectContact: c.isProjectContact,
    isProcurementContact: c.isProcurementContact,
    isFinanceContact: c.isFinanceContact,
    isActive: c.isActive,
  };
}

/**
 * Builds the full request from the form. `addresses` always carries the
 * complete set (the API removes whatever is not listed), so an operational
 * office the user has deleted — or all of them, once "same as registered" is
 * switched on — disappears on save.
 */
export function toClientRequest(v: ClientFormValue): CreateClientRequest {
  const g = v.general;
  const a = v.addresses;
  const c = v.commercial;
  const d = v.defaults;

  const addresses: ClientAddressRequest[] = [];
  if (hasAddressContent(a.registered)) {
    addresses.push(toAddressRequest(a.registered, ClientAddressType.REGISTERED));
  }
  if (!a.operationalAddressSameAsRegistered) {
    for (const op of a.operational) {
      if (hasAddressContent(op)) addresses.push(toAddressRequest(op, ClientAddressType.OPERATIONAL));
    }
  }

  const request: CreateClientRequest = {
    clientName: g.clientName.trim(),
    displayName: n(g.displayName),
    clientTypeId: g.clientTypeId,
    industryCategoryId: n(g.industryCategoryId),
    parentClientId: n(g.parentClientId),
    website: n(g.website),
    countryCode: n(g.countryCode),
    description: n(g.description),
    notes: n(g.notes),

    operationalAddressSameAsRegistered: a.operationalAddressSameAsRegistered,
    timeZone: n(a.timeZone),
    preferredLanguage: n(a.preferredLanguage),
    addresses,
    contacts: v.contacts.items
      .filter((x) => x.contactName.trim())
      .map(toContactRequest),

    commercial: {
      legalEntityName: n(c.legalEntityName),
      legalEntityType: c.legalEntityType || null,
      registrationNumber: n(c.registrationNumber),
      taxRegistrationNumber: n(c.taxRegistrationNumber),
      externalBusinessId: n(c.externalBusinessId),
      contractingEntityName: n(c.contractingEntityName),
      defaultCurrencyCode: n(c.defaultCurrencyCode),
      defaultPaymentTerms: n(c.defaultPaymentTerms),
      contractReferenceFormat: n(c.contractReferenceFormat),
      purchaseOrderReferenceFormat: n(c.purchaseOrderReferenceFormat),
      defaultIncoterms: n(c.defaultIncoterms),
      taxRegion: n(c.taxRegion),
      dateFormat: n(c.dateFormat),
    } as CreateClientRequest['commercial'],

    projectDefaults: {
      defaultProjectTypeId: n(d.defaultProjectTypeId),
      defaultProjectCurrencyCode: n(d.defaultProjectCurrencyCode),
      measurementSystem: d.measurementSystem || null,
      documentNumberingScheme: n(d.documentNumberingScheme),
      defaultWbsTemplate: n(d.defaultWbsTemplate),
      defaultCostCodeScheme: n(d.defaultCostCodeScheme),
      defaultApprovalWorkflow: n(d.defaultApprovalWorkflow),
      defaultProcurementTerms: n(d.defaultProcurementTerms),
      documentPortalUrl: n(d.documentPortalUrl),
      requiresClientApproval: d.requiresClientApproval,
      requiresDocumentControl: d.requiresDocumentControl,
    },
  };

  return request;
}

/**
 * Narrows a full request to one workspace step, so saving the Contacts step
 * never rewrites the Commercial section (and vice versa). The Documents step
 * has no fields of its own — its records are managed through dedicated
 * endpoints — so it contributes nothing.
 */
export function pickClientSection(
  request: CreateClientRequest,
  key: ClientSectionKey,
): UpdateClientRequest {
  switch (key) {
    case 'general':
      return {
        clientName: request.clientName,
        displayName: request.displayName,
        clientTypeId: request.clientTypeId,
        industryCategoryId: request.industryCategoryId,
        parentClientId: request.parentClientId,
        website: request.website,
        countryCode: request.countryCode,
        description: request.description,
        notes: request.notes,
      };
    case 'addresses':
      return {
        operationalAddressSameAsRegistered: request.operationalAddressSameAsRegistered,
        timeZone: request.timeZone,
        preferredLanguage: request.preferredLanguage,
        addresses: request.addresses,
      };
    case 'contacts':
      return { contacts: request.contacts };
    case 'commercial':
      return { commercial: request.commercial };
    case 'defaults':
      return { projectDefaults: request.projectDefaults };
    case 'documents':
      return {};
  }
}
