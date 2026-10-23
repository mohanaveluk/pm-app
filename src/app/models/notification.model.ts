/**
 * In-app notifications. Mirrors NotificationResponseDto / NotificationDetailDto
 * (pm-api/src/modules/notification/dto/notification.dto.ts).
 *
 * A notification is created for each concerned user when something happens:
 * an email is sent to them (EMAIL), a step is taken on a document they are
 * involved in (WORKFLOW — requisition, RFQ, purchase order), or a vendor they
 * raised changes (VENDOR).
 */

export type NotificationCategory = 'EMAIL' | 'WORKFLOW' | 'VENDOR' | 'SYSTEM';
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  /** EmailType for emails (REVIEW_MATERIAL_REQUISITION …), the action for workflow steps. */
  type: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  /** Where "Open" goes in the application. */
  link: string | null;
  sourceType: 'EMAIL_HISTORY' | 'EMAIL_WORKFLOW' | 'WORKFLOW_EVENT' | 'VENDOR' | string;
  referenceType: string | null;
  referenceId: string | null;
  trackingId: string | null;
  actorName: string | null;
  metadata: Record<string, any> | null;
  /** When it happened (ISO). */
  occurredAt: string;
  isRead: boolean;
  readAt: string | null;
  isArchived: boolean;
}

/** One notification with what it points at — the email's content for an email. */
export interface AppNotificationDetail extends AppNotification {
  emailHtml: string | null;
  emailSubject: string | null;
  emailFrom: string | null;
  emailTo: string | null;
  emailCc: string | null;
  emailStatus: string | null;
}

export interface NotificationPage {
  items: AppNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface NotificationQuery {
  page: number;
  limit: number;
  unreadOnly?: boolean;
  archived?: boolean;
  category?: NotificationCategory | null;
  search?: string;
}

export const NOTIFICATION_CATEGORY_OPTIONS: readonly { value: NotificationCategory; label: string; icon: string }[] = [
  { value: 'EMAIL', label: 'Emails', icon: 'mail' },
  { value: 'WORKFLOW', label: 'Workflow', icon: 'account_tree' },
  { value: 'VENDOR', label: 'Vendors', icon: 'storefront' },
  { value: 'SYSTEM', label: 'System', icon: 'info' },
];

export interface NotificationVisual {
  icon: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

/** The icon and colour a notification is shown with, from its type. */
export function notificationVisual(n: Pick<AppNotification, 'type' | 'category' | 'severity'>): NotificationVisual {
  const t = n.type ?? '';
  const tone: NotificationVisual['tone'] =
    n.severity === 'success' ? 'success'
    : n.severity === 'warning' ? 'warning'
    : n.severity === 'error' ? 'danger'
    : 'primary';

  if (/UNASSIGNED/.test(t)) return { icon: 'person_remove', tone: 'warning' };
  if (/ASSIGNED/.test(t)) return { icon: 'person_add', tone: 'success' };
  if (/VERIF/.test(t)) return { icon: 'verified', tone: 'success' };
  if (/OTC|OTP|PASSWORD/.test(t)) return { icon: 'key', tone: 'neutral' };
  if (/^REVIEW_|SUBMITTED|RESUBMIT|EDITED_IN_REVIEW/.test(t)) return { icon: 'rate_review', tone: 'primary' };
  if (/APPROVAL_REQUEST|REQUESTED/.test(t)) return { icon: 'pending_actions', tone: 'primary' };
  if (/^APPROVE|APPROVED|REVIEWED|UNBLOCK|ENABLED/.test(t)) return { icon: 'task_alt', tone: 'success' };
  if (/RETURN/.test(t)) return { icon: 'undo', tone: 'warning' };
  if (/REJECT|CANCEL|BLOCK|DISABLED/.test(t)) return { icon: 'block', tone: 'danger' };
  if (/HOLD/.test(t)) return { icon: 'pause_circle', tone: 'warning' };
  if (/DELETED/.test(t)) return { icon: 'delete', tone: 'danger' };
  if (/LOCKED/.test(t)) return { icon: 'lock', tone: 'neutral' };
  if (/STATUS_CHANGED|UPDATED/.test(t)) return { icon: 'sync_alt', tone };
  if (/CONTACT/.test(t)) return { icon: 'forum', tone: 'neutral' };
  if (/ORGANIZATION/.test(t)) return { icon: 'apartment', tone: 'primary' };
  switch (n.category) {
    case 'EMAIL': return { icon: 'mail', tone };
    case 'WORKFLOW': return { icon: 'account_tree', tone };
    case 'VENDOR': return { icon: 'storefront', tone };
    default: return { icon: 'notifications', tone };
  }
}
