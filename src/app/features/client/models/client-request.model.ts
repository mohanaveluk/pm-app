import {
  ClientAddressType, ClientContactRole, ClientDocumentType, ClientSortField, ClientStatus,
  LegalEntityType, MeasurementSystem, PreferredContactMethod,
} from './client.model';

/**
 * Mirrors CreateClientDto. Optional fields accept `null`: on update that is
 * how a value is cleared (omitting a key means "leave unchanged").
 */

export interface ClientAddressRequest {
  /** Present when updating an existing address; omitted for a new one. */
  id?: string;
  addressType: ClientAddressType;
  label?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  isActive?: boolean;
}

export interface ClientContactRequest {
  id?: string;
  contactName: string;
  jobTitle?: string | null;
  department?: string | null;
  contactRole?: ClientContactRole | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  preferredContactMethod?: PreferredContactMethod | null;
  isPrimary?: boolean;
  isProjectContact?: boolean;
  isProcurementContact?: boolean;
  isFinanceContact?: boolean;
  isActive?: boolean;
}

export interface ClientCommercialRequest {
  legalEntityName?: string | null;
  legalEntityType?: LegalEntityType | null;
  registrationNumber?: string | null;
  taxRegistrationNumber?: string | null;
  externalBusinessId?: string | null;
  contractingEntityName?: string | null;
  defaultCurrencyCode?: string | null;
  defaultPaymentTerms?: string | null;
  contractReferenceFormat?: string | null;
  purchaseOrderReferenceFormat?: string | null;
  defaultIncoterms?: string | null;
  taxRegion?: string | null;
  dateFormat?: string | null;
}

export interface ClientProjectDefaultsRequest {
  defaultProjectTypeId?: string | null;
  defaultProjectCurrencyCode?: string | null;
  measurementSystem?: MeasurementSystem | null;
  documentNumberingScheme?: string | null;
  defaultWbsTemplate?: string | null;
  defaultCostCodeScheme?: string | null;
  defaultApprovalWorkflow?: string | null;
  defaultProcurementTerms?: string | null;
  documentPortalUrl?: string | null;
  requiresClientApproval?: boolean;
  requiresDocumentControl?: boolean;
}

export interface CreateClientRequest {
  clientName: string;
  displayName?: string | null;
  clientTypeId: string;
  industryCategoryId?: string | null;
  parentClientId?: string | null;
  website?: string | null;
  countryCode?: string | null;
  description?: string | null;
  notes?: string | null;
  status?: ClientStatus;

  operationalAddressSameAsRegistered?: boolean;
  timeZone?: string | null;
  preferredLanguage?: string | null;
  /** The complete set — entries with an id update, without one create, absent ones are removed. */
  addresses?: ClientAddressRequest[];
  contacts?: ClientContactRequest[];

  commercial?: ClientCommercialRequest;
  projectDefaults?: ClientProjectDefaultsRequest;
}

/** Mirrors UpdateClientDto: any subset, never the code or the status. */
export type UpdateClientRequest = Partial<Omit<CreateClientRequest, 'status'>> & {
  /** The version last read; a mismatch is rejected with 409. */
  version?: number;
};

export interface DeactivateClientRequest {
  reason?: string;
}

/** Mirrors AddClientDocumentDto. */
export interface AddClientDocumentRequest {
  documentType: ClientDocumentType;
  documentName: string;
  documentNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  documentUrl: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  documentVersion?: string | null;
  remarks?: string | null;
}

/** Mirrors ClientQueryDto — note `limit`/`sortOrder`, not pageSize/sortDirection. */
export interface ClientQueryParams {
  page: number;
  limit: number;
  sortBy: ClientSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  clientTypeId?: string;
  industryCategoryId?: string;
  countryCode?: string;
  status?: ClientStatus;
  parentClientId?: string;
}
