import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateMaterialCategoryRequest, MaterialCategoryQueryParams, UpdateMaterialCategoryRequest,
} from '../models/material-category-request.model';
import {
  MaterialCategoryDeleteResponse, MaterialCategoryOptionsResponse, MaterialCategoryResponse,
  PagedMaterialCategoryResponse,
} from '../models/material-category-response.model';

/**
 * Thin HTTP layer over the real MaterialCategoryController. Every method maps
 * 1:1 to a documented endpoint — no synthesized routes. Auth headers and error
 * normalization are handled by the app's existing HTTP interceptor.
 */
@Injectable({ providedIn: 'root' })
export class MaterialCategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/material-categories`;

  /** GET /material-categories — paginated, searchable, filterable. */
  getMaterialCategories(params: MaterialCategoryQueryParams): Observable<PagedMaterialCategoryResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);
    if (params.isSystem !== undefined) httpParams = httpParams.set('isSystem', params.isSystem);

    return this.http.get<PagedMaterialCategoryResponse>(this.baseUrl, { params: httpParams });
  }

  /** GET /material-categories/active — slim list for dropdowns in downstream modules. */
  getActiveMaterialCategories(): Observable<MaterialCategoryOptionsResponse> {
    return this.http.get<MaterialCategoryOptionsResponse>(`${this.baseUrl}/active`);
  }

  /** GET /material-categories/:id */
  getMaterialCategoryById(id: string): Observable<MaterialCategoryResponse> {
    return this.http.get<MaterialCategoryResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /material-categories — organizationId is resolved server-side from the token. */
  createMaterialCategory(request: CreateMaterialCategoryRequest): Observable<MaterialCategoryResponse> {
    return this.http.post<MaterialCategoryResponse>(this.baseUrl, request);
  }

  /** PUT /material-categories/:id — code and isSystem are rejected by the API. */
  updateMaterialCategory(id: string, request: UpdateMaterialCategoryRequest): Observable<MaterialCategoryResponse> {
    return this.http.put<MaterialCategoryResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** DELETE /material-categories/:id — soft delete; 409 for system or in-use categories. */
  deleteMaterialCategory(id: string): Observable<MaterialCategoryDeleteResponse> {
    return this.http.delete<MaterialCategoryDeleteResponse>(`${this.baseUrl}/${id}`);
  }

  /** PATCH /material-categories/:id/enable */
  enableMaterialCategory(id: string): Observable<MaterialCategoryResponse> {
    return this.http.patch<MaterialCategoryResponse>(`${this.baseUrl}/${id}/enable`, {});
  }

  /** PATCH /material-categories/:id/disable — 409 when referenced by downstream data. */
  disableMaterialCategory(id: string): Observable<MaterialCategoryResponse> {
    return this.http.patch<MaterialCategoryResponse>(`${this.baseUrl}/${id}/disable`, {});
  }
}
