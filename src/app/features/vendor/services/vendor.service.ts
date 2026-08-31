import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateVendorRequest, RequestVendorStatusChangeRequest, UpdateVendorRequest,
  VendorQueryParams,
} from '../models/vendor-request.model';
import {
  PagedVendorResponse, VendorAddressesResponse, VendorBankAccountsResponse,
  VendorCertificationsResponse, VendorContactsResponse, VendorDeleteResponse,
  VendorDocumentUploadResponse, VendorDocumentsResponse, VendorEvaluationsResponse,
  VendorMaterialsResponse, VendorOptionsResponse, VendorPerformanceResponse,
  VendorResponse, VendorStatusChangeAcceptedResponse, VendorStatusChangeRequestsResponse,
} from '../models/vendor-response.model';

export interface UploadedVendorDocument {
  url: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
}

/**
 * Thin HTTP layer over the real VendorController. Every method maps 1:1 to a
 * documented endpoint — no synthesized routes. Auth headers and error
 * normalization are handled by the app's existing HTTP interceptor.
 */
@Injectable({ providedIn: 'root' })
export class VendorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/vendors`;

  // ── Root resource ───────────────────────────────────────────────────

  /** GET /vendors — paginated, searchable, filterable. */
  getVendors(params: VendorQueryParams): Observable<PagedVendorResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    const optional: [string, string | number | boolean | undefined][] = [
      ['search', params.search],
      ['code', params.code],
      ['vendorName', params.vendorName],
      ['email', params.email],
      ['businessRegistrationNumber', params.businessRegistrationNumber],
      ['taxRegistrationNumber', params.taxRegistrationNumber],
      ['industryCategoryId', params.industryCategoryId],
      ['parentCompanyId', params.parentCompanyId],
      ['vendorTypeId', params.vendorTypeId],
      ['vendorStatus', params.vendorStatus],
      ['vendorClassification', params.vendorClassification],
      ['riskCategory', params.riskCategory],
      ['pendingStatusChange', params.pendingStatusChange],
      ['countryOfRegistration', params.countryOfRegistration],
      ['isActive', params.isActive],
      ['includeBlacklisted', params.includeBlacklisted],
    ];
    for (const [key, value] of optional) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    }

    return this.http.get<PagedVendorResponse>(this.baseUrl, { params: httpParams });
  }

  /** GET /vendors/active — slim list for dropdowns and parent-company lookup. */
  getActiveVendors(): Observable<VendorOptionsResponse> {
    return this.http.get<VendorOptionsResponse>(`${this.baseUrl}/active`);
  }

  /** GET /vendors/:id — full detail including child collections. */
  getVendorById(id: string): Observable<VendorResponse> {
    return this.http.get<VendorResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /vendors — code is generated server-side from the Industry Category. */
  createVendor(request: CreateVendorRequest): Observable<VendorResponse> {
    return this.http.post<VendorResponse>(this.baseUrl, request);
  }

  /** PUT /vendors/:id — industryCategoryId and vendorStatus are rejected here. */
  updateVendor(id: string, request: UpdateVendorRequest): Observable<VendorResponse> {
    return this.http.put<VendorResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** DELETE /vendors/:id — soft delete. */
  deleteVendor(id: string): Observable<VendorDeleteResponse> {
    return this.http.delete<VendorDeleteResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * POST /vendors/:id/clone — server copies every column plus all reference
   * tables (addresses, contacts, bank accounts, certifications, documents,
   * material mappings, turnovers), each re-keyed with its own new id/dguid.
   * Evaluation history, performance scores and blacklist requests are NOT
   * copied — those record events that happened to the source vendor.
   *
   * The body is optional; sending {} takes the server's defaults (source name
   * + " (Copy)", statutory numbers left blank since they must stay unique).
   */
  cloneVendor(id: string): Observable<VendorResponse> {
    return this.http.post<VendorResponse>(`${this.baseUrl}/${id}/clone`, {});
  }

  // ── Status transitions ──────────────────────────────────────────────

  /** PATCH /vendors/:id/enable — vendorStatus=ACTIVE, isActive=true. */
  enableVendor(id: string): Observable<VendorResponse> {
    return this.http.patch<VendorResponse>(`${this.baseUrl}/${id}/enable`, {});
  }

  /** PATCH /vendors/:id/disable — vendorStatus=INACTIVE, isActive=false. */
  disableVendor(id: string): Observable<VendorResponse> {
    return this.http.patch<VendorResponse>(`${this.baseUrl}/${id}/disable`, {});
  }

  /**
   * PATCH /vendors/:id/blacklist — REQUESTS a blacklisting (202).
   *
   * The vendor is not blacklisted by this call: it is flagged
   * pendingStatusChange=PENDING_BLACKLIST while a manager approves, and
   * vendorStatus stays put until the decision lands. `reason` is mandatory and
   * is quoted verbatim in the approval email.
   */
  blacklistVendor(id: string, request: RequestVendorStatusChangeRequest): Observable<VendorStatusChangeAcceptedResponse> {
    return this.http.patch<VendorStatusChangeAcceptedResponse>(`${this.baseUrl}/${id}/blacklist`, request);
  }

  /**
   * PATCH /vendors/:id/remove-blacklist — REQUESTS that a blacklisting be lifted
   * (202). Also requires a reason. On approval the vendor returns to
   * UNDER_EVALUATION rather than straight to ACTIVE.
   */
  removeBlacklist(id: string, request: RequestVendorStatusChangeRequest): Observable<VendorStatusChangeAcceptedResponse> {
    return this.http.patch<VendorStatusChangeAcceptedResponse>(`${this.baseUrl}/${id}/remove-blacklist`, request);
  }

  /** GET /vendors/:id/status-requests — the blacklist request history for one vendor. */
  getStatusRequests(id: string): Observable<VendorStatusChangeRequestsResponse> {
    return this.http.get<VendorStatusChangeRequestsResponse>(`${this.baseUrl}/${id}/status-requests`);
  }

  /** GET /vendors/status-requests/pending — everything awaiting a decision. */
  getPendingStatusRequests(): Observable<VendorStatusChangeRequestsResponse> {
    return this.http.get<VendorStatusChangeRequestsResponse>(`${this.baseUrl}/status-requests/pending`);
  }

  // ── Sub-resources (read-only) ───────────────────────────────────────

  getContacts(id: string): Observable<VendorContactsResponse> {
    return this.http.get<VendorContactsResponse>(`${this.baseUrl}/${id}/contacts`);
  }

  getAddresses(id: string): Observable<VendorAddressesResponse> {
    return this.http.get<VendorAddressesResponse>(`${this.baseUrl}/${id}/addresses`);
  }

  /**
   * GET /vendors/:id/bank-accounts — masked by default. `reveal=true` requires a
   * sensitive-data role server-side and is refused with 403 otherwise, so the
   * caller must be prepared to fall back to the masked view.
   */
  getBankAccounts(id: string, reveal = false): Observable<VendorBankAccountsResponse> {
    const params = reveal ? new HttpParams().set('reveal', 'true') : undefined;
    return this.http.get<VendorBankAccountsResponse>(`${this.baseUrl}/${id}/bank-accounts`, { params });
  }

  getCertifications(id: string): Observable<VendorCertificationsResponse> {
    return this.http.get<VendorCertificationsResponse>(`${this.baseUrl}/${id}/certifications`);
  }

  getDocuments(id: string): Observable<VendorDocumentsResponse> {
    return this.http.get<VendorDocumentsResponse>(`${this.baseUrl}/${id}/documents`);
  }

  getMaterials(id: string): Observable<VendorMaterialsResponse> {
    return this.http.get<VendorMaterialsResponse>(`${this.baseUrl}/${id}/materials`);
  }

  getPerformance(id: string): Observable<VendorPerformanceResponse> {
    return this.http.get<VendorPerformanceResponse>(`${this.baseUrl}/${id}/performance`);
  }

  getEvaluations(id: string): Observable<VendorEvaluationsResponse> {
    return this.http.get<VendorEvaluationsResponse>(`${this.baseUrl}/${id}/evaluations`);
  }

  // ── Document upload ─────────────────────────────────────────────────

  /**
   * POST /vendors/documents/upload — multipart. The endpoint returns only
   * { message, url }; the rest of UploadedVendorDocument is filled in from the
   * File the caller already holds, mirroring MaterialDocumentUploadService.
   */
  uploadDocument(file: File): Observable<UploadedVendorDocument> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http
      .post<VendorDocumentUploadResponse>(`${this.baseUrl}/documents/upload`, formData)
      .pipe(
        map((res) => ({
          url: res.url,
          fileName: file.name,
          sizeBytes: file.size,
          contentType: file.type,
          uploadedAt: new Date().toISOString(),
        })),
      );
  }
}
