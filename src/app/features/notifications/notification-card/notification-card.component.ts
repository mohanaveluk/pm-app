import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '../../../core/services/notification.service';
import {
  AppNotification, NOTIFICATION_CATEGORY_OPTIONS, notificationVisual,
} from '../../../models/notification.model';
import { EmailFrameComponent } from '../email-frame/email-frame.component';

export type NotificationRemoval = 'archived' | 'restored' | 'deleted';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', UNDER_REVIEW: 'Under Review', REVIEWED: 'Reviewed', APPROVED: 'Approved',
  RETURNED: 'Returned', REJECTED: 'Rejected', CANCELLED: 'Cancelled', ON_HOLD: 'On Hold',
  DISABLED: 'Disabled', OBSOLETE: 'Obsolete',
};

/**
 * One notification, collapsed to its title or expanded to its full content —
 * the email as it was sent, or the workflow step's status and comments — with
 * its actions. Used by the bell's panel (compact) and the notifications page.
 *
 * Opening it marks it read and, for an email, fetches the email once.
 */
@Component({
  selector: 'app-notification-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, EmailFrameComponent],
  templateUrl: './notification-card.component.html',
  styleUrl: './notification-card.component.scss',
})
export class NotificationCardComponent {
  protected readonly service = inject(NotificationService);
  private readonly router = inject(Router);

  readonly notification = input.required<AppNotification>();
  readonly expanded = input(false);
  /** The panel's tighter layout. */
  readonly compact = input(false);
  /** Shows the "open in full view" icon (the panel). */
  readonly showFullView = input(false);

  /** Asks the parent to open or close this card. */
  readonly toggled = output<void>();
  /** Read / unread changed. */
  readonly changed = output<AppNotification>();
  /** Left the current list. */
  readonly removed = output<{ notification: AppNotification; reason: NotificationRemoval }>();
  /** "Full view" was chosen. */
  readonly fullView = output<AppNotification>();
  /** Went to the related record (the panel closes itself). */
  readonly navigated = output<void>();

  protected readonly visual = computed(() => notificationVisual(this.notification()));
  protected readonly isEmail = computed(() => this.notification().sourceType === 'EMAIL_HISTORY');
  /** Labelled facts about the document (metadata.details), e.g. a requisition's project. */
  protected readonly details = computed<Array<{ label: string; value: string }>>(() => {
    const list = this.notification().metadata?.['details'];
    return Array.isArray(list)
      ? list.filter((d) => d && typeof d.label === 'string' && d.value != null && d.value !== '')
          .map((d) => ({ label: d.label, value: String(d.value) }))
      : [];
  });
  protected readonly detail = computed(() => this.service.details()[this.notification().id] ?? null);
  protected readonly detailLoading = computed(() => this.service.detailLoading().has(this.notification().id));
  protected readonly detailError = computed(() => this.service.detailErrors()[this.notification().id] ?? null);
  protected readonly categoryLabel = computed(
    () => NOTIFICATION_CATEGORY_OPTIONS.find((o) => o.value === this.notification().category)?.label
      ?? this.notification().category,
  );

  protected onToggle(): void {
    const n = this.notification();
    if (!this.expanded()) {
      if (!n.isRead) this.markRead(n);
      if (this.isEmail()) this.service.ensureDetail(n.id);
    }
    this.toggled.emit();
  }

  private markRead(n: AppNotification): void {
    this.changed.emit({ ...n, isRead: true });
    this.service.markRead(n).subscribe({
      next: (u) => this.changed.emit(u),
      error: () => this.changed.emit(n),
    });
  }

  protected markUnread(): void {
    this.service.markUnread(this.notification()).subscribe({ next: (u) => this.changed.emit(u) });
  }

  protected archive(): void {
    const n = this.notification();
    this.service.archive(n).subscribe({ next: () => this.removed.emit({ notification: n, reason: 'archived' }) });
  }

  protected unarchive(): void {
    const n = this.notification();
    this.service.unarchive(n).subscribe({ next: () => this.removed.emit({ notification: n, reason: 'restored' }) });
  }

  protected remove(): void {
    const n = this.notification();
    this.service.remove(n).subscribe({ next: () => this.removed.emit({ notification: n, reason: 'deleted' }) });
  }

  protected openFull(event: Event): void {
    event.stopPropagation();
    this.fullView.emit(this.notification());
  }

  protected openRecord(): void {
    const link = this.notification().link;
    if (!link) return;
    this.navigated.emit();
    void this.router.navigateByUrl(link);
  }

  protected retry(): void {
    this.service.ensureDetail(this.notification().id, true);
  }

  protected status(code: unknown): string {
    return typeof code === 'string' ? STATUS_LABELS[code] ?? code : '';
  }
}
