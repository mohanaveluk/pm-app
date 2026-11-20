import { Injectable, signal, computed, inject } from '@angular/core';
import { User } from '../models/user.models';
import { AppRole, normalizeRole } from '../models/role.model';
import { ApiService } from './api.service';
import { firstValueFrom, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { TokenStorageService } from '../core/auth/token-storage.service';
import { takeReturnUrl } from '../core/auth/return-url';

/** Role names of vendor (external) accounts — mirrors RFQ_VENDOR_ROLE on the server. */
const VENDOR_ROLES = ['ExternalUser', 'Vendor'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly currentUser = signal<User | null>(null);
  private readonly isAuthenticated = signal(false);

  readonly user = this.currentUser.asReadonly();
  readonly authenticated = this.isAuthenticated.asReadonly();
  readonly role = computed<AppRole>(() => this.currentUser()?.role ?? 'User');
  readonly isSuperAdmin = computed(() => this.role() === 'SuperAdmin');
  readonly isOrgAdmin = computed(() => this.role() === 'OrganizationAdmin');
  /** A vendor account: it sees only the vendor screens (RFQs issued to its vendor). */
  readonly isExternal = computed(() => this.currentUser()?.isExternal === true);

  constructor() {
    const user = this.tokenStorage.getUser();
    if (user && this.tokenStorage.getAccessToken()) {
      this.currentUser.set(user);
      this.isAuthenticated.set(true);
    }
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(this.api.login({ email, password }));
    if (res?.data?.user) {
      this.setSession(res.data);
    }
  }

  async sendVerificationEmail(email: string): Promise<void> {
    await firstValueFrom(this.api.sendVerificationEmail(email));
  }

  async register(data: any): Promise<string> {
    const res = await firstValueFrom(this.api.register(data));
    if (res?.data?.access_token) {
      this.setSession(res.data);
    }
    return res?.data?.userId ?? res?.data?.user?.id ?? res?.user?.id ?? '';
  }

  logout(): void {
    this.clearLocalState();
    this.router.navigate(['/home']);
  }

  /**
   * Resets in-memory session state without navigating. Used by the auth
   * interceptor when a refresh-token attempt fails — it clears storage and
   * redirects itself, but must also invalidate these signals so guards and
   * the header stop treating the (now token-less) user as authenticated.
   */
  clearLocalState(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.tokenStorage.clearSession();
  }

  async requestPasswordReset(email: string): Promise<void> {
    await firstValueFrom(this.api.passwordResetRequest(email));
  }

  async verifyPasswordResetCode(email: string, code: string): Promise<any> {
    return firstValueFrom(this.api.verifyResetCode(email, code));
  }

  async updatePassword(data: { email: string; resetToken: string; password: string }): Promise<void> {
    await firstValueFrom(this.api.updatePassword(data));
  }

  async updatePasswordLegacy(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await firstValueFrom(this.api.updatePasswordLegacy(data));
  }

  verifyEmail(userGuid: string, verificationCode: string): Observable<any> {
    return this.api.verifyEmail(userGuid, verificationCode);
  }

  resendVerificationMail(userGuid: string): Observable<any> {
    return this.api.resendVerificationMail(userGuid);
  }

  /** Updates the cached user (e.g. after an edit-profile save) without touching tokens. */
  updateCachedUser(user: User): void {
    this.tokenStorage.setUser(user);
    this.currentUser.set(user);
  }

  /** Bridges an externally-obtained session (e.g. Entra ID) into the normal auth/session model. */
  completeExternalLogin(res: { access_token: string; refresh_token: string; user: Record<string, unknown> }): void {
    this.setSession(res);
  }

  private setSession(res: { access_token: string; refresh_token: string; user: Record<string, unknown> }): void {
    const u = res.user;
    const user: User = {
      avatar: u['avatar'] as string,
      id: u['id'] as string,
      email: u['email'] as string,
      firstName: u['firstName'] as string,
      lastName: u['lastName'] as string,
      role: normalizeRole(u['roleName'] as string),
      role_guid: u['role_guid'] as string,
      lastActive: new Date(),
      isVerified: u['is_verified'] as boolean,
      createdAt: u['created_at'] ? new Date(u['created_at'] as string) : new Date(),
      organizationId: u['organizationId'] as string,
      mobile: (u['mobile'] as string | null) ?? undefined,
      isExternal: u['is_internal'] === false || u['is_internal'] === 0 || VENDOR_ROLES.includes(u['roleName'] as string),
    };
    this.tokenStorage.setSession(res.access_token, res.refresh_token, user);
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    const returnUrl = takeReturnUrl();
    if (returnUrl) {
      void this.router.navigateByUrl(returnUrl);
      return;
    }
    this.redirectByRole(user.role, user.isExternal === true);
  }

  private redirectByRole(role: AppRole, external = false): void {
    if (external) {
      void this.router.navigate(['/vendor-rfqs']);
      return;
    }
    const map: Record<AppRole, string> = {
      SuperAdmin: '/admin/dashboard',
      OrganizationAdmin: '/admin/dashboard',
      DepartmentManager: '/manager/dashboard',
      DisciplineLead: '/manager/dashboard',
      ProjectManager: '/manager/dashboard',
      ProcurementManager: '/manager/dashboard',
      QAManager: '/manager/dashboard',
      WarehouseManager: '/manager/dashboard',
      User: '/dashboard',
    };
    this.router.navigate([map[role] ?? '/dashboard']);
  }
}
