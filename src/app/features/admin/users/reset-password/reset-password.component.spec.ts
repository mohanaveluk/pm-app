import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ResetPasswordComponent } from './reset-password.component';
import { ApiService } from '../../../../services/api.service';
import { AuthService } from '../../../../services';

const USER = {
  uguid: 'u-1', first_name: 'Sam', last_name: 'Lee', email: 'sam@example.com',
  is_active: 1, is_email_verified: true, role: { name: 'User' },
};

async function setup(user: unknown, reset: ReturnType<typeof vi.fn> = vi.fn(() => of({ message: 'ok', emailSent: true }))) {
  const api = {
    getOrganizationUserById: vi.fn(() => of({ data: user })),
    adminResetUserPassword: reset,
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      { provide: ApiService, useValue: api },
      { provide: AuthService, useValue: { user: () => ({ organizationId: 'org-1' }) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'u-1' } } } },
    ],
  });
  const fixture = TestBed.createComponent(ResetPasswordComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance, api };
}

describe('ResetPasswordComponent', () => {
  it('shows the user and allows the reset for an active, verified account', async () => {
    const { fixture, cmp } = await setup(USER);
    expect(cmp.resettable()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Sam Lee');
    expect(fixture.nativeElement.textContent).toContain('sam@example.com');
  });

  it('blocks a disabled or unverified account with an explanation', async () => {
    const disabled = await setup({ ...USER, is_active: 0 });
    expect(disabled.cmp.resettable()).toBe(false);
    expect(disabled.cmp.blockedReason()).toContain('disabled');
    TestBed.resetTestingModule();

    const unverified = await setup({ ...USER, is_email_verified: false });
    expect(unverified.cmp.blockedReason()).toContain('verified');
  });

  it('calls the API and shows the success state', async () => {
    const { cmp, api } = await setup(USER);
    await cmp.confirmReset();
    expect(api.adminResetUserPassword).toHaveBeenCalledWith('u-1');
    expect(cmp.phase()).toBe('done');
    expect(cmp.emailSent()).toBe(true);
  });

  it('reports when the reset worked but the email did not send', async () => {
    const { cmp } = await setup(USER, vi.fn(() => of({ message: 'x', emailSent: false })));
    await cmp.confirmReset();
    expect(cmp.phase()).toBe('done');
    expect(cmp.emailSent()).toBe(false);
  });

  it('stays on the confirm step and shows the server message on failure', async () => {
    const { cmp } = await setup(
      USER,
      vi.fn(() => throwError(() => ({ error: { message: 'Only active, verified users can have their password reset' } }))),
    );
    await cmp.confirmReset();
    expect(cmp.phase()).toBe('confirm');
    expect(cmp.serverError()).toContain('active, verified');
  });
});
