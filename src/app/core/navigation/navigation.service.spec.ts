import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NavigationService } from './navigation.service';
import { MENU_DATA_SOURCE } from './menu-data-source';
import { AuthService } from '../../services';
import { PermissionService } from '../rbac/permission.service';
import { MenuItem } from './menu-item.model';

const FAKE_MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', route: '/dashboard', order: 1 },
  { id: 'materials', label: 'Materials', route: '/materials', order: 2, permission: 'materials.view' },
  {
    id: 'admin', label: 'Admin', order: 3, permission: 'users.manage',
    children: [
      { id: 'users', label: 'Users', route: '/admin/users', order: 1, permission: 'users.manage' },
    ],
  },
];

// Flushes the microtask queue so toObservable()/toSignal()'s effect-driven
// first emission (which does not happen synchronously on subscribe) lands
// before assertions run.
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

async function setup(hasPermission: (permission: string) => boolean) {
  TestBed.configureTestingModule({
    providers: [
      NavigationService,
      provideRouter([]),
      { provide: AuthService, useValue: { role: signal('User') } },
      {
        provide: PermissionService,
        useValue: {
          hasPermission,
          hasAnyPermission: (perms: string[]) => perms.some(hasPermission),
        },
      },
      { provide: MENU_DATA_SOURCE, useValue: { getMenu: () => of(FAKE_MENU) } },
    ],
  });
  const service = TestBed.inject(NavigationService);
  await flush();
  return service;
}

describe('NavigationService', () => {
  beforeEach(() => localStorage.clear());

  it('keeps unrestricted items and drops permission-gated ones the user lacks', async () => {
    const service = await setup(() => false);
    const ids = service.menu().map((m) => m.id);
    expect(ids).toContain('dashboard');
    expect(ids).not.toContain('materials');
    expect(ids).not.toContain('admin');
  });

  it('keeps a parent once the user has permission for at least one child', async () => {
    const service = await setup((p) => p === 'users.manage');
    const admin = service.menu().find((m) => m.id === 'admin');
    expect(admin).toBeTruthy();
    expect(admin?.children?.map((c) => c.id)).toEqual(['users']);
  });

  it('flatMenu flattens nested children into a single list', async () => {
    const service = await setup((p) => p === 'users.manage');
    const flat = service.flatMenu().map((m) => m.id);
    expect(flat).toEqual(expect.arrayContaining(['dashboard', 'admin', 'users']));
  });

  it('toggleFavorite adds and removes an id from favorites', async () => {
    const service = await setup(() => true);
    expect(service.isFavorite('dashboard')).toBe(false);
    service.toggleFavorite('dashboard');
    expect(service.isFavorite('dashboard')).toBe(true);
    service.toggleFavorite('dashboard');
    expect(service.isFavorite('dashboard')).toBe(false);
  });
});
