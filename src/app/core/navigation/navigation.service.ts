import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd } from '@angular/router';
import { filter, switchMap } from 'rxjs/operators';
import { AuthService } from '../../services';
import { PermissionService } from '../rbac/permission.service';
import { MENU_DATA_SOURCE } from './menu-data-source';
import { MenuItem } from './menu-item.model';

const FAVORITES_KEY = 'pm_menu_favorites';
const RECENTS_KEY = 'pm_menu_recents';
const MAX_RECENTS = 8;

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly dataSource = inject(MENU_DATA_SOURCE);
  private readonly auth = inject(AuthService);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);

  private readonly rawMenu = toSignal(
    toObservable(this.auth.role).pipe(switchMap((role) => this.dataSource.getMenu(role))),
    { initialValue: [] as MenuItem[] },
  );

  private readonly favoriteIds = signal<string[]>(this.readList(FAVORITES_KEY));
  private readonly recentRoutes = signal<string[]>(this.readList(RECENTS_KEY));

  /** Permission-filtered, order-sorted menu tree for the current user. */
  readonly menu = computed(() => this.filterTree(this.rawMenu()));

  /** Flattened, permission-filtered menu — used for search and breadcrumb fallback. */
  readonly flatMenu = computed(() => this.flatten(this.menu()));

  readonly favorites = computed(() =>
    this.flatten(this.menu()).filter((item) => this.favoriteIds().includes(item.id)),
  );

  readonly recentlyVisited = computed(() => {
    const flat = this.flatten(this.menu());
    return this.recentRoutes()
      .map((route) => flat.find((item) => item.route === route))
      .filter((item): item is MenuItem => !!item);
  });

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.trackRecent(event.urlAfterRedirects));
  }

  toggleFavorite(id: string): void {
    const current = this.favoriteIds();
    const next = current.includes(id) ? current.filter((f) => f !== id) : [...current, id];
    this.favoriteIds.set(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  isFavorite(id: string): boolean {
    return this.favoriteIds().includes(id);
  }

  private trackRecent(url: string): void {
    const flat = this.flatten(this.menu());
    const match = flat.find((item) => item.route === url);
    if (!match) return;
    const next = [url, ...this.recentRoutes().filter((r) => r !== url)].slice(0, MAX_RECENTS);
    this.recentRoutes.set(next);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  }

  private filterTree(items: MenuItem[]): MenuItem[] {
    return items
      .filter((item) => !item.hidden && item.visible !== false && this.isPermitted(item))
      .map((item) => ({
        ...item,
        children: item.children ? this.filterTree(item.children) : undefined,
      }))
      .filter((item) => !!item.route || (item.children?.length ?? 0) > 0)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  private isPermitted(item: MenuItem): boolean {
    if (!item.permission) return true;
    return Array.isArray(item.permission)
      ? this.permissionService.hasAnyPermission(item.permission)
      : this.permissionService.hasPermission(item.permission);
  }

  private flatten(items: MenuItem[]): MenuItem[] {
    return items.flatMap((item) => [item, ...(item.children ? this.flatten(item.children) : [])]);
  }

  private readList(key: string): string[] {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '[]');
    } catch {
      return [];
    }
  }
}
