import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Organization, RegisterOrgRequest, VerifyEmailRequest, SubscriptionPlan, DashboardSummary } from '../models/pm.models';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  register(data: RegisterOrgRequest): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${this.base}/v1/organizations/register`, data);
  }

  verifyEmail(data: VerifyEmailRequest): Observable<{ success: boolean }> {
    return this.http.post<any>(`${this.base}/v1/organizations/verify-email`, data);
  }

  resendOtp(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${this.base}/v1/organizations/resend-otp`, { email });
  }

  getProfile(): Observable<Organization> {
    return this.http.get<Organization>(`${this.base}/v1/organizations/profile`);
  }

  updateProfile(data: Partial<Organization>): Observable<Organization> {
    return this.http.put<Organization>(`${this.base}/v1/organizations/profile`, data);
  }

  getSubscriptionPlans(): Observable<{ monthly: SubscriptionPlan[]; yearly: SubscriptionPlan[] }> {
    return this.http.get<any>(`${this.base}/v1/subscription-plans`);
  }

  createSubscription(planId: string, billingCycle: 'MONTHLY' | 'YEARLY'): Observable<any> {
    return this.http.post(`${this.base}/v1/subscriptions`, { planId, billingCycle });
  }

  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.base}/v1/dashboard/summary`);
  }
}
