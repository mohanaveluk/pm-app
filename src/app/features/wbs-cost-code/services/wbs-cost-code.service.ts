import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateWbsCostCodeRequest, UpdateWbsCostCodeRequest, WbsCostCodeQueryParams,
} from '../models/wbs-cost-code-request.model';
import {
  DisciplineOptionsResponse, PagedWbsCostCodeResponse, ProjectOptionsResponse, WbsCostCodeDeleteResponse,
  WbsCostCodeResponse,
} from '../models/wbs-cost-code-response.model';

/**
 * Thin HTTP layer over WbsCostCodeController. Every method maps 1:1 to a
 * documented endpoint — no synthesized routes. Auth headers and error
 * normalization are handled by the app's existing HTTP interceptor.
 */
@Injectable({ providedIn: 'root' })
export class WbsCostCodeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/wbs-cost-codes`;

  /** GET /wbs-cost-codes — paginated, searchable, filterable. */
  getWbsCostCodes(params: WbsCostCodeQueryParams): Observable<PagedWbsCostCodeResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);
    if (params.disciplineId) httpParams = httpParams.set('disciplineId', params.disciplineId);

    return this.http.get<PagedWbsCostCodeResponse>(this.baseUrl, { params: httpParams });
  }

  /** GET /wbs-cost-codes/:id */
  getWbsCostCodeById(id: string): Observable<WbsCostCodeResponse> {
    return this.http.get<WbsCostCodeResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /wbs-cost-codes — code is server-generated; organizationId resolved from the token. */
  createWbsCostCode(request: CreateWbsCostCodeRequest): Observable<WbsCostCodeResponse> {
    return this.http.post<WbsCostCodeResponse>(this.baseUrl, request);
  }

  /** PUT /wbs-cost-codes/:id — code is immutable and rejected by the API. */
  updateWbsCostCode(id: string, request: UpdateWbsCostCodeRequest): Observable<WbsCostCodeResponse> {
    return this.http.put<WbsCostCodeResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** DELETE /wbs-cost-codes/:id — soft delete. */
  deleteWbsCostCode(id: string): Observable<WbsCostCodeDeleteResponse> {
    return this.http.delete<WbsCostCodeDeleteResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * GET /disciplines/active — the organization's active disciplines, for the
   * Discipline dropdown. Called directly (as the Activity master does) so this
   * feature does not depend on the Discipline feature's service.
   */
  getActiveDisciplines(): Observable<DisciplineOptionsResponse> {
    return this.http.get<DisciplineOptionsResponse>(`${environment.apiUrl}/v1/disciplines/active`);
  }

  /**
   * GET /projects/active — open projects (planned, active, on hold), each with
   * its client. The full list is fetched once and searched in the browser, so
   * picking from a few hundred projects stays instant.
   */
  getActiveProjects(): Observable<ProjectOptionsResponse> {
    return this.http.get<ProjectOptionsResponse>(`${environment.apiUrl}/v1/projects/active`);
  }
}
