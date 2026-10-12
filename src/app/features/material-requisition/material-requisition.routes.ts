import { Routes } from '@angular/router';
import { PERMISSIONS } from '../../core/rbac/permissions.const';
import { permissionGuard } from '../../core/guards/permission.guard';
import { unsavedRequisitionGuard } from './guards/unsaved-requisition.guard';

/**
 * Material Requisition feature routes, mounted at /material-requisitions.
 *
 * Create and Edit share one wizard driven by route `data.mode`; View is a
 * read-only presentation. The unsaved-changes guard is on the wizard routes.
 */
export const MATERIAL_REQUISITION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./material-requisition-list/material-requisition-list.component')
        .then((m) => m.MaterialRequisitionListComponent),
    data: { breadcrumb: '' },
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./material-requisition-wizard/material-requisition-wizard.component')
        .then((m) => m.MaterialRequisitionWizardComponent),
    canActivate: [permissionGuard],
    canDeactivate: [unsavedRequisitionGuard],
    data: { breadcrumb: 'Create', mode: 'create', permission: PERMISSIONS.MATERIAL_REQUISITIONS_CREATE },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./material-requisition-wizard/material-requisition-wizard.component')
        .then((m) => m.MaterialRequisitionWizardComponent),
    canActivate: [permissionGuard],
    canDeactivate: [unsavedRequisitionGuard],
    data: { breadcrumb: 'Edit', mode: 'edit', permission: PERMISSIONS.MATERIAL_REQUISITIONS_UPDATE },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./material-requisition-view/material-requisition-view.component')
        .then((m) => m.MaterialRequisitionViewComponent),
    data: { breadcrumb: 'Details' },
  },
];
