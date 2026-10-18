import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subscription, map, tap, timer, switchMap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services';
import {
  AppNotification, AppNotificationDetail, NotificationCategory, NotificationPage, NotificationQuery,
} from '../../models/notification.model';

interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

/** How often the bell badge is refreshed while signed in. */
const POLL_MS = 60_000;
const RECENT_LIMIT = 10;

/**
 * The signed-in user's notifications: the bell badge, the recent list in the
 * side panel, and the HTTP calls the notifications page uses.
 *
 * The API returns only the caller's own notifications; nothing here filters by
 * user.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/v1/notifications`;

  readonly panelOpen = signal(false);
  readonly unreadCount = signal(0);

  // ── Side panel ───────────────────────────────────────────────────
  readonly recent = signal<AppNotification[]>([]);
  readonly recentLoading = signal(false);
  readonly recentError = signal<string | null>(null);
  readonly recentUnreadOnly = signal(false);
  readonly recentCategory = signal<NotificationCategory | null>(null);
  readonly recentSearch = signal('');
  /** More than the panel shows match the current filters. */
  readonly recentTotal = signal(0);

  // ── Opened notifications (shared by the panel and the page) ─────
  /** Notifications already fetched with their email content, by id. */
  readonly details = signal<Record<string, AppNotificationDetail>>({});
  readonly detailLoading = signal<ReadonlySet<string>>(new Set());
  readonly detailErrors = signal<Record<string, string>>({});

  private polling: Subscription | null = null;

  constructor() {
    // Poll the badge only while someone is signed in.
    effect(() => {
      if (this.auth.authenticated()) this.startPolling();
      else this.stopPolling();
    });
    inject(DestroyRef).onDestroy(() => this.stopPolling());
  }

  // ── Panel ────────────────────────────────────────────────────────

  togglePanel(): void {
    const open = !this.panelOpen();
    this.panelOpen.set(open);
    if (open) this.loadRecent();
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  setRecentUnreadOnly(value: boolean): void {
    this.recentUnreadOnly.set(value);
    this.loadRecent();
  }

  setRecentCategory(category: NotificationCategory | null): void {
    this.recentCategory.set(category);
    this.loadRecent();
  }

  setRecentSearch(term: string): void {
    this.recentSearch.set(term);
    this.loadRecent();
  }

  /** Takes one out of the panel's list (archived or deleted elsewhere). */
  dropRecent(id: string): void {
    this.recent.update((list) => list.filter((x) => x.id !== id));
    this.recentTotal.update((t) => Math.max(0, t - 1));
  }

  /** Puts an updated notification in the panel's list, if it is there. */
  updateRecent(updated: AppNotification): void {
    this.recent.update((list) => list.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
  }

  loadRecent(): void {
    this.recentLoading.set(true);
    this.recentError.set(null);
    this.list({
      page: 1,
      limit: RECENT_LIMIT,
      unreadOnly: this.recentUnreadOnly() || undefined,
      category: this.recentCategory(),
      search: this.recentSearch(),
    }).subscribe({
      next: (page) => {
        this.recent.set(page.items);
        this.recentTotal.set(page.total);
        this.recentLoading.set(false);
      },
      error: () => {
        this.recentError.set('Unable to load notifications.');
        this.recentLoading.set(false);
      },
    });
  }

  // ── API ──────────────────────────────────────────────────────────

  list(query: NotificationQuery): Observable<NotificationPage> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);
    if (query.unreadOnly) params = params.set('unreadOnly', true);
    if (query.archived) params = params.set('archived', true);
    if (query.category) params = params.set('category', query.category);
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    return this.http.get<ApiEnvelope<NotificationPage>>(this.baseUrl, { params }).pipe(
      map((res) => res.data),
      tap((page) => this.unreadCount.set(page.unreadCount)),
    );
  }

  detail(id: string): Observable<AppNotificationDetail> {
    return this.http.get<ApiEnvelope<AppNotificationDetail>>(`${this.baseUrl}/${id}`).pipe(
      map((res) => res.data),
      tap((d) => this.details.update((m) => ({ ...m, [d.id]: d }))),
    );
  }

  /** Fetches a notification's content once; later calls reuse it. */
  ensureDetail(id: string, force = false): void {
    if (!force && (this.details()[id] || this.detailLoading().has(id))) return;
    this.detailLoading.update((s) => new Set(s).add(id));
    this.detailErrors.update(({ [id]: _drop, ...rest }) => rest);
    this.detail(id).subscribe({
      next: () => this.detailLoading.update((s) => { const n = new Set(s); n.delete(id); return n; }),
      error: () => {
        this.detailLoading.update((s) => { const n = new Set(s); n.delete(id); return n; });
        this.detailErrors.update((m) => ({ ...m, [id]: 'Unable to load the content.' }));
      },
    });
  }

  markRead(n: AppNotification): Observable<AppNotification> {
    return this.patch(n, 'read').pipe(tap(() => { if (!n.isRead && !n.isArchived) this.adjustUnread(-1); }));
  }

  markUnread(n: AppNotification): Observable<AppNotification> {
    return this.patch(n, 'unread').pipe(tap(() => { if (n.isRead && !n.isArchived) this.adjustUnread(1); }));
  }

  archive(n: AppNotification): Observable<AppNotification> {
    return this.patch(n, 'archive').pipe(tap(() => {
      if (!n.isRead) this.adjustUnread(-1);
      this.dropRecent(n.id);
    }));
  }

  unarchive(n: AppNotification): Observable<AppNotification> {
    return this.patch(n, 'unarchive').pipe(tap(() => { if (!n.isRead) this.adjustUnread(1); }));
  }

  remove(n: AppNotification): Observable<void> {
    return this.http.delete<ApiEnvelope<null>>(`${this.baseUrl}/${n.id}`).pipe(
      tap(() => {
        if (!n.isRead && !n.isArchived) this.adjustUnread(-1);
        this.dropRecent(n.id);
      }),
      map(() => undefined),
    );
  }

  markAllRead(): Observable<number> {
    return this.http.patch<ApiEnvelope<{ updated: number }>>(`${this.baseUrl}/read-all`, {}).pipe(
      map((res) => res.data.updated),
      tap(() => {
        this.unreadCount.set(0);
        this.recent.update((list) => list.map((x) => ({ ...x, isRead: true })));
      }),
    );
  }

  refreshUnreadCount(): void {
    this.fetchUnread().subscribe();
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private patch(n: AppNotification, action: 'read' | 'unread' | 'archive' | 'unarchive'): Observable<AppNotification> {
    return this.http.patch<ApiEnvelope<AppNotification>>(`${this.baseUrl}/${n.id}/${action}`, {}).pipe(
      map((res) => res.data),
      tap((updated) => this.updateRecent(updated)),
    );
  }

  private adjustUnread(delta: number): void {
    this.unreadCount.update((c) => Math.max(0, c + delta));
  }

  private fetchUnread(): Observable<number> {
    return this.http.get<ApiEnvelope<{ unread: number }>>(`${this.baseUrl}/unread-count`).pipe(
      map((res) => res.data.unread),
      tap((count) => this.unreadCount.set(count)),
      catchError(() => of(this.unreadCount())),
    );
  }

  private startPolling(): void {
    if (this.polling) return;
    this.polling = timer(0, POLL_MS).pipe(switchMap(() => this.fetchUnread())).subscribe();
  }

  private stopPolling(): void {
    this.polling?.unsubscribe();
    this.polling = null;
    this.unreadCount.set(0);
    this.recent.set([]);
    this.details.set({});
    this.panelOpen.set(false);
  }
}
