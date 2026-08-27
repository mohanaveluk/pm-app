import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateIndustryCategoryRequest, IndustryCategoryQueryParams, UpdateIndustryCategoryRequest,
} from '../models/industry-category-request.model';
import {
  IndustryCategoryDeleteResponse, IndustryCategoryOptionsResponse, IndustryCategoryResponse,
  PagedIndustryCategoryResponse,
} from '../models/industry-category-response.model';

/**
 * Thin HTTP layer over the real IndustryCategoryController. Every method maps
 * 1:1 to a documented endpoint — no synthesized routes. Auth headers and error
 * normalization are handled by the app's existing HTTP interceptor.
 */
@Injectable({ providedIn: 'root' })
export class IndustryCategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/industry-categories`;

  /** GET /industry-categories — paginated, searchable, filterable. */
  getIndustryCategories(params: IndustryCategoryQueryParams): Observable<PagedIndustryCategoryResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);
    if (params.isSystem !== undefined) httpParams = httpParams.set('isSystem', params.isSystem);

    return this.http.get<PagedIndustryCategoryResponse>(this.baseUrl, { params: httpParams });
  }

  /** GET /industry-categories/active — slim list for dropdowns in downstream modules. */
  getActiveIndustryCategories(): Observable<IndustryCategoryOptionsResponse> {
    return this.http.get<IndustryCategoryOptionsResponse>(`${this.baseUrl}/active`);
  }

  /** GET /industry-categories/:id */
  getIndustryCategoryById(id: string): Observable<IndustryCategoryResponse> {
    return this.http.get<IndustryCategoryResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /industry-categories — organizationId is resolved server-side from the token. */
  createIndustryCategory(request: CreateIndustryCategoryRequest): Observable<IndustryCategoryResponse> {
    return this.http.post<IndustryCategoryResponse>(this.baseUrl, request);
  }

  /** PUT /industry-categories/:id — code and isSystem are rejected by the API. */
  updateIndustryCategory(id: string, request: UpdateIndustryCategoryRequest): Observable<IndustryCategoryResponse> {
    return this.http.put<IndustryCategoryResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** DELETE /industry-categories/:id — soft delete; 409 for system or in-use categories. */
  deleteIndustryCategory(id: string): Observable<IndustryCategoryDeleteResponse> {
    return this.http.delete<IndustryCategoryDeleteResponse>(`${this.baseUrl}/${id}`);
  }

  /** PATCH /industry-categories/:id/enable */
  enableIndustryCategory(id: string): Observable<IndustryCategoryResponse> {
    return this.http.patch<IndustryCategoryResponse>(`${this.baseUrl}/${id}/enable`, {});
  }

  /** PATCH /industry-categories/:id/disable — 409 when referenced by downstream data. */
  disableIndustryCategory(id: string): Observable<IndustryCategoryResponse> {
    return this.http.patch<IndustryCategoryResponse>(`${this.baseUrl}/${id}/disable`, {});
  }
}
