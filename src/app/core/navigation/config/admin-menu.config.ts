import { SUPER_ADMIN_MENU } from './super-admin-menu.config';

/**
 * OrganizationAdmin shares the SuperAdmin tree structure — permission-based
 * pruning in NavigationService is what actually differentiates the two
 * (e.g. OrganizationAdmin lacks system.manage, so Integration & API disappears
 * for them even though it's present in this same source tree).
 */
export const ADMIN_MENU = SUPER_ADMIN_MENU;
