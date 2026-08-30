import { VENDOR_DOCUMENT_SLOTS } from './vendor-form.service';
import {
  CreateVendorRequest, UpdateVendorRequest, VendorAddressRequest,
  VendorBankAccountRequest, VendorCertificationRequest, VendorDocumentRequest,
  VendorTurnoverRequest,
} from '../models/vendor-request.model';
import {
  DeliveryCapability, PaymentMethod, PaymentTerms, ReviewCycle, RiskCategory,
  TaxDocumentType, TransportationMode, Vendor, VendorAddressType,
  VendorClassification, VendorType,
} from '../models/vendor.model';
import { joinPhone, splitPhone } from '../../../shared/reference/countries';

/**
 * Translates between the eleven-step form value and the API payloads.
 *
 * Two asymmetries drive this file:
 *
 *  1. The DTO nests grouped sections (`statutory`, `commercial`, …) that do not
 *     match the step boundaries — `commercial` is fed by both the Banking and
 *     Financial steps.
 *  2. `PUT /vendors/:id` REPLACES each child collection it receives
 *     (VendorService.replaceChildren), so toUpdateRequest sends every collection
 *     as a complete list — including [] — rather than a partial patch. A
 *     collection the payload omits is left untouched server-side.
 */

/**
 * The workspace form's shape, section by section. Declared explicitly rather
 * than as an index signature so the compiler keeps checking the section names.
 * Section contents stay loose: they mirror the FormGroup, which the reactive
 * forms API types as any at this boundary anyway.
 */
export interface VendorFormValue {
  identification?: any;
  contact?: any;
  legal?: any;
  banking?: any;
  financial?: any;
  technical?: any;
  quality?: any;
  performance?: any;
  logistics?: any;
  documents?: any;
  evaluation?: any;
}

type FormValue = VendorFormValue;
type Section = any;

// ── Small helpers ──────────────────────────────────────────────────────────

/** '' and null collapse to undefined so optional fields are simply absent. */
function text(value: unknown): string | undefined {
  const v = (value ?? '').toString().trim();
  return v ? v : undefined;
}

function num(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function list(value: unknown): string[] | undefined {
  const arr = Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];
  return arr.length ? arr : undefined;
}

/** Dates travel as ISO date strings; the API validates with @IsDateString(). */
function isoDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function upper(value: unknown): string | undefined {
  const v = text(value);
  return v ? v.toUpperCase() : undefined;
}

/** Drops keys whose value is undefined so `{}` sections are not sent at all. */
function compact<T extends object>(obj: T): T | undefined {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  return entries.length ? (Object.fromEntries(entries) as T) : undefined;
}

// ── Section builders ───────────────────────────────────────────────────────

/** One vendor_addresses row, or null when the row carries no address at all. */
function buildAddress(value: Section): VendorAddressRequest | null {
  const address: VendorAddressRequest = {
    addressType: (value?.addressType as VendorAddressType) ?? VendorAddressType.REGISTERED,
    addressLine1: text(value?.addressLine1),
    addressLine2: text(value?.addressLine2),
    city: text(value?.city),
    state: text(value?.state),
    postalCode: text(value?.postalCode),
    country: upper(value?.country),
    phoneNumber: text(value?.phoneNumber),
    email: text(value?.email)?.toLowerCase(),
    isPrimary: !!value?.isPrimary,
    remarks: text(value?.remarks),
  };
  // An address with nothing but its type is noise — skip it entirely.
  const hasContent = !!(address.addressLine1 || address.addressLine2 || address.city
    || address.state || address.postalCode || address.country
    || address.phoneNumber || address.email);
  return hasContent ? address : null;
}

function buildAddresses(contact: Section): VendorAddressRequest[] | undefined {
  const rows = (contact?.addresses as Section[] ?? [])
    .map((row) => buildAddress(row))
    .filter((a): a is VendorAddressRequest => a !== null);

  if (!rows.length) return undefined;

  // Exactly one address may be primary; the API mirrors it onto the vendor.
  if (!rows.some((r) => r.isPrimary)) rows[0].isPrimary = true;
  return rows;
}

function buildBankAccounts(banking: Section): VendorBankAccountRequest[] | undefined {
  const bankName = text(banking.bankName);
  // bankName is the only required field on VendorBankAccountDto, so without it
  // there is no valid row to send.
  if (!bankName) return undefined;

  return [{
    bankName,
    branch: text(banking.branch),
    accountHolderName: text(banking.accountHolderName),
    accountNumber: text(banking.accountNumber),
    iban: upper(banking.iban),
    swiftCode: upper(banking.swiftCode),
    currency: upper(banking.bankCurrency),
    preferredPaymentMethod: (banking.preferredPaymentMethod as PaymentMethod) ?? undefined,
    isPrimary: true,
  }];
}

function buildTurnovers(financial: Section): VendorTurnoverRequest[] | undefined {
  const rows = (financial.turnovers as Section[] ?? [])
    .map((row) => {
      const financialYear = num(row.financialYear);
      const turnover = num(row.turnover);
      // financialYear, turnover and currency are all required on the DTO.
      const currency = upper(row.currency) ?? upper(financial.currency);
      if (financialYear === undefined || turnover === undefined || !currency) return null;
      return {
        financialYear,
        turnover,
        currency,
        isAudited: !!row.isAudited,
        financialStatementUrl: text(row.financialStatementUrl),
      } as VendorTurnoverRequest;
    })
    .filter((r): r is VendorTurnoverRequest => r !== null);

  return rows.length ? rows : undefined;
}

function buildCertifications(quality: Section): VendorCertificationRequest[] | undefined {
  const rows = (quality.certifications as Section[] ?? [])
    .map((row) => {
      const certificationName = text(row.certificationName);
      if (!certificationName) return null;
      return {
        certificationName,
        certificateNumber: text(row.certificateNumber),
        issuingAuthority: text(row.issuingAuthority),
        issueDate: isoDate(row.issueDate),
        expiryDate: isoDate(row.expiryDate),
        scopeOfCertification: text(row.scopeOfCertification),
        documentUrl: text(row.documentUrl),
      } as VendorCertificationRequest;
    })
    .filter((r): r is VendorCertificationRequest => r !== null);

  return rows.length ? rows : undefined;
}

/** Best-effort file name for a stored URL — vendor_documents keeps one. */
function fileNameFromUrl(url: string): string | undefined {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.split('/').filter(Boolean).pop() ?? '') || undefined;
  } catch {
    return url.split('/').filter(Boolean).pop() || undefined;
  }
}

/**
 * One request row per filled document slot. The slot's own `documentType`
 * decides the classification — the file name never does.
 */
function buildDocuments(documents: Section): VendorDocumentRequest[] | undefined {
  const rows = VENDOR_DOCUMENT_SLOTS
    .map((slot) => {
      const url = text(documents?.[slot.key]);
      if (!url) return null;
      const row: VendorDocumentRequest = {
        documentType: slot.documentType,
        documentUrl: url,
        fileName: fileNameFromUrl(url),
      };
      return row;
    })
    .filter((r): r is VendorDocumentRequest => r !== null);

  return rows.length ? rows : undefined;
}

// ── Form → API ─────────────────────────────────────────────────────────────

/**
 * Resolves the ids held by the Material Categories multi-select into the names
 * the API stores in technical.productCategories. Supplied by the caller because
 * only the form service knows the loaded category list.
 */
export type CategoryNameResolver = (values: readonly string[]) => string[];

const passThroughNames: CategoryNameResolver = (values) => [...values];

/** The reverse: stored names back into the ids the multi-select binds to. */
export type CategoryIdResolver = (values: readonly string[]) => string[];

const passThroughIds: CategoryIdResolver = (values) => [...values];

/** Scalar payload shared by create and update. */
function toScalarPayload(v: FormValue, resolveNames: CategoryNameResolver): Omit<CreateVendorRequest, 'vendorName' | 'vendorType' | 'industryCategoryId'> {
  const id = v.identification ?? {};
  const contact = v.contact ?? {};
  const legal = v.legal ?? {};
  const banking = v.banking ?? {};
  const financial = v.financial ?? {};
  const technical = v.technical ?? {};
  const quality = v.quality ?? {};
  const performance = v.performance ?? {};
  const logistics = v.logistics ?? {};
  const evaluation = v.evaluation ?? {};

  return {
    vendorDescription: text(id.vendorDescription),
    tradeName: text(id.tradeName),
    parentCompanyId: text(id.parentCompanyId),
    remarks: text(id.remarks),

    primaryContactPerson: text(contact.primaryContactPerson),
    designation: text(contact.designation),
    email: text(contact.email)?.toLowerCase(),
    mobileNumber: text(joinPhone(contact.mobileDialCode, contact.mobileNumber)),
    landlineNumber: text(joinPhone(contact.landlineDialCode, contact.landlineNumber)),
    website: text(contact.website),
    countryOfRegistration: upper(contact.countryOfRegistration),

    statutory: compact({
      businessRegistrationNumber: text(legal.businessRegistrationNumber),
      taxRegistrationNumber: text(legal.taxRegistrationNumber),
      taxDocumentNumber: text(legal.taxDocumentNumber),
      taxDocumentType: (legal.taxDocumentType as TaxDocumentType) ?? undefined,
      importExportCode: text(legal.importExportCode),
      msmeSmeRegistration: text(legal.msmeSmeRegistration),
    }),

    // Fed by two steps: payment terms come from Banking, the money from Financial.
    commercial: compact({
      paymentTerms: (banking.paymentTerms as PaymentTerms) ?? undefined,
      paymentMilestones: text(banking.paymentMilestones),
      preferredPaymentMethod: (banking.preferredPaymentMethod as PaymentMethod) ?? undefined,
      creditLimitRequested: num(financial.creditLimitRequested),
      currency: upper(financial.currency),
      creditRating: text(financial.creditRating),
      auditedFinancialStatementsUrl: text(financial.auditedFinancialStatementsUrl),
      priceStructure: text(financial.priceStructure),
      discountTerms: text(financial.discountTerms),
      contractReferenceNumbers: list(financial.contractReferenceNumbers),
      insuranceCoverage: text(financial.insuranceCoverage),
    }),

    technical: compact({
      // Captured on the Identification step, stored in the technical section.
      //productCategories: list(resolveNames(Array.isArray(id.productCategories) ? id.productCategories : [])),
      productCategories: list(Array.isArray(id.productCategories) ? id.productCategories : []),
      serviceCategories: list(technical.serviceCategories),
      technicalExpertiseAreas: text(technical.technicalExpertiseAreas),
      manufacturingCapabilities: text(technical.manufacturingCapabilities),
      productionCapacity: text(technical.productionCapacity),
      keyEquipmentList: text(technical.keyEquipmentList),
      qualityControlProcesses: text(technical.qualityControlProcesses),
      technicalDatasheets: list(technical.technicalDatasheets),
      complianceStandards: text(technical.complianceStandards),
    }),

    qualityHse: compact({
      qualityManagementSystemDetails: text(quality.qualityManagementSystemDetails),
      hsePolicyUrl: text(quality.hsePolicyUrl),
      incidentAccidentHistory: text(quality.incidentAccidentHistory),
      csrCompliance: text(quality.csrCompliance),
      ethicalSourcingPolicy: text(quality.ethicalSourcingPolicy),
      antiBriberyPolicy: text(quality.antiBriberyPolicy),
    }),

    experience: compact({
      majorClients: list(performance.majorClients),
      projectExperience: text(performance.projectExperience),
      pastPoContractReferences: text(performance.pastPoContractReferences),
      blacklistingHistory: text(performance.blacklistingHistory),
      geographicalExperience: list(performance.geographicalExperience),
    }),

    logistics: compact({
      standardLeadTimeDays: num(logistics.standardLeadTimeDays),
      minimumOrderQuantity: num(logistics.minimumOrderQuantity),
      deliveryCapability: (logistics.deliveryCapability as DeliveryCapability) ?? undefined,
      warehouseLocations: list(logistics.warehouseLocations),
      transportModesSupported: list(logistics.transportModesSupported) as TransportationMode[] | undefined,
      exportDocumentationCapability: !!logistics.exportDocumentationCapability,
    }),

    // Sending this does NOT approve the vendor — the API always starts a new
    // record at UNDER_EVALUATION with isActive=false.
    evaluation: compact({
      vendorEvaluationScore: num(evaluation.vendorEvaluationScore),
      riskCategory: (evaluation.riskCategory as RiskCategory) ?? undefined,
      vendorClassification: (evaluation.vendorClassification as VendorClassification) ?? undefined,
      approvalReference: text(evaluation.approvalReference),
      approvalDate: isoDate(evaluation.approvalDate),
      reviewCycle: (evaluation.reviewCycle as ReviewCycle) ?? undefined,
      nextReviewDate: isoDate(evaluation.nextReviewDate),
    }),
  };
}

/** Full create payload — the only request that can carry child collections. */
export function toCreateRequest(v: FormValue, resolveNames: CategoryNameResolver = passThroughNames): CreateVendorRequest {
  const id = v.identification ?? {};

  return {
    vendorName: (id.vendorName ?? '').toString().trim(),
    vendorType: id.vendorType as VendorType,
    industryCategoryId: id.industryCategoryId,
    ...toScalarPayload(v, resolveNames),

    addresses: buildAddresses(v.contact ?? {}),
    bankAccounts: buildBankAccounts(v.banking ?? {}),
    turnovers: buildTurnovers(v.financial ?? {}),
    certifications: buildCertifications(v.quality ?? {}),
    documents: buildDocuments(v.documents ?? {}),
  };
}

/**
 * Update payload. Child collections are omitted on purpose: the API's update
 * path drops them, so sending them would imply a save that never happens.
 * `industryCategoryId` is excluded too — the issued vendor code encodes it, and
 * the API rejects the field with 409.
 */
export function toUpdateRequest(v: FormValue, resolveNames: CategoryNameResolver = passThroughNames): UpdateVendorRequest {
  const id = v.identification ?? {};

  return {
    vendorName: (id.vendorName ?? '').toString().trim(),
    vendorType: id.vendorType as VendorType,
    ...toScalarPayload(v, resolveNames),

    // Sent as complete lists, never undefined: the API replaces the collections
    // it receives, so an emptied section has to arrive as [] to be cleared.
    addresses: buildAddresses(v.contact ?? {}) ?? [],
    bankAccounts: buildBankAccounts(v.banking ?? {}) ?? [],
    turnovers: buildTurnovers(v.financial ?? {}) ?? [],
    certifications: buildCertifications(v.quality ?? {}) ?? [],
    documents: buildDocuments(v.documents ?? {}) ?? [],
  };
}

// ── API → Form ─────────────────────────────────────────────────────────────

/**
 * Every stored address becomes one form row. A vendor with no addresses yet
 * still gets one blank REGISTERED row so the step is never an empty shell.
 */
function addressesToForm(addresses: Vendor['addresses']): Section[] {
  const rows = (addresses ?? [])
    .filter((a) => a.isActive !== false)
    .map((a) => ({
      addressType: a.addressType ?? VendorAddressType.REGISTERED,
      addressLine1: a.addressLine1 ?? '',
      addressLine2: a.addressLine2 ?? '',
      city: a.city ?? '',
      state: a.state ?? '',
      postalCode: a.postalCode ?? '',
      country: a.country ?? '',
      phoneNumber: a.phoneNumber ?? '',
      email: a.email ?? '',
      isPrimary: !!a.isPrimary,
      remarks: '',
    }));

  return rows.length ? rows : [{
    addressType: VendorAddressType.REGISTERED,
    addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '',
    country: '', phoneNumber: '', email: '', isPrimary: true, remarks: '',
  }];
}

/**
 * Rehydrates the form from a loaded vendor. Turnovers and certifications are
 * returned as plain arrays; the workspace resizes the FormArrays to match
 * before patching, since patchValue cannot grow an array on its own.
 */
export function toVendorFormValue(vendor: Vendor, resolveIds: CategoryIdResolver = passThroughIds): FormValue {
  const mobile = splitPhone(vendor.mobileNumber);
  const landline = splitPhone(vendor.landlineNumber);

  const documents = Object.fromEntries(
    VENDOR_DOCUMENT_SLOTS.map((slot) => {
      // Newest active document of this type wins the slot.
      const match = vendor.documents
        ?.filter((d) => d.documentType === slot.documentType && d.isActive !== false)
        .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
      return [slot.key, match?.documentUrl ?? ''];
    }),
  );

  const bank = vendor.bankAccounts?.find((b) => b.isPrimary) ?? vendor.bankAccounts?.[0];

  return {
    identification: {
      vendorName: vendor.vendorName ?? '',
      vendorDescription: vendor.vendorDescription ?? '',
      tradeName: vendor.tradeName ?? '',
      vendorType: vendor.vendorType ?? null,
      industryCategoryId: vendor.industryCategoryId ?? '',
      productCategories: resolveIds(vendor.productCategories ?? []),
      parentCompanyId: vendor.parentCompanyId ?? '',
      remarks: vendor.remarks ?? '',
    },
    contact: {
      primaryContactPerson: vendor.primaryContactPerson ?? '',
      designation: vendor.designation ?? '',
      email: vendor.email ?? '',
      mobileDialCode: mobile.dialCode,
      mobileNumber: mobile.number,
      landlineDialCode: landline.dialCode,
      landlineNumber: landline.number,
      website: vendor.website ?? '',
      countryOfRegistration: vendor.countryOfRegistration ?? '',
      addresses: addressesToForm(vendor.addresses),
    },
    legal: {
      businessRegistrationNumber: vendor.businessRegistrationNumber ?? '',
      taxRegistrationNumber: vendor.taxRegistrationNumber ?? '',
      taxDocumentType: vendor.taxDocumentType ?? null,
      taxDocumentNumber: vendor.taxDocumentNumber ?? '',
      importExportCode: vendor.importExportCode ?? '',
      msmeSmeRegistration: vendor.msmeSmeRegistration ?? '',
    },
    banking: {
      bankName: bank?.bankName ?? '',
      branch: bank?.branch ?? '',
      accountHolderName: bank?.accountHolderName ?? '',
      // Masked values are never written back into the editable controls —
      // doing so would send '••••1234' to the API as if it were real.
      accountNumber: bank?.isMasked ? '' : bank?.accountNumber ?? '',
      iban: bank?.isMasked ? '' : bank?.iban ?? '',
      swiftCode: bank?.isMasked ? '' : bank?.swiftCode ?? '',
      bankCurrency: bank?.currency ?? '',
      paymentTerms: vendor.paymentTerms ?? null,
      paymentMilestones: vendor.paymentMilestones ?? '',
      preferredPaymentMethod: vendor.preferredPaymentMethod ?? null,
    },
    financial: {
      currency: vendor.currency ?? '',
      creditLimitRequested: vendor.creditLimitRequested ?? null,
      creditRating: vendor.creditRating ?? '',
      auditedFinancialStatementsUrl: vendor.auditedFinancialStatementsUrl ?? '',
      priceStructure: vendor.priceStructure ?? '',
      discountTerms: vendor.discountTerms ?? '',
      contractReferenceNumbers: vendor.contractReferenceNumbers ?? [],
      insuranceCoverage: vendor.insuranceCoverage ?? '',
      turnovers: (vendor.turnovers ?? []).map((t) => ({
        financialYear: t.financialYear ?? null,
        turnover: t.turnover ?? null,
        currency: t.currency ?? '',
        isAudited: !!t.isAudited,
        financialStatementUrl: t.financialStatementUrl ?? '',
      })),
    },
    technical: {
      serviceCategories: vendor.serviceCategories ?? [],
      technicalExpertiseAreas: vendor.technicalExpertiseAreas ?? '',
      manufacturingCapabilities: vendor.manufacturingCapabilities ?? '',
      productionCapacity: vendor.productionCapacity ?? '',
      keyEquipmentList: vendor.keyEquipmentList ?? '',
      qualityControlProcesses: vendor.qualityControlProcesses ?? '',
      technicalDatasheets: vendor.technicalDatasheets ?? [],
      complianceStandards: vendor.complianceStandards ?? '',
    },
    quality: {
      qualityManagementSystemDetails: vendor.qualityManagementSystemDetails ?? '',
      hsePolicyUrl: vendor.hsePolicyUrl ?? '',
      incidentAccidentHistory: vendor.incidentAccidentHistory ?? '',
      csrCompliance: vendor.csrCompliance ?? '',
      ethicalSourcingPolicy: vendor.ethicalSourcingPolicy ?? '',
      antiBriberyPolicy: vendor.antiBriberyPolicy ?? '',
      certifications: (vendor.certifications ?? []).map((c) => ({
        certificationName: c.certificationName ?? '',
        certificateNumber: c.certificateNumber ?? '',
        issuingAuthority: c.issuingAuthority ?? '',
        issueDate: c.issueDate ? new Date(c.issueDate) : null,
        expiryDate: c.expiryDate ? new Date(c.expiryDate) : null,
        scopeOfCertification: c.scopeOfCertification ?? '',
        documentUrl: c.documentUrl ?? '',
      })),
    },
    performance: {
      majorClients: vendor.majorClients ?? [],
      projectExperience: vendor.projectExperience ?? '',
      pastPoContractReferences: vendor.pastPoContractReferences ?? '',
      blacklistingHistory: vendor.blacklistingHistory ?? '',
      geographicalExperience: vendor.geographicalExperience ?? [],
    },
    logistics: {
      standardLeadTimeDays: vendor.standardLeadTimeDays ?? null,
      minimumOrderQuantity: vendor.minimumOrderQuantity ?? null,
      deliveryCapability: vendor.deliveryCapability ?? null,
      warehouseLocations: vendor.warehouseLocations ?? [],
      transportModesSupported: vendor.transportModesSupported ?? [],
      exportDocumentationCapability: !!vendor.exportDocumentationCapability,
    },
    documents,
    evaluation: {
      vendorEvaluationScore: vendor.vendorEvaluationScore ?? null,
      riskCategory: vendor.riskCategory ?? null,
      vendorClassification: vendor.vendorClassification ?? null,
      approvalReference: vendor.approvalReference ?? '',
      approvalDate: vendor.approvalDate ? new Date(vendor.approvalDate) : null,
      reviewCycle: vendor.reviewCycle ?? null,
      nextReviewDate: vendor.nextReviewDate ? new Date(vendor.nextReviewDate) : null,
    },
  };
}
