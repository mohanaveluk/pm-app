import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { MenuTreeComponent } from './menu-tree.component';
import { MenuItem } from '../../core/navigation/menu-item.model';

@Component({ template: '', standalone: true })
class DummyComponent {}

const ITEMS: MenuItem[] = [
  {
    id: 'admin', label: 'Admin',
    children: [
      { id: 'users', label: 'Users', route: '/admin/users' },
      { id: 'roles', label: 'Roles', route: '/admin/roles' },
    ],
  },
  { id: 'dashboard', label: 'Dashboard', route: '/dashboard' },
];

async function setup(initialUrl: string) {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: '**', component: DummyComponent }])],
  });
  const router = TestBed.inject(Router);
  await router.navigateByUrl(initialUrl);

  const fixture = TestBed.createComponent(MenuTreeComponent);
  fixture.componentRef.setInput('items', ITEMS);
  fixture.detectChanges();
  await fixture.whenStable();

  return { fixture, component: fixture.componentInstance, router };
}

describe('MenuTreeComponent', () => {
  it('expands the parent group containing the active route by default, with no click', async () => {
    const { component } = await setup('/admin/users');
    expect(component.isExpanded('admin')).toBe(true);
  });

  it('does not expand a group with no active descendant', async () => {
    const { component } = await setup('/dashboard');
    expect(component.isExpanded('admin')).toBe(false);
  });

  it('expands for a route nested deeper than the menu item itself (subset match)', async () => {
    const { component } = await setup('/admin/users/42/edit');
    expect(component.isExpanded('admin')).toBe(true);
  });

  it('re-evaluates on navigation, expanding the newly-active group', async () => {
    const { component, router, fixture } = await setup('/dashboard');
    expect(component.isExpanded('admin')).toBe(false);

    await router.navigateByUrl('/admin/roles');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isExpanded('admin')).toBe(true);
  });

  it('does not collapse a group the user manually opened while browsing an inactive route', async () => {
    const { component } = await setup('/dashboard');
    component.toggle(ITEMS[0]);
    expect(component.isExpanded('admin')).toBe(true);

    // Re-running the auto-expand effect (e.g. an unrelated navigation) must
    // not remove the manual expansion.
    component.toggle(ITEMS[0]);
    expect(component.isExpanded('admin')).toBe(false);
  });
});
