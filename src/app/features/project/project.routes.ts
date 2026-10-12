import { Routes } from '@angular/router';
import { PERMISSIONS } from '../../core/rbac/permissions.const';
import { permissionGuard } from '../../core/guards/permission.guard';
import { unsavedProjectGuard } from './guards/unsaved-project.guard';

/**
 * Project Master feature routes, mounted at /projects.
 *
 * Create and Edit share one workspace component driven by route `data.mode`;
 * View is a read-only presentation. The unsaved-changes guard is attached to
 * the two editing routes only.
 */
export const PROJECT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./project-list/project-list.component').then((m) => m.ProjectListComponent),
    data: { breadcrumb: '' },
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./project-workspace/project-workspace.component').then((m) => m.ProjectWorkspaceComponent),
    canActivate: [permissionGuard],
    canDeactivate: [unsavedProjectGuard],
    data: { breadcrumb: 'Create', mode: 'create', permission: PERMISSIONS.PROJECTS_CREATE },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./project-workspace/project-workspace.component').then((m) => m.ProjectWorkspaceComponent),
    canActivate: [permissionGuard],
    canDeactivate: [unsavedProjectGuard],
    data: { breadcrumb: 'Edit', mode: 'edit', permission: PERMISSIONS.PROJECTS_UPDATE },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./project-view/project-view.component').then((m) => m.ProjectViewComponent),
    data: { breadcrumb: 'Details' },
  },
];
