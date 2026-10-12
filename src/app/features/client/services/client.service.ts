import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AddClientDocumentRequest, ClientQueryParams, CreateClientRequest,
  DeactivateClientRequest, UpdateClientRequest,
} from '../models/client-request.model';
import {
  ClientAuditResponse, ClientDeleteResponse, ClientDocumentDeleteResponse,
  ClientDocumentResponse, ClientDocumentsResponse, ClientDocumentUploadResponse,
  ClientOptionsResponse, ClientResponse, PagedClientResponse,
} from '../models/client-response.model';

/**
 * Thin HTTP layer over ClientController. Every method maps 1:1 to a documented
 * endpoint — no synthesized routes. The client `code` is never sent: the
 * server generates it (0001, 0002, …). A client starts Active, and status
 * changes go through activate / deactivate, never the PUT body.
 */
@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/clients`;

  /** GET /clients — paginated, searchable, filterable. */
  getClients(params: ClientQueryParams): Observable<PagedClientResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.clientTypeId) httpParams = httpParams.set('clientTypeId', params.clientTypeId);
    if (params.industryCategoryId) httpParams = httpParams.set('industryCategoryId', params.industryCategoryId);
    if (params.countryCode) httpParams = httpParams.set('countryCode', params.countryCode);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.parentClientId) httpParams = httpParams.set('parentClientId', params.parentClientId);

    return this.http.get<PagedClientResponse>(this.baseUrl, { params: httpParams });
  }

  /** GET /clients/active — active clients for dropdowns (parent client, Project Master). */
  getActiveClients(): Observable<ClientOptionsResponse> {
    return this.http.get<ClientOptionsResponse>(`${this.baseUrl}/active`);
  }

  /** GET /clients/:id — full detail with addresses, contacts, documents and settings. */
  getClientById(id: string): Observable<ClientResponse> {
    return this.http.get<ClientResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /clients */
  createClient(request: CreateClientRequest): Observable<ClientResponse> {
    return this.http.post<ClientResponse>(this.baseUrl, request);
  }

  /** PUT /clients/:id — accepts any subset of the fields and sections. */
  updateClient(id: string, request: UpdateClientRequest): Observable<ClientResponse> {
    return this.http.put<ClientResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** PATCH /clients/:id/activate */
  activateClient(id: string): Observable<ClientResponse> {
    return this.http.patch<ClientResponse>(`${this.baseUrl}/${id}/activate`, {});
  }

  /** PATCH /clients/:id/deactivate — soft state change; history is preserved. */
  deactivateClient(id: string, request: DeactivateClientRequest = {}): Observable<ClientResponse> {
    return this.http.patch<ClientResponse>(`${this.baseUrl}/${id}/deactivate`, request);
  }

  /** DELETE /clients/:id — soft delete; refused while the client has subsidiaries. */
  deleteClient(id: string): Observable<ClientDeleteResponse> {
    return this.http.delete<ClientDeleteResponse>(`${this.baseUrl}/${id}`);
  }

  // ── Documents ───────────────────────────────────────────────────────

  /** POST /clients/documents/upload — multipart; returns the stored file's URL. */
  uploadDocument(file: File): Observable<ClientDocumentUploadResponse> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ClientDocumentUploadResponse>(`${this.baseUrl}/documents/upload`, form);
  }

  /** GET /clients/:id/documents */
  getDocuments(clientId: string): Observable<ClientDocumentsResponse> {
    return this.http.get<ClientDocumentsResponse>(`${this.baseUrl}/${clientId}/documents`);
  }

  /** POST /clients/:id/documents — registers an already-uploaded file. */
  addDocument(clientId: string, request: AddClientDocumentRequest): Observable<ClientDocumentResponse> {
    return this.http.post<ClientDocumentResponse>(`${this.baseUrl}/${clientId}/documents`, request);
  }

  /** DELETE /clients/:id/documents/:documentId */
  removeDocument(clientId: string, documentId: string): Observable<ClientDocumentDeleteResponse> {
    return this.http.delete<ClientDocumentDeleteResponse>(`${this.baseUrl}/${clientId}/documents/${documentId}`);
  }

  // ── Audit history ───────────────────────────────────────────────────

  /** GET /clients/:id/audit — newest first. */
  getAuditHistory(clientId: string): Observable<ClientAuditResponse> {
    return this.http.get<ClientAuditResponse>(`${this.baseUrl}/${clientId}/audit`);
  }
}
