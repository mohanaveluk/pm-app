import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { UserListComponent } from './user-list.component';
import { ApiService } from '../../../../services/api.service';
import { AuthService, CommonService } from '../../../../services';

const USERS = [
  {
    id: '1', uguid: 'u1', first_name: 'Asha', last_name: 'Nair', email: 'asha@acme.com',
    role: { id: 1, guid: 'r1', name: 'Manager' }, position: 'Project Manager', location: 'Dubai',
    report_to: 'Sam Lee', is_active: 1, is_email_verified: true, is_internal: 1,
  },
  {
    id: '2', uguid: 'u2', first_name: 'Ravi', last_name: 'Kumar', email: 'ravi@acme.com',
    role: { id: 2, guid: 'r2', name: 'User' }, position: 'Site Engineer', location: 'Mumbai',
    report_to: 'Asha Nair', is_active: 0, is_email_verified: true, is_internal: 1,
  },
  {
    id: '3', uguid: 'u3', first_name: 'Vendor', last_name: 'Rep', email: 'rep@vendor.com',
    role: { id: 3, guid: 'r3', name: 'ExternalUser' }, is_active: 1, is_email_verified: true, is_internal: 0,
  },
  {
    id: '4', uguid: 'u4', first_name: 'Nina', last_name: 'Shah', email: 'nina@acme.com',
    role: { id: 2, guid: 'r2', name: 'User' }, position: 'Site Engineer', location: 'Dubai',
    is_active: 0, is_email_verified: false, is_internal: 1,
  },
];

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      { provide: ApiService, useValue: { getOrganizationUsers: vi.fn(() => of({ data: USERS })) } },
      { provide: AuthService, useValue: { user: () => ({ id: 'me', organizationId: 'org-1' }) } },
      { provide: CommonService, useValue: {} },
    ],
  });
  const fixture = TestBed.createComponent(UserListComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
  const cmp = fixture.componentInstance;
  const names = () => cmp.filteredUsers().map((u) => u.first_name);
  return { fixture, cmp, names };
}

describe('UserListComponent — search and filters', () => {
  it('shows everyone when nothing is filtered', async () => {
    const { cmp, names } = await setup();
    expect(names()).toEqual(['Asha', 'Ravi', 'Vendor', 'Nina']);
    expect(cmp.hasActiveFilters()).toBe(false);
  });

  it('searches across name, email, role, location, reports to and position', async () => {
    const { cmp, names } = await setup();

    cmp.searchTerm.set('asha');           // a name, and someone else's "reports to"
    expect(names()).toEqual(['Asha', 'Ravi']);

    cmp.searchTerm.set('mumbai');         // location
    expect(names()).toEqual(['Ravi']);

    cmp.searchTerm.set('site engineer');  // position
    expect(names()).toEqual(['Ravi', 'Nina']);

    cmp.searchTerm.set('externaluser');   // role
    expect(names()).toEqual(['Vendor']);

    cmp.searchTerm.set('RAVI@ACME');      // email, case-insensitive
    expect(names()).toEqual(['Ravi']);
  });

  it('requires every word of the search to match', async () => {
    const { cmp, names } = await setup();
    cmp.searchTerm.set('site dubai');
    expect(names()).toEqual(['Nina']);
  });

  it('filters by status using the same rules as the status chip', async () => {
    const { cmp, names } = await setup();

    cmp.statusFilter.set('active');
    expect(names()).toEqual(['Asha', 'Vendor']);

    cmp.statusFilter.set('disabled');
    expect(names()).toEqual(['Ravi']);

    cmp.statusFilter.set('pending');
    expect(names()).toEqual(['Nina']);
  });

  it('filters by role, account type, location and position, and combines them', async () => {
    const { cmp, names } = await setup();

    cmp.roleFilter.set('User');
    expect(names()).toEqual(['Ravi', 'Nina']);

    cmp.locationFilter.set('Dubai');
    expect(names()).toEqual(['Nina']);

    cmp.resetFilters();
    cmp.typeFilter.set('external');
    expect(names()).toEqual(['Vendor']);

    cmp.typeFilter.set('internal');
    expect(names()).toEqual(['Asha', 'Ravi', 'Nina']);

    cmp.positionFilter.set('Project Manager');
    expect(names()).toEqual(['Asha']);
  });

  it('offers only the roles, locations and positions that exist', async () => {
    const { cmp } = await setup();
    expect(cmp.roleOptions()).toEqual(['ExternalUser', 'Manager', 'User']);
    expect(cmp.locationOptions()).toEqual(['Dubai', 'Mumbai']);
    expect(cmp.positionOptions()).toEqual(['Project Manager', 'Site Engineer']);
  });

  it('resets everything', async () => {
    const { cmp, names } = await setup();
    cmp.searchTerm.set('zzz');
    cmp.statusFilter.set('active');
    expect(cmp.hasActiveFilters()).toBe(true);
    expect(names()).toEqual([]);

    cmp.resetFilters();

    expect(cmp.hasActiveFilters()).toBe(false);
    expect(names()).toHaveLength(4);
  });

  it('shows the no-match state with a reset button when nothing matches', async () => {
    const { fixture, cmp } = await setup();
    cmp.searchTerm.set('no-such-person');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No users match your search or filters');
    expect(text).toContain('Showing 0 of 4 users');
  });
});
