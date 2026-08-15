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
import { toMaterialFormValue, toMaterialRequest } from '../services/material.mapper';
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

  /** Populated in edit mode, and after a successful create. */
  protected readonly material = signal<Material | null>(null);

  /** Shown instead of the stepper once a material has been created. */
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
    if (group.valid && (group.dirty || this.isEdit())) return 'done';
    return 'number';
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

  next(): void {
    const key = this.steps[this.selectedIndex()].key;
    if (!this.isEdit() && this.formService.group(key).invalid) {
      this.formService.markStepTouched(key);
      this.snack.open(
        `Please complete the required information in ${this.steps[this.selectedIndex()].title}.`,
        'Close',
        { duration: 4000 },
      );
      return;
    }
    this.stepper?.next();
  }

  back(): void {
    this.stepper?.previous();
  }

  goToStep(index: number): void {
    if (this.stepper) this.stepper.selectedIndex = index;
  }

  // ── Save ────────────────────────────────────────────────────────────

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

    const payload = toMaterialRequest(this.formService.value());
    this.saving.set(true);
    try {
      if (this.isEdit()) {
        const id = this.material()!.id;
        const res = await lastValueFrom(this.materialService.updateMaterial(id, payload));
        this.material.set(res.data);
        this.formService.form.markAsPristine();
        this.snack.open('Material updated successfully', 'OK', { duration: 3000 });
        if (closeAfter) this.leaveTo(['/admin/materials']);
      } else {
        const res = await lastValueFrom(this.materialService.createMaterial(payload));
        this.formService.form.markAsPristine();
        this.created.set(res.data);
        this.material.set(res.data);
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
    this.created.set(null);
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

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: 'Unsaved Changes',
        message: 'You have unsaved changes to this Material. Leave without saving?',
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
