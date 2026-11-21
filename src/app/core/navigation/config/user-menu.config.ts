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
  // Internal users only (reviewers / approvers are company users): external accounts never hold
  // these permissions — see core/rbac/external-access.config.ts.
  { id: 'material-requisition-reviews', label: 'Requisition Reviews', icon: 'rate_review', route: '/material-requisitions/reviews', order: 3, permission: PERMISSIONS.MATERIAL_REQUISITIONS_REVIEW },
  { id: 'material-requisition-approvals', label: 'Requisition Approvals', icon: 'verified', route: '/material-requisitions/approvals', order: 3, permission: PERMISSIONS.MATERIAL_REQUISITIONS_APPROVE },
  // Vendor accounts — always shown (an empty list says no RFQ is available yet).
  { id: 'vendor-rfqs', label: 'Requests for Quotation', icon: 'request_quote', route: '/vendor-rfqs', order: 3, permission: PERMISSIONS.RFQ_RESPOND },
  { id: 'profile', label: 'My Profile', icon: 'person', route: '/profile', order: 4, permission: PERMISSIONS.PROFILE_VIEW },
];
