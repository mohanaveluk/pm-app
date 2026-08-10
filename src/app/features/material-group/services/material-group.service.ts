import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateMaterialGroupRequest, MaterialGroupQueryParams, UpdateMaterialGroupRequest,
} from '../models/material-group-request.model';
import {
  MaterialGroupDeleteResponse, MaterialGroupOptionsResponse, MaterialGroupResponse,
  PagedMaterialGroupResponse,
} from '../models/material-group-response.model';

/**
 * Thin HTTP layer over the real MaterialGroupController. Every method maps 1:1
 * to a documented endpoint — no synthesized routes. Auth headers and error
 * normalization are handled by the app's existing HTTP interceptor.
 *
 * Parent Material Categories are fetched through the root-provided
 * MaterialCategoryService rather than duplicated here: the parent relationship
 * is a hard FK (ON DELETE RESTRICT), so the dependency is intrinsic, not incidental.
 */
@Injectable({ providedIn: 'root' })
export class MaterialGroupService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/material-groups`;

  /** GET /material-groups — paginated, searchable, filterable (incl. by parent category). */
  getMaterialGroups(params: MaterialGroupQueryParams): Observable<PagedMaterialGroupResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.materialCategoryId) httpParams = httpParams.set('materialCategoryId', params.materialCategoryId);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);
    if (params.isSystem !== undefined) httpParams = httpParams.set('isSystem', params.isSystem);

    return this.http.get<PagedMaterialGroupResponse>(this.baseUrl, { params: httpParams });
  }

  /**
   * GET /material-groups/active — slim list for cascading dropdowns.
   * Pass materialCategoryId to scope the list to one parent category.
   */
  getActiveMaterialGroups(materialCategoryId?: string): Observable<MaterialGroupOptionsResponse> {
    const params = materialCategoryId
      ? new HttpParams().set('materialCategoryId', materialCategoryId)
      : undefined;
    return this.http.get<MaterialGroupOptionsResponse>(`${this.baseUrl}/active`, { params });
  }

  /** GET /material-groups/:id */
  getMaterialGroupById(id: string): Observable<MaterialGroupResponse> {
    return this.http.get<MaterialGroupResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /material-groups — parent category must exist and be active. */
  createMaterialGroup(request: CreateMaterialGroupRequest): Observable<MaterialGroupResponse> {
    return this.http.post<MaterialGroupResponse>(this.baseUrl, request);
  }

  /** PUT /material-groups/:id — code, materialCategoryId and isSystem are rejected by the API. */
  updateMaterialGroup(id: string, request: UpdateMaterialGroupRequest): Observable<MaterialGroupResponse> {
    return this.http.put<MaterialGroupResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** DELETE /material-groups/:id — soft delete; 409 for system or in-use groups. */
  deleteMaterialGroup(id: string): Observable<MaterialGroupDeleteResponse> {
    return this.http.delete<MaterialGroupDeleteResponse>(`${this.baseUrl}/${id}`);
  }

  /** PATCH /material-groups/:id/enable — 400 when the parent category is inactive. */
  enableMaterialGroup(id: string): Observable<MaterialGroupResponse> {
    return this.http.patch<MaterialGroupResponse>(`${this.baseUrl}/${id}/enable`, {});
  }

  /** PATCH /material-groups/:id/disable — 409 when referenced by downstream data. */
  disableMaterialGroup(id: string): Observable<MaterialGroupResponse> {
    return this.http.patch<MaterialGroupResponse>(`${this.baseUrl}/${id}/disable`, {});
  }
}
