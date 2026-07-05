import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

export interface ErrorMessage {
  [key: number]: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommonService {
  private readonly sanitizer = inject(DomSanitizer);

  private defaultErrorMessages: ErrorMessage = {
    400: 'Bad Request: Please check your input',
    401: 'Unauthorized: Please login again',
    403: 'Forbidden: You don\'t have permission to access this resource',
    404: 'Not Found: The requested resource was not found',
    408: 'Request Timeout: The server timed out waiting for the request',
    500: 'Internal Server Error: Something went wrong on our end',
    502: 'Bad Gateway: The server received an invalid response',
    503: 'Service Unavailable: The server is temporarily unavailable',
    504: 'Gateway Timeout: The server timed out waiting for response'
  };

  constructor(private snackBar: MatSnackBar) { }

  /**
   * Handles HTTP errors and returns an Observable with the error
   * @param error The HTTP error response
   * @param customErrorMessages Optional custom error messages for specific status codes
   * @param showSnackBar Whether to show a snackbar with the error message
   * @returns Observable with the error
   */
  handleError(
    error: HttpErrorResponse,
    customErrorMessages: ErrorMessage = {},
    showSnackBar: boolean = true
  ): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      const statusCode = error.status;
      errorMessage = customErrorMessages[statusCode] ||
        this.defaultErrorMessages[statusCode] ||
        error.error?.message ||
        error.message ||
        'Server error';
    }

    // Log the error (you can implement your logging logic here)
    console.error('Error occurred:', {
      timestamp: new Date().toISOString(),
      status: error.status,
      statusText: error.statusText,
      message: errorMessage,
      url: error.url || 'N/A',
      stack: error.error?.stack || 'N/A'
    });

    // Show error message in snackbar if enabled
    if (showSnackBar) {
      this.snackBar.open(errorMessage, 'Close', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      });
    }

    // Return an observable with the error
    return throwError(() => ({ error, message: errorMessage }));
  }

  /**
   * Creates a custom error handler with specific error messages
   * @param customErrorMessages Custom error messages for specific status codes
   * @param showSnackBar Whether to show a snackbar with the error message
   * @returns Function that handles errors with custom messages
   */
  createErrorHandler(customErrorMessages: ErrorMessage = {}, showSnackBar: boolean = true) {
    return (error: HttpErrorResponse) =>
      this.handleError(error, customErrorMessages, showSnackBar);
  }

  isNullOrEmpty(value: any) {
    return value === null || value === undefined || value === '';
  }

  public cardBg(url: string | undefined): SafeStyle {
    return this.sanitizer.bypassSecurityTrustStyle(`url('${url || '/avatar-default.svg'}')`);
  }
}