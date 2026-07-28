import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AvailableUserOption, UserServiceGroup } from '../../models/service-group-user.model';

/**
 * Reusable "who is this?" profile card — shown whenever an administrator picks
 * a user, to reduce accidental assignments. Only surfaces fields that genuinely
 * exist on the backend User entity (no employeeId/department/discipline columns
 * exist yet, so those are intentionally omitted rather than fabricated).
 */
@Component({
  selector: 'app-user-profile-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatChipsModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './user-profile-preview.component.html',
  styleUrl: './user-profile-preview.component.scss',
})
export class UserProfilePreviewComponent {
  readonly user = input<AvailableUserOption | null>(null);
  readonly currentGroups = input<UserServiceGroup[]>([]);
  readonly loadingGroups = input(false);

  protected readonly initials = computed(() => {
    const name = this.user()?.fullName ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });
}
