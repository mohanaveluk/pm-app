import { AppRole } from '../../../models/role.model';
import { MenuItem } from '../menu-item.model';
import { SUPER_ADMIN_MENU } from './super-admin-menu.config';
import { ADMIN_MENU } from './admin-menu.config';
import { MANAGER_MENU } from './manager-menu.config';
import { USER_MENU } from './user-menu.config';

const MANAGER_ROLES: AppRole[] = [
  'DepartmentManager',
  'DisciplineLead',
  'ProjectManager',
  'ProcurementManager',
  'QAManager',
  'WarehouseManager',
];

export const MENU_REGISTRY: Record<AppRole, MenuItem[]> = {
  SuperAdmin: SUPER_ADMIN_MENU,
  OrganizationAdmin: ADMIN_MENU,
  DepartmentManager: MANAGER_MENU,
  DisciplineLead: MANAGER_MENU,
  ProjectManager: MANAGER_MENU,
  ProcurementManager: MANAGER_MENU,
  QAManager: MANAGER_MENU,
  WarehouseManager: MANAGER_MENU,
  User: USER_MENU,
};

export function isManagerRole(role: AppRole): boolean {
  return MANAGER_ROLES.includes(role);
}
