import { Component, signal, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../../services/api.service';
import { trigger, style, animate, transition } from '@angular/animations';

interface UserOption { fullName: string; email: string; }

const POSITIONS = [
  'Project Manager', 'Site Engineer', 'Civil Engineer', 'Structural Engineer',
  'Mechanical Engineer', 'Electrical Engineer', 'QA / QC Engineer', 'Safety Officer',
  'Site Supervisor', 'Procurement Manager', 'Planning Engineer', 'Cost Estimator',
  'Contracts Manager', 'Design Engineer', 'BIM Coordinator', 'Team Lead',
  'Business Analyst', 'IT Support', 'HR Manager', 'Finance Manager', 'Other',
];

const LOCATIONS = [
  'Remote', 'On-Site', 'Hybrid',
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata',
  'Dubai', 'Abu Dhabi', 'Riyadh', 'Doha', 'Muscat', 'Kuwait City',
  'London', 'New York', 'Singapore', 'Sydney', 'Toronto', 'Other',
];

const PROJECT_OPTIONS = [
  'Infrastructure Expansion Phase 1', 'Bridge Rehabilitation', 'Highway Widening Project',
  'Commercial Tower A', 'Residential Complex B', 'Industrial Warehouse Fit-Out',
  'Water Treatment Plant', 'Solar Farm Installation', 'Subway Extension',
];

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDatepickerModule, MatNativeDateModule, MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './edit-profile.component.html',
  styleUrl:    './edit-profile.component.scss',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('360ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class EditProfileComponent implements OnInit {
  private readonly fb    = inject(FormBuilder);
  private readonly api   = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly cdr   = inject(ChangeDetectorRef);

  readonly loading      = signal(true);
  readonly saving       = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirm  = signal(false);
  readonly loadErr      = signal('');

  // Read-only org fields shown from profile
  readonly orgName    = signal('');
  readonly legalName  = signal('');
  readonly website    = signal('');
  readonly userEmail  = signal('');

  orgUsers: UserOption[] = [];

  readonly positions     = POSITIONS;
  readonly locations     = LOCATIONS;
  readonly projectOptions = PROJECT_OPTIONS;
  readonly maxDob        = new Date();

  readonly form = this.fb.group({
    firstName:        ['', [Validators.required, Validators.minLength(2)]],
    lastName:         ['', [Validators.required, Validators.minLength(2)]],
    mobile:           ['', [Validators.pattern(/^\+?[\d\s\-()]{7,20}$/)]],
    dob:              [null as Date | null],
    position:         [''],
    location:         [''],
    reportTo:         [[] as string[]],
    worksWith:        [[] as string[]],
    projectsWorkedOn: [[] as string[]],
    newPassword:      ['', [Validators.minLength(10),
                            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
    confirmPassword:  [''],
  }, { validators: this.passwordsMatch });

  private passwordsMatch(group: AbstractControl) {
    const pw  = group.get('newPassword')?.value;
    const cpw = group.get('confirmPassword')?.value;
    if (!pw && !cpw) return null;
    return pw === cpw ? null : { passwordMismatch: true };
  }

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    this.loading.set(true);
    this.loadErr.set('');
    try {
      const [profile, usersRaw] = await Promise.all([
        this.api.getMyProfile().toPromise(),
        this.api.getOrgUsers().toPromise(),
      ]);

      // Populate read-only org fields from org relation on profile
      const org = profile?.organization;
      this.orgName.set(org?.organizationName  ?? '');
      this.legalName.set(org?.legalName       ?? '');
      this.website.set(org?.website           ?? '');
      this.userEmail.set(profile?.email       ?? '');

      // Parse comma-separated strings back to arrays for multi-selects
      const toArray = (s: string | null | undefined) =>
        s ? s.split(',').map((v: string) => v.trim()).filter(Boolean) : [];

      const dobDate = profile?.dob ? new Date(profile.dob) : null;

      this.form.patchValue({
        firstName:        profile?.first_name   ?? '',
        lastName:         profile?.last_name    ?? '',
        mobile:           profile?.mobile       ?? '',
        dob:              dobDate,
        position:         profile?.position     ?? '',
        location:         profile?.location     ?? '',
        reportTo:         toArray(profile?.report_to)        as any,
        worksWith:        toArray(profile?.worksWith)        as any,
        projectsWorkedOn: toArray(profile?.projectsWorkedOn) as any,
      });

      // Filter org users to same org for dropdowns
      const myOrgId = profile?.organizationId ?? null;
      const myUguid = profile?.uguid;
      this.orgUsers = (usersRaw ?? [])
        .filter((u: any) => (!myOrgId || u.organizationId === myOrgId) && u.uguid !== myUguid)
        .map((u: any) => ({
          fullName: `${u.first_name} ${u.last_name}`.trim(),
          email:    u.email,
        }));

      this.form.markAsPristine();
    } catch (e: any) {
      this.loadErr.set(e?.error?.message || 'Failed to load profile.');
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  // ── Password strength ─────────────────────────────────────────
  get passwordStrength(): number {
    const p = this.form.get('newPassword')?.value ?? '';
    if (!p) return 0;
    let s = 0;
    if (p.length >= 10)          s++;
    if (/[A-Z]/.test(p))         s++;
    if (/[0-9]/.test(p))         s++;
    if (/[^A-Za-z0-9]/.test(p))  s++;
    return s;
  }
  get strengthLabel(): string { return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.passwordStrength]; }
  get strengthColor(): string { return ['', '#D32F2F', '#ED6C02', '#1976D2', '#2E7D32'][this.passwordStrength]; }

  // ── Submit ────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    try {
      const v = this.form.value;
      const dobStr = v.dob ? (v.dob as Date).toISOString().split('T')[0] : undefined;
      const reportToStr         = (v.reportTo         as any[])?.[0] ?? '';
      const worksWithStr        = (v.worksWith         as any[] ?? []).join(', ');
      const projectsWorkedOnStr = (v.projectsWorkedOn  as any[] ?? []).join(', ');

      const payload: any = {
        first_name:       v.firstName        || undefined,
        last_name:        v.lastName         || undefined,
        mobile:           v.mobile           || undefined,
        dob:              dobStr,
        position:         v.position         || undefined,
        location:         v.location         || undefined,
        report_to:        reportToStr        || undefined,
        worksWith:        worksWithStr       || undefined,
        projectsWorkedOn: projectsWorkedOnStr || undefined,
      };

      if (v.newPassword) {
        payload.password = v.newPassword;
      }

      await this.api.updateMyProfile(payload).toPromise();

      // Update localStorage display name
      const stored = localStorage.getItem('pm_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          user.firstName = v.firstName;
          user.lastName  = v.lastName;
          localStorage.setItem('pm_user', JSON.stringify(user));
        } catch { /**/ }
      }

      this.form.get('newPassword')?.reset('');
      this.form.get('confirmPassword')?.reset('');
      this.form.markAsPristine();
      this.snack.open('Profile updated successfully.', 'OK', { duration: 4000 });
    } catch (e: any) {
      const msg = e?.error?.message || 'Failed to save changes. Please try again.';
      this.snack.open(Array.isArray(msg) ? msg.join(' · ') : msg, 'Dismiss', {
        duration: 6000,
        panelClass: ['snack-error'],
      });
    } finally {
      this.saving.set(false);
      this.cdr.markForCheck();
    }
  }

  onReset(): void { this.loadData(); }

  err(field: string): string {
    const c: AbstractControl | null = this.form.get(field);
    if (!c?.touched || !c.errors) return '';
    if (c.hasError('required'))   return 'This field is required';
    if (c.hasError('minlength'))  return `Minimum ${c.errors['minlength'].requiredLength} characters`;
    if (c.hasError('pattern'))    return field === 'newPassword'
      ? 'Must contain uppercase, lowercase and a number'
      : 'Invalid format';
    return '';
  }

  get passwordMismatch(): boolean {
    return !!(this.form.hasError('passwordMismatch') &&
              this.form.get('confirmPassword')?.touched);
  }
}
