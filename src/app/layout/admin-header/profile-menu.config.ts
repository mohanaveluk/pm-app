import { AppRole } from '../../models/role.model';

export interface ProfileMenuItem {
  label: string;
  icon: string;
  route: string;
}

const ADMIN_PROFILE_MENU: ProfileMenuItem[] = [
  { label: 'Organization Settings', icon: 'domain', route: '/admin/organization/profile' },
  { label: 'Manage Users', icon: 'group', route: '/admin/users' },
  { label: 'System Settings', icon: 'settings', route: '/admin/settings/application' },
  { label: 'Edit Profile', icon: 'person', route: '/profile' },
  { label: 'Change Password', icon: 'lock', route: '/profile' },
  { label: 'Preferences', icon: 'tune', route: '/preferences' },
  { label: 'API Keys', icon: 'vpn_key', route: '/admin/api-keys' },
  { label: 'Audit Logs', icon: 'history', route: '/admin/audit-logs' },
  { label: 'Help', icon: 'help_outline', route: '/support' },
  { label: 'About', icon: 'info_outline', route: '/about-us' },
];

const USER_PROFILE_MENU: ProfileMenuItem[] = [
  { label: 'My Profile', icon: 'person', route: '/profile' },
  { label: 'My Tasks', icon: 'task', route: '/my-tasks' },
  { label: 'My Approvals', icon: 'fact_check', route: '/my-approvals' },
  { label: 'My Favorites', icon: 'star', route: '/favorites' },
  { label: 'Preferences', icon: 'tune', route: '/preferences' },
  { label: 'Help', icon: 'help_outline', route: '/support' },
];

/** Profile-menu contents are data-driven off role — one template renders whichever list comes back. */
export function buildProfileMenuItems(role: AppRole): ProfileMenuItem[] {
  return role === 'SuperAdmin' || role === 'OrganizationAdmin' ? ADMIN_PROFILE_MENU : USER_PROFILE_MENU;
}
