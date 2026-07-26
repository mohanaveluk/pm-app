import { Injectable, NgZone, inject } from '@angular/core';
import { interval } from 'rxjs';
import Swal from 'sweetalert2';
import { ApiService, AuthService } from '../../services';
import { TokenStorageService } from '../auth/token-storage.service';

const CHECK_INTERVAL_MS = 30000;
const NOTIFY_THRESHOLD_SECONDS = 60;

@Injectable({ providedIn: 'root' })
export class TokenExpiryService {
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly ngZone = inject(NgZone);

  private isNotifying = false;

  startExpiryCheck(): void {
    interval(CHECK_INTERVAL_MS).subscribe(() => {
      if (!this.authService.authenticated() || this.isNotifying) return;
      if (this.tokenStorage.shouldNotifyExpiry(NOTIFY_THRESHOLD_SECONDS)) {
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
        cancelButtonText: 'No, logout',
      }).then((result: { isConfirmed: boolean }) => {
        if (result.isConfirmed) {
          const refreshToken = this.tokenStorage.getRefreshToken();
          if (!refreshToken) {
            this.authService.logout();
            this.isNotifying = false;
            return;
          }
          this.api.refreshToken(refreshToken).subscribe({
            next: (res) => {
              this.tokenStorage.setAccessToken(res.access_token);
              Swal.fire('Session Extended', 'Your session has been extended successfully.', 'success');
              this.isNotifying = false;
            },
            error: () => {
              this.authService.logout();
              Swal.fire('Session Expired', 'Please log in again.', 'error');
              this.isNotifying = false;
            },
          });
        } else {
          this.authService.logout();
          this.isNotifying = false;
        }
      });
    });
  }
}
