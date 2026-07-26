import { Component, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { trigger, style, animate, transition } from '@angular/animations';
import { AuthService } from '../../../services';
import { MaterialModule } from '../../../shared/modules/material.module';
import { EntraAuthService } from '../../../core/auth/entra-auth.service';

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
  private readonly authService = inject(AuthService);
  protected readonly entraAuth = inject(EntraAuthService);

  readonly loading      = signal(false);
  readonly showPassword = signal(false);
  readonly loginError   = signal('');
  readonly entraLoading = signal(false);

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
    } catch (err: any) {
      this.loginError.set(err?.error?.message || err?.message || 'Invalid credentials. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async onMicrosoftSignIn(): Promise<void> {
    this.entraLoading.set(true);
    this.loginError.set('');
    try {
      await this.entraAuth.loginWithMicrosoft();
    } catch (err: any) {
      this.loginError.set(err?.message || 'Microsoft sign-in failed. Please try again.');
    } finally {
      this.entraLoading.set(false);
    }
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
