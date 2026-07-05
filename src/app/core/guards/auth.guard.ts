import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('pm_token') || localStorage.getItem('pm_token');
  if (token) return true;
  router.navigate(['/auth/login']);
  return false;
};
