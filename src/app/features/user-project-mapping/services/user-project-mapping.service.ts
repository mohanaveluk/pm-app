import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  EligibleUser, MappingStatus, UserProjectMappingDetail,
} from '../models/user-project-mapping.model';
import {
  ApiEnvelope, CreateUserProjectMappingRequest, PagedUserProjectMappings,
  UpdateUserProjectMappingRequest, UserProjectMappingQueryParams,
} from '../models/user-project-mapping-request.model';

/** Thin client for /user-project-mappings — one method per endpoint. */
@Injectable({ providedIn: 'root' })
export class UserProjectMappingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/user-project-mappings`;

  /** GET / — one row per mapped project. */
  getMappings(query: UserProjectMappingQueryParams): Observable<ApiEnvelope<PagedUserProjectMappings>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<ApiEnvelope<PagedUserProjectMappings>>(this.baseUrl, { params });
  }

  /** GET /:projectId — a project's mapping with its assignment history. */
  getMapping(projectId: string): Observable<ApiEnvelope<UserProjectMappingDetail>> {
    return this.http.get<ApiEnvelope<UserProjectMappingDetail>>(`${this.baseUrl}/${projectId}`);
  }

  /** GET /eligible-users — active internal users. */
  getEligibleUsers(): Observable<ApiEnvelope<EligibleUser[]>> {
    return this.http.get<ApiEnvelope<EligibleUser[]>>(`${this.baseUrl}/eligible-users`);
  }

  createMapping(request: CreateUserProjectMappingRequest): Observable<ApiEnvelope<UserProjectMappingDetail>> {
    return this.http.post<ApiEnvelope<UserProjectMappingDetail>>(this.baseUrl, request);
  }

  updateMapping(projectId: string, request: UpdateUserProjectMappingRequest): Observable<ApiEnvelope<UserProjectMappingDetail>> {
    return this.http.put<ApiEnvelope<UserProjectMappingDetail>>(`${this.baseUrl}/${projectId}`, request);
  }

  setStatus(projectId: string, status: MappingStatus): Observable<ApiEnvelope<UserProjectMappingDetail>> {
    return this.http.patch<ApiEnvelope<UserProjectMappingDetail>>(`${this.baseUrl}/${projectId}/status`, { status });
  }

  deleteMapping(projectId: string): Observable<ApiEnvelope<null>> {
    return this.http.delete<ApiEnvelope<null>>(`${this.baseUrl}/${projectId}`);
  }
}
