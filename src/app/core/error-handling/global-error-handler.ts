import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) { }
  private isHandlingError = false;

  handleError(error: any): void {

    if (error?.message?.includes('ExpressionChangedAfterItHasBeenCheckedError')) {
      console.warn('Angular change detection warning:', error);
      return;
    }

    const snackBar = this.injector.get(MatSnackBar);

    if (this.isHandlingError) {
      console.warn('Suppressed recursive error:', error);
      return;
    }
    this.isHandlingError = true;

    // Handle the error based on its type
    try {
      if (error instanceof HttpErrorResponse) {
        // Server-side error
        snackBar.open(`Error Code: ${error.status}, Message: ${error.message}`, 'Close', {
          duration: 5000,
        });
      } else if (error instanceof Error) {
        // Client-side error
        snackBar.open(`Error: ${error.message}`, 'Close', {
          duration: 5000,
        });
      } else {
        // Unknown error
        snackBar.open(`Unknown Error: ${error}`, 'Close', {
          duration: 5000,
        });
      }

    } finally {
      this.isHandlingError = false;
    }
    // Log the error to an external service if needed
    console.error(error);
  }
}