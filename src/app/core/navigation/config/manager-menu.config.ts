import { MenuItem } from '../menu-item.model';
import { PERMISSIONS } from '../../rbac/permissions.const';

/**
 * Shared tree for all 6 manager-type roles (DepartmentManager, DisciplineLead,
 * ProjectManager, ProcurementManager, QAManager, WarehouseManager).
 * NavigationService prunes each node by permission, so e.g. a WarehouseManager
 * sees Warehouse but not Vendors/Purchase Orders — no per-role file needed.
 */
export const MANAGER_MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', route: '/manager/dashboard', order: 1, permission: PERMISSIONS.DASHBOARD_VIEW },
  { id: 'projects', label: 'Projects', icon: 'folder_open', route: '/projects', order: 2, permission: PERMISSIONS.PROJECTS_VIEW },
  { id: 'materials', label: 'Materials', icon: 'inventory_2', route: '/materials', order: 3, permission: PERMISSIONS.MATERIALS_VIEW },
  { id: 'vendors', label: 'Vendors', icon: 'storefront', route: '/vendors', order: 4, permission: PERMISSIONS.VENDORS_VIEW },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: 'receipt_long', route: '/purchase-orders', order: 5, permission: PERMISSIONS.PO_VIEW },
  { id: 'rfqs', label: 'RFQs', icon: 'request_quote', route: '/rfqs', order: 6, permission: PERMISSIONS.RFQ_VIEW },
  { id: 'warehouse', label: 'Warehouse', icon: 'warehouse', route: '/warehouse', order: 7, permission: PERMISSIONS.WAREHOUSE_VIEW },
  { id: 'qa', label: 'QA / QC', icon: 'fact_check', route: '/qa', order: 8, permission: PERMISSIONS.QA_VIEW },
  { id: 'reports', label: 'Reports', icon: 'summarize', route: '/reports', order: 9, permission: PERMISSIONS.REPORTS_VIEW },
];
