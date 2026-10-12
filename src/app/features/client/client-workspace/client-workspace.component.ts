import { ChangeDetectionStrategy, Component, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { countryName } from '../../../shared/reference/countries';
import { ClientService } from '../services/client.service';
import { ClientFormService, ClientStepKey } from '../services/client-form.service';
import {
  blankClientFormValue, pickClientSection, toClientFormValue, toClientRequest,
} from '../services/client.mapper';
import { Client, ClientStatus } from '../models/client.model';
import { CreateClientRequest, UpdateClientRequest } from '../models/client-request.model';
import { HasUnsavedClientChanges } from '../guards/unsaved-client.guard';
import { ClientGeneralStepComponent } from '../components/client-general-step/client-general-step.component';
import { ClientAddressesStepComponent } from '../components/client-addresses-step/client-addresses-step.component';
import { ClientContactsStepComponent } from '../components/client-contacts-step/client-contacts-step.component';
import { ClientCommercialStepComponent } from '../components/client-commercial-step/client-commercial-step.component';
import { ClientDefaultsStepComponent } from '../components/client-defaults-step/client-defaults-step.component';
import { ClientDocumentsStepComponent } from '../components/client-documents-step/client-documents-step.component';

/**
 * The Client creation / editing workspace.
 *
 * Create mode is a guided flow: step 1 (name and type) creates the client and
 * generates its code, then each later step saves its own section as the user
 * moves on. Edit mode unlocks every step at once (`linear = false`) and saves
 * the whole record explicitly, with the record's version so a concurrent change
 * is reported rather than overwritten.
 */
@Component({
  selector: 'app-client-workspace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ClientFormService],
  imports: [
    CommonModule, MatStepperModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatTooltipModule, MatProgressSpinnerModule, MatDividerModule,
    ClientGeneralStepComponent, ClientAddressesStepComponent, ClientContactsStepComponent,
    ClientCommercialStepComponent, ClientDefaultsStepComponent, ClientDocumentsStepComponent,
  ],
  templateUrl: './client-workspace.component.html',
  styleUrl: './client-workspace.component.scss',
})
export class ClientWorkspaceComponent implements OnInit, HasUnsavedClientChanges {
  protected readonly formService = inject(ClientFormService);
  private readonly clientService = inject(ClientService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  @ViewChild('stepper') private stepper?: MatStepper;

  protected readonly steps = this.formService.steps;

  protected readonly mode = signal<'create' | 'edit'>('create');
  protected readonly isEdit = computed(() => this.mode() === 'edit');

  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly selectedIndex = signal(0);

  /** Populated in edit mode, and as soon as step 1 is persisted during creation. */
  protected readonly client = signal<Client | null>(null);

  /** Set the moment the client exists; from then on every step issues a PUT. */
  protected readonly clientId = signal<string | null>(null);

  protected readonly lastSavedAt = signal<Date | null>(null);
  private readonly savedSteps = signal<ReadonlySet<ClientStepKey>>(new Set());

  /** Shown instead of the stepper once the guided flow is finished. */
  protected readonly created = signal<Client | null>(null);

  /** Set immediately before a deliberate navigation so the guard stays quiet. */
  private bypassGuard = false;

  protected readonly currentStepTitle = computed(() => this.steps[this.selectedIndex()]?.title ?? '');

  protected readonly ClientStatus = ClientStatus;

  ngOnInit(): void {
    const mode = (this.route.snapshot.data['mode'] as 'create' | 'edit') ?? 'create';
    this.mode.set(mode);

    if (mode === 'edit') {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) void this.loadClient(id);
    }
  }

  private async loadClient(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const res = await lastValueFrom(this.clientService.getClientById(id));
      this.client.set(res.data);
      this.clientId.set(res.data.id);
      this.formService.patch(toClientFormValue(res.data));
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.loadError.set(
        httpErr?.status === 404
          ? 'This client could not be found. It may have been deleted.'
          : 'Unable to load the client. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  // ── Step state ──────────────────────────────────────────────────────

  onStepChange(index: number): void {
    this.selectedIndex.set(index);
  }

  /** Step states drive the ✓ / ! indicators in the header. */
  stepState(key: ClientStepKey, index: number): 'done' | 'error' | 'edit' | 'number' {
    const group = this.formService.group(key);
    if (index === this.selectedIndex()) return 'edit';
    if (group.invalid && group.touched) return 'error';
    if (group.valid && (this.isEdit() || this.savedSteps().has(key))) return 'done';
    return 'number';
  }

  private markStepSaved(key: ClientStepKey): void {
    this.savedSteps.update((s) => new Set(s).add(key));
  }

  isStepInvalid(key: ClientStepKey): boolean {
    const group = this.formService.group(key);
    return group.invalid && group.touched;
  }

  /** Create mode blocks Next until the current step validates. */
  canAdvance(): boolean {
    if (this.isEdit()) return true;
    return this.formService.group(this.steps[this.selectedIndex()].key).valid;
  }

  nextTooltip(): string {
    if (!this.canAdvance()) return 'Complete the required fields on this step first';
    return this.clientId()
      ? 'Saves this section, then moves to the next step'
      : 'Creates the client and generates its code, then moves to the next step';
  }

  /**
   * Validates the current step, persists it, and only then advances. Step 1
   * issues the POST that brings the client into existence; every later step
   * issues a PUT carrying just its own section.
   */
  async next(): Promise<void> {
    const key = this.steps[this.selectedIndex()].key;

    if (this.formService.group(key).invalid) {
      this.formService.markStepTouched(key);
      this.snack.open(
        `Please complete the required information in ${this.steps[this.selectedIndex()].title}.`,
        'Close',
        { duration: 4000 },
      );
      return;
    }

    const saved = await this.persistStep(key);
    if (!saved) return;

    this.stepper?.next();
  }

  /**
   * Persists one step. Returns false when the call failed so the caller can
   * hold position. In edit mode this is a no-op: the user saves explicitly
   * there, and silently rewriting a live record on every step change would be
   * surprising.
   */
  private async persistStep(key: ClientStepKey): Promise<boolean> {
    if (this.isEdit()) return true;

    const group = this.formService.group(key);
    const id = this.clientId();

    // Nothing typed on an optional step — skip the round trip, but still mark
    // it visited so the stepper shows it as handled.
    if (id && group.pristine) {
      this.markStepSaved(key);
      return true;
    }

    this.saving.set(true);
    try {
      let res;
      if (id) {
        const full = toClientRequest(this.formService.value());
        const body: UpdateClientRequest = {
          ...pickClientSection(full, key),
          version: this.client()?.version,
        };
        res = await lastValueFrom(this.clientService.updateClient(id, body));
      } else {
        const full = toClientRequest(this.formService.value());
        // The first save carries only the identity: the other sections are
        // saved by their own steps. The server generates the code and starts
        // the client Active.
        const body = pickClientSection(full, 'general') as CreateClientRequest;
        res = await lastValueFrom(this.clientService.createClient(body));
      }

      const saved = res.data;
      this.client.set(saved);
      this.clientId.set(saved.id);
      this.lastSavedAt.set(new Date());

      if (!id) {
        this.snack.open(`Client ${saved.code} created — continue completing the remaining sections.`, 'OK', {
          duration: 4000,
        });
      }

      group.markAsPristine();
      this.markStepSaved(key);
      return true;
    } catch (err) {
      this.snack.open(this.messageFor(err as HttpErrorResponse), 'Close', {
        duration: 6000, panelClass: ['error-snackbar'],
      });
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  back(): void {
    this.stepper?.previous();
  }

  goToStep(index: number): void {
    // `selectedIndex` is the bound source of truth, so it has to move even when
    // the stepper isn't in the view yet (e.g. jumping back from the success
    // screen, where the stepper is still swapped out).
    this.selectedIndex.set(index);
    if (this.stepper) this.stepper.selectedIndex = index;
  }

  // ── Save ────────────────────────────────────────────────────────────

  /**
   * Edit mode: one PUT carrying the whole record.
   * Create mode: the client already exists (persisted at step 1), so this
   * saves the last step and moves to the success screen.
   */
  async save(closeAfter: boolean): Promise<void> {
    if (this.saving()) return;

    this.formService.markAllTouched();
    const invalidIndex = this.formService.firstInvalidStepIndex();
    if (invalidIndex !== -1) {
      this.goToStep(invalidIndex);
      this.snack.open(
        `Please complete the required information in ${this.steps[invalidIndex].title}.`,
        'Close',
        { duration: 5000, panelClass: ['error-snackbar'] },
      );
      return;
    }

    if (this.isEdit()) {
      const payload: UpdateClientRequest = {
        ...toClientRequest(this.formService.value()),
        version: this.client()?.version,
      };
      this.saving.set(true);
      try {
        const res = await lastValueFrom(this.clientService.updateClient(this.clientId()!, payload));
        this.client.set(res.data);
        this.lastSavedAt.set(new Date());
        // Re-sync the form so child records pick up their server ids.
        this.formService.patch(toClientFormValue(res.data));
        this.snack.open('Client updated successfully', 'OK', { duration: 3000 });
        if (closeAfter) this.leaveTo(['/admin/clients']);
      } catch (err) {
        this.snack.open(this.messageFor(err as HttpErrorResponse), 'Close', {
          duration: 6000, panelClass: ['error-snackbar'],
        });
      } finally {
        this.saving.set(false);
      }
      return;
    }

    // Create mode, final step: nothing left to save on Documents, so hand off
    // to the summary — saving any step that is still dirty first.
    const finalKey = this.steps[this.steps.length - 1].key;
    const saved = await this.persistStep(finalKey);
    if (!saved) return;

    const finished = this.client();
    if (finished) {
      this.formService.form.markAsPristine();
      this.created.set(finished);
    }
  }

  private messageFor(err: HttpErrorResponse): string {
    switch (err?.status) {
      case 0:   return 'Cannot reach the server. Check your connection and try again.';
      case 400: return err.error?.message || 'Some information is invalid. Review the highlighted steps.';
      case 401: return 'Your session has expired. Please sign in again.';
      case 403: return err.error?.message || 'You do not have permission to save this client.';
      case 404: return 'The client or one of the selected lookups could not be found. Refresh and try again.';
      case 409: return err.error?.message || 'A client with these details already exists.';
      case 422: return err.error?.message || 'The submitted data could not be processed.';
      case 500: return 'Something went wrong. Please try again.';
      default:  return err?.error?.message || 'The client could not be saved.';
    }
  }

  // ── Success screen actions ──────────────────────────────────────────

  viewCreated(): void {
    const id = this.created()?.id;
    if (id) this.leaveTo(['/admin/clients', id]);
  }

  createAnother(): void {
    // Clear the persisted identity so the next Next() issues a fresh POST.
    this.created.set(null);
    this.client.set(null);
    this.clientId.set(null);
    this.lastSavedAt.set(null);
    this.savedSteps.set(new Set());
    this.formService.patch(blankClientFormValue());
    this.formService.loadReferenceData();
    this.goToStep(0);
  }

  /**
   * Plain navigation — deliberately does NOT set `bypassGuard`, so leaving with
   * unsaved edits still prompts. Used by Cancel and the header back arrow.
   */
  backToList(): void {
    void this.router.navigate(['/admin/clients']);
  }

  cancel(): void {
    this.backToList();
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
    return !this.bypassGuard && !this.created() && this.formService.form.dirty;
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.hasUnsavedChanges()) return true;

    // Once step 1 has been persisted the client exists regardless of leaving,
    // so the prompt says what is actually at risk: only this step's edits.
    const persisted = !!this.clientId() && !this.isEdit();
    const message = persisted
      ? `${this.client()?.code} has already been created. Changes on this step have not been saved yet — leave without saving them?`
      : 'You have unsaved changes to this client. Leave without saving?';

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        title: 'Unsaved Changes',
        message,
        confirmText: 'Leave',
        cancelText: 'Stay',
        color: 'warn',
        icon: 'warning',
      },
    });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }

  // ── Header helpers ──────────────────────────────────────────────────

  protected countryLabel(code: string | null | undefined): string {
    return code ? countryName(code) : '—';
  }

  protected statusClass(status: ClientStatus | null): string {
    switch (status) {
      case ClientStatus.ACTIVE:   return 'status-chip status-chip--active';
      case ClientStatus.INACTIVE: return 'status-chip status-chip--inactive';
      default: return 'status-chip status-chip--new';
    }
  }
}
