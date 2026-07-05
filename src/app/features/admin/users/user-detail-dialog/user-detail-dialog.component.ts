import { Component, inject, Inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../../services/api.service';
import { OrgUser } from '../user-list/user-list.component';

@Component({
  selector: 'app-user-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatDividerModule, MatTooltipModule, MatSnackBarModule,
  ],
  templateUrl: './user-detail-dialog.component.html',
  styleUrl: './user-detail-dialog.component.scss',
})
export class UserDetailDialogComponent {
  private readonly api   = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly cdr   = inject(ChangeDetectorRef);
  readonly dialogRef     = inject(MatDialogRef<UserDetailDialogComponent>);

  user!: ReturnType<typeof signal<OrgUser>>;

  constructor(@Inject(MAT_DIALOG_DATA) public data: OrgUser) {
    this.user = signal<OrgUser>({ ...data });
  }

  avatarUrl(): string {
    const u = this.user();
    if (u.profile_image) return u.profile_image;
    const gender = (u.gender ?? '').toLowerCase();
    gender === 'female'
      ? 'assets/images/avatar-female.png'
      : 'assets/images/avatar-male.png';
    return "/avatar-default.svg";
  }

  statusLabel(): string {
    const u = this.user();
    if (!u.is_email_verified) return 'Pending';
    return u.is_active ? 'Active' : 'Disabled';
  }

  statusColor(): string {
    const u = this.user();
    if (!u.is_email_verified) return 'accent';
    return u.is_active ? 'primary' : 'warn';
  }

  async resendCode(): Promise<void> {
    try {
      await this.api.resendUserVerificationMail(this.user().id, '').toPromise();
      this.snack.open('Verification email resent successfully', 'OK', { duration: 4000 });
    } catch {
      this.snack.open('Failed to resend verification email', 'Close', { duration: 3000 });
    }
  }

  async toggleStatus(): Promise<void> {
    const u = this.user();
    const newState = !u.is_active;
    const action = newState ? 'enable' : 'disable';
    if (!confirm(`Are you sure you want to ${action} ${u.first_name} ${u.last_name}?`)) return;
    try {
      await this.api.toggleUserStatus(u.uguid, newState).toPromise();
      this.user.update(prev => ({ ...prev, is_active: newState ? 1 : 0 }));
      this.snack.open(`User ${action}d successfully`, 'OK', { duration: 3000 });
      this.cdr.markForCheck();
    } catch {
      this.snack.open(`Failed to ${action} user`, 'Close', { duration: 3000 });
    }
  }

  close(): void { this.dialogRef.close(this.user()); }
}
