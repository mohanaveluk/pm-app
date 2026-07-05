import { Component, signal, inject, OnDestroy, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OrganizationService } from '../../../services/organization.service';
import { trigger, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-register-organization',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatStepperModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  templateUrl: './register-organization.component.html',
  styleUrl:    './register-organization.component.scss',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class RegisterOrganizationComponent implements OnDestroy {
  @ViewChild('stepper') private stepper!: MatStepper;

  private readonly fb     = inject(FormBuilder);
  private readonly orgSvc = inject(OrganizationService);
  private readonly snack  = inject(MatSnackBar);

  readonly loading     = signal(false);
  readonly step1Done   = signal(false);
  readonly step2Done   = signal(false);
  readonly resendTimer = signal(0);
  readonly orgEmail    = signal('');
  readonly serverError = signal('');

  private timerInterval?: ReturnType<typeof setInterval>;

  // ── Step 1: Basic info ────────────────────────────────────────
  readonly step1 = this.fb.group({
    organizationName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    legalName:        [''],
    email:            ['', [Validators.required, Validators.email]],
    phoneNumber:      ['', [Validators.pattern(/^\+?[\d\s\-()]{7,20}$/)]],
    website:          ['', [Validators.pattern(/^(https?:\/\/)?([\w\-]+\.)+[\w]{2,}(\/.*)?$/)]],
  });

  // ── Step 2: OTP ────────────────────────────────────────────────
  readonly step2 = this.fb.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  // ── Step 1 submit ─────────────────────────────────────────────
  async submitStep1(): Promise<void> {
    if (this.step1.invalid) { this.step1.markAllAsTouched(); return; }
    this.loading.set(true);
    this.serverError.set('');
    try {
      const v = this.step1.value;
      await this.orgSvc.register({
        organizationName: v.organizationName!,
        legalName:        v.legalName || undefined,
        email:            v.email!,
        phoneNumber:      v.phoneNumber || undefined,
        website:          v.website || undefined,
      }).toPromise();
      this.orgEmail.set(v.email!);
      this.step1Done.set(true);
      this.startResendTimer();
      // Navigate the stepper to Step 2
      setTimeout(() => this.stepper.next(), 0);
    } catch (err: any) {
      const status = err?.status ?? err?.error?.statusCode;
      if (status === 409) {
        this.step1.get('email')!.setErrors({ emailTaken: true });
      } else {
        this.serverError.set(err?.error?.message || 'Registration failed. Please try again.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  // ── Step 2 submit ─────────────────────────────────────────────
  async submitStep2(): Promise<void> {
    if (this.step2.invalid) { this.step2.markAllAsTouched(); return; }
    this.loading.set(true);
    this.serverError.set('');
    try {
      await this.orgSvc.verifyEmail({
        email: this.orgEmail(),
        otp:   this.step2.value.otp!,
      }).toPromise();
      clearInterval(this.timerInterval);
      this.step2Done.set(true);
    } catch (err: any) {
      this.serverError.set(err?.error?.message || 'Verification failed. Check your OTP and try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async resendOtp(): Promise<void> {
    if (this.resendTimer() > 0) return;
    this.loading.set(true);
    try {
      await this.orgSvc.resendOtp(this.orgEmail()).toPromise();
      this.snack.open('New OTP sent to your email', 'OK', { duration: 3000 });
      this.startResendTimer();
    } catch { /* ignore */ } finally { this.loading.set(false); }
  }

  clearEmailTakenError(): void {
    const ctrl = this.step1.get('email');
    if (ctrl?.hasError('emailTaken')) ctrl.setErrors(null);
  }

  private startResendTimer(): void {
    this.resendTimer.set(60);
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.resendTimer.update(t => {
        if (t <= 1) { clearInterval(this.timerInterval); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  ngOnDestroy(): void { clearInterval(this.timerInterval); }

  err(form: any, field: string): string {
    const c: AbstractControl = form.get(field);
    if (!c?.touched) return '';
    if (c.hasError('required'))   return 'This field is required';
    if (c.hasError('email'))      return 'Enter a valid email address';
    if (c.hasError('emailTaken')) return '';
    if (c.hasError('pattern'))    return 'Invalid format';
    if (c.hasError('minlength'))  return `Minimum ${c.errors?.['minlength']?.requiredLength} characters`;
    return '';
  }
}
