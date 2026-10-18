import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { NotificationService } from './notification.service';
import { AuthService } from '../../services';
import { AppNotification } from '../../models/notification.model';

const base = 'http://localhost:3000/api/v1/notifications';

const note = (id: string, extra: Partial<AppNotification> = {}): AppNotification => ({
  id, category: 'EMAIL', type: 'REVIEW_MATERIAL_REQUISITION', title: 'Review Material Requisition',
  message: 'Review requested: MR-0002', severity: 'info', link: '/material-requisitions/mr-2',
  sourceType: 'EMAIL_HISTORY', referenceType: 'MATERIAL_REQUISITION', referenceId: 'mr-2', trackingId: null,
  actorName: null, metadata: null, occurredAt: '2026-10-18T10:00:00Z', isRead: false, readAt: null,
  isArchived: false, ...extra,
});

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      // Signed out: no polling, so each test controls every request.
      { provide: AuthService, useValue: { authenticated: signal(false) } },
    ],
  });
  return { service: TestBed.inject(NotificationService), http: TestBed.inject(HttpTestingController) };
}

describe('NotificationService', () => {
  it('lists with the filters as query parameters and takes the unread count from the answer', () => {
    const { service, http } = setup();
    let items: AppNotification[] = [];
    service.list({ page: 2, limit: 10, unreadOnly: true, category: 'WORKFLOW', search: ' MR ' })
      .subscribe((p) => (items = p.items));

    const req = http.expectOne((r) => r.url === base);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('unreadOnly')).toBe('true');
    expect(req.request.params.get('category')).toBe('WORKFLOW');
    expect(req.request.params.get('search')).toBe('MR');
    expect(req.request.params.has('archived')).toBe(false);
    req.flush({ status: true, message: '', data: { items: [note('1')], total: 1, page: 2, limit: 10, totalPages: 1, unreadCount: 4 } });

    expect(items.map((n) => n.id)).toEqual(['1']);
    expect(service.unreadCount()).toBe(4);
  });

  it('lowers the badge when one is read and clears it on mark all read', () => {
    const { service, http } = setup();
    service.unreadCount.set(3);

    service.markRead(note('1')).subscribe();
    http.expectOne(`${base}/1/read`).flush({ status: true, message: '', data: note('1', { isRead: true }) });
    expect(service.unreadCount()).toBe(2);

    service.markAllRead().subscribe();
    const req = http.expectOne(`${base}/read-all`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ status: true, message: '', data: { updated: 2 } });
    expect(service.unreadCount()).toBe(0);
  });

  it('does not lower the badge for one that was already read', () => {
    const { service, http } = setup();
    service.unreadCount.set(1);
    service.markRead(note('1', { isRead: true })).subscribe();
    http.expectOne(`${base}/1/read`).flush({ status: true, message: '', data: note('1', { isRead: true }) });
    expect(service.unreadCount()).toBe(1);
  });

  it('loads the panel when it opens', () => {
    const { service, http } = setup();
    service.togglePanel();
    expect(service.panelOpen()).toBe(true);
    http.expectOne((r) => r.url === base && r.params.get('limit') === '10')
      .flush({ status: true, message: '', data: { items: [note('9')], total: 1, page: 1, limit: 10, totalPages: 1, unreadCount: 1 } });
    expect(service.recent().map((n) => n.id)).toEqual(['9']);
  });
});
