import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateProjectTypeRequest, UpdateProjectTypeRequest, ProjectTypeQueryParams,
} from '../models/project-type-request.model';
import {
  PagedProjectTypeResponse, ProjectTypeDeleteResponse, ProjectTypeOptionsResponse, ProjectTypeResponse,
} from '../models/project-type-response.model';

/**
 * Thin HTTP layer over ProjectTypeController. Every method maps 1:1 to a
 * documented endpoint — no synthesized routes. Auth headers and error
 * normalization are handled by the app's existing HTTP interceptor.
 */
@Injectable({ providedIn: 'root' })
export class ProjectTypeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/project-types`;

  /** GET /project-types — paginated, searchable, filterable. */
  getProjectTypes(params: ProjectTypeQueryParams): Observable<PagedProjectTypeResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);

    return this.http.get<PagedProjectTypeResponse>(this.baseUrl, { params: httpParams });
  }

  /** GET /project-types/active — active project types for the organization, for dropdowns. */
  getActiveProjectTypes(): Observable<ProjectTypeOptionsResponse> {
    return this.http.get<ProjectTypeOptionsResponse>(`${this.baseUrl}/active`);
  }

  /** GET /project-types/:id */
  getProjectTypeById(id: string): Observable<ProjectTypeResponse> {
    return this.http.get<ProjectTypeResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /project-types — code is server-generated; organizationId resolved from the token. */
  createProjectType(request: CreateProjectTypeRequest): Observable<ProjectTypeResponse> {
    return this.http.post<ProjectTypeResponse>(this.baseUrl, request);
  }

  /** PUT /project-types/:id — code is immutable and rejected by the API. */
  updateProjectType(id: string, request: UpdateProjectTypeRequest): Observable<ProjectTypeResponse> {
    return this.http.put<ProjectTypeResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** DELETE /project-types/:id — soft delete. */
  deleteProjectType(id: string): Observable<ProjectTypeDeleteResponse> {
    return this.http.delete<ProjectTypeDeleteResponse>(`${this.baseUrl}/${id}`);
  }
}
