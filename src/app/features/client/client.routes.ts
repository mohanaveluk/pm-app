import { Routes } from '@angular/router';
import { PERMISSIONS } from '../../core/rbac/permissions.const';
import { permissionGuard } from '../../core/guards/permission.guard';
import { unsavedClientGuard } from './guards/unsaved-client.guard';

/**
 * Client Master feature routes, mounted at /admin/clients.
 *
 * Create and Edit share one workspace component driven by route `data.mode`;
 * View reuses the same sections in a read-only, tabbed presentation. The
 * unsaved-changes guard is attached to the two editing routes only.
 */
export const CLIENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./client-list/client-list.component').then((m) => m.ClientListComponent),
    data: { breadcrumb: '' },
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./client-workspace/client-workspace.component').then((m) => m.ClientWorkspaceComponent),
    canActivate: [permissionGuard],
    canDeactivate: [unsavedClientGuard],
    data: { breadcrumb: 'Create', mode: 'create', permission: PERMISSIONS.CLIENTS_CREATE },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./client-workspace/client-workspace.component').then((m) => m.ClientWorkspaceComponent),
    canActivate: [permissionGuard],
    canDeactivate: [unsavedClientGuard],
    data: { breadcrumb: 'Edit', mode: 'edit', permission: PERMISSIONS.CLIENTS_UPDATE },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./client-view/client-view.component').then((m) => m.ClientViewComponent),
    data: { breadcrumb: 'Details' },
  },
];
