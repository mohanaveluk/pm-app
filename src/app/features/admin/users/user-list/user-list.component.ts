import {
  Component, signal, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../../../services/api.service';
import { UserDetailDialogComponent } from '../user-detail-dialog/user-detail-dialog.component';
import { trigger, style, animate, transition, query, stagger } from '@angular/animations';
import { CommonService } from '../../../../services';

type ViewMode = 'grid' | 'table';

export interface OrgUser {
  id: string;
  uguid: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile?: string;
  position?: string;
  location?: string;
  report_to?: string;
  profile_image?: string;
  is_active: number;
  is_email_verified: boolean;
  organizationId: string;
  role?: { id: number; guid: string; name: string };
  created_at: string;
  last_login?: string;
  gender?: string;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatButtonToggleModule, MatIconModule, MatChipsModule,
    MatTooltipModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDialogModule, MatDividerModule, MatTableModule,
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
  animations: [
    trigger('staggerIn', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger(60, animate('300ms ease', style({ opacity: 1, transform: 'translateY(0)' }))),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class UserListComponent implements OnInit {
  private readonly api    = inject(ApiService);
  protected readonly commonService  = inject(CommonService);

  private readonly snack  = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly cdr    = inject(ChangeDetectorRef);

  readonly loading        = signal(true);
  readonly users          = signal<OrgUser[]>([]);
  readonly organizationId = signal('');
  readonly currentUserId  = signal('');
  readonly viewMode       = signal<ViewMode>('grid');

  readonly tableColumns = ['avatar', 'name', 'role', 'location', 'report_to', 'status', 'actions'];

  ngOnInit(): void {
    const stored = localStorage.getItem('pm_user');
    const me = stored ? JSON.parse(stored) : null;
    this.organizationId.set(me?.organizationId ?? '');
    this.currentUserId.set(me?.id ?? '');
    this.loadUsers();
  }

  private async loadUsers(): Promise<void> {
    const orgId = this.organizationId();
    if (!orgId) { this.loading.set(false); return; }
    try {
      const res: any = await this.api.getOrganizationUsers(orgId).toPromise();
      this.users.set(res?.data ?? res ?? []);
    } catch {
      this.snack.open('Failed to load users', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  statusLabel(u: OrgUser): string {
    if (!u.is_email_verified) return 'Pending';
    return u.is_active ? 'Active' : 'Disabled';
  }

  statusColor(u: OrgUser): string {
    if (!u.is_email_verified) return 'accent';
    return u.is_active ? 'primary' : 'warn';
  }

  avatarUrl(u: OrgUser): string {
    if (u.profile_image) return u.profile_image;
    const gender = (u.gender ?? '').toLowerCase();
    gender === 'female'
      ? 'assets/images/avatar-female.png'
      : 'assets/images/avatar-male.png';
    return "/avatar-default.svg";
  }

  openDetail(u: OrgUser): void {
    this.dialog.open(UserDetailDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: u,
      panelClass: 'user-detail-dialog',
    });
  }

  async resendCode(u: OrgUser, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.api.resendUserVerificationMail(u.id, '').toPromise();
      this.snack.open(`Verification email resent to ${u.email}`, 'OK', { duration: 4000 });
    } catch {
      this.snack.open('Failed to resend verification email', 'Close', { duration: 3000 });
    }
  }

  async toggleStatus(u: OrgUser, event: Event): Promise<void> {
    event.stopPropagation();
    const newState = !u.is_active;
    const action = newState ? 'enable' : 'disable';
    if (!confirm(`Are you sure you want to ${action} ${u.first_name} ${u.last_name}?`)) return;
    try {
      await this.api.toggleUserStatus(u.uguid, newState).toPromise();
      u.is_active = newState ? 1 : 0;
      this.users.update(list => [...list]);
      this.snack.open(`User ${action}d successfully`, 'OK', { duration: 3000 });
      this.cdr.markForCheck();
    } catch {
      this.snack.open(`Failed to ${action} user`, 'Close', { duration: 3000 });
    }
  }

  addUser(): void {
    this.router.navigate(['/admin/users/create']);
  }
}
