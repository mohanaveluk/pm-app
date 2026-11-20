import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services';
import { rememberReturnUrl } from '../auth/return-url';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (auth.authenticated()) return true;
  // Back to this page once signed in (e.g. a vendor opening an RFQ link from an email).
  rememberReturnUrl(state.url);
  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
