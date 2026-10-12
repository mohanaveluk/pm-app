import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateProjectRequest, ProjectQueryParams, UpdateProjectRequest, UpdateProjectStatusRequest,
} from '../models/project-request.model';
import {
  PagedProjectResponse, ProjectDeleteResponse, ProjectManagersResponse, ProjectOptionsResponse,
  ProjectResponse, ProjectSummaryResponse,
} from '../models/project-response.model';

/**
 * Thin HTTP layer over ProjectController. Every method maps 1:1 to a documented
 * endpoint — no synthesized routes. The project number is never sent (the
 * server generates it), and status changes go through `updateStatus`, never the
 * PUT body.
 */
@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/projects`;

  /** GET /projects — paginated, searchable, filterable. */
  getProjects(params: ProjectQueryParams): Observable<PagedProjectResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.clientId) httpParams = httpParams.set('clientId', params.clientId);
    if (params.projectTypeId) httpParams = httpParams.set('projectTypeId', params.projectTypeId);
    if (params.projectManagerId) httpParams = httpParams.set('projectManagerId', params.projectManagerId);
    if (params.countryCode) httpParams = httpParams.set('countryCode', params.countryCode);

    return this.http.get<PagedProjectResponse>(this.baseUrl, { params: httpParams });
  }

  /** GET /projects/active — open projects (planned, active, on hold) for dropdowns. */
  getActiveProjects(): Observable<ProjectOptionsResponse> {
    return this.http.get<ProjectOptionsResponse>(`${this.baseUrl}/active`);
  }

  /** GET /projects/project-managers — internal, active users who can own a project. */
  getProjectManagers(): Observable<ProjectManagersResponse> {
    return this.http.get<ProjectManagersResponse>(`${this.baseUrl}/project-managers`);
  }

  /** GET /projects/:id */
  getProjectById(id: string): Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`${this.baseUrl}/${id}`);
  }

  /** GET /projects/:id/summary — the project with its client, schedule and next statuses. */
  getProjectSummary(id: string): Observable<ProjectSummaryResponse> {
    return this.http.get<ProjectSummaryResponse>(`${this.baseUrl}/${id}/summary`);
  }

  /** POST /projects */
  createProject(request: CreateProjectRequest): Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(this.baseUrl, request);
  }

  /** PUT /projects/:id */
  updateProject(id: string, request: UpdateProjectRequest): Observable<ProjectResponse> {
    return this.http.put<ProjectResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** PATCH /projects/:id/status */
  updateStatus(id: string, request: UpdateProjectStatusRequest): Observable<ProjectResponse> {
    return this.http.patch<ProjectResponse>(`${this.baseUrl}/${id}/status`, request);
  }

  /** DELETE /projects/:id — soft delete; only a planned or cancelled project. */
  deleteProject(id: string): Observable<ProjectDeleteResponse> {
    return this.http.delete<ProjectDeleteResponse>(`${this.baseUrl}/${id}`);
  }
}
