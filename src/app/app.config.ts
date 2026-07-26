import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MsalModule } from '@azure/msal-angular';
import { routes } from './app.routes';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { authInterceptor } from './interceptors/auth.interceptor';
import { MENU_DATA_SOURCE, StaticMenuDataSource } from './core/navigation/menu-data-source';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { createMsalInstance, isEntraConfigured, msalGuardConfig, msalInterceptorConfig } from './core/auth/msal-config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      withViewTransitions(),
    ),
    provideHttpClient(withInterceptors([httpErrorInterceptor, authInterceptor])),
    { provide: MENU_DATA_SOURCE, useClass: StaticMenuDataSource },
    provideCharts(withDefaultRegisterables()),
    // Only registered once a real Azure AD app registration is configured —
    // PublicClientApplication requires a valid clientId to construct.
    ...(isEntraConfigured()
      ? [importProvidersFrom(MsalModule.forRoot(createMsalInstance(), msalGuardConfig, msalInterceptorConfig))]
      : []),
  ],
};
