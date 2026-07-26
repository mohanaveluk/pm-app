import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BulkCreateDepartmentDisciplineRequest, CreateDepartmentDisciplineRequest,
  MappingQueryParams, UpdateDepartmentDisciplineRequest,
} from '../models/department-discipline-request.model';
import { ApiEnvelope, MappingListResponse, MappingResponse, PagedMappingResponse } from '../models/department-discipline-response.model';

@Injectable({ providedIn: 'root' })
export class DepartmentDisciplineService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/department-disciplines`;

  getMappings(params: MappingQueryParams): Observable<PagedMappingResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortDirection', params.sortDirection);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.organizationId) httpParams = httpParams.set('organizationId', params.organizationId);
    if (params.departmentId) httpParams = httpParams.set('departmentId', params.departmentId);
    if (params.disciplineId) httpParams = httpParams.set('disciplineId', params.disciplineId);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);
    if (params.createdFrom) httpParams = httpParams.set('createdFrom', params.createdFrom);
    if (params.createdTo) httpParams = httpParams.set('createdTo', params.createdTo);
    if (params.updatedFrom) httpParams = httpParams.set('updatedFrom', params.updatedFrom);
    if (params.updatedTo) httpParams = httpParams.set('updatedTo', params.updatedTo);

    return this.http.get<PagedMappingResponse>(this.baseUrl, { params: httpParams });
  }

  getActiveMappings(organizationId?: string): Observable<MappingListResponse> {
    const httpParams = organizationId ? new HttpParams().set('organizationId', organizationId) : undefined;
    return this.http.get<MappingListResponse>(`${this.baseUrl}/active`, { params: httpParams });
  }

  getMappingsByDepartment(departmentId: string): Observable<MappingListResponse> {
    return this.http.get<MappingListResponse>(`${this.baseUrl}/department/${departmentId}`);
  }

  getMappingsByDiscipline(disciplineId: string): Observable<MappingListResponse> {
    return this.http.get<MappingListResponse>(`${this.baseUrl}/discipline/${disciplineId}`);
  }

  getMappingById(id: string): Observable<MappingResponse> {
    return this.http.get<MappingResponse>(`${this.baseUrl}/${id}`);
  }

  createMapping(request: CreateDepartmentDisciplineRequest): Observable<MappingResponse> {
    return this.http.post<MappingResponse>(this.baseUrl, request);
  }

  bulkCreateMappings(request: BulkCreateDepartmentDisciplineRequest): Observable<MappingListResponse> {
    return this.http.post<MappingListResponse>(`${this.baseUrl}/bulk`, request);
  }

  updateMapping(id: string, request: UpdateDepartmentDisciplineRequest): Observable<MappingResponse> {
    return this.http.put<MappingResponse>(`${this.baseUrl}/${id}`, request);
  }

  deleteMapping(id: string): Observable<ApiEnvelope<unknown>> {
    return this.http.delete<ApiEnvelope<unknown>>(`${this.baseUrl}/${id}`);
  }
}
