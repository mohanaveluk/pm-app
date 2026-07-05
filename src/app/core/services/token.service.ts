import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly ACCESS_TOKEN_KEY = 'lrpd_opr';
  private readonly REFRESH_TOKEN_KEY = 'pm_refresh_token';
  private readonly TOKEN_EXPIRY_NOTIFICATION = 60; // Notify 60 seconds before expiry
  private jwtHelper = new JwtHelperService();


  getToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  setTokens(token: string,  refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }


  removeTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem('pm_refresh_token');
    localStorage.removeItem('userName');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
  }

  hasValidAccessToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const decodedToken: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decodedToken.exp > currentTime;
    } catch {
      return false;
    }
  }

  getTokenExpiryTime(): number | null {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const decodedToken: any = jwtDecode(token);
      return decodedToken.exp * 1000; // Convert to milliseconds
    } catch {
      return null;
    }
  }

  shouldNotifyTokenExpiry(): boolean {
    const expiryTime = this.getTokenExpiryTime();
    if (!expiryTime) return false;

    const currentTime = Date.now();
    const timeToExpiry = expiryTime - currentTime;
    return timeToExpiry <= this.TOKEN_EXPIRY_NOTIFICATION * 1000 && timeToExpiry > 0;
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  public isTokenExpired(): boolean {
    const token = this.getToken();
    return token ? this.jwtHelper.isTokenExpired(token) : true;
  }
}