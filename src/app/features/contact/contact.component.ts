import {
  Component, signal, ChangeDetectionStrategy, inject, OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, style, animate, transition, query, stagger } from '@angular/animations';
import { ContactService } from './contact.service';
import { ContactInfo, SocialLink } from './contact.model';
import { MaterialModule } from '../../shared/modules/material.module';

@Component({
  selector: 'app-contact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatTooltipModule, MaterialModule
  ],
  templateUrl: './contact.component.html',
  styleUrl:    './contact.component.scss',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(28px)' }),
        animate('480ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(.94)' }),
        animate('420ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
    trigger('stagger', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(90, animate('380ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))),
        ], { optional: true }),
      ]),
    ]),
    trigger('successIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(.88) translateY(20px)' }),
        animate('500ms cubic-bezier(.34,1.56,.64,1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' })),
      ]),
    ]),
  ],
})
export class ContactComponent implements OnInit {
  private readonly fb      = inject(FormBuilder);
  private readonly svc     = inject(ContactService);
  private readonly snack   = inject(MatSnackBar);

  readonly loading  = signal(false);
  readonly submitted = signal(false);

  // ── Contact info cards ──────────────────────────────────────────────
  readonly contactCards: ContactInfo[] = [
    {
      icon: 'mail',
      title: 'Email Us',
      value: 'support@icmp.io',
      description: 'Send us your questions anytime.',
      href: 'mailto:support@icmp.io',
      color: '#1565C0',
      bg: '#E3F2FD',
    },
    {
      icon: 'call',
      title: 'Call Us',
      value: '+91 98765 43210',
      description: 'Available Monday to Saturday.',
      href: 'tel:+919876543210',
      color: '#2E7D32',
      bg: '#E8F5E9',
    },
    {
      icon: 'schedule',
      title: 'Working Hours',
      value: '9:00 AM – 6:00 PM',
      description: 'Indian Standard Time (IST)',
      color: '#0F4C81',
      bg: '#E8EAF6',
    },
  ];

  // ── Social links ───────────────────────────────────────────────────
  readonly socialLinks: SocialLink[] = [
    { icon: 'facebook',  label: 'Facebook',  url: 'https://facebook.com',  color: '#1877F2' },
    { icon: 'photo_camera', label: 'Instagram', url: 'https://instagram.com', color: '#E4405F' },
    { icon: 'smart_display', label: 'YouTube', url: 'https://youtube.com',  color: '#FF0000' },
    { icon: 'close',     label: 'X / Twitter', url: 'https://twitter.com', color: '#000000' },
  ];

  // ── Reactive form ──────────────────────────────────────────────────
  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName:  ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email:     ['', [Validators.required, Validators.email]],
      mobile:    ['', [Validators.pattern(/^\+?[\d\s\-()]{7,20}$/)]],
      message:   ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    });
  }

  get messageLength(): number {
    return this.form?.get('message')?.value?.length ?? 0;
  }

  err(field: string): string {
    const c = this.form.get(field);
    if (!c?.touched || !c.errors) return '';
    if (c.hasError('required'))   return 'This field is required.';
    if (c.hasError('email'))      return 'Please enter a valid email address.';
    if (c.hasError('minlength'))  return `Minimum ${c.errors['minlength'].requiredLength} characters required.`;
    if (c.hasError('maxlength'))  return `Maximum ${c.errors['maxlength'].requiredLength} characters allowed.`;
    if (c.hasError('pattern'))    return 'Please enter a valid mobile number.';
    return '';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const { firstName, lastName, email, mobile, message } = this.form.value;
    this.svc.createContact({ firstName, lastName, email, mobile: mobile || undefined, message })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.submitted.set(true);
        },
        error: () => {
          this.loading.set(false);
          this.snack.open(
            'Unable to submit your request. Please try again later.',
            'Retry',
            { duration: 6000, panelClass: ['snack-error'] },
          );
        },
      });
  }

  resetForm(): void {
    this.form.reset();
    this.submitted.set(false);
  }
}
