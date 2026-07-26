import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, Routes } from '@angular/router';
import { BreadcrumbService } from './breadcrumb.service';
import { AuthService } from '../../services';
import { AppRole } from '../../models/role.model';

@Component({ template: '' })
class BlankComponent {}

const routes: Routes = [
  {
    path: 'admin',
    data: { breadcrumb: 'Administration' },
    children: [
      { path: 'users', component: BlankComponent, data: { breadcrumb: 'Manage Users' } },
      { path: 'users/create', component: BlankComponent, data: { breadcrumb: 'Create User' } },
    ],
  },
  { path: 'dashboard', component: BlankComponent, data: { breadcrumb: 'Dashboard' } },
  { path: 'no-breadcrumb', component: BlankComponent },
];

async function navigateAndGetBreadcrumbs(url: string, role: AppRole = 'OrganizationAdmin') {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: AuthService, useValue: { role: signal(role) } },
    ],
  });
  const service = TestBed.inject(BreadcrumbService);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return service.breadcrumbs();
}

describe('BreadcrumbService', () => {
  it('builds a trail from nested route data, prefixed with Home', async () => {
    const crumbs = await navigateAndGetBreadcrumbs('/admin/users/create');
    expect(crumbs.map((c) => c.label)).toEqual(['Home', 'Administration', 'Create User']);
    expect(crumbs.map((c) => c.url)).toEqual(['/admin/dashboard', '/admin', '/admin/users/create']);
  });

  it('does not prefix Home when the trail already starts at Dashboard', async () => {
    const crumbs = await navigateAndGetBreadcrumbs('/dashboard');
    expect(crumbs.map((c) => c.label)).toEqual(['Dashboard']);
  });

  it('resolves the Home link per the current role', async () => {
    const managerCrumbs = await navigateAndGetBreadcrumbs('/admin/users', 'ProjectManager');
    expect(managerCrumbs[0]).toEqual({ label: 'Home', url: '/manager/dashboard' });

    const userCrumbs = await navigateAndGetBreadcrumbs('/admin/users', 'User');
    expect(userCrumbs[0]).toEqual({ label: 'Home', url: '/dashboard' });
  });

  it('returns an empty trail for routes with no breadcrumb data', async () => {
    const crumbs = await navigateAndGetBreadcrumbs('/no-breadcrumb');
    expect(crumbs).toEqual([]);
  });
});
