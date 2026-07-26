export type NotificationCategory =
  | 'Inbox'
  | 'Approvals'
  | 'Workflow'
  | 'Purchase Orders'
  | 'RFQs'
  | 'Projects'
  | 'System Alerts'
  | 'Mentions'
  | 'Announcements';

export type NotificationPriority = 'low' | 'normal' | 'high';
export type NotificationStatus = 'open' | 'resolved' | 'expired';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  archived: boolean;
  priority: NotificationPriority;
  status: NotificationStatus;
  icon: string;
  actionUrl?: string;
}
