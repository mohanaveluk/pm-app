import { Component, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { PmRole } from '../../../models/pm.models';
import { trigger, style, animate, transition } from '@angular/animations';
import { AuthService } from '../../../services';
import { MaterialModule } from '../../../shared/modules/material.module';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, MaterialModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(24px)' }),
        animate('450ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class LoginComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(ApiService);
  private readonly authService    = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading      = signal(false);
  readonly showPassword = signal(false);
  readonly loginError   = signal('');

  readonly features = [
    'Real-time project tracking',
    'Multi-team collaboration',
    'Enterprise-grade reporting',
    'Role-based access control',
  ];

  readonly form = this.fb.group({
    email:      ['', [Validators.required, Validators.email]],
    password:   ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.loginError.set('');
    try {
      const { email, password } = this.form.value;
      await this.authService.login(email!, password!);
      /*const res: any = await this.api.login({ email: email!, password: password! }).toPromise();
      const data = res?.data ?? res;
      if (data?.access_token) {
        localStorage.setItem('pm_token',    data.access_token);
        if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
        const user = data.user ?? {};
        localStorage.setItem('pm_user',    JSON.stringify(user));
        this.redirectByRole(user.role as PmRole);
      }*/
    } catch (err: any) {
      this.loginError.set(err?.error?.message || err?.message || 'Invalid credentials. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private redirectByRole(role: PmRole): void {
    const map: Record<string, string> = {
      OrganizationAdmin: '/admin/dashboard',
      SuperAdmin:        '/admin/dashboard',
      Manager:           '/manager/dashboard',
    };
    this.router.navigate([map[role] ?? '/dashboard']);
  }

  get emailErr(): string {
    const c = this.form.get('email');
    if (c?.hasError('required')) return 'Email is required';
    if (c?.hasError('email'))    return 'Enter a valid email address';
    return '';
  }
  get passErr(): string {
    const c = this.form.get('password');
    if (c?.hasError('required'))  return 'Password is required';
    if (c?.hasError('minlength')) return 'Minimum 6 characters required';
    return '';
  }
}
