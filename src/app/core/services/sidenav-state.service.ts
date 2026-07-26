import { Injectable, signal } from '@angular/core';

const COLLAPSED_KEY = 'pm_sidenav_collapsed';

@Injectable({ providedIn: 'root' })
export class SidenavStateService {
  readonly collapsed = signal<boolean>(localStorage.getItem(COLLAPSED_KEY) === 'true');
  readonly mobileOpen = signal<boolean>(false);

  toggleCollapsed(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  }

  toggleMobile(): void {
    this.mobileOpen.set(!this.mobileOpen());
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
