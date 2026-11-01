import {
  Component, signal, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, computed,
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../../../services/api.service';
import { UserDetailDialogComponent } from '../user-detail-dialog/user-detail-dialog.component';
import { trigger, style, animate, transition, query, stagger } from '@angular/animations';
import { CommonService, AuthService } from '../../../../services';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

type ViewMode = 'grid' | 'table';
type StatusFilter = 'all' | 'active' | 'disabled' | 'pending';
type AccountTypeFilter = 'all' | 'internal' | 'external';

/** Internal staff and external (vendor-side) accounts are listed apart. */
interface UserSection {
  key: Exclude<AccountTypeFilter, 'all'>;
  title: string;
  hint: string;
  icon: string;
  users: OrgUser[];
}

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
  /** 1 = internal staff (default), 0 = external (vendor-side) account. */
  is_internal?: number;
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
    MatFormFieldModule, MatInputModule, MatSelectModule,
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
  private readonly auth   = inject(AuthService);

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

  // ── Search & filters (client-side: the org's users are loaded in one call) ──
  readonly searchTerm     = signal('');
  readonly statusFilter   = signal<StatusFilter>('all');
  readonly roleFilter     = signal('');
  readonly typeFilter     = signal<AccountTypeFilter>('all');
  readonly locationFilter = signal('');
  readonly positionFilter = signal('');

  /** Dropdown options are whatever the loaded users actually have, so no empty choices. */
  readonly roleOptions     = computed(() => this.distinct(this.users().map(u => u.role?.name)));
  readonly locationOptions = computed(() => this.distinct(this.users().map(u => u.location)));
  readonly positionOptions = computed(() => this.distinct(this.users().map(u => u.position)));

  readonly hasActiveFilters = computed(() =>
    !!this.searchTerm().trim()
    || this.statusFilter() !== 'all'
    || !!this.roleFilter()
    || this.typeFilter() !== 'all'
    || !!this.locationFilter()
    || !!this.positionFilter(),
  );

  readonly filteredUsers = computed(() => {
    // Every word typed must match somewhere, so "john dubai" narrows by both.
    const words = this.searchTerm().toLowerCase().split(/\s+/).filter(Boolean);
    const status = this.statusFilter();
    const role = this.roleFilter();
    const type = this.typeFilter();
    const location = this.locationFilter();
    const position = this.positionFilter();

    return this.users().filter((u) => {
      if (status !== 'all' && this.statusKey(u) !== status) return false;
      if (role && u.role?.name !== role) return false;
      if (type === 'external' && u.is_internal !== 0) return false;
      if (type === 'internal' && u.is_internal === 0) return false;
      if (location && u.location !== location) return false;
      if (position && u.position !== position) return false;

      if (!words.length) return true;
      const haystack = [
        u.first_name, u.last_name, u.email, u.mobile, u.role?.name,
        u.position, u.location, u.report_to,
      ].filter(Boolean).join(' ').toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  });

  /** Internal users first, then external users — each its own section / table. */
  readonly sections = computed<UserSection[]>(() => {
    const list = this.filteredUsers();
    const type = this.typeFilter();
    const all: UserSection[] = [
      {
        key: 'internal',
        title: 'Internal Users',
        hint: "Your organisation's staff",
        icon: 'badge',
        users: list.filter((u) => u.is_internal !== 0),
      },
      {
        key: 'external',
        title: 'External Users',
        hint: 'Vendor-side accounts — scoped to the Vendor Master records they create',
        icon: 'storefront',
        users: list.filter((u) => u.is_internal === 0),
      },
    ];
    return all.filter((s) => type === 'all' || type === s.key);
  });

  readonly deletingId = signal<string | null>(null);

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.roleFilter.set('');
    this.typeFilter.set('all');
    this.locationFilter.set('');
    this.positionFilter.set('');
  }

  private statusKey(u: OrgUser): Exclude<StatusFilter, 'all'> {
    if (!u.is_email_verified) return 'pending';
    return u.is_active ? 'active' : 'disabled';
  }

  private distinct(values: (string | null | undefined)[]): string[] {
    return [...new Set(values.map(v => (v ?? '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }

  ngOnInit(): void {
    const me = this.auth.user();
    this.organizationId.set(me?.organizationId ?? '');
    // The session's "id" is the user's uguid.
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

  /** Anyone but yourself can be deleted (the API also keeps the last Organization Admin). */
  canDelete(u: OrgUser): boolean {
    return u.uguid !== this.currentUserId();
  }

  async deleteUser(u: OrgUser, event?: Event): Promise<void> {
    event?.stopPropagation();
    const name = `${u.first_name} ${u.last_name ?? ''}`.trim() || u.email;
    const confirmed = await firstValueFrom(this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent, {
        width: '440px',
        maxWidth: '95vw',
        data: {
          title: 'Delete user?',
          message: `${name} (${u.email}) will be removed from the user list and can no longer sign in. `
            + 'Their records and history are kept.',
          confirmText: 'Delete',
          icon: 'person_remove',
          color: 'warn',
        },
      },
    ).afterClosed());
    if (!confirmed) return;

    this.deletingId.set(u.id);
    try {
      await firstValueFrom(this.api.deleteUser(u.uguid));
      this.users.update((list) => list.filter((x) => x.id !== u.id));
      this.snack.open(`${name} deleted`, 'OK', { duration: 3000 });
    } catch (err) {
      const e = err as HttpErrorResponse;
      const message = [400, 403, 404, 409].includes(e?.status) && e.error?.message
        ? (Array.isArray(e.error.message) ? e.error.message.join(' ') : e.error.message)
        : 'Failed to delete user';
      this.snack.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
    } finally {
      this.deletingId.set(null);
      this.cdr.markForCheck();
    }
  }

  /** Only active, verified accounts have a password to reset — and never your own. */
  canResetPassword(u: OrgUser): boolean {
    return !!u.is_active && u.is_email_verified && u.uguid !== this.currentUserId();
  }

  resetPassword(u: OrgUser, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/admin/users', u.uguid, 'reset-password']);
  }

  addUser(): void {
    this.router.navigate(['/admin/users/create']);
  }

  editUser(u: OrgUser, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/admin/users', u.uguid, 'edit']);
  }
}
