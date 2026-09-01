import { MenuItem } from '../menu-item.model';
import { PERMISSIONS } from '../../rbac/permissions.const';

/**
 * Full navigation tree for SuperAdmin / OrganizationAdmin, grouped by
 * administrative function so related screens sit together instead of
 * competing for space at the top level.
 *
 * Group nodes deliberately carry no `permission` of their own: NavigationService
 * prunes children first and then drops any parent left with no route and no
 * surviving children. Gating only the leaves means a group can never hide a
 * screen its owner is actually entitled to — an OrganizationAdmin lacking
 * system.manage simply sees System Administration shrink to the settings.manage
 * entries, and Integration & API disappear entirely.
 */
export const SUPER_ADMIN_MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', route: '/admin/dashboard', order: 1, permission: PERMISSIONS.DASHBOARD_VIEW },

  {
    id: 'organization-setup', label: 'System Configuration', tooltip: 'System Configuration (Organization Setup)', icon: 'domain', order: 2,
    children: [
      { id: 'org-profile', label: 'Organization Profile', route: '/admin/organization/profile', order: 1, permission: PERMISSIONS.ORGANIZATION_MANAGE },
      { id: 'org-departments', label: 'Departments', route: '/admin/departments', order: 2, permission: PERMISSIONS.DEPARTMENTS_VIEW },
      { id: 'org-disciplines', label: 'Disciplines', route: '/admin/disciplines', order: 3, permission: PERMISSIONS.DISCIPLINES_VIEW },
      { id: 'org-department-disciplines', label: 'Department-Discipline Mapping', route: '/admin/department-disciplines', order: 4, permission: PERMISSIONS.DEPARTMENT_DISCIPLINES_VIEW },
      { id: 'org-activities', label: 'Activity Master', route: '/admin/activity', order: 5, permission: PERMISSIONS.ACTIVITIES_VIEW },
      { id: 'org-material-categories', label: 'Material Categories', route: '/admin/material-categories', order: 6, permission: PERMISSIONS.MATERIAL_CATEGORIES_VIEW },
      { id: 'org-material-groups', label: 'Material Groups', route: '/admin/material-group', order: 7, permission: PERMISSIONS.MATERIAL_GROUPS_VIEW },
      { id: 'org-uom', label: 'Unit of Measurements', route: '/admin/unit-of-measurements', order: 8, permission: PERMISSIONS.UOM_VIEW },
      { id: 'org-industry-categories', label: 'Industry Categories', route: '/admin/industry-categories', order: 9, permission: PERMISSIONS.INDUSTRY_CATEGORIES_VIEW },
      { id: 'org-vendor-types', label: 'Vendor Types', route: '/admin/vendor-types', order: 10, permission: PERMISSIONS.VENDOR_TYPES_VIEW },
    ],
  },

  {
    id: 'user-access', label: 'Access Management', tooltip: 'Access Management', icon: 'manage_accounts', order: 3,
    children: [
      { id: 'user-accounts', label: 'Users', route: '/admin/users', order: 1, permission: PERMISSIONS.USERS_MANAGE },
      { id: 'user-roles', label: 'Roles', route: '/admin/roles', order: 2, permission: PERMISSIONS.ROLES_MANAGE },
      { id: 'user-permissions', label: 'Permissions', route: '/admin/permissions', order: 3, permission: PERMISSIONS.PERMISSIONS_MANAGE },
      { id: 'user-ad-groups', label: 'Active Directory Groups', route: '/admin/access/ad-groups', order: 4, permission: PERMISSIONS.PERMISSIONS_MANAGE },
    ],
  },

  {
    id: 'rbac', label: 'RBAC', tooltip: 'Role-Based Access Control', icon: 'security', order: 4,
    children: [
      { id: 'rbac-service-groups', label: 'Service Groups', route: '/admin/service-groups', order: 1, permission: PERMISSIONS.SERVICE_GROUPS_VIEW },
      { id: 'rbac-service-group-users', label: 'Service Group User Assignment', route: '/admin/service-group-users', order: 2, permission: PERMISSIONS.SERVICE_GROUP_USERS_VIEW },
      { id: 'rbac-permission-matrix', label: 'Permission Matrix', route: '/admin/access/permission-matrix', order: 3, permission: PERMISSIONS.PERMISSIONS_MANAGE },
      { id: 'rbac-activity-mapping', label: 'Activity Mapping', route: '/admin/access/activities', order: 4, permission: PERMISSIONS.ACTIVITIES_MANAGE },
      { id: 'rbac-feature-mapping', label: 'Feature Mapping', route: '/admin/access/features', order: 5, permission: PERMISSIONS.FEATURES_MANAGE },
      { id: 'rbac-project-mapping', label: 'Project Mapping', route: '/admin/access/projects', order: 6, permission: PERMISSIONS.PROJECTS_MANAGE },
    ],
  },

  { id: 'projects', label: 'Projects', tooltip: 'Projects', icon: 'folder_open', route: '/projects', order: 5, permission: PERMISSIONS.PROJECTS_VIEW },

  {
    id: 'procurement', label: 'Procurement', tooltip: 'Procurement', icon: 'shopping_cart', order: 6,
    children: [
      { id: 'procurement-vendors', label: 'Vendors', route: '/vendors', order: 1, permission: PERMISSIONS.VENDORS_VIEW },
      { id: 'procurement-vendor-evaluation', label: 'Vendor Evaluation', route: '/vendor-evaluation', order: 2, permission: PERMISSIONS.VENDOR_EVALUATION_VIEW },
      { id: 'procurement-purchase-orders', label: 'Purchase Orders', route: '/purchase-orders', order: 3, permission: PERMISSIONS.PO_VIEW },
      { id: 'procurement-rfqs', label: 'RFQs', route: '/rfqs', order: 4, permission: PERMISSIONS.RFQ_VIEW },
    ],
  },

  {
    id: 'engineering', label: 'Engineering', tooltip: 'Engineering', icon: 'engineering', order: 7,
    children: [
      { id: 'material-requisition', label: 'Material Requisition', route: '/warehouse', order: 2, permission: PERMISSIONS.WAREHOUSE_VIEW },
    ],
  },

  {
    id: 'inventory-quality', label: 'Materials', tooltip: 'Materials', icon: 'inventory_2', order: 7,
    children: [
      { id: 'material-master', label: 'Material Master', route: '/admin/materials', order: 1, permission: PERMISSIONS.MATERIALS_VIEW },
      { id: 'inventory-materials', label: 'Inventory', route: '/materials', order: 1, permission: PERMISSIONS.MATERIALS_VIEW },
      { id: 'inventory-warehouse', label: 'Warehouse', route: '/warehouse', order: 2, permission: PERMISSIONS.WAREHOUSE_VIEW },
    ],
  },

  {
    id: 'quality', label: 'Quality', tooltip: 'Quality', icon: 'spa', order: 8,
    children: [
      { id: 'inventory-qa', label: 'QA / QC', route: '/qa', order: 3, permission: PERMISSIONS.QA_VIEW },
    ],
  },  
  {
    id: 'reporting', label: 'Reports & Analytics', tooltip: 'Reports & Analytics', icon: 'insights', order: 9,
    children: [
      { id: 'reporting-reports', label: 'Reports', route: '/reports', order: 1, permission: PERMISSIONS.REPORTS_VIEW },
      { id: 'reporting-analytics', label: 'Analytics', route: '/analytics', order: 2, permission: PERMISSIONS.ANALYTICS_VIEW },
    ],
  },

  {
    id: 'system-admin', label: 'System Admin', tooltip: 'System Administration', icon: 'tune', order: 10,
    children: [
      { id: 'system-app-settings', label: 'Application Settings', route: '/admin/settings/application', order: 1, permission: PERMISSIONS.SETTINGS_MANAGE },
      { id: 'system-notifications', label: 'Notification Settings', route: '/admin/settings/notifications', order: 2, permission: PERMISSIONS.SETTINGS_MANAGE },
      { id: 'system-master-data', label: 'Master Data', route: '/admin/settings/master-data', order: 3, permission: PERMISSIONS.SETTINGS_MANAGE },
      { id: 'system-database', label: 'Database Settings', route: '/admin/security/database', order: 4, permission: PERMISSIONS.SYSTEM_MANAGE },
      { id: 'system-license', label: 'License Management', route: '/admin/security/license', order: 5, permission: PERMISSIONS.SYSTEM_MANAGE },
    ],
  },

  {
    id: 'integration', label: 'Integration & API', tooltip: 'Integration & API', icon: 'api', order: 11,
    children: [
      { id: 'integration-api', label: 'API Management', route: '/admin/security/api', order: 1, permission: PERMISSIONS.SYSTEM_MANAGE },
      { id: 'integration-api-keys', label: 'API Keys', route: '/admin/api-keys', order: 2, permission: PERMISSIONS.SETTINGS_MANAGE },
      { id: 'integration-connectors', label: 'Integration', route: '/admin/security/integration', order: 3, permission: PERMISSIONS.SYSTEM_MANAGE },
    ],
  },

  { id: 'audit-logs', label: 'Audit Logs', tooltip: 'Audit Logs', icon: 'history', route: '/admin/audit-logs', order: 12, permission: PERMISSIONS.AUDIT_VIEW },

  { id: 'support', label: 'Support', tooltip: 'Support', icon: 'support_agent', route: '/support', order: 13 },
];
