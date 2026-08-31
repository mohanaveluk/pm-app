import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AddMaterialDocumentRequest, CreateMaterialRequest, MaterialDocumentQueryParams,
  MaterialQueryParams, UpdateMaterialRequest,
} from '../models/material-request.model';
import {
  MaterialDeleteResponse, MaterialDocumentDeleteResponse, MaterialDocumentResponse,
  MaterialDocumentsResponse, MaterialOptionsResponse, MaterialResponse, PagedMaterialResponse,
} from '../models/material-response.model';

/**
 * Thin HTTP layer over the real MaterialController. Every method maps 1:1 to a
 * documented endpoint — no synthesized routes.
 *
 * `code` is never sent: MaterialCodeService generates it server-side (RAW000001).
 * Status changes go through the dedicated enable/disable/obsolete endpoints
 * rather than the PUT body.
 */
@Injectable({ providedIn: 'root' })
export class MaterialService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/materials`;

  /** GET /materials — paginated, searchable, filterable. */
  getMaterials(params: MaterialQueryParams): Observable<PagedMaterialResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.materialCategoryId) httpParams = httpParams.set('materialCategoryId', params.materialCategoryId);
    if (params.materialGroupId) httpParams = httpParams.set('materialGroupId', params.materialGroupId);
    if (params.unitOfMeasurementId) httpParams = httpParams.set('unitOfMeasurementId', params.unitOfMeasurementId);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.criticalityLevel) httpParams = httpParams.set('criticalityLevel', params.criticalityLevel);
    if (params.isStockItem !== undefined) httpParams = httpParams.set('isStockItem', params.isStockItem);
    if (params.isSystem !== undefined) httpParams = httpParams.set('isSystem', params.isSystem);
    if (params.manufacturerName) httpParams = httpParams.set('manufacturerName', params.manufacturerName);

    return this.http.get<PagedMaterialResponse>(this.baseUrl, { params: httpParams });
  }

  /** GET /materials/active — slim list for dropdowns, optionally scoped by category/group. */
  getActiveMaterials(materialCategoryId?: string, materialGroupId?: string): Observable<MaterialOptionsResponse> {
    let params = new HttpParams();
    if (materialCategoryId) params = params.set('materialCategoryId', materialCategoryId);
    if (materialGroupId) params = params.set('materialGroupId', materialGroupId);
    return this.http.get<MaterialOptionsResponse>(`${this.baseUrl}/active`, { params });
  }

  /** GET /materials/:id — full detail, returned flat (see material.mapper.ts). */
  getMaterialById(id: string): Observable<MaterialResponse> {
    return this.http.get<MaterialResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /materials — code auto-generated server-side. */
  createMaterial(request: CreateMaterialRequest): Observable<MaterialResponse> {
    return this.http.post<MaterialResponse>(this.baseUrl, request);
  }

  /** PUT /materials/:id — accepts any subset of the nested section payloads. */
  updateMaterial(id: string, request: UpdateMaterialRequest): Observable<MaterialResponse> {
    return this.http.put<MaterialResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** PATCH /materials/:id/enable — status → ACTIVE. */
  enableMaterial(id: string): Observable<MaterialResponse> {
    return this.http.patch<MaterialResponse>(`${this.baseUrl}/${id}/enable`, {});
  }

  /** PATCH /materials/:id/disable — status → INACTIVE. */
  disableMaterial(id: string): Observable<MaterialResponse> {
    return this.http.patch<MaterialResponse>(`${this.baseUrl}/${id}/disable`, {});
  }

  /** PATCH /materials/:id/obsolete — status → OBSOLETE (terminal; cannot be re-activated). */
  obsoleteMaterial(id: string): Observable<MaterialResponse> {
    return this.http.patch<MaterialResponse>(`${this.baseUrl}/${id}/obsolete`, {});
  }

  /** DELETE /materials/:id — soft delete. */
  deleteMaterial(id: string): Observable<MaterialDeleteResponse> {
    return this.http.delete<MaterialDeleteResponse>(`${this.baseUrl}/${id}`);
  }

  // ── Document register (material_documents) ──────────────────────────
  // GET /materials/:id already returns the current version of each type as
  // `documents`; these three are the dedicated endpoints for full history and
  // for mutating one document at a time.

  /**
   * GET /materials/:id/documents — defaults to `includeSuperseded: true` so
   * the Documents step can show every version of every type; pass `false`
   * explicitly for just the current row of each chain.
   */
  getMaterialDocuments(
    materialId: string,
    params: MaterialDocumentQueryParams = { includeSuperseded: true },
  ): Observable<MaterialDocumentsResponse> {
    let httpParams = new HttpParams();
    if (params.documentType) httpParams = httpParams.set('documentType', params.documentType);
    if (params.includeSuperseded !== undefined) {
      httpParams = httpParams.set('includeSuperseded', params.includeSuperseded);
    }
    return this.http.get<MaterialDocumentsResponse>(`${this.baseUrl}/${materialId}/documents`, { params: httpParams });
  }

  /**
   * POST /materials/:id/documents — allowed even once a purchase order has
   * locked the rest of the material. Omitting `supersedesId` lets the server
   * decide: auto-supersede for a singleton type, or start a new chain for
   * everything else (the mechanism behind "Add New Document").
   */
  addMaterialDocument(materialId: string, request: AddMaterialDocumentRequest): Observable<MaterialDocumentResponse> {
    return this.http.post<MaterialDocumentResponse>(`${this.baseUrl}/${materialId}/documents`, request);
  }

  /**
   * DELETE /materials/:id/documents/:documentId — soft delete. Refused with
   * 409 once a purchase order has been issued against the material.
   */
  removeMaterialDocument(materialId: string, documentId: string): Observable<MaterialDocumentDeleteResponse> {
    return this.http.delete<MaterialDocumentDeleteResponse>(`${this.baseUrl}/${materialId}/documents/${documentId}`);
  }

  /**
   * POST /materials/:id/clone — server copies every field (descriptions,
   * category, group, UOM, technical/procurement/inventory/quality/accounting/
   * safety/logistics data, document URLs) into a new record with a new id,
   * dguid, and the next sequential code in the same category.
   */
  cloneMaterial(id: string): Observable<MaterialResponse> {
    return this.http.post<MaterialResponse>(`${this.baseUrl}/${id}/clone`, {});
  }
}
