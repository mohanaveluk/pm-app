import {
  HttpErrorResponse, HttpEvent, HttpHandlerFn,
  HttpInterceptorFn, HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { ApiService } from '../services/api.service';

const TOKEN_KEY   = 'pm_token';
const REFRESH_KEY = 'pm_refresh_token';

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

function clearSession(router: Router): void {
  isRefreshing = false;
  refreshTokenSubject.next(null);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem('pm_user');
  router.navigate(['/login']);
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  api: ApiService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  // If a refresh is already in flight, queue this request until the new token arrives
  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap(token => next(addAuthHeader(req, token))),
    );
  }

  const storedRefreshToken = localStorage.getItem(REFRESH_KEY);
  if (!storedRefreshToken) {
    clearSession(router);
    return throwError(() => new Error('Session expired. Please log in again.'));
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  return api.refreshToken(storedRefreshToken).pipe(
    switchMap(res => {
      isRefreshing = false;
      const newToken: string = res.access_token;
      localStorage.setItem(TOKEN_KEY, newToken);
      refreshTokenSubject.next(newToken);
      // Retry the original request with the fresh token
      return next(addAuthHeader(req, newToken));
    }),
    catchError(err => {
      clearSession(router);
      return throwError(() => err);
    }),
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const api    = inject(ApiService);
  const router = inject(Router);

  if (isPublicRoute(req.url)) {
    return next(req);
  }

  const token = localStorage.getItem(TOKEN_KEY);
  return next(addAuthHeader(req, token)).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error instanceof HttpErrorResponse && isTokenExpiredError(error)) {
        return handle401(req, next, api, router);
      }
      return throwError(() => error);
    }),
  );
};
