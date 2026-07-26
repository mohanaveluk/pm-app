import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateDisciplineRequest, DisciplineQueryParams, UpdateDisciplineRequest } from '../models/discipline-request.model';
import { ApiEnvelope, DisciplineListResponse, DisciplineResponse, PagedDisciplineResponse } from '../models/discipline-response.model';

@Injectable({ providedIn: 'root' })
export class DisciplineService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/disciplines`;

  getDisciplines(params: DisciplineQueryParams): Observable<PagedDisciplineResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortDirection', params.sortDirection);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.organizationId) httpParams = httpParams.set('organizationId', params.organizationId);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);
    if (params.createdFrom) httpParams = httpParams.set('createdFrom', params.createdFrom);
    if (params.createdTo) httpParams = httpParams.set('createdTo', params.createdTo);
    if (params.updatedFrom) httpParams = httpParams.set('updatedFrom', params.updatedFrom);
    if (params.updatedTo) httpParams = httpParams.set('updatedTo', params.updatedTo);

    return this.http.get<PagedDisciplineResponse>(this.baseUrl, { params: httpParams });
  }

  getActiveDisciplines(organizationId?: string): Observable<DisciplineListResponse> {
    const httpParams = organizationId ? new HttpParams().set('organizationId', organizationId) : undefined;
    return this.http.get<DisciplineListResponse>(`${this.baseUrl}/active`, { params: httpParams });
  }

  getDisciplineById(id: string): Observable<DisciplineResponse> {
    return this.http.get<DisciplineResponse>(`${this.baseUrl}/${id}`);
  }

  createDiscipline(request: CreateDisciplineRequest): Observable<DisciplineResponse> {
    return this.http.post<DisciplineResponse>(this.baseUrl, request);
  }

  updateDiscipline(id: string, request: UpdateDisciplineRequest): Observable<DisciplineResponse> {
    return this.http.put<DisciplineResponse>(`${this.baseUrl}/${id}`, request);
  }

  deleteDiscipline(id: string): Observable<ApiEnvelope<unknown>> {
    return this.http.delete<ApiEnvelope<unknown>>(`${this.baseUrl}/${id}`);
  }
}
