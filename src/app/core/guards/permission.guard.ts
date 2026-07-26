import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../../services';
import { PermissionService } from '../rbac/permission.service';

/**
 * Route guard checking route.data['permission'] (string | string[], any-of)
 * and/or the legacy route.data['roles'] (string[]) against the current
 * user. Replaces the old, coarser role.guard.ts.
 */
export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const permissionService = inject(PermissionService);

  if (!auth.authenticated()) {
    router.navigate(['/auth/login']);
    return false;
  }

  const requiredPermission: string | string[] | undefined = route.data['permission'];
  const requiredRoles: string[] | undefined = route.data['roles'];

  if (requiredPermission) {
    const granted = Array.isArray(requiredPermission)
      ? permissionService.hasAnyPermission(requiredPermission)
      : permissionService.hasPermission(requiredPermission);
    if (!granted) {
      router.navigate(['/forbidden']);
      return false;
    }
  }

  if (requiredRoles?.length && !requiredRoles.includes(auth.role())) {
    router.navigate(['/forbidden']);
    return false;
  }

  return true;
};
