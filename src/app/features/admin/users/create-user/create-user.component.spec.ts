import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { CreateUserComponent } from './create-user.component';
import { ApiService } from '../../../../services/api.service';
import { AuthService } from '../../../../services';

const ROLES = [
  { guid: 'r-admin', name: 'OrganizationAdmin', is_active: true },
  { guid: 'r-user', name: 'User', is_active: true },
  { guid: 'r-ext', name: 'ExternalUser', is_active: true },
];

async function setup(roles = ROLES, register: ReturnType<typeof vi.fn> = vi.fn(() => of({}))) {
  const api = { getRoles: () => of(roles), getOrgUsers: () => of([]), register };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      { provide: ApiService, useValue: api },
      { provide: AuthService, useValue: { user: () => ({ organizationId: 'org-1' }) } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { data: { mode: 'create' }, paramMap: { get: () => null } } },
      },
    ],
  });
  const fixture = TestBed.createComponent(CreateUserComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  // loadMeta() chains several awaited promises; let them all settle.
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance, api };
}

describe('CreateUserComponent — External user', () => {
  it('starts internal with Work Details shown', async () => {
    const { fixture, cmp } = await setup();
    expect(cmp.isExternal()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Work Details');
  });

  it('hides Work Details and preselects the ExternalUser role when switched on', async () => {
    const { fixture, cmp } = await setup();
    cmp.form.patchValue({ position: 'Site Engineer', location: 'Dubai', worksWith: ['A'] });

    cmp.form.controls.isExternal.setValue(true);
    fixture.detectChanges();

    expect(cmp.isExternal()).toBe(true);
    expect(cmp.form.value.role_guid).toBe('r-ext');
    expect(fixture.nativeElement.textContent).not.toContain('Work Details');
    // Stale work details must not be submitted for an account that has none.
    expect(cmp.form.value.position).toBe('');
    expect(cmp.form.value.location).toBe('');
    expect(cmp.form.value.worksWith).toEqual([]);
  });

  it('falls back to the User role when there is no ExternalUser role', async () => {
    const { cmp } = await setup(ROLES.filter((r) => r.name !== 'ExternalUser'));
    cmp.form.controls.isExternal.setValue(true);
    expect(cmp.form.value.role_guid).toBe('r-user');
  });

  it('undoes its own role preselection when switched back, but not a role the admin chose', async () => {
    const { cmp } = await setup();

    cmp.form.controls.isExternal.setValue(true);
    cmp.form.controls.isExternal.setValue(false);
    expect(cmp.form.value.role_guid).toBe('');

    cmp.form.controls.isExternal.setValue(true);
    cmp.form.controls.role_guid.setValue('r-admin');
    cmp.form.controls.isExternal.setValue(false);
    expect(cmp.form.value.role_guid).toBe('r-admin');
  });

  it('never requires Work Details — an external user can be created without any of them', async () => {
    const { cmp } = await setup();
    cmp.form.patchValue({ firstName: 'Sam', lastName: 'Lee', email: 'sam@example.com' });
    const workFields = ['position', 'location', 'reportTo', 'worksWith', 'projectsWorkedOn'];

    cmp.form.controls.isExternal.setValue(true);
    expect(cmp.form.valid).toBe(true);
    for (const f of workFields) {
      expect(cmp.form.get(f)?.hasError('required')).toBe(false);
    }

    // Internal behaviour is unchanged: these fields were never mandatory there either.
    cmp.form.controls.isExternal.setValue(false);
    cmp.form.controls.role_guid.setValue('r-user');
    for (const f of workFields) {
      expect(cmp.form.get(f)?.hasError('required')).toBe(false);
    }
  });

  it('submits report_to as a string (or omits it) — never an array', async () => {
    const register = vi.fn(() => of({}));
    const { cmp, api } = await setup(ROLES, register);
    cmp.form.patchValue({
      firstName: 'Sam', lastName: 'Lee', email: 'sam@example.com', role_guid: 'r-user',
    });

    await cmp.onSubmit();
    expect(api.register).toHaveBeenCalledTimes(1);
    let payload = (api.register as any).mock.calls[0][0];
    expect(payload.report_to).toBeUndefined();

    cmp.form.patchValue({ reportTo: 'Asha Admin' });
    await cmp.onSubmit();
    payload = (api.register as any).mock.calls[1][0];
    expect(payload.report_to).toBe('Asha Admin');
  });

  it('creates an external user with no Work Details and no report_to', async () => {
    const { cmp, api } = await setup();
    cmp.form.patchValue({ firstName: 'Sam', lastName: 'Lee', email: 'sam@example.com' });
    cmp.form.controls.isExternal.setValue(true);

    await cmp.onSubmit();

    const payload = (api.register as any).mock.calls[0][0];
    expect(payload.report_to).toBeUndefined();
    expect(payload.position).toBeUndefined();
    expect(payload.is_internal).toBe(false);
    expect(payload.role_guid).toBe('r-ext');
  });
});
