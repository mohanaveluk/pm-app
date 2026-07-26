/**
 * Flat permission-code catalogue. Domain-scoped as `<domain>.<action>` so
 * `PermissionService` can match a whole domain via a `<domain>.*` wildcard.
 * Extend this list as real ERP feature modules are added — nothing else
 * needs to change to introduce a new permission string.
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',

  ORGANIZATION_VIEW: 'organization.view',
  ORGANIZATION_MANAGE: 'organization.manage',

  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',

  ROLES_MANAGE: 'roles.manage',
  PERMISSIONS_MANAGE: 'permissions.manage',

  DEPARTMENTS_VIEW: 'departments.view',
  DEPARTMENTS_CREATE: 'departments.create',
  DEPARTMENTS_UPDATE: 'departments.update',
  DEPARTMENTS_DELETE: 'departments.delete',
  DEPARTMENTS_EXPORT: 'departments.export',

  DISCIPLINES_VIEW: 'disciplines.view',
  DISCIPLINES_CREATE: 'disciplines.create',
  DISCIPLINES_UPDATE: 'disciplines.update',
  DISCIPLINES_DELETE: 'disciplines.delete',
  DISCIPLINES_EXPORT: 'disciplines.export',

  DEPARTMENT_DISCIPLINES_VIEW: 'department-disciplines.view',
  DEPARTMENT_DISCIPLINES_CREATE: 'department-disciplines.create',
  DEPARTMENT_DISCIPLINES_UPDATE: 'department-disciplines.update',
  DEPARTMENT_DISCIPLINES_DELETE: 'department-disciplines.delete',
  DEPARTMENT_DISCIPLINES_EXPORT: 'department-disciplines.export',

  ACTIVITIES_MANAGE: 'activities.manage',

  ACTIVITIES_VIEW: 'activities.view',
  ACTIVITIES_CREATE: 'activities.create',
  ACTIVITIES_UPDATE: 'activities.update',
  ACTIVITIES_DELETE: 'activities.delete',
  ACTIVITIES_EXPORT: 'activities.export',
  ACTIVITIES_IMPORT: 'activities.import',
  ACTIVITIES_BULK_CREATE: 'activities.bulk-create',

  FEATURES_MANAGE: 'features.manage',

  PROJECTS_VIEW: 'projects.view',
  PROJECTS_MANAGE: 'projects.manage',

  MATERIALS_VIEW: 'materials.view',
  MATERIALS_MANAGE: 'materials.manage',

  VENDORS_VIEW: 'vendors.view',
  VENDORS_MANAGE: 'vendors.manage',

  PO_VIEW: 'po.view',
  PO_MANAGE: 'po.manage',
  PO_APPROVE: 'po.approve',

  RFQ_VIEW: 'rfq.view',
  RFQ_MANAGE: 'rfq.manage',

  WAREHOUSE_VIEW: 'warehouse.view',
  WAREHOUSE_MANAGE: 'warehouse.manage',

  QA_VIEW: 'qa.view',
  QA_MANAGE: 'qa.manage',

  REPORTS_VIEW: 'reports.view',
  ANALYTICS_VIEW: 'analytics.view',

  AUDIT_VIEW: 'audit.view',
  SETTINGS_MANAGE: 'settings.manage',
  SYSTEM_MANAGE: 'system.manage',

  PROFILE_VIEW: 'profile.view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Baseline permissions every authenticated user has, regardless of role. */
export const BASELINE_PERMISSIONS: Permission[] = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.PROFILE_VIEW,
];
