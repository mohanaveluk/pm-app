import { Inject, Injectable, NgZone } from '@angular/core';
import { interval } from 'rxjs';
import { TokenService } from './token.service';
import Swal from 'sweetalert2';
import { ApiService, AuthService } from '../../services';


@Injectable({
  providedIn: 'root',
})
export class TokenExpiryService {
  private checkInterval = 120000; // Check every 30 seconds
  private isNotifying = false;

  private readonly api = Inject(ApiService);
  constructor(
    private tokenService: TokenService,
    private authService: AuthService,
    private ngZone: NgZone
  ) {}

  startExpiryCheck(): void {
    interval(this.checkInterval).subscribe(() => {
      if (this.tokenService.shouldNotifyTokenExpiry() && !this.isNotifying) {
        this.showExpiryNotification();
      }
    });
  }

  private showExpiryNotification(): void {
    this.isNotifying = true;

    this.ngZone.run(() => {
      Swal.fire({
        title: 'Session Expiring',
        text: 'Your session is about to expire. Would you like to extend it?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, extend session',
        cancelButtonText: 'No, logout'
      }).then((result: { isConfirmed: any; }) => {
        if (result.isConfirmed) {
          this.api.refreshToken('a').subscribe({
            next: () => {
              Swal.fire('Session Extended', 'Your session has been extended successfully.', 'success');
            },
            error: () => {
              this.authService.logout();
              Swal.fire('Session Expired', 'Please log in again.', 'error');
            }
          });
        } else {
          this.authService.logout();
        }
        this.isNotifying = false;
      });
    });
  }
}