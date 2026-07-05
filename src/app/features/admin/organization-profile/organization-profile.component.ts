import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OrganizationService } from '../../../services/organization.service';
import { trigger, style, animate, transition } from '@angular/animations';

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Argentina','Australia','Austria','Bangladesh',
  'Belgium','Brazil','Canada','Chile','China','Colombia','Croatia','Czech Republic',
  'Denmark','Egypt','Ethiopia','Finland','France','Germany','Ghana','Greece',
  'Hong Kong','Hungary','India','Indonesia','Iran','Iraq','Ireland','Israel',
  'Italy','Japan','Jordan','Kenya','Malaysia','Mexico','Morocco','Netherlands',
  'New Zealand','Nigeria','Norway','Pakistan','Peru','Philippines','Poland',
  'Portugal','Romania','Russia','Saudi Arabia','Singapore','South Africa',
  'South Korea','Spain','Sri Lanka','Sweden','Switzerland','Taiwan','Thailand',
  'Turkey','UAE','Ukraine','United Kingdom','United States','Vietnam','Other',
];

@Component({
  selector: 'app-organization-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatDividerModule, MatSnackBarModule,MatIconModule
  ],
  templateUrl: './organization-profile.component.html',
  styleUrl:    './organization-profile.component.scss',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(18px)' }),
        animate('380ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class OrganizationProfileComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly orgSvc = inject(OrganizationService);
  private readonly snack  = inject(MatSnackBar);

  readonly loading  = signal(true);
  readonly saving   = signal(false);
  readonly saved    = signal(false);
  readonly loadErr  = signal('');

  readonly countries = COUNTRIES;

  readonly form = this.fb.group({
    organizationName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    legalName:        [''],
    email:            ['', [Validators.required, Validators.email]],
    phoneNumber:      ['', [Validators.pattern(/^\+?[\d\s\-()]{7,20}$/)]],
    website:          ['', [Validators.pattern(/^(https?:\/\/)?([\w\-]+\.)+[\w]{2,}(\/.*)?$/)]],
    addressLine1:     [''],
    addressLine2:     [''],
    city:             [''],
    state:            [''],
    country:          [''],
    postalCode:       [''],
    taxNumber:        [''],
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.loadErr.set('');
    try {
      const org = await this.orgSvc.getProfile().toPromise();
      if (org) {
        this.form.patchValue({
          organizationName: org.organizationName ?? '',
          legalName:        org.legalName        ?? '',
          email:            org.email            ?? '',
          phoneNumber:      org.phoneNumber      ?? '',
          website:          org.website          ?? '',
          addressLine1:     org.addressLine1     ?? '',
          addressLine2:     org.addressLine2     ?? '',
          city:             org.city             ?? '',
          state:            org.state            ?? '',
          country:          org.country          ?? '',
          postalCode:       org.postalCode       ?? '',
          taxNumber:        org.taxNumber        ?? '',
        });
      }
    } catch (e: any) {
      this.loadErr.set(e?.error?.message || 'Failed to load organisation profile.');
    } finally {
      this.loading.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.saved.set(false);
    try {
      await this.orgSvc.updateProfile(this.form.value as any).toPromise();
      this.saved.set(true);
      this.snack.open('Organisation profile updated successfully.', 'OK', { duration: 4000 });
      // Reset dirty/pristine so the "unsaved changes" indicator clears
      this.form.markAsPristine();
    } catch (e: any) {
      const msg = e?.error?.message || 'Failed to save changes. Please try again.';
      this.snack.open(msg, 'Dismiss', { duration: 6000, panelClass: ['snack-error'] });
    } finally {
      this.saving.set(false);
    }
  }

  onReset(): void {
    this.loadProfile();
  }

  err(field: string): string {
    const c: AbstractControl | null = this.form.get(field);
    if (!c?.touched) return '';
    if (c.hasError('required'))   return 'This field is required';
    if (c.hasError('email'))      return 'Enter a valid email address';
    if (c.hasError('pattern'))    return 'Invalid format';
    if (c.hasError('minlength'))  return `Minimum ${c.errors?.['minlength']?.requiredLength} characters`;
    if (c.hasError('maxlength'))  return `Maximum ${c.errors?.['maxlength']?.requiredLength} characters`;
    return '';
  }
}
