import {
  Component, signal, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, computed,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { trigger, style, animate, transition } from '@angular/animations';
import { ApiService } from '../../../../services/api.service';
import { AuthService } from '../../../../services';

interface TargetUser {
  uguid: string;
  first_name: string;
  last_name: string;
  email: string;
  position?: string;
  is_active: number;
  is_email_verified: boolean;
  is_internal?: number;
  role?: { name: string };
}

type Phase = 'confirm' | 'done';

/**
 * Admin-initiated password reset for a user who has forgotten their password and
 * asked an administrator for help. The API sets the default temporary password,
 * ends the user's sessions and emails them — this page only confirms and reports.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('380ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class ResetPasswordComponent implements OnInit {
  private readonly api    = inject(ApiService);
  private readonly auth   = inject(AuthService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr    = inject(ChangeDetectorRef);

  readonly initLoading = signal(true);
  readonly submitting  = signal(false);
  readonly loadError   = signal('');
  readonly serverError = signal('');
  readonly user        = signal<TargetUser | null>(null);
  readonly phase       = signal<Phase>('confirm');
  readonly emailSent   = signal(true);

  readonly fullName = computed(() => {
    const u = this.user();
    return u ? `${u.first_name} ${u.last_name}`.trim() : '';
  });

  readonly initials = computed(() => {
    const u = this.user();
    return u ? `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase() : '';
  });

  /** Mirrors the API rule: only active, verified accounts can be reset. */
  readonly resettable = computed(() => {
    const u = this.user();
    return !!u && !!u.is_active && u.is_email_verified;
  });

  readonly blockedReason = computed(() => {
    const u = this.user();
    if (!u) return '';
    if (!u.is_email_verified) return 'This user has not verified their email yet, so there is no password to reset. Resend the verification email instead.';
    if (!u.is_active) return 'This account is disabled. Enable it before resetting the password.';
    return '';
  });

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const uguid = this.route.snapshot.paramMap.get('uguid');
    const orgId = this.auth.user()?.organizationId ?? '';
    try {
      if (!uguid) throw new Error('missing user');
      const res: any = await this.api.getOrganizationUserById(orgId, uguid).toPromise();
      const u = res?.data ?? res;
      if (!u) {
        this.loadError.set('This user could not be found.');
      } else {
        this.user.set(u);
      }
    } catch {
      this.loadError.set('Unable to load this user. They may not exist, or belong to another organisation.');
    } finally {
      this.initLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async confirmReset(): Promise<void> {
    const u = this.user();
    if (!u || !this.resettable() || this.submitting()) return;

    this.submitting.set(true);
    this.serverError.set('');
    try {
      const res = await this.api.adminResetUserPassword(u.uguid).toPromise();
      this.emailSent.set(res?.emailSent !== false);
      this.phase.set('done');
    } catch (err: any) {
      const msg = err?.error?.message || 'Failed to reset the password. Please try again.';
      this.serverError.set(Array.isArray(msg) ? msg.join(' · ') : msg);
    } finally {
      this.submitting.set(false);
      this.cdr.markForCheck();
    }
  }

  backToUsers(): void {
    void this.router.navigate(['/admin/users']);
  }
}
