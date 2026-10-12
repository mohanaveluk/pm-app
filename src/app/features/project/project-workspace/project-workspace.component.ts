import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
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
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { COUNTRIES } from '../../../shared/reference/countries';
import { CURRENCY_OPTIONS, ClientOption, timeZoneOptions } from '../../client/models/client.model';
import { ProjectService } from '../services/project.service';
import { ProjectFormService } from '../services/project-form.service';
import { toProjectFormValue, toProjectRequest } from '../services/project.mapper';
import {
  PROJECT_MEASUREMENT_OPTIONS, PROJECT_STATUS_OPTIONS, Project, ProjectStatus,
} from '../models/project.model';
import { HasUnsavedProjectChanges } from '../guards/unsaved-project.guard';

/**
 * The Project creation / editing screen.
 *
 * Deliberately one page with two sections — Project Information and Project
 * Details — so creating a project stays quick. WBS, cost codes, areas, systems
 * and work packages are configured after the project exists.
 *
 * The client is chosen by name but only its id is stored; its code and name are
 * shown from the Client Master and never sent back.
 */
@Component({
  selector: 'app-project-workspace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProjectFormService],
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterLink, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './project-workspace.component.html',
  styleUrl: './project-workspace.component.scss',
})
export class ProjectWorkspaceComponent implements OnInit, HasUnsavedProjectChanges {
  protected readonly formService = inject(ProjectFormService);
  private readonly projectService = inject(ProjectService);
  private readonly permissionService = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly countries = COUNTRIES;
  protected readonly currencies = CURRENCY_OPTIONS;
  protected readonly timeZones = timeZoneOptions();
  protected readonly statusOptions = PROJECT_STATUS_OPTIONS;
  protected readonly measurementOptions = PROJECT_MEASUREMENT_OPTIONS;

  protected readonly mode = signal<'create' | 'edit'>('create');
  protected readonly isEdit = computed(() => this.mode() === 'edit');

  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);

  /** Populated in edit mode. */
  protected readonly project = signal<Project | null>(null);

  protected readonly clientSearch = signal('');
  protected readonly currencySearch = signal('');
  protected readonly timeZoneSearch = signal('');

  /** Set immediately before a deliberate navigation so the guard stays quiet. */
  private bypassGuard = false;

  protected get info(): FormGroup {
    return this.formService.group('info');
  }

  protected get details(): FormGroup {
    return this.formService.group('details');
  }

  /**
   * The active clients, plus the project's own client when it is no longer in
   * that list (deactivated since), so the field still shows who it belongs to.
   */
  private readonly allClients = computed<ClientOption[]>(() => {
    const options = this.formService.clients();
    const p = this.project();
    if (p && !options.some((c) => c.id === p.clientId)) {
      return [{
        id: p.clientId,
        code: p.clientCode ?? '',
        clientName: p.clientName ?? p.clientId,
        displayName: p.clientDisplayName,
        clientTypeId: '',
        countryCode: null,
      }, ...options];
    }
    return options;
  });

  /** Search by client code or name. */
  protected readonly visibleClients = computed(() => {
    const term = this.clientSearch().trim().toLowerCase();
    const all = this.allClients();
    return term
      ? all.filter((c) =>
          c.code.toLowerCase().includes(term)
          || c.clientName.toLowerCase().includes(term)
          || (c.displayName ?? '').toLowerCase().includes(term))
      : all;
  });

  /** Mirrors the start date so the end date's calendar can follow it. */
  private readonly startDateValue = toSignal(
    this.formService.group('info').get('startDate')!.valueChanges,
    { initialValue: this.formService.group('info').get('startDate')!.value as Date | null },
  );

  /**
   * The earliest end date the calendar offers: the day after the start date.
   * Null until a start date is chosen, so nothing is disabled before then.
   */
  protected readonly minEndDate = computed<Date | null>(() => {
    const start = this.startDateValue();
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) return null;
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  });

  protected readonly visibleCurrencies = computed(() => {
    const term = this.currencySearch().trim().toLowerCase();
    return term
      ? this.currencies.filter((c) => c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term))
      : this.currencies;
  });

  protected readonly visibleTimeZones = computed(() => {
    const term = this.timeZoneSearch().trim().toLowerCase();
    return term ? this.timeZones.filter((z) => z.toLowerCase().includes(term)) : this.timeZones;
  });

  /** Mirrors the control so `selectedClient` reacts when the user (or a load) changes it. */
  private readonly clientIdValue = toSignal(
    this.formService.group('info').get('clientId')!.valueChanges,
    { initialValue: this.formService.group('info').get('clientId')!.value as string },
  );

  /** The stored client reference, shown beneath the field as the example form does. */
  protected readonly selectedClient = computed(
    () => this.allClients().find((c) => c.id === this.clientIdValue()) ?? null,
  );

  ngOnInit(): void {
    const mode = (this.route.snapshot.data['mode'] as 'create' | 'edit') ?? 'create';
    this.mode.set(mode);
    // A project changes status through its own action once it exists.
    this.formService.setStatusEditable(mode === 'create');

    if (mode === 'edit') {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) void this.loadProject(id);
    }
  }

  private async loadProject(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const res = await lastValueFrom(this.projectService.getProjectById(id));
      this.project.set(res.data);
      this.formService.patch(toProjectFormValue(res.data));
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

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  // ── Client selection ────────────────────────────────────────────────

  protected clientLabel(c: ClientOption): string {
    return `${c.code} — ${c.displayName || c.clientName}`;
  }

  /** Fires only for a choice the user made, so loading a record never rewrites it. */
  protected onClientSelected(clientId: string): void {
    const client = this.allClients().find((c) => c.id === clientId);
    this.formService.applyClientDefaults(client);
  }

  protected refreshClients(): void {
    this.formService.refreshClients((added) => {
      if (added.length === 1) {
        const [client] = added;
        this.info.get('clientId')!.setValue(client.id);
        this.info.get('clientId')!.markAsDirty();
        this.onClientSelected(client.id);
        this.snack.open(`Selected the new client ${this.clientLabel(client)}.`, 'OK', { duration: 4000 });
      } else if (added.length > 1) {
        this.snack.open(`${added.length} new clients are now available in the list.`, 'OK', { duration: 4000 });
      } else {
        this.snack.open('The client list is up to date.', 'OK', { duration: 2500 });
      }
    });
  }

  // ── Validation messages ─────────────────────────────────────────────

  protected err(group: FormGroup, controlName: string): string {
    const control = group.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['required']) {
      switch (controlName) {
        case 'projectName': return 'Project name is required';
        case 'clientId': return 'Select a client';
        case 'projectTypeId': return 'Select a project type';
        case 'startDate': return 'Start date is required';
        default: return 'This field is required';
      }
    }
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    return '';
  }

  /** The end date is on or before the start date — whichever of the two rules caught it. */
  protected get endNotAfterStart(): boolean {
    const end = this.info.get('endDate');
    return !!end && (end.touched || end.dirty)
      && (!!this.info.errors?.['endNotAfterStart'] || end.hasError('matDatepickerMin'));
  }

  /** The end date is optional, and the field is read-only, so it needs its own clear. */
  protected clearEndDate(): void {
    const end = this.info.get('endDate')!;
    end.setValue(null);
    end.markAsDirty();
    end.markAsTouched();
  }

  // ── Save ────────────────────────────────────────────────────────────

  async save(closeAfter: boolean): Promise<void> {
    if (this.saving()) return;

    this.formService.markAllTouched();
    if (this.formService.form.invalid) {
      this.snack.open('Please complete the required information.', 'Close', {
        duration: 4000, panelClass: ['error-snackbar'],
      });
      return;
    }

    const value = this.formService.value();
    this.saving.set(true);
    try {
      if (this.isEdit()) {
        const id = this.project()!.id;
        const res = await lastValueFrom(
          this.projectService.updateProject(id, toProjectRequest(value)),
        );
        this.project.set(res.data);
        this.formService.patch(toProjectFormValue(res.data));
        this.snack.open('Project updated successfully', 'OK', { duration: 3000 });
        if (closeAfter) this.leaveTo(['/projects', id]);
      } else {
        const res = await lastValueFrom(
          this.projectService.createProject(toProjectRequest(value, { includeStatus: true })),
        );
        this.formService.form.markAsPristine();
        this.snack.open(
          `Project ${res.data.code} created — WBS, cost codes and work packages can be set up next.`,
          'OK',
          { duration: 5000 },
        );
        this.leaveTo(['/projects', res.data.id]);
      }
    } catch (err) {
      this.snack.open(this.messageFor(err as HttpErrorResponse), 'Close', {
        duration: 6000, panelClass: ['error-snackbar'],
      });
    } finally {
      this.saving.set(false);
    }
  }

  private messageFor(err: HttpErrorResponse): string {
    switch (err?.status) {
      case 0:   return 'Cannot reach the server. Check your connection and try again.';
      case 400: return err.error?.message || 'Some information is invalid. Please review the form.';
      case 401: return 'Your session has expired. Please sign in again.';
      case 403: return err.error?.message || 'You do not have permission to save this project.';
      case 404: return 'The project could not be found. It may have been deleted.';
      case 409: return err.error?.message || 'A project with these details already exists.';
      case 500: return 'Something went wrong. Please try again.';
      default:  return err?.error?.message || 'The project could not be saved.';
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────

  /** Plain navigation — keeps the unsaved-changes prompt. */
  backToList(): void {
    void this.router.navigate(['/projects']);
  }

  cancel(): void {
    const id = this.project()?.id;
    void this.router.navigate(id ? ['/projects', id] : ['/projects']);
  }

  /** Navigation that follows a completed save, where prompting would be noise. */
  private leaveTo(commands: unknown[]): void {
    this.bypassGuard = true;
    void this.router.navigate(commands as string[]);
  }

  // ── Unsaved-changes protection ──────────────────────────────────────

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  private hasUnsavedChanges(): boolean {
    return !this.bypassGuard && this.formService.form.dirty;
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.hasUnsavedChanges()) return true;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        title: 'Unsaved Changes',
        message: 'You have unsaved changes to this project. Leave without saving?',
        confirmText: 'Leave',
        cancelText: 'Stay',
        color: 'warn',
        icon: 'warning',
      },
    });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }

  // ── Header helpers ──────────────────────────────────────────────────

  protected statusClass(status: ProjectStatus | null): string {
    return `status-chip status-chip--${(status ?? 'planned').toLowerCase().replace('_', '-')}`;
  }

  protected statusLabel(status: ProjectStatus | null): string {
    return PROJECT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'New';
  }
}
