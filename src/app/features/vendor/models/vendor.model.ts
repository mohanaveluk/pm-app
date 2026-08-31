/**
 * Vendor Master domain model.
 *
 * Every enum and interface here mirrors the pm-api Vendor module exactly
 * (`pm-api/src/modules/vendor/`). Nothing is invented: where the API has no
 * field, the UI has no field either.
 */

// ── Enums (mirror pm-api/src/modules/vendor/enums) ─────────────────────────

// Vendor Type is no longer a fixed enum — it is administrable, organization-
// scoped master data. See ../../vendor-type/models/vendor-type.model.ts and
// GET /vendor-types/active.

export enum VendorStatus {
  UNDER_EVALUATION = 'UNDER_EVALUATION',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLACKLISTED = 'BLACKLISTED',
}

export enum VendorClassification {
  PREFERRED = 'PREFERRED',
  APPROVED = 'APPROVED',
  CONDITIONAL = 'CONDITIONAL',
  REJECTED = 'REJECTED',
}

export enum RiskCategory {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum ReviewCycle {
  ANNUAL = 'ANNUAL',
  BIENNIAL = 'BIENNIAL',
}

export enum TaxDocumentType {
  GST = 'GST',
  VAT = 'VAT',
  TIN = 'TIN',
  EIN = 'EIN',
  PAN = 'PAN',
  NATIONAL_TAX_ID = 'NATIONAL_TAX_ID',
  OTHER = 'OTHER',
}

export enum PaymentTerms {
  ADVANCE = 'ADVANCE',
  NET_15 = 'NET_15',
  NET_30 = 'NET_30',
  NET_45 = 'NET_45',
  NET_60 = 'NET_60',
  NET_90 = 'NET_90',
  MILESTONE_BASED = 'MILESTONE_BASED',
  LETTER_OF_CREDIT = 'LETTER_OF_CREDIT',
  OTHER = 'OTHER',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  ONLINE = 'ONLINE',
  LETTER_OF_CREDIT = 'LETTER_OF_CREDIT',
  OTHER = 'OTHER',
}

export enum DeliveryCapability {
  LOCAL = 'LOCAL',
  INTERNATIONAL = 'INTERNATIONAL',
  BOTH = 'BOTH',
}

/** Shared with Material Master — the API reuses that module's enum. */
export enum TransportationMode {
  AIR = 'AIR',
  SEA = 'SEA',
  ROAD = 'ROAD',
  RAIL = 'RAIL',
  MULTIMODAL = 'MULTIMODAL',
  COURIER = 'COURIER',
}

export enum VendorAddressType {
  REGISTERED = 'REGISTERED',
  CORPORATE = 'CORPORATE',
  FACTORY = 'FACTORY',
  WORKSHOP = 'WORKSHOP',
  WAREHOUSE = 'WAREHOUSE',
  BRANCH = 'BRANCH',
  SITE_OFFICE = 'SITE_OFFICE',
}

export enum VendorDocumentType {
  COMPANY_PROFILE = 'COMPANY_PROFILE',
  TRADE_LICENSE = 'TRADE_LICENSE',
  TAX_REGISTRATION = 'TAX_REGISTRATION',
  BANK_LETTER = 'BANK_LETTER',
  CANCELLED_CHEQUE = 'CANCELLED_CHEQUE',
  ISO_CERTIFICATE = 'ISO_CERTIFICATE',
  PRODUCT_CATALOGUE = 'PRODUCT_CATALOGUE',
  FINANCIAL_STATEMENT = 'FINANCIAL_STATEMENT',
  HSE_POLICY = 'HSE_POLICY',
  PAST_PO = 'PAST_PO',
  CLIENT_TESTIMONIAL = 'CLIENT_TESTIMONIAL',
  INSURANCE = 'INSURANCE',
  OTHER = 'OTHER',
}

export enum EvaluationStage {
  TECHNICAL = 'TECHNICAL',
  COMMERCIAL = 'COMMERCIAL',
  QUALITY_HSE = 'QUALITY_HSE',
  FINANCE = 'FINANCE',
  PROCUREMENT = 'PROCUREMENT',
  FINAL = 'FINAL',
}

/**
 * An in-flight status change awaiting manager approval.
 *
 * Deliberately separate from VendorStatus: a vendor whose blacklisting is only
 * *requested* is not yet blacklisted — its settled status stays put until a
 * manager decides, and reverts cleanly if the request is rejected.
 */
export enum PendingStatusChange {
  PENDING_BLACKLIST = 'PENDING_BLACKLIST',
  PENDING_UNBLACKLIST = 'PENDING_UNBLACKLIST',
}

export enum StatusChangeRequestType {
  BLACKLIST = 'BLACKLIST',
  UNBLACKLIST = 'UNBLACKLIST',
}

export enum StatusChangeRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum EvaluationDecision {
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
  ON_HOLD = 'ON_HOLD',
}

// ── Select options ─────────────────────────────────────────────────────────

export interface EnumOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export const VENDOR_STATUS_OPTIONS: readonly EnumOption<VendorStatus>[] = [
  { value: VendorStatus.UNDER_EVALUATION, label: 'Under Evaluation' },
  { value: VendorStatus.ACTIVE, label: 'Active' },
  { value: VendorStatus.INACTIVE, label: 'Inactive' },
  { value: VendorStatus.BLACKLISTED, label: 'Blacklisted' },
];

export const VENDOR_CLASSIFICATION_OPTIONS: readonly EnumOption<VendorClassification>[] = [
  { value: VendorClassification.PREFERRED, label: 'Preferred', hint: 'First choice for enquiry and award' },
  { value: VendorClassification.APPROVED, label: 'Approved', hint: 'Fully qualified, on the AVL' },
  { value: VendorClassification.CONDITIONAL, label: 'Conditional', hint: 'Usable with restrictions or oversight' },
  { value: VendorClassification.REJECTED, label: 'Rejected', hint: 'Failed qualification' },
];

/** Every address type vendor_addresses accepts, in the order EPC users expect. */
export const VENDOR_ADDRESS_TYPE_OPTIONS: readonly EnumOption<VendorAddressType>[] = [
  { value: VendorAddressType.REGISTERED, label: 'Registered', hint: 'Legal registered office' },
  { value: VendorAddressType.CORPORATE, label: 'Corporate', hint: 'Head or corporate office' },
  { value: VendorAddressType.FACTORY, label: 'Factory' },
  { value: VendorAddressType.WORKSHOP, label: 'Workshop' },
  { value: VendorAddressType.WAREHOUSE, label: 'Warehouse' },
  { value: VendorAddressType.BRANCH, label: 'Branch' },
  { value: VendorAddressType.SITE_OFFICE, label: 'Site Office' },
];

export const PENDING_STATUS_OPTIONS: readonly EnumOption<PendingStatusChange>[] = [
  { value: PendingStatusChange.PENDING_BLACKLIST, label: 'Blacklist requested' },
  { value: PendingStatusChange.PENDING_UNBLACKLIST, label: 'Un-blacklist requested' },
];

export const RISK_CATEGORY_OPTIONS: readonly EnumOption<RiskCategory>[] = [
  { value: RiskCategory.LOW, label: 'Low' },
  { value: RiskCategory.MEDIUM, label: 'Medium' },
  { value: RiskCategory.HIGH, label: 'High' },
];

export const REVIEW_CYCLE_OPTIONS: readonly EnumOption<ReviewCycle>[] = [
  { value: ReviewCycle.ANNUAL, label: 'Annual' },
  { value: ReviewCycle.BIENNIAL, label: 'Biennial' },
];

export const TAX_DOCUMENT_TYPE_OPTIONS: readonly EnumOption<TaxDocumentType>[] = [
  { value: TaxDocumentType.GST, label: 'GST' },
  { value: TaxDocumentType.VAT, label: 'VAT' },
  { value: TaxDocumentType.TIN, label: 'TIN' },
  { value: TaxDocumentType.EIN, label: 'EIN' },
  { value: TaxDocumentType.PAN, label: 'PAN' },
  { value: TaxDocumentType.NATIONAL_TAX_ID, label: 'National Tax ID' },
  { value: TaxDocumentType.OTHER, label: 'Other' },
];

export const PAYMENT_TERMS_OPTIONS: readonly EnumOption<PaymentTerms>[] = [
  { value: PaymentTerms.ADVANCE, label: 'Advance' },
  { value: PaymentTerms.NET_15, label: 'Net 15 days' },
  { value: PaymentTerms.NET_30, label: 'Net 30 days' },
  { value: PaymentTerms.NET_45, label: 'Net 45 days' },
  { value: PaymentTerms.NET_60, label: 'Net 60 days' },
  { value: PaymentTerms.NET_90, label: 'Net 90 days' },
  { value: PaymentTerms.MILESTONE_BASED, label: 'Milestone based' },
  { value: PaymentTerms.LETTER_OF_CREDIT, label: 'Letter of Credit' },
  { value: PaymentTerms.OTHER, label: 'Other' },
];

export const PAYMENT_METHOD_OPTIONS: readonly EnumOption<PaymentMethod>[] = [
  { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer' },
  { value: PaymentMethod.CHEQUE, label: 'Cheque' },
  { value: PaymentMethod.ONLINE, label: 'Online' },
  { value: PaymentMethod.LETTER_OF_CREDIT, label: 'Letter of Credit' },
  { value: PaymentMethod.OTHER, label: 'Other' },
];

export const DELIVERY_CAPABILITY_OPTIONS: readonly EnumOption<DeliveryCapability>[] = [
  { value: DeliveryCapability.LOCAL, label: 'Local' },
  { value: DeliveryCapability.INTERNATIONAL, label: 'International' },
  { value: DeliveryCapability.BOTH, label: 'Both' },
];

export const TRANSPORT_MODE_OPTIONS: readonly EnumOption<TransportationMode>[] = [
  { value: TransportationMode.AIR, label: 'Air' },
  { value: TransportationMode.SEA, label: 'Sea' },
  { value: TransportationMode.ROAD, label: 'Road' },
  { value: TransportationMode.RAIL, label: 'Rail' },
  { value: TransportationMode.MULTIMODAL, label: 'Multimodal' },
  { value: TransportationMode.COURIER, label: 'Courier' },
];

/**
 * Common industrial standards offered as suggestions on the Technical step.
 * `complianceStandards` is a free-text column server-side, so custom entries
 * are accepted alongside these.
 */
export const COMPLIANCE_STANDARD_SUGGESTIONS: readonly string[] = [
  'API', 'ASTM', 'ASME', 'IS', 'BS', 'EN', 'ISO', 'DIN', 'JIS', 'NACE', 'AWS', 'IEC',
];

// ── Child records ──────────────────────────────────────────────────────────

export interface VendorContact {
  id: string;
  contactPerson: string;
  designation?: string;
  department?: string;
  email?: string;
  mobileNumber?: string;
  landlineNumber?: string;
  isPrimary: boolean;
  isActive: boolean;
  remarks?: string;
}

export interface VendorAddress {
  id: string;
  addressType: VendorAddressType;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  email?: string;
  isPrimary: boolean;
  isActive: boolean;
}

/**
 * Account number, IBAN and SWIFT arrive masked unless the caller holds a
 * sensitive-data role AND asked for `reveal=true`. `isMasked` says which it is,
 * so the UI never has to guess whether it is showing real digits.
 */
export interface VendorBankAccount {
  id: string;
  bankName: string;
  branch?: string;
  accountHolderName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  currency?: string;
  preferredPaymentMethod?: PaymentMethod;
  isPrimary: boolean;
  isActive: boolean;
  isMasked: boolean;
}

export interface VendorCertification {
  id: string;
  certificationName: string;
  certificateNumber?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
  documentUrl?: string;
  scopeOfCertification?: string;
  isActive: boolean;
  /** Derived server-side. */
  isExpired: boolean;
  daysToExpiry?: number;
}

export interface VendorDocument {
  id: string;
  documentType: VendorDocumentType;
  documentUrl: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  version: number;
  supersedesId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  expiryDate?: string;
  isActive: boolean;
  uploadedBy?: string;
  uploadedAt?: string;
}

export interface VendorMaterial {
  id: string;
  materialId: string;
  materialCode?: string;
  materialDescription?: string;
  vendorPartNumber?: string;
  manufacturerPartNumber?: string;
  leadTimeDays?: number;
  minimumOrderQuantity?: number;
  unitPrice?: number;
  currency?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isPreferred: boolean;
  isActive: boolean;
}

export interface VendorTurnover {
  id: string;
  financialYear: number;
  turnover: number;
  currency: string;
  isAudited: boolean;
  financialStatementUrl?: string;
}

export interface VendorEvaluation {
  id: string;
  stage: EvaluationStage;
  decision: EvaluationDecision;
  score?: number;
  referenceNumber?: string;
  comments?: string;
  evaluatedBy: string;
  evaluatedAt: string;
  createdAt: string;
}

export interface VendorPerformance {
  id: string;
  projectId?: string;
  purchaseOrderId?: string;
  evaluationPeriodStart?: string;
  evaluationPeriodEnd?: string;
  qualityScore?: number;
  deliveryScore?: number;
  commercialScore?: number;
  hseScore?: number;
  overallScore?: number;
  remarks?: string;
  evaluatedBy: string;
  evaluatedAt: string;
}

// ── Root records ───────────────────────────────────────────────────────────

/** Mirrors VendorResponseDto. */
export interface Vendor {
  id: string;
  dguid: string;
  organizationId: string;
  /** Server-generated, immutable: <3-char category prefix><6-digit sequence>. */
  code: string;

  vendorName: string;
  vendorDescription?: string;
  tradeName?: string;
  vendorTypeId: string;
  vendorType?: { id: string; code?: string; name?: string };

  industryCategoryId: string;
  industryCategory?: { id: string; code?: string; name?: string };
  parentCompanyId?: string;
  parentCompany?: { id: string; code?: string; vendorName?: string };

  vendorStatus: VendorStatus;
  isActive: boolean;
  blacklistReason?: string;
  blacklistedAt?: string;
  blacklistedBy?: string;

  primaryContactPerson?: string;
  designation?: string;
  email?: string;
  mobileNumber?: string;
  landlineNumber?: string;
  website?: string;
  countryOfRegistration?: string;

  businessRegistrationNumber?: string;
  taxRegistrationNumber?: string;
  taxDocumentNumber?: string;
  taxDocumentType?: TaxDocumentType;
  importExportCode?: string;
  msmeSmeRegistration?: string;

  paymentTerms?: PaymentTerms;
  paymentMilestones?: string;
  preferredPaymentMethod?: PaymentMethod;
  creditLimitRequested?: number;
  currency?: string;
  creditRating?: string;
  auditedFinancialStatementsUrl?: string;
  priceStructure?: string;
  discountTerms?: string;
  contractReferenceNumbers?: string[];
  insuranceCoverage?: string;

  productCategories?: string[];
  serviceCategories?: string[];
  technicalExpertiseAreas?: string;
  manufacturingCapabilities?: string;
  productionCapacity?: string;
  keyEquipmentList?: string;
  qualityControlProcesses?: string;
  technicalDatasheets?: string[];
  complianceStandards?: string;

  qualityManagementSystemDetails?: string;
  hsePolicyUrl?: string;
  incidentAccidentHistory?: string;
  csrCompliance?: string;
  ethicalSourcingPolicy?: string;
  antiBriberyPolicy?: string;

  majorClients?: string[];
  projectExperience?: string;
  pastPoContractReferences?: string;
  blacklistingHistory?: string;
  geographicalExperience?: string[];

  standardLeadTimeDays?: number;
  minimumOrderQuantity?: number;
  deliveryCapability?: DeliveryCapability;
  warehouseLocations?: string[];
  transportModesSupported?: TransportationMode[];
  exportDocumentationCapability?: boolean;

  vendorEvaluationScore?: number;
  riskCategory?: RiskCategory;
  vendorClassification?: VendorClassification;
  approvalReference?: string;
  approvalDate?: string;
  reviewCycle?: ReviewCycle;
  nextReviewDate?: string;
  remarks?: string;

  contacts?: VendorContact[];
  addresses?: VendorAddress[];
  bankAccounts?: VendorBankAccount[];
  certifications?: VendorCertification[];
  documents?: VendorDocument[];
  materials?: VendorMaterial[];
  turnovers?: VendorTurnover[];

  /**
   * Set while a blacklist / un-blacklist request awaits manager approval.
   * `vendorStatus` is deliberately unchanged until the decision lands.
   */
  pendingStatusChange?: PendingStatusChange;
  pendingStatusChangeRequestId?: string;

  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors VendorListItemDto — deliberately far smaller than the detail shape. */
export interface VendorListItem {
  id: string;
  dguid: string;
  code: string;
  vendorName: string;
  tradeName?: string;
  vendorTypeId: string;
  vendorTypeName?: string;
  vendorStatus: VendorStatus;
  isActive: boolean;
  industryCategoryId: string;
  industryCategoryName?: string;
  /** Material categories this vendor supplies, by name. */
  productCategories?: string[];
  parentCompanyId?: string;
  parentCompanyName?: string;
  primaryContactPerson?: string;
  email?: string;
  mobileNumber?: string;
  countryOfRegistration?: string;
  vendorClassification?: VendorClassification;
  /** A blacklist / un-blacklist request awaiting manager approval. */
  pendingStatusChange?: PendingStatusChange;
  riskCategory?: RiskCategory;
  vendorEvaluationScore?: number;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors VendorDropdownDto — GET /vendors/active. */
export interface VendorOption {
  id: string;
  dguid: string;
  code: string;
  vendorName: string;
  tradeName?: string;
  vendorTypeId: string;
  vendorTypeName?: string;
  vendorStatus: VendorStatus;
  vendorClassification?: VendorClassification;
  industryCategoryId: string;
}

// ── List state ─────────────────────────────────────────────────────────────

/** Only these are accepted by VendorQueryDto.sortBy. */
export type VendorSortField =
  | 'code' | 'vendorName' | 'tradeName' | 'vendorStatus'
  | 'vendorTypeId' | 'vendorClassification' | 'createdAt' | 'updatedAt';

export type SortDirection = 'asc' | 'desc';

export interface VendorFilter {
  search: string;
  vendorTypeId: string | null;
  vendorStatus: VendorStatus | null;
  vendorClassification: VendorClassification | null;
  /** Vendors whose blacklist / un-blacklist request is awaiting approval. */
  pendingStatusChange: PendingStatusChange | null;
  riskCategory: RiskCategory | null;
  industryCategoryId: string | null;
  countryOfRegistration: string | null;
  /** null = both; true/false filter the technical availability flag. */
  isActive: boolean | null;
  /** Blacklisted vendors are excluded server-side unless this is on. */
  includeBlacklisted: boolean;
}

export const DEFAULT_VENDOR_FILTER: VendorFilter = {
  search: '',
  vendorTypeId: null,
  vendorStatus: null,
  vendorClassification: null,
  pendingStatusChange: null,
  riskCategory: null,
  industryCategoryId: null,
  countryOfRegistration: null,
  isActive: null,
  includeBlacklisted: false,
};

// ── Display helpers ────────────────────────────────────────────────────────

const LABELS: Record<string, string> = {
  ...Object.fromEntries(PENDING_STATUS_OPTIONS.map((o) => [o.value, o.label])),
  ...Object.fromEntries(VENDOR_STATUS_OPTIONS.map((o) => [o.value, o.label])),
  ...Object.fromEntries(VENDOR_CLASSIFICATION_OPTIONS.map((o) => [o.value, o.label])),
  ...Object.fromEntries(PAYMENT_TERMS_OPTIONS.map((o) => [o.value, o.label])),
  ...Object.fromEntries(PAYMENT_METHOD_OPTIONS.map((o) => [o.value, o.label])),
  ...Object.fromEntries(DELIVERY_CAPABILITY_OPTIONS.map((o) => [o.value, o.label])),
};

/** Turns an enum value into its human label, falling back to the raw value. */
export function enumLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return LABELS[value] ?? value.replace(/_/g, ' ');
}

/**
 * Masks an account identifier for display. The API already masks these for
 * unauthorised callers; this covers the values a user just typed into the form,
 * which have never left the browser.
 */
export function maskAccount(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '—';
  if (raw.length <= 4) return '••••';
  return `•••• •••• ${raw.slice(-4)}`;
}
