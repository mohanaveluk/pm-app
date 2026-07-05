import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const stored = localStorage.getItem('pm_user') || localStorage.getItem('pm_user');
  if (!stored) { router.navigate(['/auth/login']); return false; }
  try {
    const user = JSON.parse(stored);
    const required: string[] = route.data['roles'] ?? [];
    if (!required.length || required.includes(user.role)) return true;
    router.navigate(['/dashboard']);
    return false;
  } catch {
    router.navigate(['/auth/login']);
    return false;
  }
};
