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
import { PermissionService } from '../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../core/rbac/permissions.const';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MaterialService } from '../services/material.service';
import { MaterialFormService, MaterialStepKey } from '../services/material-form.service';
import { pickMaterialSection, toMaterialFormValue, toMaterialRequest } from '../services/material.mapper';
import { Material, MaterialStatus } from '../models/material.model';
import { HasUnsavedChanges } from '../guards/unsaved-material.guard';
import { MaterialGeneralStepComponent } from '../components/material-general-step/material-general-step.component';
import { MaterialTechnicalStepComponent } from '../components/material-technical-step/material-technical-step.component';
import { MaterialProcurementStepComponent } from '../components/material-procurement-step/material-procurement-step.component';
import { MaterialInventoryStepComponent } from '../components/material-inventory-step/material-inventory-step.component';
import { MaterialQualityStepComponent } from '../components/material-quality-step/material-quality-step.component';
import { MaterialAccountingStepComponent } from '../components/material-accounting-step/material-accounting-step.component';
import { MaterialSafetyStepComponent } from '../components/material-safety-step/material-safety-step.component';
import { MaterialLogisticsStepComponent } from '../components/material-logistics-step/material-logistics-step.component';
import { MaterialDocumentsStepComponent } from '../components/material-documents-step/material-documents-step.component';

/**
 * The Material creation / editing workspace.
 *
 * Create mode enforces sequential progress — only Step 1 has mandatory fields, so
 * in practice the gate is "complete General, then roam". Edit mode unlocks every
 * step immediately (`linear = false`), because the record already satisfies the
 * required fields and users jump straight to the section they came to change.
 */
@Component({
  selector: 'app-material-workspace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MaterialFormService],
  imports: [
    CommonModule, MatStepperModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatTooltipModule, MatProgressSpinnerModule, MatDividerModule,
    MaterialGeneralStepComponent, MaterialTechnicalStepComponent, MaterialProcurementStepComponent,
    MaterialInventoryStepComponent, MaterialQualityStepComponent, MaterialAccountingStepComponent,
    MaterialSafetyStepComponent, MaterialLogisticsStepComponent, MaterialDocumentsStepComponent,
  ],
  templateUrl: './material-workspace.component.html',
  styleUrl: './material-workspace.component.scss',
})
export class MaterialWorkspaceComponent implements OnInit, HasUnsavedChanges {
  protected readonly formService = inject(MaterialFormService);
  private readonly materialService = inject(MaterialService);
  private readonly permissionService = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  @ViewChild('stepper') private stepper?: MatStepper;

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly steps = this.formService.steps;

  protected readonly mode = signal<'create' | 'edit'>('create');
  protected readonly isEdit = computed(() => this.mode() === 'edit');

  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly selectedIndex = signal(0);

  /** Populated in edit mode, and as soon as step 1 is persisted during creation. */
  protected readonly material = signal<Material | null>(null);

  /**
   * Set the moment the material is persisted (end of step 1 in create mode).
   * From then on every step issues a PUT against this id rather than a POST.
   */
  protected readonly materialId = signal<string | null>(null);

  /** Timestamp of the last successful incremental save, for the "Saved" indicator. */
  protected readonly lastSavedAt = signal<Date | null>(null);

  /** Steps already persisted to the server — drives the ✓ marks in create mode. */
  private readonly savedSteps = signal<ReadonlySet<MaterialStepKey>>(new Set());

  /** Shown instead of the stepper once the wizard is finished. */
  protected readonly created = signal<Material | null>(null);

  /** Set immediately before a deliberate navigation so the guard stays quiet. */
  private bypassGuard = false;

  protected readonly currentStepTitle = computed(() => this.steps[this.selectedIndex()]?.title ?? '');

  ngOnInit(): void {
    const mode = (this.route.snapshot.data['mode'] as 'create' | 'edit') ?? 'create';
    this.mode.set(mode);

    if (mode === 'edit') {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) this.loadMaterial(id);
    }
  }

  private async loadMaterial(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const res = await lastValueFrom(this.materialService.getMaterialById(id));
      this.material.set(res.data);
      this.materialId.set(res.data.id);
      this.formService.patch(toMaterialFormValue(res.data));
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.loadError.set(
        httpErr?.status === 404
          ? 'This material could not be found. It may have been deleted.'
          : 'Unable to load the material. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  // ── Step state ──────────────────────────────────────────────────────

  onStepChange(index: number): void {
    this.selectedIndex.set(index);
  }

  /** Material step states drive the ✓ / ! indicators in the header. */
  stepState(key: MaterialStepKey, index: number): 'done' | 'error' | 'edit' | 'number' {
    const group = this.formService.group(key);
    if (index === this.selectedIndex()) return 'edit';
    if (group.invalid && group.touched) return 'error';
    // In create mode a step is complete once it has been persisted; in edit mode
    // every valid step is already on the server.
    if (group.valid && (this.isEdit() || this.savedSteps().has(key))) return 'done';
    return 'number';
  }

  private markStepSaved(key: MaterialStepKey): void {
    this.savedSteps.update((s) => new Set(s).add(key));
  }

  isStepInvalid(key: MaterialStepKey): boolean {
    const group = this.formService.group(key);
    return group.invalid && group.touched;
  }

  /** Create mode blocks Next until the current step validates. */
  canAdvance(): boolean {
    if (this.isEdit()) return true;
    return this.formService.group(this.steps[this.selectedIndex()].key).valid;
  }

  /** Explains what the primary button will do, and why it may be disabled. */
  nextTooltip(): string {
    if (!this.canAdvance()) return 'Complete the required fields on this step first';
    return this.materialId()
      ? 'Saves this section, then moves to the next step'
      : 'Creates the material and generates its code, then moves to the next step';
  }

  /**
   * Validates the current step, persists it, and only then advances.
   *
   * Step 1 issues the POST that brings the material into existence; every later
   * step issues a PUT carrying just its own section. Advancing is blocked if the
   * save fails, so the wizard never runs ahead of what the server holds.
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
   * Persists one step. Returns false when the call failed so the caller can hold
   * position. In edit mode this is a no-op: the user saves explicitly there, and
   * silently rewriting a live record on every step change would be surprising.
   */
  private async persistStep(key: MaterialStepKey): Promise<boolean> {
    if (this.isEdit()) return true;

    const group = this.formService.group(key);
    const id = this.materialId();

    // Nothing typed on an optional step — skip the round trip, but still mark it
    // visited so the stepper shows it as handled.
    if (id && group.pristine) {
      this.markStepSaved(key);
      return true;
    }

    const request = toMaterialRequest(this.formService.value());
    this.saving.set(true);
    try {
      const res = id
        ? await lastValueFrom(this.materialService.updateMaterial(id, pickMaterialSection(request, key)))
        : await lastValueFrom(this.materialService.createMaterial(request));

      this.material.set(res.data);
      this.materialId.set(res.data.id);
      this.lastSavedAt.set(new Date());
      group.markAsPristine();
      this.markStepSaved(key);

      if (!id) {
        this.snack.open(`Material ${res.data.code} created — continue completing the remaining sections.`, 'OK', {
          duration: 4000,
        });
      }
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
    // the stepper isn't in the view yet (e.g. jumping back to step 1 from the
    // success screen, where the stepper is still swapped out).
    this.selectedIndex.set(index);
    if (this.stepper) this.stepper.selectedIndex = index;
  }

  // ── Save ────────────────────────────────────────────────────────────

  /**
   * Edit mode: one PUT carrying the whole record.
   * Create mode: the material already exists (persisted at step 1), so this saves
   * the last step and moves to the success screen.
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
      const payload = toMaterialRequest(this.formService.value());
      this.saving.set(true);
      try {
        const res = await lastValueFrom(this.materialService.updateMaterial(this.materialId()!, payload));
        this.material.set(res.data);
        this.lastSavedAt.set(new Date());
        this.formService.form.markAsPristine();
        this.snack.open('Material updated successfully', 'OK', { duration: 3000 });
        if (closeAfter) this.leaveTo(['/admin/materials']);
      } catch (err) {
        this.snack.open(this.messageFor(err as HttpErrorResponse), 'Close', {
          duration: 6000, panelClass: ['error-snackbar'],
        });
      } finally {
        this.saving.set(false);
      }
      return;
    }

    // Create mode, final step: persist Documents, then hand off to the summary.
    const finalKey = this.steps[this.steps.length - 1].key;
    const saved = await this.persistStep(finalKey);
    if (!saved) return;

    const finished = this.material();
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
      case 403: return 'You do not have permission to save this material.';
      case 404: return 'The selected category, group or unit could not be found. Refresh and try again.';
      case 409: return err.error?.message || 'A material with these details already exists.';
      case 422: return err.error?.message || 'The submitted data could not be processed.';
      case 500: return 'Something went wrong. Please try again.';
      default:  return err?.error?.message || 'Material could not be saved.';
    }
  }

  // ── Success screen actions ──────────────────────────────────────────

  viewCreated(): void {
    const id = this.created()?.id;
    if (id) this.leaveTo(['/admin/materials', id]);
  }

  createAnother(): void {
    // Clear the persisted identity so the next Next() issues a fresh POST.
    this.created.set(null);
    this.material.set(null);
    this.materialId.set(null);
    this.lastSavedAt.set(null);
    this.savedSteps.set(new Set());
    this.formService.form.reset();
    this.formService.patch(toMaterialFormValue({
      // A blank slate that still satisfies the form's non-null shape.
      isStockItem: true, isSerialized: false, isBatchManaged: false,
    } as unknown as Material));
    this.formService.form.markAsPristine();
    this.goToStep(0);
  }

  /**
   * Plain navigation — deliberately does NOT set `bypassGuard`, so leaving with
   * unsaved edits still prompts. Used by Cancel and the header back arrow.
   */
  backToList(): void {
    void this.router.navigate(['/admin/materials']);
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

  /** Warns on browser-level navigation (reload, tab close, address bar). */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  private hasUnsavedChanges(): boolean {
    return !this.bypassGuard && !this.created() && this.formService.form.dirty;
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.hasUnsavedChanges()) return true;

    // Once step 1 has been persisted the material exists regardless of leaving,
    // so the prompt says what is actually at risk: only this step's edits.
    const persisted = !!this.materialId() && !this.isEdit();
    const message = persisted
      ? `${this.material()?.code} has already been created. Changes on this step have not been saved yet — leave without saving them?`
      : 'You have unsaved changes to this Material. Leave without saving?';

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

  protected get statusValue(): MaterialStatus | null {
    return this.material()?.status ?? null;
  }

  protected statusClass(status: MaterialStatus | null): string {
    switch (status) {
      case MaterialStatus.ACTIVE:   return 'status-chip status-chip--active';
      case MaterialStatus.INACTIVE: return 'status-chip status-chip--inactive';
      case MaterialStatus.OBSOLETE: return 'status-chip status-chip--obsolete';
      default: return 'status-chip status-chip--new';
    }
  }
}
