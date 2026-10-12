import { ChangeDetectionStrategy, Component, OnInit, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { PermissionService } from '../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../core/rbac/permissions.const';
import { countryName } from '../../../shared/reference/countries';
import { ProjectService } from '../services/project.service';
import {
  ProjectStatus, ProjectSummary, measurementLabel, projectStatusLabel,
} from '../models/project.model';
import {
  ProjectStatusDialogComponent, ProjectStatusDialogData, ProjectStatusDialogResult,
} from '../components/project-status-dialog/project-status-dialog.component';

interface ViewField {
  label: string;
  value: string;
  full?: boolean;
}

/** Read-only presentation of a Project, with its client and schedule summary. */
@Component({
  selector: 'app-project-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterLink, MatButtonModule, MatIconModule, MatChipsModule, MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './project-view.component.html',
  styleUrl: './project-view.component.scss',
})
export class ProjectViewComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly permissionService = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly PERMISSIONS = PERMISSIONS;

  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly summary = signal<ProjectSummary | null>(null);
  protected readonly saving = signal(false);

  protected readonly project = computed(() => this.summary()?.project ?? null);

  protected readonly canChangeStatus = computed(
    () => (this.summary()?.allowedStatuses.length ?? 0) > 0,
  );

  // ── Section data ────────────────────────────────────────────────────

  protected readonly informationFields = computed<ViewField[]>(() => {
    const p = this.project();
    if (!p) return [];
    return this.present([
      { label: 'Project No.', value: p.code },
      { label: 'Project Name', value: p.projectName },
      { label: 'Project Type', value: p.projectTypeName ?? '' },
      { label: 'Status', value: projectStatusLabel(p.status) },
      { label: 'Start Date', value: this.date(p.startDate) },
      { label: 'End Date', value: this.date(p.endDate) },
      { label: 'Description', value: p.description ?? '', full: true },
    ]);
  });

  protected readonly detailFields = computed<ViewField[]>(() => {
    const p = this.project();
    if (!p) return [];
    const address = [p.addressLine1, p.city, p.state, p.postalCode].filter((x) => !!x).join(', ');
    return this.present([
      { label: 'Project Manager', value: p.projectManagerName ?? '' },
      { label: 'Project Location / Site', value: p.siteLocation ?? '' },
      { label: 'Site Address', value: address, full: true },
      { label: 'Country', value: p.countryCode ? countryName(p.countryCode) : '' },
      { label: 'Contract Number', value: p.contractNumber ?? '' },
      { label: 'Client Project Reference', value: p.clientProjectReference ?? '' },
      { label: 'Project Currency', value: p.currencyCode ?? '' },
      { label: 'Measurement System', value: measurementLabel(p.measurementSystem) },
      { label: 'Project Time Zone', value: p.timeZone ?? '' },
    ]);
  });

  protected readonly auditFields = computed<ViewField[]>(() => {
    const p = this.project();
    if (!p) return [];
    const stamp = (v: string | null) => (v ? new Date(v).toLocaleString() : '');
    return this.present([
      { label: 'Created By', value: p.createdBy ?? '' },
      { label: 'Created At', value: stamp(p.createdAt) },
      { label: 'Updated By', value: p.updatedBy ?? '' },
      { label: 'Updated At', value: stamp(p.updatedAt) },
      { label: 'Last Status Change', value: stamp(p.statusChangedAt) },
      { label: 'Changed By', value: p.statusChangedBy ?? '' },
      { label: 'Reason', value: p.statusReason ?? '', full: true },
    ]);
  });

  private present(fields: ViewField[]): ViewField[] {
    return fields.filter((f) => f.value && f.value !== '—');
  }

  private date(value: string | null): string {
    if (!value) return '';
    // A date-only string is a calendar date, not an instant — format it without
    // a time zone so it never shifts a day.
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const res = await lastValueFrom(this.projectService.getProjectSummary(id));
      this.summary.set(res.data);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.loadError.set(
        httpErr?.status === 404
          ? 'This project could not be found. It may have been deleted.'
          : 'Unable to load the project. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  edit(): void {
    const id = this.project()?.id;
    if (id) void this.router.navigate(['/projects', id, 'edit']);
  }

  backToList(): void {
    void this.router.navigate(['/projects']);
  }

  async changeStatus(): Promise<void> {
    const s = this.summary();
    if (!s || this.saving()) return;

    const ref = this.dialog.open<
      ProjectStatusDialogComponent, ProjectStatusDialogData, ProjectStatusDialogResult
    >(ProjectStatusDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        code: s.project.code,
        projectName: s.project.projectName,
        current: s.project.status,
        allowed: s.allowedStatuses,
      },
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    this.saving.set(true);
    try {
      await lastValueFrom(this.projectService.updateStatus(s.project.id, {
        status: result.status,
        reason: result.reason || undefined,
      }));
      this.snack.open('Project status updated', 'OK', { duration: 3000 });
      await this.load(s.project.id);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.snack.open(
        httpErr?.error?.message || 'The status could not be changed.',
        'Close',
        { duration: 6000, panelClass: ['error-snackbar'] },
      );
    } finally {
      this.saving.set(false);
    }
  }

  // ── Display helpers ────────────────────────────────────────────────

  protected statusClass(status: ProjectStatus | undefined): string {
    return `status-chip status-chip--${(status ?? ProjectStatus.PLANNED).toLowerCase().replace('_', '-')}`;
  }

  protected statusLabel(status: ProjectStatus | undefined): string {
    return projectStatusLabel(status);
  }

  protected country(code: string | null | undefined): string {
    return code ? countryName(code) : '';
  }

  protected scheduleText(): string {
    const s = this.summary()?.schedule;
    if (!s || s.daysToEnd === null) return '';
    if (s.isOverdue) return `${Math.abs(s.daysToEnd)} day${Math.abs(s.daysToEnd) === 1 ? '' : 's'} past the planned end`;
    if (s.daysToEnd === 0) return 'Planned to finish today';
    if (s.daysToEnd > 0) return `${s.daysToEnd} day${s.daysToEnd === 1 ? '' : 's'} to the planned end`;
    return `${Math.abs(s.daysToEnd)} day${Math.abs(s.daysToEnd) === 1 ? '' : 's'} since the planned end`;
  }
}
