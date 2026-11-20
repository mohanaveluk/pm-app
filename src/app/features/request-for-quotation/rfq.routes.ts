import { Routes } from '@angular/router';
import { PERMISSIONS } from '../../core/rbac/permissions.const';
import { permissionGuard } from '../../core/guards/permission.guard';

/**
 * Request for Quotation routes, mounted at /rfqs. Create, edit and view share
 * one workspace driven by route `data.mode`; what can be edited on it comes
 * from the server's permissions for the signed-in user (buyer or vendor).
 */
export const RFQ_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./rfq-list/rfq-list.component').then((m) => m.RfqListComponent),
    data: { breadcrumb: '' },
  },
  {
    path: 'create',
    loadComponent: () => import('./rfq-workspace/rfq-workspace.component').then((m) => m.RfqWorkspaceComponent),
    canActivate: [permissionGuard],
    data: { breadcrumb: 'Create', mode: 'create', permission: PERMISSIONS.RFQ_MANAGE },
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./rfq-workspace/rfq-workspace.component').then((m) => m.RfqWorkspaceComponent),
    canActivate: [permissionGuard],
    data: { breadcrumb: 'Edit', mode: 'edit', permission: PERMISSIONS.RFQ_MANAGE },
  },
  {
    path: ':id',
    loadComponent: () => import('./rfq-workspace/rfq-workspace.component').then((m) => m.RfqWorkspaceComponent),
    data: { breadcrumb: 'Details', mode: 'view' },
  },
];
