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

  SERVICE_GROUPS_VIEW: 'service-groups.view',
  SERVICE_GROUPS_CREATE: 'service-groups.create',
  SERVICE_GROUPS_UPDATE: 'service-groups.update',
  SERVICE_GROUPS_DELETE: 'service-groups.delete',
  SERVICE_GROUPS_CLONE: 'service-groups.clone',
  SERVICE_GROUPS_COPY: 'service-groups.copy',
  SERVICE_GROUPS_ENABLE: 'service-groups.enable',
  SERVICE_GROUPS_DISABLE: 'service-groups.disable',
  SERVICE_GROUPS_PERMISSION_MATRIX: 'service-groups.permission-matrix',
  SERVICE_GROUPS_AUDIT_HISTORY: 'service-groups.audit-history',
  SERVICE_GROUPS_EXPORT: 'service-groups.export',

  SERVICE_GROUP_USERS_VIEW: 'service-group-users.view',
  SERVICE_GROUP_USERS_CREATE: 'service-group-users.create',
  SERVICE_GROUP_USERS_UPDATE: 'service-group-users.update',
  SERVICE_GROUP_USERS_DELETE: 'service-group-users.delete',
  SERVICE_GROUP_USERS_ENABLE: 'service-group-users.enable',
  SERVICE_GROUP_USERS_DISABLE: 'service-group-users.disable',
  SERVICE_GROUP_USERS_BULK_ENABLE: 'service-group-users.bulk-enable',
  SERVICE_GROUP_USERS_BULK_DISABLE: 'service-group-users.bulk-disable',
  SERVICE_GROUP_USERS_EXPORT: 'service-group-users.export',
  SERVICE_GROUP_USERS_AUDIT_HISTORY: 'service-group-users.audit-history',

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
