import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateVendorTypeRequest, UpdateVendorTypeRequest, VendorTypeQueryParams,
} from '../models/vendor-type-request.model';
import {
  PagedVendorTypeResponse, VendorTypeDeleteResponse, VendorTypeOptionsResponse, VendorTypeResponse,
} from '../models/vendor-type-response.model';

/**
 * Thin HTTP layer over VendorTypeController. Every method maps 1:1 to a
 * documented endpoint — no synthesized routes. Auth headers and error
 * normalization are handled by the app's existing HTTP interceptor.
 */
@Injectable({ providedIn: 'root' })
export class VendorTypeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/vendor-types`;

  /** GET /vendor-types — paginated, searchable, filterable. */
  getVendorTypes(params: VendorTypeQueryParams): Observable<PagedVendorTypeResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);

    return this.http.get<PagedVendorTypeResponse>(this.baseUrl, { params: httpParams });
  }

  /** GET /vendor-types/active — active vendor types for the organization, for dropdowns. */
  getActiveVendorTypes(): Observable<VendorTypeOptionsResponse> {
    return this.http.get<VendorTypeOptionsResponse>(`${this.baseUrl}/active`);
  }

  /** GET /vendor-types/:id */
  getVendorTypeById(id: string): Observable<VendorTypeResponse> {
    return this.http.get<VendorTypeResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /vendor-types — code is server-generated; organizationId resolved from the token. */
  createVendorType(request: CreateVendorTypeRequest): Observable<VendorTypeResponse> {
    return this.http.post<VendorTypeResponse>(this.baseUrl, request);
  }

  /** PUT /vendor-types/:id — code is immutable and rejected by the API. */
  updateVendorType(id: string, request: UpdateVendorTypeRequest): Observable<VendorTypeResponse> {
    return this.http.put<VendorTypeResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** DELETE /vendor-types/:id — soft delete. */
  deleteVendorType(id: string): Observable<VendorTypeDeleteResponse> {
    return this.http.delete<VendorTypeDeleteResponse>(`${this.baseUrl}/${id}`);
  }
}
