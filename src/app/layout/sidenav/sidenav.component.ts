import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OverlayModule } from '@angular/cdk/overlay';
import { ConnectionPositionPair } from '@angular/cdk/overlay';
import { NavigationService } from '../../core/navigation/navigation.service';
import { SidenavStateService } from '../../core/services/sidenav-state.service';
import { MenuItem } from '../../core/navigation/menu-item.model';
import { MenuTreeComponent } from './menu-tree.component';

const FLYOUT_CLOSE_DELAY_MS = 200;

@Component({
  selector: 'app-sidenav',
  imports: [
    CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule,
    MatTooltipModule, OverlayModule, MenuTreeComponent,
  ],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss',
})
export class SidenavComponent {
  private readonly navigationService = inject(NavigationService);
  private readonly sidenavState = inject(SidenavStateService);

  readonly collapsed = this.sidenavState.collapsed;
  readonly menu = this.navigationService.menu;
  readonly favorites = this.navigationService.favorites;
  readonly recentlyVisited = this.navigationService.recentlyVisited;

  readonly searchTerm = signal('');
  readonly filteredResults = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return [];
    return this.navigationService
      .flatMenu()
      .filter((item) => !!item.route && item.label.toLowerCase().includes(term));
  });

  readonly flyoutPositions: ConnectionPositionPair[] = [
    { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 4 },
  ];

  private readonly openFlyoutId = signal<string | null>(null);
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  isFlyoutOpen(id: string): boolean {
    return this.openFlyoutId() === id;
  }

  openFlyout(id: string): void {
    this.cancelClose();
    this.openFlyoutId.set(id);
  }

  scheduleClose(): void {
    this.cancelClose();
    this.closeTimer = setTimeout(() => this.openFlyoutId.set(null), FLYOUT_CLOSE_DELAY_MS);
  }

  cancelClose(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  closeFlyout(): void {
    this.openFlyoutId.set(null);
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  toggleFavorite(item: MenuItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.navigationService.toggleFavorite(item.id);
  }

  isFavorite(item: MenuItem): boolean {
    return this.navigationService.isFavorite(item.id);
  }
}
