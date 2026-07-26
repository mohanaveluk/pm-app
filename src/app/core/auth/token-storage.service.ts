import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { User } from '../../models/user.models';

const TOKEN_KEY = 'pm_token';
const REFRESH_TOKEN_KEY = 'pm_refresh_token';
const USER_KEY = 'pm_user';

interface DecodedToken {
  exp: number;
  [claim: string]: unknown;
}

/**
 * Single source of truth for session persistence. Replaces the old,
 * duplicate `core/services/token.service.ts` (which used a different
 * `lrpd_opr` key and was only wired into a dead interceptor).
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  getUser(): User | null {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  }

  setSession(accessToken: string, refreshToken: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  setAccessToken(accessToken: string): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  isAccessTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      return decoded.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

  getAccessTokenExpiryMs(): number | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      return jwtDecode<DecodedToken>(token).exp * 1000;
    } catch {
      return null;
    }
  }

  shouldNotifyExpiry(thresholdSeconds: number): boolean {
    const expiryMs = this.getAccessTokenExpiryMs();
    if (!expiryMs) return false;
    const msToExpiry = expiryMs - Date.now();
    return msToExpiry > 0 && msToExpiry <= thresholdSeconds * 1000;
  }
}
