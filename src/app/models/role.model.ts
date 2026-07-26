export type AppRole =
  | 'SuperAdmin'
  | 'OrganizationAdmin'
  | 'DepartmentManager'
  | 'DisciplineLead'
  | 'ProjectManager'
  | 'ProcurementManager'
  | 'QAManager'
  | 'WarehouseManager'
  | 'User';

export const APP_ROLES: AppRole[] = [
  'SuperAdmin',
  'OrganizationAdmin',
  'DepartmentManager',
  'DisciplineLead',
  'ProjectManager',
  'ProcurementManager',
  'QAManager',
  'WarehouseManager',
  'User',
];

export const ROLE_LABELS: Record<AppRole, string> = {
  SuperAdmin: 'Super Administrator',
  OrganizationAdmin: 'Organization Administrator',
  DepartmentManager: 'Department Manager',
  DisciplineLead: 'Discipline Lead',
  ProjectManager: 'Project Manager',
  ProcurementManager: 'Procurement Manager',
  QAManager: 'QA/QC Manager',
  WarehouseManager: 'Warehouse Manager',
  User: 'Regular User',
};

/** Legacy role values that predate the full 9-role model. */
const LEGACY_ROLE_ALIASES: Record<string, AppRole> = {
  Manager: 'DepartmentManager',
  Viewer: 'User',
};

/**
 * Normalizes a raw role value (from the backend, a JWT claim, or stale
 * localStorage) into one of the 9 canonical AppRole values.
 */
export function normalizeRole(raw: string | null | undefined): AppRole {
  if (!raw) return 'User';
  if ((APP_ROLES as string[]).includes(raw)) return raw as AppRole;
  const aliased = LEGACY_ROLE_ALIASES[raw];
  if (aliased) return aliased;
  console.warn(`[role.model] Unrecognized role "${raw}" — defaulting to "User".`);
  return 'User';
}
