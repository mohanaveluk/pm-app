import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { PERMISSIONS } from './core/rbac/permissions.const';
import { PublicLayoutComponent } from './layout/public-layout/public-layout.component';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';

const comingSoon = () =>
  import('./shared/components/feature-coming-soon/feature-coming-soon.component').then(
    (m) => m.FeatureComingSoonComponent,
  );

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'features',
        loadComponent: () => import('./features/features/features.component').then(m => m.FeaturesComponent),
      },
      {
        path: 'about-us',
        loadComponent: () => import('./features/about-us/about-us.component').then(m => m.AboutUsComponent),
      },
      {
        path: 'pricing',
        loadComponent: () => import('./features/pricing/pricing.component').then(m => m.PricingComponent),
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent),
      },
      {
        path: 'auth',
        children: [
          { path: '', redirectTo: 'login', pathMatch: 'full' },
          {
            path: 'login',
            loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
          },
          {
            path: 'register-organization',
            loadComponent: () => import('./features/auth/register-organization/register-organization.component').then(m => m.RegisterOrganizationComponent),
          },
        ],
      },
    ],
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        data: { breadcrumb: 'Dashboard' },
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/user/edit-profile/edit-profile.component').then(m => m.EditProfileComponent),
        data: { breadcrumb: 'My Profile' },
      },
      {
        path: 'preferences',
        loadComponent: comingSoon,
        data: { breadcrumb: 'Preferences', title: 'Preferences', icon: 'tune' },
      },
      {
        path: 'favorites',
        loadComponent: comingSoon,
        data: { breadcrumb: 'My Favorites', title: 'My Favorites', icon: 'star' },
      },
      {
        path: 'my-tasks',
        loadComponent: comingSoon,
        data: { breadcrumb: 'My Tasks', title: 'My Tasks', icon: 'task' },
      },
      {
        path: 'my-approvals',
        loadComponent: comingSoon,
        data: { breadcrumb: 'My Approvals', title: 'My Approvals', icon: 'fact_check' },
      },
      {
        path: 'support',
        loadComponent: comingSoon,
        data: { breadcrumb: 'Help Center', title: 'Help Center', icon: 'support_agent' },
      },
      {
        path: 'projects',
        loadComponent: comingSoon,
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Projects', title: 'Projects', icon: 'folder_open', permission: PERMISSIONS.PROJECTS_VIEW },
      },
      {
        path: 'materials',
        loadComponent: comingSoon,
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Materials', title: 'Materials Management', icon: 'inventory_2', permission: PERMISSIONS.MATERIALS_VIEW },
      },
      {
        path: 'vendors',
        loadComponent: comingSoon,
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Vendors', title: 'Vendor Management', icon: 'storefront', permission: PERMISSIONS.VENDORS_VIEW },
      },
      {
        path: 'purchase-orders',
        loadComponent: comingSoon,
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Purchase Orders', title: 'Purchase Orders', icon: 'receipt_long', permission: PERMISSIONS.PO_VIEW },
      },
      {
        path: 'rfqs',
        loadComponent: comingSoon,
        canActivate: [permissionGuard],
        data: { breadcrumb: 'RFQs', title: 'Requests for Quotation', icon: 'request_quote', permission: PERMISSIONS.RFQ_VIEW },
      },
      {
        path: 'warehouse',
        loadComponent: comingSoon,
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Warehouse', title: 'Warehouse Management', icon: 'warehouse', permission: PERMISSIONS.WAREHOUSE_VIEW },
      },
      {
        path: 'qa',
        loadComponent: comingSoon,
        canActivate: [permissionGuard],
        data: { breadcrumb: 'QA / QC', title: 'Quality Assurance', icon: 'fact_check', permission: PERMISSIONS.QA_VIEW },
      },
      {
        path: 'reports',
        loadComponent: comingSoon,
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Reports', title: 'Reports', icon: 'summarize', permission: PERMISSIONS.REPORTS_VIEW },
      },
      {
        path: 'analytics',
        loadComponent: comingSoon,
        canActivate: [permissionGuard],
        data: { breadcrumb: 'Analytics', title: 'Analytics', icon: 'insights', permission: PERMISSIONS.ANALYTICS_VIEW },
      },
      {
        path: 'admin',
        canActivate: [permissionGuard],
        data: { roles: ['OrganizationAdmin', 'SuperAdmin'], breadcrumb: 'Administration' },
        children: [
          {
            path: 'dashboard',
            loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
            data: { breadcrumb: 'Dashboard' },
          },
          {
            path: 'users',
            loadComponent: () => import('./features/admin/users/user-list/user-list.component').then(m => m.UserListComponent),
            data: { breadcrumb: 'Manage Users', permission: PERMISSIONS.USERS_MANAGE },
          },
          {
            path: 'users/create',
            loadComponent: () => import('./features/admin/users/create-user/create-user.component').then(m => m.CreateUserComponent),
            data: { breadcrumb: 'Create User', permission: PERMISSIONS.USERS_MANAGE },
          },
          {
            path: 'organization/profile',
            loadComponent: () => import('./features/admin/organization-profile/organization-profile.component').then(m => m.OrganizationProfileComponent),
            data: { breadcrumb: 'Organization Settings', permission: PERMISSIONS.ORGANIZATION_MANAGE },
          },
          {
            path: 'roles',
            loadComponent: comingSoon,
            data: { breadcrumb: 'Role Management', title: 'Role Management', icon: 'admin_panel_settings', permission: PERMISSIONS.ROLES_MANAGE },
          },
          {
            path: 'permissions',
            loadComponent: comingSoon,
            data: { breadcrumb: 'Permission Management', title: 'Permission Management', icon: 'lock_person', permission: PERMISSIONS.PERMISSIONS_MANAGE },
          },
          {
            path: 'departments',
            loadComponent: () => import('./features/department/department.component').then(m => m.DepartmentComponent),
            data: { breadcrumb: 'Department', permission: PERMISSIONS.DEPARTMENTS_VIEW },
          },
          {
            path: 'disciplines',
            loadComponent: () => import('./features/discipline/discipline.component').then(m => m.DisciplineComponent),
            data: { breadcrumb: 'Discipline', permission: PERMISSIONS.DISCIPLINES_VIEW },
          },
          {
            path: 'department-disciplines',
            loadComponent: () => import('./features/department-discipline/department-discipline.component').then(m => m.DepartmentDisciplineComponent),
            data: { breadcrumb: 'Department-Discipline Mapping', permission: PERMISSIONS.DEPARTMENT_DISCIPLINES_VIEW },
          },
          {
            path: 'activity',
            loadComponent: () => import('./features/activity/activity.component').then(m => m.ActivityComponent),
            data: { breadcrumb: 'Activity', permission: PERMISSIONS.ACTIVITIES_VIEW },
          },
          {
            path: 'material-categories',
            loadComponent: () => import('./features/material-category/material-category.component').then(m => m.MaterialCategoryComponent),
            data: { breadcrumb: 'Material Categories', permission: PERMISSIONS.MATERIAL_CATEGORIES_VIEW },
          },
          {
            path: 'material-group',
            loadComponent: () => import('./features/material-group/material-group.component').then(m => m.MaterialGroupComponent),
            data: { breadcrumb: 'Material Groups', permission: PERMISSIONS.MATERIAL_GROUPS_VIEW },
          },
          {
            path: 'unit-of-measurements',
            loadComponent: () => import('./features/unit-of-measurement/unit-of-measurement.component').then(m => m.UnitOfMeasurementComponent),
            data: { breadcrumb: 'Unit of Measurements', permission: PERMISSIONS.UOM_VIEW },
          },
          {
            path: 'service-groups',
            loadComponent: () => import('./features/service-group/service-group.component').then(m => m.ServiceGroupComponent),
            data: { breadcrumb: 'Service Groups', permission: PERMISSIONS.SERVICE_GROUPS_VIEW },
          },
          {
            path: 'service-group-users',
            loadComponent: () => import('./features/service-group-user/service-group-user.component').then(m => m.ServiceGroupUserComponent),
            data: { breadcrumb: 'Service Group User Assignment', permission: PERMISSIONS.SERVICE_GROUP_USERS_VIEW },
          },
          {
            path: 'api-keys',
            loadComponent: comingSoon,
            data: { breadcrumb: 'API Keys', title: 'API Keys', icon: 'vpn_key', permission: PERMISSIONS.SETTINGS_MANAGE },
          },
          {
            path: 'audit-logs',
            loadComponent: comingSoon,
            data: { breadcrumb: 'Audit Logs', title: 'Audit Logs', icon: 'history', permission: PERMISSIONS.AUDIT_VIEW },
          },
          {
            path: 'access',
            data: { breadcrumb: 'Access Management' },
            children: [
              { path: 'ad-groups', loadComponent: comingSoon, data: { breadcrumb: 'Active Directory Groups', title: 'Active Directory Groups', icon: 'groups', permission: PERMISSIONS.PERMISSIONS_MANAGE } },
              { path: 'activities', loadComponent: comingSoon, data: { breadcrumb: 'Activities', title: 'Activity Mapping', icon: 'timeline', permission: PERMISSIONS.ACTIVITIES_MANAGE } },
              { path: 'features', loadComponent: comingSoon, data: { breadcrumb: 'Features', title: 'Feature Mapping', icon: 'extension', permission: PERMISSIONS.FEATURES_MANAGE } },
              { path: 'projects', loadComponent: comingSoon, data: { breadcrumb: 'Projects', title: 'Project Mapping', icon: 'folder_shared', permission: PERMISSIONS.PROJECTS_MANAGE } },
              { path: 'permission-matrix', loadComponent: comingSoon, data: { breadcrumb: 'Permission Matrix', title: 'Permission Matrix', icon: 'grid_view', permission: PERMISSIONS.PERMISSIONS_MANAGE } },
            ],
          },
          {
            path: 'settings',
            data: { breadcrumb: 'System Configuration' },
            children: [
              { path: 'application', loadComponent: comingSoon, data: { breadcrumb: 'Application Settings', title: 'Application Settings', icon: 'tune', permission: PERMISSIONS.SETTINGS_MANAGE } },
              { path: 'notifications', loadComponent: comingSoon, data: { breadcrumb: 'Notifications', title: 'Notification Settings', icon: 'notifications', permission: PERMISSIONS.SETTINGS_MANAGE } },
              { path: 'master-data', loadComponent: comingSoon, data: { breadcrumb: 'Master Data', title: 'Master Data', icon: 'dataset', permission: PERMISSIONS.SETTINGS_MANAGE } },
            ],
          },
          {
            path: 'security',
            data: { breadcrumb: 'Security' },
            children: [
              { path: 'database', loadComponent: comingSoon, data: { breadcrumb: 'Database Settings', title: 'Database Settings', icon: 'storage', permission: PERMISSIONS.SYSTEM_MANAGE } },
              { path: 'api', loadComponent: comingSoon, data: { breadcrumb: 'API Management', title: 'API Management', icon: 'api', permission: PERMISSIONS.SYSTEM_MANAGE } },
              { path: 'integration', loadComponent: comingSoon, data: { breadcrumb: 'Integration', title: 'Integration', icon: 'hub', permission: PERMISSIONS.SYSTEM_MANAGE } },
              { path: 'license', loadComponent: comingSoon, data: { breadcrumb: 'License Management', title: 'License Management', icon: 'verified', permission: PERMISSIONS.SYSTEM_MANAGE } },
            ],
          },
        ],
      },
      {
        path: 'manager',
        canActivate: [permissionGuard],
        data: { roles: ['DepartmentManager', 'DisciplineLead', 'ProjectManager', 'ProcurementManager', 'QAManager', 'WarehouseManager'], breadcrumb: 'Manager' },
        children: [
          {
            path: 'dashboard',
            loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
            data: { breadcrumb: 'Dashboard' },
          },
        ],
      },
    ],
  },
  {
    path: 'forbidden',
    loadComponent: comingSoon,
    data: { title: 'Access Denied', icon: 'block', description: "You don't have permission to view this page." },
  },
  { path: '**', redirectTo: 'home' },
];
