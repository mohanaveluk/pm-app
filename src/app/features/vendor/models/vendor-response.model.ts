import {
  StatusChangeRequestStatus, StatusChangeRequestType, Vendor, VendorAddress,
  VendorBankAccount, VendorCertification, VendorContact, VendorDocument,
  VendorEvaluation, VendorListItem, VendorMaterial, VendorOption, VendorPerformance,
} from './vendor.model';

/**
 * Every pm-api endpoint wraps its payload in ResponseDto
 * (pm-api/src/common/dto/response.dto.ts).
 */
export interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
  timestamp: string;
}

/** Mirrors VendorListResponseDto. */
export interface PagedVendors {
  items: VendorListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type VendorResponse = ApiEnvelope<Vendor>;
export type PagedVendorResponse = ApiEnvelope<PagedVendors>;
export type VendorOptionsResponse = ApiEnvelope<VendorOption[]>;
export type VendorDeleteResponse = ApiEnvelope<null>;

export type VendorContactsResponse = ApiEnvelope<VendorContact[]>;
export type VendorAddressesResponse = ApiEnvelope<VendorAddress[]>;
export type VendorBankAccountsResponse = ApiEnvelope<VendorBankAccount[]>;
export type VendorCertificationsResponse = ApiEnvelope<VendorCertification[]>;
export type VendorDocumentsResponse = ApiEnvelope<VendorDocument[]>;
export type VendorMaterialsResponse = ApiEnvelope<VendorMaterial[]>;
export type VendorPerformanceResponse = ApiEnvelope<VendorPerformance[]>;
export type VendorEvaluationsResponse = ApiEnvelope<VendorEvaluation[]>;

/** Mirrors VendorStatusChangeRequestResponseDto. The approval token is never serialised. */
export interface VendorStatusChangeRequest {
  id: string;
  vendorId: string;
  vendorCode?: string;
  vendorName?: string;
  requestType: StatusChangeRequestType;
  status: StatusChangeRequestStatus;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  notifiedApprovers?: string[];
  approverUserId?: string;
  tokenExpiresAt?: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionComments?: string;
  createdAt: string;
}

/**
 * Mirrors VendorStatusChangeAcceptedDto — the 202 body from the blacklist and
 * un-blacklist endpoints. `notificationSent` can be false while the request
 * still stands, so the UI has to report both facts.
 */
export interface VendorStatusChangeAccepted {
  request: VendorStatusChangeRequest;
  notificationSent: boolean;
  approversNotified: number;
}

export type VendorStatusChangeAcceptedResponse = ApiEnvelope<VendorStatusChangeAccepted>;
export type VendorStatusChangeRequestsResponse = ApiEnvelope<VendorStatusChangeRequest[]>;

/**
 * POST /vendors/documents/upload returns the raw object, NOT a ResponseDto
 * envelope — the controller returns the service result directly. The Material
 * Master upload endpoint behaves the same way.
 */
export interface VendorDocumentUploadResponse {
  message: string;
  url: string;
}
