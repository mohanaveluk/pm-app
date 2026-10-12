import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateClientTypeRequest, UpdateClientTypeRequest, ClientTypeQueryParams,
} from '../models/client-type-request.model';
import {
  PagedClientTypeResponse, ClientTypeDeleteResponse, ClientTypeOptionsResponse, ClientTypeResponse,
} from '../models/client-type-response.model';

/**
 * Thin HTTP layer over ClientTypeController. Every method maps 1:1 to a
 * documented endpoint — no synthesized routes. Auth headers and error
 * normalization are handled by the app's existing HTTP interceptor.
 */
@Injectable({ providedIn: 'root' })
export class ClientTypeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/client-types`;

  /** GET /client-types — paginated, searchable, filterable. */
  getClientTypes(params: ClientTypeQueryParams): Observable<PagedClientTypeResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);

    return this.http.get<PagedClientTypeResponse>(this.baseUrl, { params: httpParams });
  }

  /** GET /client-types/active — active client types for the organization, for dropdowns. */
  getActiveClientTypes(): Observable<ClientTypeOptionsResponse> {
    return this.http.get<ClientTypeOptionsResponse>(`${this.baseUrl}/active`);
  }

  /** GET /client-types/:id */
  getClientTypeById(id: string): Observable<ClientTypeResponse> {
    return this.http.get<ClientTypeResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /client-types — code is server-generated; organizationId resolved from the token. */
  createClientType(request: CreateClientTypeRequest): Observable<ClientTypeResponse> {
    return this.http.post<ClientTypeResponse>(this.baseUrl, request);
  }

  /** PUT /client-types/:id — code is immutable and rejected by the API. */
  updateClientType(id: string, request: UpdateClientTypeRequest): Observable<ClientTypeResponse> {
    return this.http.put<ClientTypeResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** DELETE /client-types/:id — soft delete. */
  deleteClientType(id: string): Observable<ClientTypeDeleteResponse> {
    return this.http.delete<ClientTypeDeleteResponse>(`${this.baseUrl}/${id}`);
  }
}
