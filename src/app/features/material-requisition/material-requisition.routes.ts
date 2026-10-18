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
    canActivate: [permissionGuard],
    data: { breadcrumb: '', permission: PERMISSIONS.MATERIAL_REQUISITIONS_VIEW },
  },
  {
    path: 'reviews',
    loadComponent: () =>
      import('./material-requisition-review-list/material-requisition-review-list.component')
        .then((m) => m.MaterialRequisitionReviewListComponent),
    canActivate: [permissionGuard],
    data: { breadcrumb: 'Reviews', permission: PERMISSIONS.MATERIAL_REQUISITIONS_REVIEW },
  },
  {
    path: 'reviews/:id',
    loadComponent: () =>
      import('./material-requisition-review/material-requisition-review.component')
        .then((m) => m.MaterialRequisitionReviewComponent),
    canActivate: [permissionGuard],
    data: { breadcrumb: 'Review', permission: PERMISSIONS.MATERIAL_REQUISITIONS_REVIEW },
  },
  {
    path: 'approvals',
    loadComponent: () =>
      import('./material-requisition-approval-list/material-requisition-approval-list.component')
        .then((m) => m.MaterialRequisitionApprovalListComponent),
    canActivate: [permissionGuard],
    data: { breadcrumb: 'Approvals', permission: PERMISSIONS.MATERIAL_REQUISITIONS_APPROVE },
  },
  {
    path: 'approvals/:id',
    loadComponent: () =>
      import('./material-requisition-approval/material-requisition-approval.component')
        .then((m) => m.MaterialRequisitionApprovalComponent),
    canActivate: [permissionGuard],
    data: { breadcrumb: 'Approval', permission: PERMISSIONS.MATERIAL_REQUISITIONS_APPROVE },
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
    data: {
      breadcrumb: 'Edit', mode: 'edit',
      permission: [PERMISSIONS.MATERIAL_REQUISITIONS_UPDATE, PERMISSIONS.MATERIAL_REQUISITIONS_REVIEW],
    },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./material-requisition-view/material-requisition-view.component')
        .then((m) => m.MaterialRequisitionViewComponent),
    data: { breadcrumb: 'Details' },
  },
];
