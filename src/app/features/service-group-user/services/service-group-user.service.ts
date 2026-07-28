import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services';
import {
  BulkAssignmentIdsRequest, CreateServiceGroupUserRequest, ServiceGroupUserQueryParams, SyncServiceGroupUsersRequest,
} from '../models/service-group-user-request.model';
import {
  ApiEnvelope, BulkOperationResponse, CreateAssignmentResponse, PagedServiceGroupUserResponse,
  ServiceGroupMembersResponse, ServiceGroupUserResponse, SyncResponse, UserServiceGroupsResponse,
} from '../models/service-group-user-response.model';
import { AvailableUserOption, ServiceGroupOption } from '../models/service-group-user.model';

/** Raw shape of `GET /User/organization/:organizationId` items — snake_case, no
 * employeeId/department/discipline columns exist on the backend User entity. */
interface RawOrgUser {
  id: string;
  first_name: string;
  last_name?: string;
  email: string;
  mobile?: string;
  position?: string;
  profile_image?: string;
  is_active: number | boolean;
  is_email_verified: boolean;
  role?: { name: string } | null;
  created_at?: string;
}

/** Minimal shape needed from GET /service-groups' items for the picker + permission preview. */
interface RawServiceGroupListItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  activityCount: number;
}

export interface PermissionPreviewActivity {
  activityName: string;
  moduleGroup?: string;
  permissions: { permissionType: string; isAllowed: boolean }[];
}

export interface PermissionPreview {
  serviceGroupId: string;
  serviceGroupName: string;
  activities: PermissionPreviewActivity[];
}

@Injectable({ providedIn: 'root' })
export class ServiceGroupUserService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/v1/service-group-users`;

  getAssignments(params: ServiceGroupUserQueryParams): Observable<PagedServiceGroupUserResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.serviceGroupId) httpParams = httpParams.set('serviceGroupId', params.serviceGroupId);
    if (params.userId) httpParams = httpParams.set('userId', params.userId);
    if (params.assignmentType) httpParams = httpParams.set('assignmentType', params.assignmentType);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);
    if (params.isPrimary !== undefined) httpParams = httpParams.set('isPrimary', params.isPrimary);
    if (params.createdFrom) httpParams = httpParams.set('createdFrom', params.createdFrom);
    if (params.createdTo) httpParams = httpParams.set('createdTo', params.createdTo);

    return this.http.get<PagedServiceGroupUserResponse>(this.baseUrl, { params: httpParams });
  }

  getAssignmentById(id: string): Observable<ServiceGroupUserResponse> {
    return this.http.get<ServiceGroupUserResponse>(`${this.baseUrl}/${id}`);
  }

  createAssignment(request: CreateServiceGroupUserRequest): Observable<CreateAssignmentResponse> {
    return this.http.post<CreateAssignmentResponse>(this.baseUrl, request);
  }

  syncAssignments(serviceGroupId: string, request: SyncServiceGroupUsersRequest): Observable<SyncResponse> {
    return this.http.put<SyncResponse>(`${this.baseUrl}/service-group/${serviceGroupId}/sync`, request);
  }

  deleteAssignment(id: string): Observable<ApiEnvelope<null>> {
    return this.http.delete<ApiEnvelope<null>>(`${this.baseUrl}/${id}`);
  }

  enableAssignment(id: string): Observable<ServiceGroupUserResponse> {
    return this.http.patch<ServiceGroupUserResponse>(`${this.baseUrl}/${id}/enable`, {});
  }

  disableAssignment(id: string): Observable<ServiceGroupUserResponse> {
    return this.http.patch<ServiceGroupUserResponse>(`${this.baseUrl}/${id}/disable`, {});
  }

  bulkEnable(request: BulkAssignmentIdsRequest): Observable<BulkOperationResponse> {
    return this.http.post<BulkOperationResponse>(`${this.baseUrl}/bulk-enable`, request);
  }

  bulkDisable(request: BulkAssignmentIdsRequest): Observable<BulkOperationResponse> {
    return this.http.post<BulkOperationResponse>(`${this.baseUrl}/bulk-disable`, request);
  }

  getUsersByServiceGroup(serviceGroupId: string): Observable<ServiceGroupMembersResponse> {
    return this.http.get<ServiceGroupMembersResponse>(`${this.baseUrl}/service-group/${serviceGroupId}`);
  }

  getServiceGroupsByUser(userId: string): Observable<UserServiceGroupsResponse> {
    return this.http.get<UserServiceGroupsResponse>(`${this.baseUrl}/user/${userId}`);
  }

  // ── Self-contained reference-data lookups (own direct HTTP calls, matching the
  // established convention of not depending on sibling feature services) ──────

  getAvailableServiceGroups(): Observable<ServiceGroupOption[]> {
    // organizationId is resolved server-side from the auth token, not a query param.
    const params = new HttpParams().set('limit', 1000).set('page', 1).set('sortBy', 'name').set('sortOrder', 'ASC');
    return this.http
      .get<ApiEnvelope<{ items: RawServiceGroupListItem[] }>>(`${environment.apiUrl}/v1/service-groups`, { params })
      .pipe(
        map((res) => (res.data.items ?? []).map((sg) => ({
          id: sg.id,
          code: sg.code,
          name: sg.name,
          description: sg.description,
          isActive: sg.isActive,
          activityCount: sg.activityCount,
        }))),
      );
  }

  getAvailableUsers(): Observable<AvailableUserOption[]> {
    const orgId = this.auth.user()?.organizationId;
    if (!orgId) return new Observable((subscriber) => { subscriber.next([]); subscriber.complete(); });

    return this.http.get<ApiEnvelope<RawOrgUser[]>>(`${environment.apiUrl}/v1/User/organization/${orgId}`).pipe(
      map((res) => (res.data ?? []).map((u) => this.toAvailableUserOption(u))),
    );
  }

  getUserProfile(userId: string): Observable<AvailableUserOption | null> {
    const orgId = this.auth.user()?.organizationId;
    if (!orgId) return new Observable((subscriber) => { subscriber.next(null); subscriber.complete(); });

    return this.http
      .get<ApiEnvelope<RawOrgUser>>(`${environment.apiUrl}/v1/User/organization/${orgId}/${userId}`)
      .pipe(map((res) => (res.data ? this.toAvailableUserOption(res.data) : null)));
  }

  getPermissionPreview(serviceGroupId: string): Observable<PermissionPreview> {
    interface RawPermission { permissionType: string; isAllowed: boolean }
    interface RawActivity { activityName: string; moduleGroup?: string; permissions: RawPermission[] }
    interface RawServiceGroupDetail { id: string; name: string; activities: RawActivity[] }

    return this.http.get<ApiEnvelope<RawServiceGroupDetail>>(`${environment.apiUrl}/v1/service-groups/${serviceGroupId}`).pipe(
      map((res) => ({
        serviceGroupId: res.data.id,
        serviceGroupName: res.data.name,
        activities: (res.data.activities ?? []).map((a) => ({
          activityName: a.activityName,
          moduleGroup: a.moduleGroup,
          permissions: a.permissions ?? [],
        })),
      })),
    );
  }

  private toAvailableUserOption(u: RawOrgUser): AvailableUserOption {
    return {
      id: u.id,
      fullName: `${u.first_name} ${u.last_name ?? ''}`.trim(),
      email: u.email,
      mobile: u.mobile,
      position: u.position,
      profileImage: u.profile_image,
      isActive: !!u.is_active,
      isEmailVerified: !!u.is_email_verified,
      roleName: u.role?.name,
      createdAt: u.created_at,
    };
  }
}
