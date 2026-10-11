import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { EditProfileComponent } from './edit-profile.component';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services';

const PROFILE = {
  first_name: 'Sam', last_name: 'Lee', email: 'sam@example.com', uguid: 'u-1',
  position: 'Site Engineer', location: 'Dubai', report_to: 'Asha Admin',
  organizationId: 'org-1', organization: { organizationName: 'Acme' },
};

async function setup(profile: Record<string, unknown>) {
  const api = {
    getMyProfile: vi.fn(() => of(profile)),
    getOrgUsers: vi.fn(() => of([])),
    updateMyProfile: vi.fn(() => of({})),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      { provide: ApiService, useValue: api },
      { provide: AuthService, useValue: { user: () => null, updateCachedUser: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(EditProfileComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance, api };
}

describe('EditProfileComponent — Work Details', () => {
  it('shows Work Details for an internal user', async () => {
    const { fixture, cmp } = await setup({ ...PROFILE, is_internal: 1 });
    expect(cmp.isExternal()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Work Details');
  });

  it('treats a profile with no is_internal as internal', async () => {
    const { fixture, cmp } = await setup(PROFILE);
    expect(cmp.isExternal()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Work Details');
  });

  it('hides Work Details for an external user, but keeps the other sections', async () => {
    const { fixture, cmp } = await setup({ ...PROFILE, is_internal: 0 });
    expect(cmp.isExternal()).toBe(true);
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('Work Details');
    expect(text).toContain('Personal Information');
    expect(text).toContain('Change Password');
  });

  it('does not post work details for an external user, and does for an internal one', async () => {
    const external = await setup({ ...PROFILE, is_internal: 0 });
    await external.cmp.onSubmit();
    const externalPayload = (external.api.updateMyProfile as any).mock.calls[0][0];
    expect(externalPayload.first_name).toBe('Sam');
    expect(externalPayload).not.toHaveProperty('position');
    expect(externalPayload).not.toHaveProperty('report_to');
    TestBed.resetTestingModule();

    const internal = await setup({ ...PROFILE, is_internal: 1 });
    await internal.cmp.onSubmit();
    const internalPayload = (internal.api.updateMyProfile as any).mock.calls[0][0];
    expect(internalPayload.position).toBe('Site Engineer');
    expect(internalPayload.location).toBe('Dubai');
  });
});
