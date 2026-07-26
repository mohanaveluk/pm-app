import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../services';
import { OrganizationService } from '../../services/organization.service';
import { NavigationService } from '../../core/navigation/navigation.service';
import { SidenavStateService } from '../../core/services/sidenav-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { buildProfileMenuItems } from './profile-menu.config';

@Component({
  selector: 'app-admin-header',
  imports: [
    CommonModule, RouterLink, MatToolbarModule, MatIconModule, MatButtonModule,
    MatMenuModule, MatDividerModule, MatTooltipModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule,
    MatBadgeModule,
  ],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.scss',
})
export class AdminHeaderComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly orgService = inject(OrganizationService);
  private readonly navigationService = inject(NavigationService);
  private readonly sidenavState = inject(SidenavStateService);
  private readonly snack = inject(MatSnackBar);
  protected readonly notificationService = inject(NotificationService);
  protected readonly themeService = inject(ThemeService);

  readonly user = this.auth.user;

  readonly themeIcon = computed(() => {
    switch (this.themeService.mode()) {
      case 'light': return 'light_mode';
      case 'dark': return 'dark_mode';
      default: return 'brightness_auto';
    }
  });

  readonly themeLabel = computed(() => {
    const mode = this.themeService.mode();
    return `Theme: ${mode[0].toUpperCase()}${mode.slice(1)} (click to change)`;
  });
  readonly collapsed = this.sidenavState.collapsed;
  readonly organizationName = signal('');
  readonly now = signal(new Date());

  readonly searchTerm = signal('');
  readonly searchResults = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return [];
    return this.navigationService
      .flatMenu()
      .filter((item) => !!item.route && item.label.toLowerCase().includes(term))
      .slice(0, 8);
  });

  readonly profileMenuItems = computed(() => buildProfileMenuItems(this.auth.role()));

  ngOnInit(): void {
    setInterval(() => this.now.set(new Date()), 1000 * 30);

    this.orgService.getProfile().subscribe({
      next: (org) => this.organizationName.set(org?.organizationName ?? ''),
      error: () => this.organizationName.set(''),
    });
  }

  toggleSidenav(): void {
    this.sidenavState.toggleCollapsed();
  }

  toggleMobileSidenav(): void {
    this.sidenavState.toggleMobile();
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  showComingSoon(feature: string): void {
    this.snack.open(`${feature} is coming soon.`, 'Dismiss', { duration: 2500 });
  }

  logout(): void {
    this.auth.logout();
  }
}
