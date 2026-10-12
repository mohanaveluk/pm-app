import { Injectable, computed, inject, signal } from '@angular/core';
import {
  AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ClientService } from '../../client/services/client.service';
import { ClientOption } from '../../client/models/client.model';
import { ProjectTypeService } from '../../project-type/services/project-type.service';
import { ProjectType } from '../../project-type/models/project-type.model';
import { ProjectService } from './project.service';
import { ProjectManagerOption, ProjectStatus } from '../models/project.model';
import { ProjectFormValue, blankProjectFormValue } from './project.mapper';

/** A calendar day as a comparable number, ignoring any time of day. */
function dayNumber(value: unknown): number | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}

/** End date, when given, must be later than the start date. */
function dateOrder(group: AbstractControl): ValidationErrors | null {
  const start = dayNumber(group.get('startDate')?.value);
  const end = dayNumber(group.get('endDate')?.value);
  return start !== null && end !== null && end <= start ? { endNotAfterStart: true } : null;
}

/** What got filled in from the selected client, for the note under the form. */
export interface AppliedClientDefaults {
  currencyCode?: boolean;
  measurementSystem?: boolean;
  projectTypeId?: boolean;
  timeZone?: boolean;
}

/**
 * Owns the Project workspace's form state and reference data.
 *
 * Provided per-workspace (not root) so a fresh form and a fresh reference-data
 * fetch happen on each visit.
 */
@Injectable()
export class ProjectFormService {
  private readonly fb = inject(FormBuilder);
  private readonly clientService = inject(ClientService);
  private readonly typeService = inject(ProjectTypeService);
  private readonly projectService = inject(ProjectService);

  // ── Reference data ──────────────────────────────────────────────────
  readonly clients = signal<ClientOption[]>([]);
  readonly projectTypes = signal<ProjectType[]>([]);
  readonly managers = signal<ProjectManagerOption[]>([]);
  readonly referenceLoading = signal(true);
  readonly referenceError = signal<string | null>(null);
  readonly clientsRefreshing = signal(false);

  /** What the last client selection filled in; cleared when the user changes it. */
  readonly appliedDefaults = signal<AppliedClientDefaults | null>(null);

  readonly appliedDefaultLabels = computed(() => {
    const a = this.appliedDefaults();
    if (!a) return [] as string[];
    const labels: string[] = [];
    if (a.projectTypeId) labels.push('project type');
    if (a.currencyCode) labels.push('currency');
    if (a.measurementSystem) labels.push('measurement system');
    if (a.timeZone) labels.push('time zone');
    return labels;
  });

  readonly form: FormGroup = this.buildForm();

  constructor() {
    this.loadReferenceData();
  }

  // ── Reference data ──────────────────────────────────────────────────

  loadReferenceData(): void {
    this.referenceLoading.set(true);
    this.referenceError.set(null);

    forkJoin({
      clients: this.clientService.getActiveClients(),
      types: this.typeService.getActiveProjectTypes(),
      managers: this.projectService.getProjectManagers(),
    }).subscribe({
      next: (res) => {
        this.clients.set(res.clients.data ?? []);
        this.projectTypes.set(res.types.data ?? []);
        this.managers.set(res.managers.data ?? []);
        this.referenceLoading.set(false);
      },
      error: () => {
        this.referenceError.set('Unable to load clients, project types and managers.');
        this.referenceLoading.set(false);
      },
    });
  }

  /**
   * Reloads the client list — used after the user has created a missing client
   * in another tab. Returns the options that were not there before, so the
   * caller can select a single new one.
   */
  refreshClients(onDone: (added: ClientOption[]) => void): void {
    const before = new Set(this.clients().map((c) => c.id));
    this.clientsRefreshing.set(true);

    this.clientService.getActiveClients().subscribe({
      next: (res) => {
        const next = res.data ?? [];
        this.clients.set(next);
        this.clientsRefreshing.set(false);
        onDone(next.filter((c) => !before.has(c.id)));
      },
      error: () => {
        this.clientsRefreshing.set(false);
        onDone([]);
      },
    });
  }

  clientOption(id: string | null | undefined): ClientOption | undefined {
    return this.clients().find((c) => c.id === id);
  }

  /**
   * Fills the fields the client defines defaults for — but only where the user
   * has not already chosen something, so picking a client never overwrites
   * deliberate input. Returns what was applied.
   */
  applyClientDefaults(client: ClientOption | undefined): AppliedClientDefaults {
    const applied: AppliedClientDefaults = {};
    if (!client) {
      this.appliedDefaults.set(null);
      return applied;
    }

    const info = this.group('info');
    const details = this.group('details');
    const empty = (control: AbstractControl | null) => !String(control?.value ?? '').trim();

    const currency = client.defaultProjectCurrencyCode || client.defaultCurrencyCode;
    if (currency && empty(details.get('currencyCode'))) {
      details.get('currencyCode')!.setValue(currency);
      applied.currencyCode = true;
    }
    if (client.measurementSystem && empty(details.get('measurementSystem'))) {
      details.get('measurementSystem')!.setValue(client.measurementSystem);
      applied.measurementSystem = true;
    }
    if (client.timeZone && empty(details.get('timeZone'))) {
      details.get('timeZone')!.setValue(client.timeZone);
      applied.timeZone = true;
    }
    // Only a type that is currently selectable is worth pre-selecting.
    const typeId = client.defaultProjectTypeId;
    if (typeId && empty(info.get('projectTypeId')) && this.projectTypes().some((t) => t.id === typeId)) {
      info.get('projectTypeId')!.setValue(typeId);
      applied.projectTypeId = true;
    }

    this.appliedDefaults.set(Object.keys(applied).length ? applied : null);
    return applied;
  }

  // ── Form construction ───────────────────────────────────────────────

  private buildForm(): FormGroup {
    return this.fb.group({
      info: this.fb.group(
        {
          projectName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
          clientId: ['', [Validators.required]],
          projectTypeId: ['', [Validators.required]],
          status: [ProjectStatus.PLANNED as ProjectStatus, [Validators.required]],
          startDate: [null as Date | null, [Validators.required]],
          endDate: [null as Date | null],
        },
        { validators: [dateOrder] },
      ),
      details: this.fb.group({
        description: ['', [Validators.maxLength(4000)]],
        siteLocation: ['', [Validators.maxLength(255)]],
        addressLine1: ['', [Validators.maxLength(255)]],
        city: ['', [Validators.maxLength(100)]],
        state: ['', [Validators.maxLength(100)]],
        postalCode: ['', [Validators.maxLength(20)]],
        countryCode: [''],
        projectManagerId: [''],
        contractNumber: ['', [Validators.maxLength(100)]],
        clientProjectReference: ['', [Validators.maxLength(100)]],
        currencyCode: [''],
        measurementSystem: [''],
        timeZone: [''],
      }),
    });
  }

  group(key: 'info' | 'details'): FormGroup {
    return this.form.get(key) as FormGroup;
  }

  // ── Value in / out ──────────────────────────────────────────────────

  value(): ProjectFormValue {
    return this.form.getRawValue() as ProjectFormValue;
  }

  patch(value: ProjectFormValue): void {
    this.form.patchValue(value);
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  reset(): void {
    this.patch(blankProjectFormValue());
    this.appliedDefaults.set(null);
  }

  /** The status is only editable while a project is being created. */
  setStatusEditable(editable: boolean): void {
    const control = this.form.get('info.status')!;
    if (editable) control.enable({ emitEvent: false });
    else control.disable({ emitEvent: false });
  }

  markAllTouched(): void {
    this.form.markAllAsTouched();
  }
}
