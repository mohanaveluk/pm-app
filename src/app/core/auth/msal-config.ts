import { InteractionType, PublicClientApplication } from '@azure/msal-browser';
import { MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';

/**
 * True once a real Azure AD app registration (tenantId/clientId) has been
 * filled in. Entra ID provider registration in app.config.ts is gated
 * behind this so an empty placeholder config never throws at bootstrap.
 */
export function isEntraConfigured(): boolean {
  return !!environment.entra?.clientId;
}

export function createMsalInstance(): PublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.entra.clientId,
      authority: `https://login.microsoftonline.com/${environment.entra.tenantId || 'common'}`,
      redirectUri: environment.entra.redirectUri || window.location.origin,
    },
    cache: {
      cacheLocation: 'localStorage',
    },
  });
}

export const msalGuardConfig: MsalGuardConfiguration = {
  interactionType: InteractionType.Popup,
};

export const msalInterceptorConfig: MsalInterceptorConfiguration = {
  interactionType: InteractionType.Popup,
  protectedResourceMap: new Map(),
};
