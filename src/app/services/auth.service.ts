import { Injectable, signal, computed, inject } from '@angular/core';
import { User, UserRole, MembershipTier } from '../models/user.models';
import { ApiService } from './api.service';
import { firstValueFrom, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { PmRole } from '../models/pm.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly currentUser = signal<User | null>(null);
  private readonly isAuthenticated = signal(false);

  readonly user = this.currentUser.asReadonly();
  readonly authenticated = this.isAuthenticated.asReadonly();
  readonly userRole = computed<UserRole>(() => this.currentUser()?.role ?? 'guest');
  readonly isAdmin = computed(() => this.userRole() === 'admin');
  readonly isTester = computed(() => this.userRole() === 'tester');

  constructor() {
    const stored = localStorage.getItem('pm_user');
    if (stored) {
      try {
        const user = JSON.parse(stored) as User;
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch { /* ignore */ }
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

  async loginAsRole(role: UserRole): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.loginAsRole(role));
      this.setSession(res);
    } catch {
     
      this.isAuthenticated.set(true);
    }
  }

  logout(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem('pm_token');
    localStorage.removeItem('pm_user');
    localStorage.removeItem('pm_refresh_token');
    this.router.navigate(['/home']);
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

  private setSession(res: { access_token: string; refresh_token: string; user: Record<string, unknown> }): void {
    localStorage.setItem('pm_token', res.access_token);
    localStorage.setItem('pm_refresh_token', res.refresh_token);
    const u = res.user;
    const user: User = {
      avatar: u['avatar'] as string,
      id: u['id'] as string, 
      email: u['email'] as string,
      firstName: u['firstName'] as string,
      lastName: u['lastName'] as string,
      role: u['roleName'] as any , 
      role_guid: u['role_guid'] as string,
      lastActive: new Date(),
      isVerified: u['is_verified'] as boolean,
      createdAt: u['created_at'] ? new Date(u['created_at'] as string) : new Date(),
      organizationId: u['organizationId'] as string
    };
    localStorage.setItem('pm_user', JSON.stringify(user));
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    this.redirectByRole(user.role as PmRole);
  }

  private redirectByRole(role: PmRole): void {
    const map: Record<string, string> = {
      OrganizationAdmin: '/admin/dashboard',
      SuperAdmin: '/admin/dashboard',
      Manager: '/manager/dashboard',
    };
    this.router.navigate([map[role] ?? '/dashboard']);
  }
}
