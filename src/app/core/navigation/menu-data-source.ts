import { Injectable, InjectionToken } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AppRole } from '../../models/role.model';
import { MenuItem } from './menu-item.model';
import { MENU_REGISTRY } from './config/menu-registry';

/**
 * Abstraction over "where the menu tree comes from". Swapping the static
 * config-file source for a real `GET /api/navigation/menu` endpoint later
 * is a one-line provider change in app.config.ts — nothing else in the
 * navigation/sidenav layer needs to know.
 */
export interface MenuDataSource {
  getMenu(role: AppRole): Observable<MenuItem[]>;
}

@Injectable({ providedIn: 'root' })
export class StaticMenuDataSource implements MenuDataSource {
  getMenu(role: AppRole): Observable<MenuItem[]> {
    return of(MENU_REGISTRY[role] ?? []);
  }
}

export const MENU_DATA_SOURCE = new InjectionToken<MenuDataSource>('MENU_DATA_SOURCE');
