import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../services';
import { AppRole } from '../../models/role.model';
import { ROLE_PERMISSIONS } from './role-permissions.config';
import { externalPermissions } from './external-access.config';
import { PERMISSIONS } from './permissions.const';
import { VendorRfqAccessService } from './vendor-rfq-access.service';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);

  private readonly vendorRfqs = inject(VendorRfqAccessService);

  readonly permissions = computed(() => {
    const base = ROLE_PERMISSIONS[this.auth.role()] ?? [];
    if (!this.auth.isExternal()) return base;
    // Vendor accounts: their RFQ screens, and the menu entry once they have acknowledged an RFQ —
    // then only what external-access.config.ts allows (everything else is internal-only).
    const menu = (this.vendorRfqs.summary()?.acknowledgedTotal ?? 0) > 0 ? [PERMISSIONS.RFQ_VENDOR_MENU] : [];
    return externalPermissions([...base, PERMISSIONS.RFQ_RESPOND, ...menu]);
  });

  /** A vendor account (limited by external-access.config.ts). */
  readonly isExternal = computed(() => this.auth.isExternal());

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
