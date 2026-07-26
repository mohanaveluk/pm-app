import { MenuItem } from '../menu-item.model';
import { PERMISSIONS } from '../../rbac/permissions.const';

/**
 * Full navigation tree for SuperAdmin / OrganizationAdmin. Nodes are pruned
 * per-user by NavigationService based on the actual permission set for
 * their role — an OrganizationAdmin viewing this same tree simply won't see
 * the system.manage-gated Security section.
 */
export const SUPER_ADMIN_MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', route: '/admin/dashboard', order: 1, permission: PERMISSIONS.DASHBOARD_VIEW },

  { id: 'org-management', label: 'Organization Management', icon: 'domain', route: '/admin/organization/profile', order: 2, permission: PERMISSIONS.ORGANIZATION_MANAGE },
  { id: 'user-management', label: 'User Management', icon: 'group', route: '/admin/users', order: 3, permission: PERMISSIONS.USERS_MANAGE },
  { id: 'role-management', label: 'Role Management', icon: 'admin_panel_settings', route: '/admin/roles', order: 4, permission: PERMISSIONS.ROLES_MANAGE },
  { id: 'permission-management', label: 'Permission Management', icon: 'lock_person', route: '/admin/permissions', order: 5, permission: PERMISSIONS.PERMISSIONS_MANAGE },
  { id: 'department', label: 'Department', icon: 'account_tree', route: '/admin/departments', order: 6, permission: PERMISSIONS.DEPARTMENTS_VIEW },
  { id: 'discipline', label: 'Discipline', icon: 'engineering', route: '/admin/disciplines', order: 7, permission: PERMISSIONS.DISCIPLINES_VIEW },
  { id: 'department-discipline', label: 'Department-Discipline Mapping', icon: 'hub', route: '/admin/department-disciplines', order: 8, permission: PERMISSIONS.DEPARTMENT_DISCIPLINES_VIEW },
  { id: 'activity', label: 'Activity', icon: 'timeline', route: '/admin/activity', order: 9, permission: PERMISSIONS.ACTIVITIES_VIEW },

  {
    id: 'access-management', label: 'Access Management', icon: 'security', order: 10, permission: PERMISSIONS.PERMISSIONS_MANAGE,
    children: [
      { id: 'access-service-groups', label: 'Service Groups', route: '/admin/access/service-groups', order: 1, permission: PERMISSIONS.PERMISSIONS_MANAGE },
      { id: 'access-ad-groups', label: 'Active Directory Groups', route: '/admin/access/ad-groups', order: 2, permission: PERMISSIONS.PERMISSIONS_MANAGE },
      { id: 'access-activities', label: 'Activities', route: '/admin/access/activities', order: 3, permission: PERMISSIONS.ACTIVITIES_MANAGE },
      { id: 'access-features', label: 'Features', route: '/admin/access/features', order: 4, permission: PERMISSIONS.FEATURES_MANAGE },
      { id: 'access-projects', label: 'Projects', route: '/admin/access/projects', order: 5, permission: PERMISSIONS.PROJECTS_MANAGE },
      { id: 'access-permission-matrix', label: 'Permission Matrix', route: '/admin/access/permission-matrix', order: 6, permission: PERMISSIONS.PERMISSIONS_MANAGE },
    ],
  },

  { id: 'projects', label: 'Projects', icon: 'folder_open', route: '/projects', order: 11, permission: PERMISSIONS.PROJECTS_VIEW },
  { id: 'materials', label: 'Materials', icon: 'inventory_2', route: '/materials', order: 12, permission: PERMISSIONS.MATERIALS_VIEW },
  { id: 'vendors', label: 'Vendors', icon: 'storefront', route: '/vendors', order: 13, permission: PERMISSIONS.VENDORS_VIEW },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: 'receipt_long', route: '/purchase-orders', order: 14, permission: PERMISSIONS.PO_VIEW },
  { id: 'rfqs', label: 'RFQs', icon: 'request_quote', route: '/rfqs', order: 15, permission: PERMISSIONS.RFQ_VIEW },
  { id: 'warehouse', label: 'Warehouse', icon: 'warehouse', route: '/warehouse', order: 16, permission: PERMISSIONS.WAREHOUSE_VIEW },
  { id: 'qa', label: 'QA / QC', icon: 'fact_check', route: '/qa', order: 17, permission: PERMISSIONS.QA_VIEW },

  { id: 'audit-logs', label: 'Audit Logs', icon: 'history', route: '/admin/audit-logs', order: 18, permission: PERMISSIONS.AUDIT_VIEW },

  {
    id: 'system-configuration', label: 'System Configuration', icon: 'tune', order: 19, permission: PERMISSIONS.SETTINGS_MANAGE,
    children: [
      { id: 'system-app-settings', label: 'Application Settings', route: '/admin/settings/application', order: 1, permission: PERMISSIONS.SETTINGS_MANAGE },
      { id: 'system-notifications', label: 'Notifications', route: '/admin/settings/notifications', order: 2, permission: PERMISSIONS.SETTINGS_MANAGE },
      { id: 'system-master-data', label: 'Master Data', route: '/admin/settings/master-data', order: 3, permission: PERMISSIONS.SETTINGS_MANAGE },
    ],
  },

  { id: 'reports', label: 'Reports', icon: 'summarize', route: '/reports', order: 20, permission: PERMISSIONS.REPORTS_VIEW },
  { id: 'analytics', label: 'Analytics', icon: 'insights', route: '/analytics', order: 21, permission: PERMISSIONS.ANALYTICS_VIEW },

  {
    id: 'security', label: 'Security', icon: 'shield', order: 22, permission: PERMISSIONS.SYSTEM_MANAGE,
    children: [
      { id: 'security-database', label: 'Database Settings', route: '/admin/security/database', order: 1, permission: PERMISSIONS.SYSTEM_MANAGE },
      { id: 'security-api', label: 'API Management', route: '/admin/security/api', order: 2, permission: PERMISSIONS.SYSTEM_MANAGE },
      { id: 'security-integration', label: 'Integration', route: '/admin/security/integration', order: 3, permission: PERMISSIONS.SYSTEM_MANAGE },
      { id: 'security-license', label: 'License Management', route: '/admin/security/license', order: 4, permission: PERMISSIONS.SYSTEM_MANAGE },
    ],
  },

  { id: 'support', label: 'Support', icon: 'support_agent', route: '/support', order: 23 },
];
