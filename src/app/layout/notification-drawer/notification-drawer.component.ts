import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from '../../core/services/notification.service';
import {
  AppNotification, NOTIFICATION_CATEGORY_OPTIONS, NotificationCategory,
} from '../../models/notification.model';
import {
  NotificationCardComponent, NotificationRemoval,
} from '../../features/notifications/notification-card/notification-card.component';

const REMOVAL_MESSAGES: Record<NotificationRemoval, string> = {
  archived: 'Notification archived',
  restored: 'Notification restored',
  deleted: 'Notification deleted',
};

/**
 * The bell's side panel. Each notification opens in place — the email as it
 * was sent, or the workflow step's details — with Archive, Delete and an icon
 * to open it on the full notifications page.
 */
@Component({
  selector: 'app-notification-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatIconModule, MatButtonModule, MatChipsModule, MatFormFieldModule, MatInputModule,
    MatTooltipModule, MatDividerModule, MatProgressSpinnerModule, NotificationCardComponent,
  ],
  templateUrl: './notification-drawer.component.html',
  styleUrl: './notification-drawer.component.scss',
})
export class NotificationDrawerComponent {
  protected readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  protected readonly categories = NOTIFICATION_CATEGORY_OPTIONS;
  protected readonly expandedId = signal<string | null>(null);
  protected readonly searchTerm = signal(this.notificationService.recentSearch());

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((term) => {
        this.expandedId.set(null);
        this.notificationService.setRecentSearch(term);
      });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.search$.next(value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.search$.next('');
  }

  selectCategory(category: NotificationCategory | null): void {
    this.expandedId.set(null);
    this.notificationService.setRecentCategory(category);
  }

  setUnreadOnly(value: boolean): void {
    this.expandedId.set(null);
    this.notificationService.setRecentUnreadOnly(value);
  }

  toggle(n: AppNotification): void {
    this.expandedId.set(this.expandedId() === n.id ? null : n.id);
  }

  /** The card marks read optimistically; the panel's list follows. */
  changed(updated: AppNotification): void {
    this.notificationService.updateRecent(updated);
  }

  removed(event: { notification: AppNotification; reason: NotificationRemoval }): void {
    this.notificationService.dropRecent(event.notification.id);
    if (this.expandedId() === event.notification.id) this.expandedId.set(null);
    this.snack.open(REMOVAL_MESSAGES[event.reason], 'OK', { duration: 2500 });
  }

  close(): void {
    this.notificationService.closePanel();
  }

  /** Opens one notification on the full page, already expanded. */
  openFull(n: AppNotification): void {
    this.close();
    void this.router.navigate(['/notifications'], { queryParams: { id: n.id } });
  }

  openAll(): void {
    this.close();
    void this.router.navigate(['/notifications']);
  }

  markAllRead(): void {
    this.notificationService.markAllRead().subscribe();
  }
}
