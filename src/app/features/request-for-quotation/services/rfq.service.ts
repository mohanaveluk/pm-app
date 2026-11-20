import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, lastValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiEnvelope, Rfq, RfqAcknowledgementForm, RfqAcknowledgementRequest, RfqDefaults, RfqListPage, RfqQueryParams, RfqRequisitionContent, RfqRequisitionOption,
  RfqSaveRequest, RfqStatus, RfqVendorDocument, RfqVendorOption, RfqVendorResponseRequest,
} from '../models/rfq.model';

/** Thin HTTP layer over RfqController (pm-api /rfqs). */
@Injectable({ providedIn: 'root' })
export class RfqService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/rfqs`;

  getRfqs(params: RfqQueryParams): Observable<ApiEnvelope<RfqListPage>> {
    let p = new HttpParams()
      .set('page', params.page).set('limit', params.limit)
      .set('sortBy', params.sortBy).set('sortOrder', params.sortOrder);
    if (params.search) p = p.set('search', params.search);
    if (params.status) p = p.set('status', params.status);
    if (params.projectId) p = p.set('projectId', params.projectId);
    if (params.groupBy) p = p.set('groupBy', params.groupBy);
    return this.http.get<ApiEnvelope<RfqListPage>>(this.baseUrl, { params: p });
  }

  getRfq(id: string): Observable<ApiEnvelope<Rfq>> {
    return this.http.get<ApiEnvelope<Rfq>>(`${this.baseUrl}/${id}`);
  }

  getDefaults(): Observable<ApiEnvelope<RfqDefaults>> {
    return this.http.get<ApiEnvelope<RfqDefaults>>(`${this.baseUrl}/defaults`);
  }

  /** Approved requisitions (optionally of one project). */
  getRequisitionOptions(projectId?: string | null, search?: string): Observable<ApiEnvelope<RfqRequisitionOption[]>> {
    let p = new HttpParams();
    if (projectId) p = p.set('projectId', projectId);
    if (search) p = p.set('search', search);
    return this.http.get<ApiEnvelope<RfqRequisitionOption[]>>(`${this.baseUrl}/requisition-options`, { params: p });
  }

  /** Lines (with open quantity), compliance items, deviations and documents of the requisitions. */
  getRequisitionContent(ids: string[], excludeRfqId?: string | null): Observable<ApiEnvelope<RfqRequisitionContent>> {
    let p = new HttpParams().set('ids', ids.join(','));
    if (excludeRfqId) p = p.set('excludeRfqId', excludeRfqId);
    return this.http.get<ApiEnvelope<RfqRequisitionContent>>(`${this.baseUrl}/requisition-content`, { params: p });
  }

  getVendorOptions(search?: string): Observable<ApiEnvelope<RfqVendorOption[]>> {
    let p = new HttpParams();
    if (search) p = p.set('search', search);
    return this.http.get<ApiEnvelope<RfqVendorOption[]>>(`${this.baseUrl}/vendor-options`, { params: p });
  }

  /** A vendor's Vendor Master documents (buyer, before the RFQ is saved). */
  getVendorMasterDocuments(vendorId: string): Observable<ApiEnvelope<RfqVendorDocument[]>> {
    return this.http.get<ApiEnvelope<RfqVendorDocument[]>>(`${this.baseUrl}/vendors/${vendorId}/documents`);
  }

  /** The Vendor Master documents of the RFQ's vendor. */
  getVendorDocuments(id: string): Observable<ApiEnvelope<RfqVendorDocument[]>> {
    return this.http.get<ApiEnvelope<RfqVendorDocument[]>>(`${this.baseUrl}/${id}/vendor-documents`);
  }

  uploadDocument(file: File): Observable<{ message: string; url: string }> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<{ message: string; url: string }>(`${this.baseUrl}/documents/upload`, form);
  }

  create(request: RfqSaveRequest): Observable<ApiEnvelope<Rfq>> {
    return this.http.post<ApiEnvelope<Rfq>>(this.baseUrl, request);
  }

  update(id: string, request: RfqSaveRequest): Observable<ApiEnvelope<Rfq>> {
    return this.http.put<ApiEnvelope<Rfq>>(`${this.baseUrl}/${id}`, request);
  }

  issue(id: string): Observable<ApiEnvelope<Rfq>> {
    return this.http.post<ApiEnvelope<Rfq>>(`${this.baseUrl}/${id}/issue`, {});
  }

  saveVendorResponse(id: string, request: RfqVendorResponseRequest): Observable<ApiEnvelope<Rfq>> {
    return this.http.put<ApiEnvelope<Rfq>>(`${this.baseUrl}/${id}/vendor-response`, request);
  }

  changeStatus(id: string, status: RfqStatus): Observable<ApiEnvelope<Rfq>> {
    return this.http.patch<ApiEnvelope<Rfq>>(`${this.baseUrl}/${id}/status`, { status });
  }

  /** The RFQ Acknowledgement Form (vendor). */
  getAcknowledgementForm(id: string): Observable<ApiEnvelope<RfqAcknowledgementForm>> {
    return this.http.get<ApiEnvelope<RfqAcknowledgementForm>>(`${this.baseUrl}/${id}/acknowledgement`);
  }

  acknowledge(id: string, request: RfqAcknowledgementRequest): Observable<ApiEnvelope<RfqAcknowledgementForm>> {
    return this.http.post<ApiEnvelope<RfqAcknowledgementForm>>(`${this.baseUrl}/${id}/acknowledge`, request);
  }

  /**
   * Downloads the RFQ as a PDF (issued RFQs and later — a draft is refused).
   * GET /rfqs/:id/pdf → "RFQ-<number>-Rev<n>.pdf".
   */
  async downloadPdf(rfq: { id: string; rfqNumber: string; revisionNo: number }): Promise<void> {
    const blob = await lastValueFrom(this.http.get(`${this.baseUrl}/${rfq.id}/pdf`, { responseType: 'blob' }));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RFQ-${rfq.rfqNumber.replace(/[^A-Za-z0-9._-]+/g, '-')}-Rev${rfq.revisionNo}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  delete(id: string): Observable<ApiEnvelope<null>> {
    return this.http.delete<ApiEnvelope<null>>(`${this.baseUrl}/${id}`);
  }
}
