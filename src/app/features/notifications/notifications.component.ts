import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from '../../core/services/notification.service';
import {
  AppNotification, NOTIFICATION_CATEGORY_OPTIONS, NotificationCategory,
} from '../../models/notification.model';
import {
  NotificationCardComponent, NotificationRemoval,
} from './notification-card/notification-card.component';

type Tab = 'all' | 'unread' | 'archived';

interface DayGroup {
  label: string;
  items: AppNotification[];
}

const PAGE_SIZE = 20;

const REMOVAL_MESSAGES: Record<NotificationRemoval, string> = {
  archived: 'Notification archived',
  restored: 'Notification restored',
  deleted: 'Notification deleted',
};

/**
 * Every notification of the signed-in user — emails they were sent (with the
 * email itself), workflow steps on documents they are involved in, vendor
 * changes — newest first, grouped by day. Opening one marks it read.
 *
 * Route: /notifications (?id=<notification> opens that one).
 */
@Component({
  selector: 'app-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatChipsModule, MatFormFieldModule, MatInputModule,
    MatTooltipModule, MatProgressSpinnerModule, NotificationCardComponent,
  ],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent implements OnInit {
  protected readonly service = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categories = NOTIFICATION_CATEGORY_OPTIONS;

  protected readonly tab = signal<Tab>('all');
  protected readonly category = signal<NotificationCategory | null>(null);
  protected readonly search = signal('');

  protected readonly items = signal<AppNotification[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly expandedId = signal<string | null>(null);

  protected readonly hasMore = computed(() => this.items().length < this.total());

  /** Today, Yesterday, then one group per day. */
  protected readonly groups = computed<DayGroup[]>(() => {
    const today = new Date();
    const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const groups: DayGroup[] = [];
    for (const n of this.items()) {
      const d = new Date(n.occurredAt);
      const label = key(d) === key(today) ? 'Today'
        : key(d) === key(yesterday) ? 'Yesterday'
        : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      const last = groups[groups.length - 1];
      if (last?.label === label) last.items.push(n);
      else groups.push({ label, items: [n] });
    }
    return groups;
  });

  private readonly search$ = new Subject<string>();
  /** The notification asked for in ?id=, opened once the list is in. */
  private focusId: string | null = null;

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload());

    // ?id= also changes while on the page (opening another from the bell).
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.focusId = params.get('id');
      if (this.focusId && !this.loading()) this.focus(this.focusId);
    });

    this.reload();
  }

  // ── Loading ──────────────────────────────────────────────────────

  protected reload(): void {
    this.page.set(1);
    this.loading.set(true);
    this.error.set(null);
    this.fetch(1, (page) => {
      this.items.set(page.items);
      this.loading.set(false);
      if (this.focusId) this.focus(this.focusId);
    });
  }

  protected loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) return;
    const next = this.page() + 1;
    this.loadingMore.set(true);
    this.fetch(next, (page) => {
      const seen = new Set(this.items().map((n) => n.id));
      this.items.update((list) => [...list, ...page.items.filter((n) => !seen.has(n.id))]);
      this.page.set(next);
      this.loadingMore.set(false);
    });
  }

  private fetch(page: number, done: (p: { items: AppNotification[]; total: number }) => void): void {
    const tab = this.tab();
    this.service.list({
      page,
      limit: PAGE_SIZE,
      unreadOnly: tab === 'unread' || undefined,
      archived: tab === 'archived' || undefined,
      category: this.category(),
      search: this.search(),
    }).subscribe({
      next: (res) => {
        this.total.set(res.total);
        done(res);
      },
      error: () => {
        this.error.set('Unable to load your notifications. Please try again.');
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  // ── Filters ──────────────────────────────────────────────────────

  protected setTab(tab: Tab): void {
    if (this.tab() === tab) return;
    this.tab.set(tab);
    this.expandedId.set(null);
    this.reload();
  }

  protected setCategory(category: NotificationCategory | null): void {
    this.category.set(category);
    this.expandedId.set(null);
    this.reload();
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    this.search$.next(value);
  }

  protected clearSearch(): void {
    this.search.set('');
    this.search$.next('');
  }

  // ── Opening ──────────────────────────────────────────────────────

  protected toggle(n: AppNotification): void {
    this.expandedId.set(this.expandedId() === n.id ? null : n.id);
  }

  /** Opens the notification from ?id=, fetching it if it is not on the first page. */
  private focus(id: string): void {
    this.focusId = null;
    const inList = this.items().find((n) => n.id === id);
    if (inList) {
      this.open(inList);
      return;
    }
    this.service.detail(id).subscribe({
      next: (d) => {
        this.items.update((list) => [d, ...list]);
        this.open(d);
      },
      error: () => this.snack.open('That notification is no longer available.', 'OK', { duration: 3000 }),
    });
  }

  /** Expands one as if clicked: marked read, its email fetched, scrolled into view. */
  private open(n: AppNotification): void {
    this.expandedId.set(n.id);
    if (!n.isRead) {
      this.afterChange({ ...n, isRead: true });
      this.service.markRead(n).subscribe({ next: (u) => this.afterChange(u) });
    }
    if (n.sourceType === 'EMAIL_HISTORY') this.service.ensureDetail(n.id);
    setTimeout(() => document.getElementById(`notif-${n.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  // ── Actions ──────────────────────────────────────────────────────

  protected markAllRead(): void {
    this.service.markAllRead().subscribe({
      next: () => {
        if (this.tab() === 'unread') this.reload();
        else this.items.update((list) => list.map((x) => ({ ...x, isRead: true })));
      },
    });
  }

  protected afterChange(updated: AppNotification): void {
    // In "Unread", one marked read stays until the list reloads, so it can still be read.
    this.items.update((list) => list.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
  }

  protected onRemoved(event: { notification: AppNotification; reason: NotificationRemoval }): void {
    const n = event.notification;
    this.items.update((list) => list.filter((x) => x.id !== n.id));
    this.total.update((t) => Math.max(0, t - 1));
    if (this.expandedId() === n.id) this.expandedId.set(null);
    this.snack.open(REMOVAL_MESSAGES[event.reason], 'OK', { duration: 2500 });
  }
}
