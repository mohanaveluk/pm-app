import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RefreshTokenResponse } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/health`, { responseType: 'text' as const });
  }

  // Auth
  register(data: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    mobile?: string;
    dob?: string;
    position?: string;
    location?: string;
    report_to?: string;
    worksWith?: string;
    projectsWorkedOn?: string;
    created_at: string;
    updated_at: string | null;
    role_guid: string;
    organizationId: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/register`, data);
  }

  getRoles(): Observable<{ id: number; guid: string; name: string; is_active: number }[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v1/auth/roles`);
  }

  getOrgUsers(): Observable<{ uguid: string; first_name: string; last_name: string; email: string; organizationId: string }[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v1/auth/users`);
  }

  login(data: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/login`, data);
  }

  /** Not implemented server-side yet — shaped to return the same {access_token, refresh_token, user} contract as login(). */
  loginWithEntra(idToken: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/login-entra`, { idToken });
  }

  sendVerificationEmail(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/resend-verification`, { email });
  }

  passwordResetRequest(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/forgot-password`, { email });
  }

  verifyResetCode(email: string, code: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/verify-reset-code`, { email, code });
  }

  updatePassword(data: { email: string; resetToken: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/update-password`, data);
  }

  updatePasswordLegacy(data: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/update-password-legacy`, data);
  }

  loginAsRole(role: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/demo/${role}`, {});
  }

  verifyEmail(userGuid: string, verificationCode: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/verify-email`, { userGuid, code: verificationCode });
  }

  resendVerificationMail(userGuid: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/resend-verification`, { userGuid });
  }

  // Token
  refreshToken(refreshToken: string): Observable<RefreshTokenResponse> {
    return this.http.post<RefreshTokenResponse>(`${this.baseUrl}/v1/token/refresh`, { refreshToken });
  }

  // User profile
  getMyProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/v1/auth/profile`);
  }

  updateMyProfile(data: {
    first_name?: string;
    last_name?: string;
    password?: string;
    mobile?: string;
    dob?: string;
    position?: string;
    location?: string;
    report_to?: string;
    worksWith?: string;
    projectsWorkedOn?: string;
  }): Observable<any> {
    return this.http.put(`${this.baseUrl}/v1/auth/profile`, data);
  }

  uploadPhoto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post(`${this.baseUrl}/v1/profiles/profile/image`, formData);
  }

  // Contact
  createContact(data: { firstName: string; lastName: string; email: string; mobile?: string; message: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/contact`, data);
  }

  // Organization Users
  getOrganizationUsers(organizationId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v1/User/organization/${organizationId}`);
  }

  getOrganizationUserById(organizationId: string, userId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/v1/User/organization/${organizationId}/${userId}`);
  }

  resendUserVerificationMail(userId: string, origin: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/auth/resend-verification-mail`, { userId });
  }

  toggleUserStatus(uguid: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/v1/auth/${uguid}/status`, { isActive });
  }

}
