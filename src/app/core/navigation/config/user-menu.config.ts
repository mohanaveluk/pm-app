import { MenuItem } from '../menu-item.model';
import { PERMISSIONS } from '../../rbac/permissions.const';

/**
 * Regular User navigation. Per the spec, regular users only see menus
 * actually returned for them — kept intentionally minimal here since this
 * role has no domain-management permissions in role-permissions.config.ts.
 */
export const USER_MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', route: '/dashboard', order: 1, permission: PERMISSIONS.DASHBOARD_VIEW },
  { id: 'my-tasks', label: 'My Tasks', icon: 'task', route: '/my-tasks', order: 2 },
  { id: 'my-approvals', label: 'My Approvals', icon: 'fact_check', route: '/my-approvals', order: 3 },
  { id: 'profile', label: 'My Profile', icon: 'person', route: '/profile', order: 4, permission: PERMISSIONS.PROFILE_VIEW },
];
