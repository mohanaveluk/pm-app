import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../services';
import { AppRole } from '../../models/role.model';
import { ROLE_PERMISSIONS } from './role-permissions.config';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);

  readonly permissions = computed(() => ROLE_PERMISSIONS[this.auth.role()] ?? []);

  hasPermission(permission: string): boolean {
    const perms = this.permissions();
    if (perms.includes('*')) return true;
    if (perms.includes(permission)) return true;
    const domain = permission.split('.')[0];
    return perms.includes(`${domain}.*`);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((p) => this.hasPermission(p));
  }

  hasRole(role: AppRole | AppRole[]): boolean {
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(this.auth.role());
  }
}
