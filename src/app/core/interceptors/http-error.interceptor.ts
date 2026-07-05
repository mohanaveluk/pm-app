import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const SERVICE_DOWN_STATUSES = new Set([0, 503, 504]);

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (SERVICE_DOWN_STATUSES.has(error.status)) {
        if (!router.url.startsWith('/service-unavailable')) {
          router.navigate(['/service-unavailable']);
        }
      } else {
        // Log for diagnostics — preserve original error so callers can inspect status/body
        const msg =
          error.error?.message ?? error.message ?? `HTTP ${error.status}`;
        console.error(`[HTTP] ${error.status}: ${msg}`);
      }
      // Always re-throw the original HttpErrorResponse so authInterceptor
      // and individual components can still check error.status and error.error
      return throwError(() => error);
    })
  );
};
