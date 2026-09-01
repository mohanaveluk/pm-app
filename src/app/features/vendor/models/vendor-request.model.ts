import {
  DeliveryCapability, EvaluationDecision, EvaluationStage, PaymentMethod, PaymentTerms,
  PendingStatusChange, RiskCategory, TaxDocumentType, TransportationMode, VendorAddressType,
  VendorClassification, VendorDocumentType, VendorSortField, VendorStatus,
} from './vendor.model';

/**
 * Mirrors AddVendorEvaluationDto (pm-api/src/modules/vendor/dto/vendor-evaluation.dto.ts)
 * — the write side of GET /vendors/:id/evaluations. `stage` and `decision` are
 * the only required fields; `comments` becomes mandatory when `decision` is
 * REJECTED or RETURNED, enforced server-side (and mirrored client-side so the
 * user sees the problem before submitting).
 */
export interface AddVendorEvaluationRequest {
  stage: EvaluationStage;
  decision: EvaluationDecision;
  score?: number;
  referenceNumber?: string;
  comments?: string;
  riskCategory?: RiskCategory;
  vendorClassification?: VendorClassification;
}

/**
 * Request shapes mirroring pm-api's CreateVendorDto. Grouped sub-objects
 * (`statutory`, `commercial`, …) are part of the wire format, not a UI
 * convenience — the DTO nests them exactly this way.
 */

export interface VendorAddressRequest {
  addressType: VendorAddressType;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  /** ISO 3166-1 alpha-2. */
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  email?: string;
  isPrimary?: boolean;
  remarks?: string;
}

export interface VendorContactRequest {
  contactPerson: string;
  designation?: string;
  department?: string;
  email?: string;
  mobileNumber?: string;
  landlineNumber?: string;
  isPrimary?: boolean;
  remarks?: string;
}

export interface VendorBankAccountRequest {
  bankName: string;
  branch?: string;
  accountHolderName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  currency?: string;
  preferredPaymentMethod?: PaymentMethod;
  isPrimary?: boolean;
}

export interface VendorCertificationRequest {
  certificationName: string;
  certificateNumber?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
  documentUrl?: string;
  scopeOfCertification?: string;
}

export interface VendorDocumentRequest {
  documentType: VendorDocumentType;
  documentUrl: string;
  fileName?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  expiryDate?: string;
}

export interface VendorTurnoverRequest {
  financialYear: number;
  turnover: number;
  currency: string;
  isAudited?: boolean;
  financialStatementUrl?: string;
}

export interface VendorStatutoryRequest {
  businessRegistrationNumber?: string;
  taxRegistrationNumber?: string;
  taxDocumentNumber?: string;
  taxDocumentType?: TaxDocumentType;
  importExportCode?: string;
  msmeSmeRegistration?: string;
}

export interface VendorCommercialRequest {
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
}

export interface VendorTechnicalRequest {
  productCategories?: string[];
  serviceCategories?: string[];
  technicalExpertiseAreas?: string;
  manufacturingCapabilities?: string;
  productionCapacity?: string;
  keyEquipmentList?: string;
  qualityControlProcesses?: string;
  technicalDatasheets?: string[];
  complianceStandards?: string;
}

export interface VendorQualityHseRequest {
  qualityManagementSystemDetails?: string;
  hsePolicyUrl?: string;
  incidentAccidentHistory?: string;
  csrCompliance?: string;
  ethicalSourcingPolicy?: string;
  antiBriberyPolicy?: string;
}

export interface VendorExperienceRequest {
  majorClients?: string[];
  geographicalExperience?: string[];
}

/**
 * Mirrors VendorProjectExperienceDto's exposed slice
 * (pm-api/src/modules/vendor/dto/vendor-project-experience.dto.ts).
 * `projectName` is the only field the DTO requires (`@IsNotEmpty`) —
 * `clientName` is `@IsOptional`, so the form mirrors that exactly rather
 * than inventing a stricter rule the API does not enforce.
 */
export interface VendorProjectExperienceRequest {
  projectName?: string;
  clientName?: string;
  projectExperience?: string;
  pastPoContractReferences?: string;
  blacklistingHistory?: string;
}

export interface VendorLogisticsRequest {
  standardLeadTimeDays?: number;
  minimumOrderQuantity?: number;
  deliveryCapability?: DeliveryCapability;
  warehouseLocations?: string[];
  transportModesSupported?: TransportationMode[];
  exportDocumentationCapability?: boolean;
}

/**
 * Mirrors CreateVendorDto. `code` is absent by design — it is generated from the
 * Industry Category prefix and a locked counter, and supplying it is rejected.
 * `vendorStatus` is absent too: status moves only through the dedicated
 * enable / disable / blacklist endpoints.
 */
export interface CreateVendorRequest {
  vendorName: string;
  vendorTypeId: string;
  industryCategoryId: string;

  vendorDescription?: string;
  tradeName?: string;
  parentCompanyId?: string;

  primaryContactPerson?: string;
  designation?: string;
  email?: string;
  mobileNumber?: string;
  landlineNumber?: string;
  website?: string;
  countryOfRegistration?: string;
  remarks?: string;

  statutory?: VendorStatutoryRequest;
  commercial?: VendorCommercialRequest;
  technical?: VendorTechnicalRequest;
  qualityHse?: VendorQualityHseRequest;
  experience?: VendorExperienceRequest;
  logistics?: VendorLogisticsRequest;
  // No `evaluation` field: score, risk, classification, approval reference/
  // date and review cycle are set only by the separate Vendor Evaluation
  // workflow (POST /vendors/:id/evaluations), never by Vendor Master.

  addresses?: VendorAddressRequest[];
  contacts?: VendorContactRequest[];
  bankAccounts?: VendorBankAccountRequest[];
  certifications?: VendorCertificationRequest[];
  documents?: VendorDocumentRequest[];
  materials?: { materialId: string; vendorPartNumber?: string }[];
  turnovers?: VendorTurnoverRequest[];
  projectExperiences?: VendorProjectExperienceRequest[];
}

/**
 * Mirrors UpdateVendorDto = PartialType(OmitType(Create, ['industryCategoryId'])).
 * The category is fixed once the code is issued — CIV000042 must not end up
 * filed under "Mechanical" — so it is structurally excluded here.
 */
export type UpdateVendorRequest = Partial<Omit<CreateVendorRequest, 'industryCategoryId'>>;

/**
 * Mirrors RequestVendorStatusChangeDto.
 *
 * Blacklisting is no longer applied directly: PATCH /vendors/:id/blacklist and
 * /remove-blacklist raise a request that a manager must approve, so both carry a
 * mandatory reason that is quoted verbatim in the approval email.
 */
export interface RequestVendorStatusChangeRequest {
  reason: string;
  /** Route to one specific manager; omitted means every eligible approver. */
  approverUserId?: string;
}

/** Mirrors VendorQueryDto — note `limit`/`sortOrder`, and 1-based `page`. */
export interface VendorQueryParams {
  page: number;
  limit: number;
  sortBy: VendorSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  code?: string;
  vendorName?: string;
  email?: string;
  businessRegistrationNumber?: string;
  taxRegistrationNumber?: string;
  industryCategoryId?: string;
  parentCompanyId?: string;
  vendorTypeId?: string;
  vendorStatus?: VendorStatus;
  vendorClassification?: VendorClassification;
  riskCategory?: RiskCategory;
  pendingStatusChange?: PendingStatusChange;
  countryOfRegistration?: string;
  isActive?: boolean;
  includeBlacklisted?: boolean;
}
