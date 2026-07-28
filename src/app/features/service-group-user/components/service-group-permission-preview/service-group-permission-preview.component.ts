import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PermissionPreview } from '../../services/service-group-user.service';

/**
 * Reusable, embeddable "what will this grant?" panel — shows a Service Group's
 * Activities and their granted Permissions as expansion panels + chips, mirroring
 * the Service Group module's own view dialog / Azure RBAC style. Used inside the
 * Assign/Edit form dialog (after picking a Service Group) and the read-only View dialog.
 */
@Component({
  selector: 'app-service-group-permission-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatChipsModule, MatExpansionModule, MatProgressSpinnerModule],
  templateUrl: './service-group-permission-preview.component.html',
  styleUrl: './service-group-permission-preview.component.scss',
})
export class ServiceGroupPermissionPreviewComponent {
  readonly preview = input<PermissionPreview | null>(null);
  readonly loading = input(false);
}
