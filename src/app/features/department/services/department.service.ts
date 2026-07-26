import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Department } from '../models/department.model';
import { CreateDepartmentRequest, DepartmentQueryParams, UpdateDepartmentRequest } from '../models/department-request.model';
import { DepartmentResponse, PagedDepartmentResponse } from '../models/department-response.model';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/departments`;

  getDepartments(params: DepartmentQueryParams): Observable<PagedDepartmentResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('pageSize', params.pageSize)
      .set('sortBy', params.sortBy)
      .set('sortDirection', params.sortDirection);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.organizationId) httpParams = httpParams.set('organizationId', params.organizationId);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);
    if (params.createdFrom) httpParams = httpParams.set('createdFrom', params.createdFrom);
    if (params.createdTo) httpParams = httpParams.set('createdTo', params.createdTo);
    if (params.updatedFrom) httpParams = httpParams.set('updatedFrom', params.updatedFrom);
    if (params.updatedTo) httpParams = httpParams.set('updatedTo', params.updatedTo);

    return this.http.get<PagedDepartmentResponse>(this.baseUrl, { params: httpParams });
  }

  getActiveDepartments(organizationId?: string): Observable<Department[]> {
    const httpParams = organizationId ? new HttpParams().set('organizationId', organizationId) : undefined;
    return this.http.get<Department[]>(`${this.baseUrl}/active`, { params: httpParams });
  }

  getDepartmentById(id: string): Observable<Department> {
    return this.http.get<Department>(`${this.baseUrl}/${id}`);
  }

  createDepartment(request: CreateDepartmentRequest): Observable<DepartmentResponse> {
    return this.http.post<DepartmentResponse>(this.baseUrl, request);
  }

  updateDepartment(id: string, request: UpdateDepartmentRequest): Observable<DepartmentResponse> {
    return this.http.put<DepartmentResponse>(`${this.baseUrl}/${id}`, request);
  }

  deleteDepartment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
