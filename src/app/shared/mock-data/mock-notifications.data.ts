import { AppNotification } from '../../models/notification.model';

const hoursAgo = (h: number): Date => new Date(Date.now() - h * 60 * 60 * 1000);

/**
 * Placeholder notification feed. No backend notification endpoint exists
 * yet — NotificationService reads from this file today and can be pointed
 * at a real API later without changing the drawer/service contract.
 */
export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', category: 'Inbox', title: 'New email received', body: "You've received a new message from Priya Shah (Procurement).", timestamp: hoursAgo(0.2), read: false, archived: false, priority: 'normal', status: 'open', icon: 'mail' },
  { id: 'n2', category: 'Approvals', title: 'Purchase Order approved', body: 'PO #PO-2291 for Structural Steel Beams was approved by Finance.', timestamp: hoursAgo(0.5), read: false, archived: false, priority: 'normal', status: 'resolved', icon: 'task_alt', actionUrl: '/purchase-orders' },
  { id: 'n3', category: 'RFQs', title: 'RFQ created', body: 'RFQ #RFQ-0587 was created for Insulation Materials — Phase 2.', timestamp: hoursAgo(1), read: false, archived: false, priority: 'normal', status: 'open', icon: 'request_quote', actionUrl: '/rfqs' },
  { id: 'n4', category: 'Workflow', title: 'Workflow assigned', body: 'You were assigned to the Vendor Onboarding approval workflow.', timestamp: hoursAgo(2), read: true, archived: false, priority: 'normal', status: 'open', icon: 'account_tree' },
  { id: 'n5', category: 'Approvals', title: 'Vendor approved', body: "Vendor 'Al Falah Steel Trading LLC' passed compliance review.", timestamp: hoursAgo(3), read: true, archived: false, priority: 'low', status: 'resolved', icon: 'storefront', actionUrl: '/vendors' },
  { id: 'n6', category: 'System Alerts', title: 'Material awaiting inspection', body: 'Batch #BX-4471 (Rebar 12mm) is awaiting QA inspection at Yard 3.', timestamp: hoursAgo(4), read: false, archived: false, priority: 'high', status: 'open', icon: 'inventory_2', actionUrl: '/qa' },
  { id: 'n7', category: 'System Alerts', title: 'Quality inspection completed', body: 'Inspection for Batch #BX-4402 completed — Passed with 2 minor NCRs.', timestamp: hoursAgo(6), read: true, archived: false, priority: 'normal', status: 'resolved', icon: 'fact_check', actionUrl: '/qa' },
  { id: 'n8', category: 'System Alerts', title: 'Supplier certificate expiring', body: "ISO 9001 certificate for 'Gulf Precision Fabricators' expires in 14 days.", timestamp: hoursAgo(8), read: false, archived: false, priority: 'high', status: 'open', icon: 'verified' },
  { id: 'n9', category: 'System Alerts', title: 'Inventory below minimum stock', body: 'Warehouse WH-01: Welding Electrodes (E7018) below reorder threshold.', timestamp: hoursAgo(10), read: false, archived: false, priority: 'high', status: 'open', icon: 'warehouse', actionUrl: '/warehouse' },
  { id: 'n10', category: 'Approvals', title: 'Purchase Request rejected', body: 'PR #PR-1187 was rejected by Procurement — missing budget code.', timestamp: hoursAgo(14), read: true, archived: false, priority: 'normal', status: 'resolved', icon: 'cancel' },
  { id: 'n11', category: 'System Alerts', title: 'Contract expiring', body: "Supply contract with 'Nordic Valve Systems' expires in 30 days.", timestamp: hoursAgo(20), read: true, archived: false, priority: 'normal', status: 'open', icon: 'description' },
  { id: 'n12', category: 'Announcements', title: 'Document revision released', body: "Drawing 'P&ID-1042' revision C released for construction.", timestamp: hoursAgo(26), read: true, archived: false, priority: 'low', status: 'resolved', icon: 'library_books' },
  { id: 'n13', category: 'Projects', title: 'Milestone completed', body: "Project 'Refinery Expansion Phase 1' reached milestone: Foundation Complete.", timestamp: hoursAgo(30), read: true, archived: false, priority: 'normal', status: 'resolved', icon: 'flag', actionUrl: '/projects' },
  { id: 'n14', category: 'Mentions', title: 'You were mentioned', body: "Ahmed R. mentioned you in a comment on RFQ-0574.", timestamp: hoursAgo(36), read: false, archived: false, priority: 'normal', status: 'open', icon: 'alternate_email' },
  { id: 'n15', category: 'Announcements', title: 'Scheduled maintenance', body: 'Platform maintenance window Saturday 11 PM – 1 AM. Brief downtime expected.', timestamp: hoursAgo(48), read: true, archived: false, priority: 'low', status: 'open', icon: 'build' },
  { id: 'n16', category: 'Inbox', title: 'New email received', body: 'Weekly procurement summary from the Finance team is ready.', timestamp: hoursAgo(50), read: true, archived: true, priority: 'low', status: 'resolved', icon: 'mail' },
];
