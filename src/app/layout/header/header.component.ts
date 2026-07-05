import { Component, ChangeDetectionStrategy, signal, HostListener, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
//import { MaterialModule } from '../../shared/modules/material.module';
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
  private readonly router = inject(Router);
  readonly scrolled = signal(false);
  readonly menuOpen = signal(false);

  readonly navLinks = [
    { label: 'Home',       path: '/home' },
    { label: 'Features',   path: '/features' },
    { label: 'Pricing',    path: '/pricing' },
    { label: 'About Us',   path: '/about-us' },
    { label: 'Contact Us', path: '/contact' },
  ];

  readonly currentUser = computed(() => {
    const stored = localStorage.getItem('pm_user');
    if (!stored) return null;
    try { return JSON.parse(stored); } catch { return null; }
  });

  readonly isAuthenticated = computed(() => !!this.currentUser());

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 20); }

  logout(): void {
    // localStorage.removeItem('pm_token');
    // localStorage.removeItem('pm_user');
    // localStorage.removeItem('refresh_token');
    // this.router.navigate(['/home']);
    this.auth.logout();
    this.menuOpen.set(false);
  }

  get dashboardRoute(): string {
    const role = this.currentUser()?.role;
    if (role === 'OrganizationAdmin' || role === 'SuperAdmin') return '/admin/dashboard';
    if (role === 'Manager') return '/manager/dashboard';
    return '/dashboard';
  }
}
