import {
  HttpErrorResponse, HttpEvent, HttpHandlerFn,
  HttpInterceptorFn, HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../core/auth/token-storage.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

function addAuthHeader(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

function isPublicRoute(url: string): boolean {
  return (
    (url.includes('/v1/auth/login') || url.includes('/v1/token/refresh') || url.includes('/v1/health')) &&
    !url.includes('/v1/auth/update-password-legacy')
  );
}

function isTokenExpiredError(error: HttpErrorResponse): boolean {
  // Treat any 401 as needing a token refresh
  return error.status === 401;
}

function clearSession(router: Router, authService: AuthService): void {
  isRefreshing = false;
  refreshTokenSubject.next(null);
  authService.clearLocalState();
  router.navigate(['/auth/login']);
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  api: ApiService,
  router: Router,
  tokenStorage: TokenStorageService,
  authService: AuthService,
): Observable<HttpEvent<unknown>> {
  // If a refresh is already in flight, queue this request until the new token arrives
  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap(token => next(addAuthHeader(req, token))),
    );
  }

  const storedRefreshToken = tokenStorage.getRefreshToken();
  if (!storedRefreshToken) {
    clearSession(router, authService);
    return throwError(() => new Error('Session expired. Please log in again.'));
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  return api.refreshToken(storedRefreshToken).pipe(
    switchMap(res => {
      isRefreshing = false;
      const newToken: string = res.access_token;
      tokenStorage.setAccessToken(newToken);
      refreshTokenSubject.next(newToken);
      // Retry the original request with the fresh token
      return next(addAuthHeader(req, newToken));
    }),
    catchError(err => {
      clearSession(router, authService);
      return throwError(() => err);
    }),
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const api    = inject(ApiService);
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);

  if (isPublicRoute(req.url)) {
    return next(req);
  }

  const token = tokenStorage.getAccessToken();
  return next(addAuthHeader(req, token)).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error instanceof HttpErrorResponse && isTokenExpiredError(error)) {
        return handle401(req, next, api, router, tokenStorage, authService);
      }
      return throwError(() => error);
    }),
  );
};
