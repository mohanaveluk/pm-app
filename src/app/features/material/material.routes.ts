import { Routes } from '@angular/router';
import { PERMISSIONS } from '../../core/rbac/permissions.const';
import { permissionGuard } from '../../core/guards/permission.guard';
import { unsavedMaterialGuard } from './guards/unsaved-material.guard';

/**
 * Material Master feature routes, mounted at /admin/materials.
 *
 * Create and Edit share one workspace component driven by route `data.mode`;
 * View reuses the same nine sections in a read-only presentation. The
 * unsaved-changes guard is attached to the two editing routes only.
 */
export const MATERIAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./material-list/material-list.component').then((m) => m.MaterialListComponent),
    data: { breadcrumb: '' },
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./material-workspace/material-workspace.component').then((m) => m.MaterialWorkspaceComponent),
    canActivate: [permissionGuard],
    canDeactivate: [unsavedMaterialGuard],
    data: { breadcrumb: 'Create', mode: 'create', permission: PERMISSIONS.MATERIALS_CREATE },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./material-workspace/material-workspace.component').then((m) => m.MaterialWorkspaceComponent),
    canActivate: [permissionGuard],
    canDeactivate: [unsavedMaterialGuard],
    data: { breadcrumb: 'Edit', mode: 'edit', permission: PERMISSIONS.MATERIALS_UPDATE },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./material-view/material-view.component').then((m) => m.MaterialViewComponent),
    data: { breadcrumb: 'Details' },
  },
];
