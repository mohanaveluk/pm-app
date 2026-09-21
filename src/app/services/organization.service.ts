import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Organization, RegisterOrgRequest, VerifyEmailRequest, SubscriptionPlan, DashboardSummary } from '../models/pm.models';

/** A document as held by the profile form: saved (has id) or freshly uploaded (no id yet). */
export interface OrganizationDocument {
  id?: string;
  title: string;
  documentUrl: string;
  fileName: string;
  mimeType?: string | null;
  fileSizeBytes?: number | string | null;
  uploadedBy?: string | null;
  createdAt?: string;
}

/** What POST /organizations/documents/upload returns — the file is stored, no DB row yet. */
export interface UploadedOrgFile {
  documentUrl: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}

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

  /** `documents` is the complete attached list; the API syncs organization_documents to it. */
  updateProfile(data: Partial<Organization> & { documents?: OrganizationDocument[] }): Observable<Organization> {
    return this.http.put<Organization>(`${this.base}/v1/organizations/profile`, data);
  }

  // ── Documents ─────────────────────────────────────────────────────

  getDocuments(): Observable<OrganizationDocument[]> {
    return this.http.get<OrganizationDocument[]>(`${this.base}/v1/organizations/documents`);
  }

  uploadDocument(file: File): Observable<UploadedOrgFile> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<UploadedOrgFile>(`${this.base}/v1/organizations/documents/upload`, form);
  }

  /** The file bytes, fetched with the auth header — the storage bucket is not publicly readable. */
  getDocumentFile(doc: OrganizationDocument, inline: boolean): Observable<Blob> {
    return this.http.get(`${this.base}/v1/organizations/documents/file`, {
      params: { url: doc.documentUrl, name: doc.fileName, inline },
      responseType: 'blob',
    });
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
