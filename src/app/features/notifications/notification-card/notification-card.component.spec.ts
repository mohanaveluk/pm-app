import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NotificationCardComponent } from './notification-card.component';
import { NotificationService } from '../../../core/services/notification.service';
import { AppNotification } from '../../../models/notification.model';

const note = (extra: Partial<AppNotification> = {}): AppNotification => ({
  id: '7', category: 'WORKFLOW', type: 'REVIEWED', title: 'Material Requisition Reviewed',
  message: 'Material Requisition 0002 was reviewed by Arjun Rao', severity: 'success',
  link: '/material-requisitions/mr-2', sourceType: 'WORKFLOW_EVENT', referenceType: 'MR_REVIEW',
  referenceId: 'mr-2', trackingId: 'TRK-1', actorName: 'Arjun Rao',
  metadata: { fromStatus: 'UNDER_REVIEW', toStatus: 'REVIEWED', comments: 'Checked', round: 1 },
  occurredAt: '2026-10-18T10:00:00Z', isRead: false, readAt: null, isArchived: false, ...extra,
});

function setup(n: AppNotification, expanded = false) {
  const service = {
    details: signal<Record<string, any>>({}),
    detailLoading: signal(new Set<string>()),
    detailErrors: signal<Record<string, string>>({}),
    ensureDetail: vi.fn(),
    markRead: vi.fn(() => of({ ...n, isRead: true })),
    markUnread: vi.fn(() => of({ ...n, isRead: false })),
    archive: vi.fn(() => of({ ...n, isArchived: true })),
    unarchive: vi.fn(() => of(n)),
    remove: vi.fn(() => of(undefined)),
  };
  TestBed.configureTestingModule({
    imports: [NotificationCardComponent],
    providers: [provideRouter([]), provideNoopAnimations(), { provide: NotificationService, useValue: service }],
  });
  const fixture = TestBed.createComponent(NotificationCardComponent);
  fixture.componentRef.setInput('notification', n);
  fixture.componentRef.setInput('expanded', expanded);
  fixture.componentRef.setInput('compact', true);
  fixture.componentRef.setInput('showFullView', true);
  fixture.detectChanges();
  const cmp = fixture.componentInstance;
  const events = { toggled: 0, changed: [] as AppNotification[], removed: [] as string[], full: 0 };
  cmp.toggled.subscribe(() => events.toggled++);
  cmp.changed.subscribe((u) => events.changed.push(u));
  cmp.removed.subscribe((r) => events.removed.push(r.reason));
  cmp.fullView.subscribe(() => events.full++);
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) => [...el.querySelectorAll<HTMLButtonElement>('button')]
    .find((b) => b.textContent?.includes(text))!;
  return { fixture, el, service, events, button };
}

describe('NotificationCardComponent', () => {
  it('opening an unread one marks it read', () => {
    const t = setup(note());
    t.el.querySelector<HTMLButtonElement>('.nt-card__toggle')!.click();

    expect(t.events.toggled).toBe(1);
    expect(t.service.markRead).toHaveBeenCalled();
    expect(t.events.changed.at(-1)?.isRead).toBe(true);
  });

  it('opening an email fetches the email', () => {
    const t = setup(note({ sourceType: 'EMAIL_HISTORY', isRead: true }));
    t.el.querySelector<HTMLButtonElement>('.nt-card__toggle')!.click();
    expect(t.service.ensureDetail).toHaveBeenCalledWith('7');
    expect(t.service.markRead).not.toHaveBeenCalled();
  });

  it('shows a workflow step\'s status and comments when expanded', () => {
    const t = setup(note({ isRead: true }), true);
    expect(t.el.textContent).toContain('Under Review');
    expect(t.el.textContent).toContain('Reviewed');
    expect(t.el.textContent).toContain('Checked');
  });

  it('shows the project details of an email\'s in-app item, and that the email was not delivered', () => {
    const t = setup(note({
      isRead: true, sourceType: 'EMAIL_WORKFLOW', type: 'REVIEW_MATERIAL_REQUISITION',
      metadata: {
        emailStatus: 'FAILED', toStatus: 'UNDER_REVIEW',
        details: [{ label: 'Project', value: 'PRJ-01 — Tower A' }, { label: 'Project description', value: 'Block A' }],
      },
    }), true);
    expect(t.el.textContent).toContain('PRJ-01 — Tower A');
    expect(t.el.textContent).toContain('Block A');
    expect(t.el.textContent).toContain('could not be delivered');
    expect(t.service.ensureDetail).not.toHaveBeenCalled();
  });

  it('archives and deletes from the card', () => {
    const t = setup(note({ isRead: true }), true);
    t.button('Archive').click();
    t.button('Delete').click();
    expect(t.events.removed).toEqual(['archived', 'deleted']);
  });

  it('asks for the full view from its icon without toggling', () => {
    const t = setup(note());
    t.el.querySelector<HTMLButtonElement>('.nt-card__full')!.click();
    expect(t.events.full).toBe(1);
    expect(t.events.toggled).toBe(0);
  });
});
