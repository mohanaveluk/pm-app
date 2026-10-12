import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MaterialRequisitionStatus } from '../models/material-requisition.model';
import { environment } from '../../../../environments/environment';
import { WbsCostCode } from '../../wbs-cost-code/models/wbs-cost-code.model';
import {
  CreateMaterialRequisitionRequest, MaterialRequisitionQueryParams,
  RequisitionMaterialQueryParams, UpdateMaterialRequisitionRequest,
} from '../models/material-requisition-request.model';
import {
  ApiEnvelope, BomColumnsResponse, BomPreviewResponse, CandidateListResponse, CandidatesResponse,
  DeleteResponse, DocumentUploadResponse, MaterialRequisitionResponse,
  PagedMaterialRequisitionResponse,
} from '../models/material-requisition-response.model';

/**
 * Thin HTTP layer over MaterialRequisitionController. Every method maps 1:1 to a
 * documented endpoint. The requisition's code is never sent — the server
 * generates it — and neither are the client or any WBS detail: both are read
 * from the project and the WBS / cost code the requisition points at.
 */
@Injectable({ providedIn: 'root' })
export class MaterialRequisitionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/material-requisitions`;

  /** GET /material-requisitions */
  getRequisitions(params: MaterialRequisitionQueryParams): Observable<PagedMaterialRequisitionResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.projectId) httpParams = httpParams.set('projectId', params.projectId);

    return this.http.get<PagedMaterialRequisitionResponse>(this.baseUrl, { params: httpParams });
  }

  /** GET /material-requisitions/:id */
  getRequisitionById(id: string): Observable<MaterialRequisitionResponse> {
    return this.http.get<MaterialRequisitionResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /material-requisitions — `submit: true` saves and submits. */
  createRequisition(request: CreateMaterialRequisitionRequest): Observable<MaterialRequisitionResponse> {
    return this.http.post<MaterialRequisitionResponse>(this.baseUrl, request);
  }

  /** PUT /material-requisitions/:id — a draft only. */
  updateRequisition(id: string, request: UpdateMaterialRequisitionRequest): Observable<MaterialRequisitionResponse> {
    return this.http.put<MaterialRequisitionResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** PATCH /material-requisitions/:id/submit — DRAFT → UNDER_REVIEW. */
  submitRequisition(id: string): Observable<MaterialRequisitionResponse> {
    return this.http.patch<MaterialRequisitionResponse>(`${this.baseUrl}/${id}/submit`, {});
  }

  /** PATCH /material-requisitions/:id/status — hold, release, disable, enable, obsolete. */
  updateStatus(id: string, status: MaterialRequisitionStatus): Observable<MaterialRequisitionResponse> {
    return this.http.patch<MaterialRequisitionResponse>(`${this.baseUrl}/${id}/status`, { status });
  }

  /** DELETE /material-requisitions/:id — a draft only. */
  deleteRequisition(id: string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.baseUrl}/${id}`);
  }

  // ── Material sources ────────────────────────────────────────────────

  /** GET /material-requisitions/materials — Material Master source, paged. */
  searchMaterials(params: RequisitionMaterialQueryParams): Observable<CandidateListResponse> {
    let httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.materialCategoryId) httpParams = httpParams.set('materialCategoryId', params.materialCategoryId);
    if (params.materialGroupId) httpParams = httpParams.set('materialGroupId', params.materialGroupId);
    if (params.unitOfMeasurementId) httpParams = httpParams.set('unitOfMeasurementId', params.unitOfMeasurementId);
    return this.http.get<CandidateListResponse>(`${this.baseUrl}/materials`, { params: httpParams });
  }

  /** GET /material-requisitions/project-items — Project source. */
  getProjectItems(projectId: string, wbsCostCodeId?: string | null): Observable<CandidatesResponse> {
    let httpParams = new HttpParams().set('projectId', projectId);
    if (wbsCostCodeId) httpParams = httpParams.set('wbsCostCodeId', wbsCostCodeId);
    return this.http.get<CandidatesResponse>(`${this.baseUrl}/project-items`, { params: httpParams });
  }

  /** POST /material-requisitions/bom/columns — the file's columns, with a guess. */
  getBomColumns(file: File): Observable<BomColumnsResponse> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<BomColumnsResponse>(`${this.baseUrl}/bom/columns`, form);
  }

  /** POST /material-requisitions/bom/preview — rows matched to the Material Master. */
  previewBom(file: File, codeColumn: string, quantityColumn: string): Observable<BomPreviewResponse> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('codeColumn', codeColumn);
    form.append('quantityColumn', quantityColumn);
    return this.http.post<BomPreviewResponse>(`${this.baseUrl}/bom/preview`, form);
  }

  // ── Documents ───────────────────────────────────────────────────────

  /** POST /material-requisitions/documents/upload — returns the stored file's URL. */
  uploadDocument(file: File): Observable<DocumentUploadResponse> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<DocumentUploadResponse>(`${this.baseUrl}/documents/upload`, form);
  }

  // ── WBS / cost codes ────────────────────────────────────────────────

  /** GET /wbs-cost-codes/active?projectId= — the WBS / cost codes of one project. */
  getWbsCostCodes(projectId: string): Observable<ApiEnvelope<WbsCostCode[]>> {
    const params = new HttpParams().set('projectId', projectId);
    return this.http.get<ApiEnvelope<WbsCostCode[]>>(`${environment.apiUrl}/v1/wbs-cost-codes/active`, { params });
  }
}
