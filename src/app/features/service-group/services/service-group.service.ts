import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CloneServiceGroupRequest, CopyPermissionsRequest, CreateServiceGroupRequest,
  ServiceGroupQueryParams, UpdateServiceGroupRequest,
} from '../models/service-group-request.model';
import { AvailableActivityOption } from '../models/service-group.model';
import { ApiEnvelope, PagedServiceGroupResponse, PermissionMatrixResponse, ServiceGroupResponse } from '../models/service-group-response.model';

@Injectable({ providedIn: 'root' })
export class ServiceGroupService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/service-groups`;

  getServiceGroups(params: ServiceGroupQueryParams): Observable<PagedServiceGroupResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.groupType) httpParams = httpParams.set('groupType', params.groupType);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);

    return this.http.get<PagedServiceGroupResponse>(this.baseUrl, { params: httpParams });
  }

  getServiceGroupById(id: string): Observable<ServiceGroupResponse> {
    return this.http.get<ServiceGroupResponse>(`${this.baseUrl}/${id}`);
  }

  createServiceGroup(request: CreateServiceGroupRequest): Observable<ServiceGroupResponse> {
    return this.http.post<ServiceGroupResponse>(this.baseUrl, request);
  }

  updateServiceGroup(id: string, request: UpdateServiceGroupRequest): Observable<ServiceGroupResponse> {
    return this.http.put<ServiceGroupResponse>(`${this.baseUrl}/${id}`, request);
  }

  deleteServiceGroup(id: string): Observable<ApiEnvelope<null>> {
    return this.http.delete<ApiEnvelope<null>>(`${this.baseUrl}/${id}`);
  }

  enableGroup(id: string): Observable<ServiceGroupResponse> {
    return this.http.patch<ServiceGroupResponse>(`${this.baseUrl}/${id}/enable`, {});
  }

  disableGroup(id: string): Observable<ServiceGroupResponse> {
    return this.http.patch<ServiceGroupResponse>(`${this.baseUrl}/${id}/disable`, {});
  }

  cloneGroup(id: string, request: CloneServiceGroupRequest): Observable<ServiceGroupResponse> {
    return this.http.post<ServiceGroupResponse>(`${this.baseUrl}/${id}/clone`, request);
  }

  copyPermissions(id: string, request: CopyPermissionsRequest): Observable<ServiceGroupResponse> {
    return this.http.post<ServiceGroupResponse>(`${this.baseUrl}/${id}/copy`, request);
  }

  getPermissionMatrix(id: string): Observable<PermissionMatrixResponse> {
    return this.http.get<PermissionMatrixResponse>(`${this.baseUrl}/${id}/permission-matrix`);
  }

  getActivities(): Observable<ApiEnvelope<AvailableActivityOption[]>> {
    return this.http.get<ApiEnvelope<AvailableActivityOption[]>>(`${this.baseUrl}/activities`);
  }
}
