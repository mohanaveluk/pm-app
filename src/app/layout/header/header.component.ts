import { Component, ChangeDetectionStrategy, signal, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
  readonly scrolled = signal(false);
  readonly menuOpen = signal(false);

  readonly navLinks = [
    { label: 'Home',       path: '/home' },
    { label: 'Features',   path: '/features' },
    { label: 'Pricing',    path: '/pricing' },
    { label: 'About Us',   path: '/about-us' },
    { label: 'Contact Us', path: '/contact' },
  ];

  readonly currentUser = this.auth.user;
  readonly isAuthenticated = this.auth.authenticated;

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 20); }

  logout(): void {
    this.auth.logout();
    this.menuOpen.set(false);
  }

  get dashboardRoute(): string {
    const role = this.currentUser()?.role;
    if (role === 'OrganizationAdmin' || role === 'SuperAdmin') return '/admin/dashboard';
    if (role && role !== 'User') return '/manager/dashboard';
    return '/dashboard';
  }
}
