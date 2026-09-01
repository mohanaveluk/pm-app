import { Routes } from '@angular/router';
import { PERMISSIONS } from '../../core/rbac/permissions.const';
import { permissionGuard } from '../../core/guards/permission.guard';

/**
 * Vendor Evaluation & Approval feature routes, mounted at /vendor-evaluation.
 *
 * Deliberately separate from VENDOR_ROUTES (/vendors) — see the class comment
 * on VendorEvaluationWorkspaceComponent. Both routes require VIEW; the
 * workspace itself further gates Evaluate/Approve/Reject/Return per action.
 */
export const VENDOR_EVALUATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vendor-evaluation-queue/vendor-evaluation-queue.component').then((m) => m.VendorEvaluationQueueComponent),
    canActivate: [permissionGuard],
    data: { breadcrumb: '', permission: PERMISSIONS.VENDOR_EVALUATION_VIEW },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./vendor-evaluation-workspace/vendor-evaluation-workspace.component').then((m) => m.VendorEvaluationWorkspaceComponent),
    canActivate: [permissionGuard],
    data: { breadcrumb: 'Evaluate', permission: PERMISSIONS.VENDOR_EVALUATION_VIEW },
  },
];
