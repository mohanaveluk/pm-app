import { Injectable, inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services';
import { ApiService } from '../../services/api.service';
import { isEntraConfigured } from './msal-config';

@Injectable({ providedIn: 'root' })
export class EntraAuthService {
  // MsalService is only provided when isEntraConfigured() — optional injection
  // avoids a DI error in the (default, unconfigured) case.
  private readonly msal = inject(MsalService, { optional: true });
  private readonly authService = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly isAvailable = isEntraConfigured() && !!this.msal;

  async loginWithMicrosoft(): Promise<void> {
    if (!this.msal) {
      throw new Error('Entra ID sign-in is not configured for this environment.');
    }
    const result = await firstValueFrom(this.msal.loginPopup({ scopes: environment.entra.scopes }));
    const res: any = await firstValueFrom(this.api.loginWithEntra(result.idToken));
    this.authService.completeExternalLogin(res?.data ?? res);
  }
}
