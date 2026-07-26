import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BulkCreateActivityRequest, CreateActivityRequest, ActivityQueryParams, UpdateActivityRequest,
} from '../models/activity-request.model';
import {
  ActivityDropdownListResponse, ActivityListResponse, ActivityResponse, BulkCreateActivityResponse, PagedActivityResponse,
} from '../models/activity-response.model';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/activities`;

  getActivities(params: ActivityQueryParams): Observable<PagedActivityResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.departmentId) httpParams = httpParams.set('departmentId', params.departmentId);
    if (params.disciplineId) httpParams = httpParams.set('disciplineId', params.disciplineId);
    if (params.departmentDisciplineId) httpParams = httpParams.set('departmentDisciplineId', params.departmentDisciplineId);
    if (params.moduleGroup) httpParams = httpParams.set('moduleGroup', params.moduleGroup);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);

    return this.http.get<PagedActivityResponse>(this.baseUrl, { params: httpParams });
  }

  getActivityById(id: string): Observable<ActivityResponse> {
    return this.http.get<ActivityResponse>(`${this.baseUrl}/${id}`);
  }

  createActivity(request: CreateActivityRequest): Observable<ActivityResponse> {
    return this.http.post<ActivityResponse>(this.baseUrl, request);
  }

  updateActivity(id: string, request: UpdateActivityRequest): Observable<ActivityResponse> {
    return this.http.put<ActivityResponse>(`${this.baseUrl}/${id}`, request);
  }

  deleteActivity(id: string): Observable<{ status: boolean; message: string; data: null; timestamp: string }> {
    return this.http.delete<{ status: boolean; message: string; data: null; timestamp: string }>(`${this.baseUrl}/${id}`);
  }

  bulkCreateActivities(request: BulkCreateActivityRequest): Observable<BulkCreateActivityResponse> {
    return this.http.post<BulkCreateActivityResponse>(`${this.baseUrl}/bulk`, request);
  }

  getActiveActivities(): Observable<ActivityDropdownListResponse> {
    return this.http.get<ActivityDropdownListResponse>(`${this.baseUrl}/active`);
  }

  getActivitiesByDepartment(departmentId: string): Observable<ActivityDropdownListResponse> {
    return this.http.get<ActivityDropdownListResponse>(`${this.baseUrl}/department/${departmentId}`);
  }

  getActivitiesByDiscipline(disciplineId: string): Observable<ActivityDropdownListResponse> {
    return this.http.get<ActivityDropdownListResponse>(`${this.baseUrl}/discipline/${disciplineId}`);
  }

  getActivitiesByDepartmentDiscipline(departmentDisciplineId: string): Observable<ActivityDropdownListResponse> {
    return this.http.get<ActivityDropdownListResponse>(`${this.baseUrl}/department-discipline/${departmentDisciplineId}`);
  }
}
