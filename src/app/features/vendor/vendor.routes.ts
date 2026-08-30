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
