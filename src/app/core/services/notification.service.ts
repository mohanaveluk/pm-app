import { Injectable, computed, signal } from '@angular/core';
import { AppNotification, NotificationCategory } from '../../models/notification.model';
import { MOCK_NOTIFICATIONS } from '../../shared/mock-data/mock-notifications.data';

const PAGE_SIZE = 6;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notifications = signal<AppNotification[]>([...MOCK_NOTIFICATIONS]);

  readonly panelOpen = signal(false);
  readonly searchTerm = signal('');
  readonly categoryFilter = signal<NotificationCategory | null>(null);
  readonly showArchived = signal(false);
  readonly pageIndex = signal(0);

  readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.read && !n.archived).length,
  );

  readonly categories = computed<NotificationCategory[]>(() => {
    const set = new Set(this.notifications().map((n) => n.category));
    return Array.from(set);
  });

  private readonly filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.categoryFilter();
    const showArchived = this.showArchived();

    return this.notifications()
      .filter((n) => n.archived === showArchived)
      .filter((n) => !category || n.category === category)
      .filter((n) => !term || n.title.toLowerCase().includes(term) || n.body.toLowerCase().includes(term))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  readonly pagedNotifications = computed(() => {
    const start = this.pageIndex() * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  togglePanel(): void {
    this.panelOpen.set(!this.panelOpen());
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  setSearchTerm(term: string): void {
    this.searchTerm.set(term);
    this.pageIndex.set(0);
  }

  setCategoryFilter(category: NotificationCategory | null): void {
    this.categoryFilter.set(category);
    this.pageIndex.set(0);
  }

  setShowArchived(show: boolean): void {
    this.showArchived.set(show);
    this.pageIndex.set(0);
  }

  setPage(index: number): void {
    this.pageIndex.set(Math.max(0, Math.min(index, this.totalPages() - 1)));
  }

  markRead(id: string): void {
    this.update(id, { read: true });
  }

  markUnread(id: string): void {
    this.update(id, { read: false });
  }

  markAllRead(): void {
    this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
  }

  archive(id: string): void {
    this.update(id, { archived: true });
  }

  unarchive(id: string): void {
    this.update(id, { archived: false });
  }

  remove(id: string): void {
    this.notifications.update((list) => list.filter((n) => n.id !== id));
  }

  private update(id: string, changes: Partial<AppNotification>): void {
    this.notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, ...changes } : n)),
    );
  }
}
