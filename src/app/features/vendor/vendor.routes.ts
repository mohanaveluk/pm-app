import { Routes } from '@angular/router';
import { PERMISSIONS } from '../../core/rbac/permissions.const';
import { permissionGuard } from '../../core/guards/permission.guard';
import { unsavedVendorGuard } from './guards/unsaved-vendor.guard';

/**
 * Vendor Master feature routes, mounted at /vendors.
 *
 * Create and Edit share one workspace component driven by route `data.mode`;
 * View is a separate read-only screen rather than a disabled form. The
 * unsaved-changes guard is attached to the two editing routes only.
 */
export const VENDOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vendor-list/vendor-list.component').then((m) => m.VendorListComponent),
    data: { breadcrumb: '' },
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./vendor-workspace/vendor-workspace.component').then((m) => m.VendorWorkspaceComponent),
    canActivate: [permissionGuard],
    canDeactivate: [unsavedVendorGuard],
    data: { breadcrumb: 'New Vendor', mode: 'create', permission: PERMISSIONS.VENDORS_CREATE },
  },
  // Static path — must be declared before the `:id` routes below, or a
  // navigation here would be swallowed by `:id` with id="status-approval".
  // This is the exact path pm-api's VendorService.sendApprovalEmail hard-codes
  // into the emailed blacklist/un-blacklist approval link
  // (`${FRONTEND_URL}/vendors/status-approval?requestId=&token=`) — changing
  // it here without changing it there would break every email already sent.
  {
    path: 'status-approval',
    loadComponent: () =>
      import('./components/vendor-status-approval/vendor-status-approval.component').then((m) => m.VendorStatusApprovalComponent),
    canActivate: [permissionGuard],
    data: {
      breadcrumb: 'Approval Decision',
      permission: [PERMISSIONS.VENDOR_EVALUATION_APPROVE, PERMISSIONS.VENDOR_EVALUATION_REJECT],
    },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./vendor-workspace/vendor-workspace.component').then((m) => m.VendorWorkspaceComponent),
    canActivate: [permissionGuard],
    canDeactivate: [unsavedVendorGuard],
    data: { breadcrumb: 'Edit', mode: 'edit', permission: PERMISSIONS.VENDORS_UPDATE },
  },
  {
    path: ':id/view',
    loadComponent: () =>
      import('./vendor-view/vendor-view.component').then((m) => m.VendorViewComponent),
    data: { breadcrumb: 'Details' },
  },
  // Bare /vendors/:id lands on the read-only view rather than 404ing.
  {
    path: ':id',
    redirectTo: ':id/view',
    pathMatch: 'full',
  },
];
