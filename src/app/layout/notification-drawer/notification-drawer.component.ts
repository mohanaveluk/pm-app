import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationCategory } from '../../models/notification.model';

@Component({
  selector: 'app-notification-drawer',
  imports: [
    CommonModule, RouterLink, MatIconModule, MatButtonModule, MatChipsModule,
    MatExpansionModule, MatFormFieldModule, MatInputModule, MatTooltipModule, MatDividerModule,
  ],
  templateUrl: './notification-drawer.component.html',
  styleUrl: './notification-drawer.component.scss',
})
export class NotificationDrawerComponent {
  protected readonly notificationService = inject(NotificationService);

  onSearchInput(event: Event): void {
    this.notificationService.setSearchTerm((event.target as HTMLInputElement).value);
  }

  selectCategory(category: NotificationCategory | null): void {
    this.notificationService.setCategoryFilter(category);
  }

  close(): void {
    this.notificationService.closePanel();
  }

  prevPage(): void {
    this.notificationService.setPage(this.notificationService.pageIndex() - 1);
  }

  nextPage(): void {
    this.notificationService.setPage(this.notificationService.pageIndex() + 1);
  }
}
