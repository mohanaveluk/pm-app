/**
 * Client Master domain model. Mirrors ClientResponseDto
 * (pm-api/src/modules/client/dto/client-response.dto.ts) exactly — unlike the
 * Material API, the Client API is symmetric: the nested sections a client is
 * read with are the nested sections it is written with.
 */

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum ClientAddressType {
  REGISTERED = 'REGISTERED',
  OPERATIONAL = 'OPERATIONAL',
}

export enum ClientContactRole {
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  PROCUREMENT_MANAGER = 'PROCUREMENT_MANAGER',
  ENGINEERING_MANAGER = 'ENGINEERING_MANAGER',
  CONTRACTS_MANAGER = 'CONTRACTS_MANAGER',
  FINANCE_CONTACT = 'FINANCE_CONTACT',
  DOCUMENT_CONTROLLER = 'DOCUMENT_CONTROLLER',
  OTHER = 'OTHER',
}

export enum PreferredContactMethod {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  MOBILE = 'MOBILE',
}

export enum ClientDocumentType {
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
  TAX_CERTIFICATE = 'TAX_CERTIFICATE',
  CONTRACT_FRAMEWORK = 'CONTRACT_FRAMEWORK',
  NDA = 'NDA',
  CLIENT_SPECIFICATION = 'CLIENT_SPECIFICATION',
  DOCUMENT_TEMPLATE = 'DOCUMENT_TEMPLATE',
  PROCUREMENT_PROCEDURE = 'PROCUREMENT_PROCEDURE',
  OTHER = 'OTHER',
}

export enum LegalEntityType {
  CORPORATION = 'CORPORATION',
  LIMITED_LIABILITY_COMPANY = 'LIMITED_LIABILITY_COMPANY',
  PARTNERSHIP = 'PARTNERSHIP',
  SOLE_PROPRIETORSHIP = 'SOLE_PROPRIETORSHIP',
  JOINT_VENTURE = 'JOINT_VENTURE',
  STATE_OWNED_ENTERPRISE = 'STATE_OWNED_ENTERPRISE',
  GOVERNMENT_ENTITY = 'GOVERNMENT_ENTITY',
  NON_PROFIT = 'NON_PROFIT',
  OTHER = 'OTHER',
}

export enum MeasurementSystem {
  METRIC = 'METRIC',
  IMPERIAL = 'IMPERIAL',
  US_CUSTOMARY = 'US_CUSTOMARY',
}

export enum ClientAuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  ACTIVATED = 'ACTIVATED',
  DEACTIVATED = 'DEACTIVATED',
  DOCUMENT_ADDED = 'DOCUMENT_ADDED',
  DOCUMENT_REMOVED = 'DOCUMENT_REMOVED',
  DELETED = 'DELETED',
}

// ── Records ─────────────────────────────────────────────────────────────

export interface ClientAddress {
  id: string;
  addressType: ClientAddressType;
  label: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  /** ISO 3166-1 alpha-2. */
  countryCode: string | null;
  isActive: boolean;
}

export interface ClientContact {
  id: string;
  contactName: string;
  jobTitle: string | null;
  department: string | null;
  contactRole: ClientContactRole | null;
  email: string | null;
  /** Stored as "+<code> <number>" — see splitPhone / joinPhone. */
  phone: string | null;
  mobile: string | null;
  preferredContactMethod: PreferredContactMethod | null;
  isPrimary: boolean;
  isProjectContact: boolean;
  isProcurementContact: boolean;
  isFinanceContact: boolean;
  isActive: boolean;
}

export interface ClientDocument {
  id: string;
  documentType: ClientDocumentType;
  documentName: string;
  documentNumber: string | null;
  /** YYYY-MM-DD */
  issueDate: string | null;
  /** YYYY-MM-DD */
  expiryDate: string | null;
  documentUrl: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  documentVersion: string | null;
  remarks: string | null;
  uploadedBy: string | null;
  uploadedAt: string | null;
  isExpired: boolean;
}

export interface ClientCommercial {
  legalEntityName: string | null;
  legalEntityType: LegalEntityType | null;
  registrationNumber: string | null;
  taxRegistrationNumber: string | null;
  externalBusinessId: string | null;
  contractingEntityName: string | null;
  defaultCurrencyCode: string | null;
  defaultPaymentTerms: string | null;
  contractReferenceFormat: string | null;
  purchaseOrderReferenceFormat: string | null;
  defaultIncoterms: string | null;
  taxRegion: string | null;
  dateFormat: string | null;
}

export interface ClientProjectDefaults {
  defaultProjectTypeId: string | null;
  defaultProjectTypeName: string | null;
  defaultProjectCurrencyCode: string | null;
  measurementSystem: MeasurementSystem | null;
  documentNumberingScheme: string | null;
  defaultWbsTemplate: string | null;
  defaultCostCodeScheme: string | null;
  defaultApprovalWorkflow: string | null;
  defaultProcurementTerms: string | null;
  documentPortalUrl: string | null;
  requiresClientApproval: boolean;
  requiresDocumentControl: boolean;
}

/** A row of the list: identity, classification and the primary contact. */
export interface ClientListItem {
  id: string;
  code: string;
  clientName: string;
  displayName: string | null;
  clientTypeId: string;
  clientTypeName: string | null;
  industryCategoryId: string | null;
  industryCategoryName: string | null;
  parentClientId: string | null;
  parentClientName: string | null;
  countryCode: string | null;
  website: string | null;
  status: ClientStatus;
  isActive: boolean;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client extends ClientListItem {
  dguid: string;
  organizationId: string;
  description: string | null;
  notes: string | null;
  /** Incremented on every update; sent back so a concurrent change is detected. */
  version: number;

  operationalAddressSameAsRegistered: boolean;
  timeZone: string | null;
  preferredLanguage: string | null;

  addresses: ClientAddress[];
  contacts: ClientContact[];
  documents: ClientDocument[];
  commercial: ClientCommercial;
  projectDefaults: ClientProjectDefaults;

  deactivatedBy: string | null;
  deactivatedAt: string | null;
  deactivationReason: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

/** An entry of the parent-client dropdown — GET /clients/active. */
export interface ClientOption {
  id: string;
  code: string;
  clientName: string;
  displayName: string | null;
  clientTypeId: string;
  countryCode: string | null;
  /** Defaults a project created for this client starts from (all optional). */
  defaultCurrencyCode?: string | null;
  defaultProjectCurrencyCode?: string | null;
  defaultProjectTypeId?: string | null;
  measurementSystem?: MeasurementSystem | null;
  timeZone?: string | null;
}

export interface ClientAuditEntry {
  id: string;
  action: ClientAuditAction;
  summary: string | null;
  changes: Array<{ field: string; from: string | null; to: string | null }> | null;
  performedBy: string | null;
  version: number | null;
  createdAt: string;
}

// ── List state ──────────────────────────────────────────────────────────

/** Only these are accepted by the backend's ClientQueryDto.sortBy. */
export type ClientSortField =
  | 'code' | 'clientName' | 'clientType' | 'industryCategory'
  | 'countryCode' | 'status' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface ClientFilter {
  search: string;
  clientTypeId: string | null;
  industryCategoryId: string | null;
  countryCode: string | null;
  status: ClientStatus | null;
}

export const DEFAULT_CLIENT_FILTER: ClientFilter = {
  search: '',
  clientTypeId: null,
  industryCategoryId: null,
  countryCode: null,
  status: null,
};

// ── Option lists ────────────────────────────────────────────────────────

export interface EnumOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export const CLIENT_STATUS_OPTIONS: readonly EnumOption<ClientStatus>[] = [
  { value: ClientStatus.ACTIVE, label: 'Active', hint: 'Available for new projects and documents' },
  { value: ClientStatus.INACTIVE, label: 'Inactive', hint: 'Kept for history, not offered for new work' },
];

export const CONTACT_ROLE_OPTIONS: readonly EnumOption<ClientContactRole>[] = [
  { value: ClientContactRole.PROJECT_MANAGER, label: 'Project Manager' },
  { value: ClientContactRole.PROCUREMENT_MANAGER, label: 'Procurement Manager' },
  { value: ClientContactRole.ENGINEERING_MANAGER, label: 'Engineering Manager' },
  { value: ClientContactRole.CONTRACTS_MANAGER, label: 'Contracts Manager' },
  { value: ClientContactRole.FINANCE_CONTACT, label: 'Finance Contact' },
  { value: ClientContactRole.DOCUMENT_CONTROLLER, label: 'Document Controller' },
  { value: ClientContactRole.OTHER, label: 'Other' },
];

export const PREFERRED_CONTACT_METHOD_OPTIONS: readonly EnumOption<PreferredContactMethod>[] = [
  { value: PreferredContactMethod.EMAIL, label: 'Email' },
  { value: PreferredContactMethod.PHONE, label: 'Phone' },
  { value: PreferredContactMethod.MOBILE, label: 'Mobile' },
];

export const CLIENT_DOCUMENT_TYPE_OPTIONS: readonly EnumOption<ClientDocumentType>[] = [
  { value: ClientDocumentType.BUSINESS_REGISTRATION, label: 'Business Registration Certificate' },
  { value: ClientDocumentType.TAX_CERTIFICATE, label: 'Tax Certificate' },
  { value: ClientDocumentType.CONTRACT_FRAMEWORK, label: 'Contract Framework' },
  { value: ClientDocumentType.NDA, label: 'NDA' },
  { value: ClientDocumentType.CLIENT_SPECIFICATION, label: 'Client Specification' },
  { value: ClientDocumentType.DOCUMENT_TEMPLATE, label: 'Approved Document Template' },
  { value: ClientDocumentType.PROCUREMENT_PROCEDURE, label: 'Client Procurement Procedure' },
  { value: ClientDocumentType.OTHER, label: 'Other' },
];

export const LEGAL_ENTITY_TYPE_OPTIONS: readonly EnumOption<LegalEntityType>[] = [
  { value: LegalEntityType.CORPORATION, label: 'Corporation' },
  { value: LegalEntityType.LIMITED_LIABILITY_COMPANY, label: 'Limited Liability Company' },
  { value: LegalEntityType.PARTNERSHIP, label: 'Partnership' },
  { value: LegalEntityType.SOLE_PROPRIETORSHIP, label: 'Sole Proprietorship' },
  { value: LegalEntityType.JOINT_VENTURE, label: 'Joint Venture' },
  { value: LegalEntityType.STATE_OWNED_ENTERPRISE, label: 'State-Owned Enterprise' },
  { value: LegalEntityType.GOVERNMENT_ENTITY, label: 'Government Entity' },
  { value: LegalEntityType.NON_PROFIT, label: 'Non-Profit' },
  { value: LegalEntityType.OTHER, label: 'Other' },
];

export const MEASUREMENT_SYSTEM_OPTIONS: readonly EnumOption<MeasurementSystem>[] = [
  { value: MeasurementSystem.METRIC, label: 'Metric (SI)' },
  { value: MeasurementSystem.IMPERIAL, label: 'Imperial' },
  { value: MeasurementSystem.US_CUSTOMARY, label: 'US Customary' },
];

/** Incoterms 2020. */
export const INCOTERM_OPTIONS: readonly EnumOption<string>[] = [
  { value: 'EXW', label: 'EXW — Ex Works' },
  { value: 'FCA', label: 'FCA — Free Carrier' },
  { value: 'CPT', label: 'CPT — Carriage Paid To' },
  { value: 'CIP', label: 'CIP — Carriage and Insurance Paid To' },
  { value: 'DAP', label: 'DAP — Delivered At Place' },
  { value: 'DPU', label: 'DPU — Delivered At Place Unloaded' },
  { value: 'DDP', label: 'DDP — Delivered Duty Paid' },
  { value: 'FAS', label: 'FAS — Free Alongside Ship' },
  { value: 'FOB', label: 'FOB — Free On Board' },
  { value: 'CFR', label: 'CFR — Cost and Freight' },
  { value: 'CIF', label: 'CIF — Cost, Insurance and Freight' },
];

export const DATE_FORMAT_OPTIONS: readonly string[] = [
  'DD-MMM-YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD',
];

export const LANGUAGE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'hi', label: 'Hindi' },
];

/** ISO 4217 currencies offered in the currency dropdowns. */
export const CURRENCY_OPTIONS: readonly { code: string; name: string }[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'Pound Sterling' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'KES', name: 'Kenyan Shilling' },
];

/** Time zones offered in the picker; falls back to a short list on older browsers. */
export function timeZoneOptions(): readonly string[] {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    const list = supported?.('timeZone');
    if (list?.length) return list;
  } catch {
    // Fall through to the short list.
  }
  return [
    'UTC', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Kolkata',
    'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'America/New_York', 'America/Chicago',
    'America/Denver', 'America/Los_Angeles',
  ];
}

// ── Labels ──────────────────────────────────────────────────────────────

const LABELS: Record<string, string> = {
  ...Object.fromEntries(CLIENT_STATUS_OPTIONS.map((o) => [o.value, o.label])),
  ...Object.fromEntries(CONTACT_ROLE_OPTIONS.map((o) => [o.value, o.label])),
  ...Object.fromEntries(PREFERRED_CONTACT_METHOD_OPTIONS.map((o) => [o.value, o.label])),
  ...Object.fromEntries(CLIENT_DOCUMENT_TYPE_OPTIONS.map((o) => [o.value, o.label])),
  ...Object.fromEntries(LEGAL_ENTITY_TYPE_OPTIONS.map((o) => [o.value, o.label])),
  ...Object.fromEntries(MEASUREMENT_SYSTEM_OPTIONS.map((o) => [o.value, o.label])),
  ...Object.fromEntries(INCOTERM_OPTIONS.map((o) => [o.value, o.label])),
  ADVANCE: 'Advance', NET_15: 'Net 15 days', NET_30: 'Net 30 days', NET_45: 'Net 45 days',
  NET_60: 'Net 60 days', NET_90: 'Net 90 days', MILESTONE_BASED: 'Milestone based',
  LETTER_OF_CREDIT: 'Letter of Credit',
  [ClientAddressType.REGISTERED]: 'Registered Office',
  [ClientAddressType.OPERATIONAL]: 'Operational Office',
};

/** Turns an enum value into its human label, falling back to the raw value. */
export function clientLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return LABELS[value] ?? value.replace(/_/g, ' ');
}

/** Human names for the field keys the audit history reports. */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  clientName: 'Client name', displayName: 'Display name', clientTypeId: 'Client type',
  industryCategoryId: 'Industry category', parentClientId: 'Parent client', website: 'Website',
  countryCode: 'Country of registration', description: 'Description', notes: 'Notes',
  operationalAddressSameAsRegistered: 'Operational address same as registered',
  timeZone: 'Time zone', preferredLanguage: 'Preferred language',
  legalEntityName: 'Legal entity name', legalEntityType: 'Legal entity type',
  registrationNumber: 'Registration number', taxRegistrationNumber: 'Tax registration number',
  externalBusinessId: 'External business ID', contractingEntityName: 'Contracting entity',
  defaultCurrencyCode: 'Default currency', defaultPaymentTerms: 'Payment terms',
  contractReferenceFormat: 'Contract reference format',
  purchaseOrderReferenceFormat: 'Purchase order reference format',
  defaultIncoterms: 'Default Incoterms', taxRegion: 'Tax region', dateFormat: 'Date format',
  defaultProjectTypeId: 'Default project type', defaultProjectCurrencyCode: 'Project currency',
  measurementSystem: 'Measurement system', documentNumberingScheme: 'Document numbering scheme',
  defaultWbsTemplate: 'WBS template', defaultCostCodeScheme: 'Cost code scheme',
  defaultApprovalWorkflow: 'Approval workflow', defaultProcurementTerms: 'Procurement terms',
  documentPortalUrl: 'Document portal URL', requiresClientApproval: 'Requires client approval',
  requiresDocumentControl: 'Document control required',
  addresses: 'Addresses', contacts: 'Contacts',
};
