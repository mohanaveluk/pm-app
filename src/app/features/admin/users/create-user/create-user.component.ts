import { Component, signal, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
import { ApiService } from '../../../../services/api.service';
import { AuthService } from '../../../../services';
import { trigger, style, animate, transition } from '@angular/animations';

interface RoleOption  { guid: string; name: string; }
interface UserOption  { uguid: string; fullName: string; email: string; }

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

const PROJECTS_PLACEHOLDER = [
  'Infrastructure Expansion Phase 1', 'Bridge Rehabilitation', 'Highway Widening Project',
  'Commercial Tower A', 'Residential Complex B', 'Industrial Warehouse Fit-Out',
  'Water Treatment Plant', 'Solar Farm Installation', 'Subway Extension',
];

@Component({
  selector: 'app-create-user',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDatepickerModule, MatNativeDateModule, MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './create-user.component.html',
  styleUrl:    './create-user.component.scss',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('380ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class CreateUserComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(ApiService);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snack  = inject(MatSnackBar);
  private readonly cdr    = inject(ChangeDetectorRef);

  readonly loading      = signal(false);
  readonly initLoading  = signal(true);
  readonly showPassword = signal(false);
  readonly serverError  = signal('');
  readonly organizationId  = signal('');

  roles:    RoleOption[] = [];
  orgUsers: UserOption[] = [];

  readonly positions     = POSITIONS;
  readonly locations     = LOCATIONS;
  readonly projectOptions = PROJECTS_PLACEHOLDER;

  readonly maxDob = new Date();

  readonly form = this.fb.group({
    firstName:        ['', [Validators.required, Validators.minLength(2)]],
    lastName:         ['', [Validators.required, Validators.minLength(2)]],
    email:            ['', [Validators.required, Validators.email]],
    password:         ['Welcome@123', [Validators.required, Validators.minLength(10),
                            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
    mobile:           ['', [Validators.pattern(/^\+?[\d\s\-()]{7,20}$/)]],
    dob:              [null as Date | null],
    role_guid:        ['', Validators.required],
    position:         [''],
    location:         [''],
    reportTo:         [[] as string[]],      // dropdown of org users (single)
    worksWith:        [[] as string[]],      // dropdown of org users (multi)
    projectsWorkedOn: [[] as string[]],      // dropdown of projects (multi)
  });

  ngOnInit(): void {
    this.loadMeta();
  }

  private async loadMeta(): Promise<void> {
    this.initLoading.set(true);
    try {
      const [rolesRaw, usersRaw] = await Promise.all([
        this.api.getRoles().toPromise(),
        this.api.getOrgUsers().toPromise(),
      ]);

      this.roles = (rolesRaw ?? [])
        .filter(r => r.is_active)
        .map(r => ({ guid: r.guid, name: r.name }));

      // Get the logged-in user's organizationId to filter users to the same org
      const me = this.auth.user();
      const myOrgId = me?.organizationId ?? null;
      this.organizationId.set(myOrgId ?? '');

      this.orgUsers = (usersRaw ?? [])
        .filter(u => !myOrgId || u.organizationId === myOrgId)
        .map(u => ({
          uguid:    u.uguid,
          fullName: `${u.first_name} ${u.last_name}`.trim(),
          email:    u.email,
        }));
    } catch {
      // roles/users load failure is non-fatal — form still usable with static data
    } finally {
      this.initLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  // ── Password strength ─────────────────────────────────────────
  get passwordStrength(): number {
    const p = this.form.get('password')?.value ?? '';
    let s = 0;
    if (p.length >= 10)           s++;
    if (/[A-Z]/.test(p))          s++;
    if (/[0-9]/.test(p))          s++;
    if (/[^A-Za-z0-9]/.test(p))   s++;
    return s;
  }
  get strengthLabel(): string { return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.passwordStrength]; }
  get strengthColor(): string { return ['', '#D32F2F', '#ED6C02', '#1976D2', '#2E7D32'][this.passwordStrength]; }

  // ── Submit ────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.serverError.set('');
    try {
      const v = this.form.value;

      // Convert multi-select arrays to comma-separated strings for the backend
      const worksWithStr        = (v.worksWith        ?? []).join(', ');
      const projectsWorkedOnStr = (v.projectsWorkedOn ?? []).join(', ');

      // report_to: single user's fullName or email stored as a string
      const reportToStr = (v.reportTo as any) ?? ''; //(v.reportTo as any)?.[0] ?? '';

      const dobStr = v.dob ? (v.dob as Date).toISOString().split('T')[0] : undefined;

      await this.api.register({
        first_name:        v.firstName!,
        last_name:         v.lastName!,
        email:             v.email!,
        password:          v.password!,
        mobile:            v.mobile || undefined,
        dob:               dobStr,
        position:          v.position || undefined,
        location:          v.location || undefined,
        report_to:         reportToStr || undefined,
        worksWith:         worksWithStr || undefined,
        projectsWorkedOn:  projectsWorkedOnStr || undefined,
        created_at:        new Date().toISOString(),
        updated_at:        null,
        role_guid:         v.role_guid!,
        organizationId: this.organizationId()
      }).toPromise();

      this.snack.open('User created successfully! A verification email has been sent.', 'OK', { duration: 5000 });
      setTimeout(() => this.router.navigate(['/admin/users']), 1500);
    } catch (err: any) {
      const msg = err?.error?.message || err?.error?.detail || 'Failed to create user. Please try again.';
      this.serverError.set(Array.isArray(msg) ? msg.join(' · ') : msg);
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  onReset(): void {
    this.form.reset();
    this.serverError.set('');
  }

  err(field: string): string {
    const c: AbstractControl | null = this.form.get(field);
    if (!c?.touched || !c.errors) return '';
    if (c.hasError('required'))   return 'This field is required';
    if (c.hasError('email'))      return 'Enter a valid email address';
    if (c.hasError('minlength'))  return `Minimum ${c.errors['minlength'].requiredLength} characters`;
    if (c.hasError('pattern'))    return field === 'password'
      ? 'Must contain uppercase, lowercase and a number'
      : 'Invalid format';
    return '';
  }
}
