import {
  ChangeDetectionStrategy, Component, HostListener, OnInit, ViewChild, computed, inject, signal,
} from '@angular/core';
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
import { VendorService } from '../services/vendor.service';
import { VendorFormService, VendorStepKey } from '../services/vendor-form.service';
import { toCreateRequest, toUpdateRequest, toVendorFormValue } from '../services/vendor.mapper';
import {
  Vendor, VendorPerformance, VendorStatus, enumLabel,
} from '../models/vendor.model';
import { HasUnsavedChanges } from '../guards/unsaved-vendor.guard';
import { VendorIdentificationStepComponent } from '../components/vendor-identification-step/vendor-identification-step.component';
import { VendorContactStepComponent } from '../components/vendor-contact-step/vendor-contact-step.component';
import { VendorLegalStepComponent } from '../components/vendor-legal-step/vendor-legal-step.component';
import { VendorBankingStepComponent } from '../components/vendor-banking-step/vendor-banking-step.component';
import { VendorFinancialStepComponent } from '../components/vendor-financial-step/vendor-financial-step.component';
import { VendorTechnicalStepComponent } from '../components/vendor-technical-step/vendor-technical-step.component';
import { VendorQualityStepComponent } from '../components/vendor-quality-step/vendor-quality-step.component';
import { VendorPerformanceStepComponent } from '../components/vendor-performance-step/vendor-performance-step.component';
import { VendorLogisticsStepComponent } from '../components/vendor-logistics-step/vendor-logistics-step.component';
import { VendorDocumentsStepComponent } from '../components/vendor-documents-step/vendor-documents-step.component';

/**
 * The Vendor creation / editing workspace.
 *
 * `POST /vendors` writes the vendor and its child collections in one
 * transaction, and `PUT /vendors/:id` replaces the collections it is given, so
 * every section is editable in both modes.
 *
 * Create still holds all eleven steps client-side and issues a single POST on
 * Submit or Save Draft rather than saving step by step: the child rows entered
 * on later steps have to travel with the vendor that owns them. The stepper is
 * linear while creating; editing unlocks it.
 *
 * There is deliberately no autosave: in create mode it would create the vendor
 * prematurely, and in edit mode it would rewrite a live master record without
 * the user asking.
 */
@Component({
  selector: 'app-vendor-workspace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [VendorFormService],
  imports: [
    CommonModule, MatStepperModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatTooltipModule, MatProgressSpinnerModule, MatDividerModule,
    VendorIdentificationStepComponent, VendorContactStepComponent, VendorLegalStepComponent,
    VendorBankingStepComponent, VendorFinancialStepComponent, VendorTechnicalStepComponent,
    VendorQualityStepComponent, VendorPerformanceStepComponent, VendorLogisticsStepComponent,
    VendorDocumentsStepComponent,
  ],
  templateUrl: './vendor-workspace.component.html',
  styleUrl: './vendor-workspace.component.scss',
})
export class VendorWorkspaceComponent implements OnInit, HasUnsavedChanges {
  protected readonly formService = inject(VendorFormService);
  private readonly vendorService = inject(VendorService);
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
  protected readonly showReview = signal(false);

  protected readonly vendor = signal<Vendor | null>(null);
  protected readonly vendorId = signal<string | null>(null);
  protected readonly lastSavedAt = signal<Date | null>(null);

  /** Read-only child data for the steps that display it. Evaluation/approval
   *  history is owned by the separate Vendor Evaluation workflow now — see
   *  vendor-evaluation/ — so it is not loaded here. */
  protected readonly performanceHistory = signal<VendorPerformance[]>([]);

  /** Shown instead of the stepper once a vendor has been created. */
  protected readonly created = signal<Vendor | null>(null);

  /** Set immediately before a deliberate navigation so the guard stays quiet. */
  private bypassGuard = false;

  protected readonly currentStepTitle = computed(() => this.steps[this.selectedIndex()]?.title ?? '');

  /** Header summary of the chosen material categories, by readable name. */
  protected selectedCategoryLabels(): string {
    const ids = (this.formService.form.get('identification.productCategories')?.value as string[]) ?? [];
    if (!ids.length) return '—';
    return this.formService.productCategoryNames(ids).join(', ');
  }

  ngOnInit(): void {
    const mode = (this.route.snapshot.data['mode'] as 'create' | 'edit') ?? 'create';
    this.mode.set(mode);

    if (mode === 'edit') {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) void this.loadVendor(id);
    } else {
      this.formService.applyCreateDefaults();
    }
  }

  private async loadVendor(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const res = await lastValueFrom(this.vendorService.getVendorById(id));
      this.applyVendor(res.data);
      void this.loadSubResources(id);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.loadError.set(
        httpErr?.status === 404
          ? 'This vendor could not be found. It may have been deleted.'
          : 'Unable to load the vendor. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  /** Patches the form from a loaded vendor, resizing the child arrays first. */
  private applyVendor(vendor: Vendor): void {
    this.vendor.set(vendor);
    this.vendorId.set(vendor.id);
    this.formService.setEditingVendorId(vendor.id);

    // Stored names come back as the ids the category multi-select binds to.
    const value = toVendorFormValue(vendor, (names) => this.formService.productCategoryIds(names));
    // patchValue cannot grow a FormArray, so the rows have to exist first.
    this.formService.setAddressCount(value.contact?.addresses?.length ?? 0);
    this.formService.setTurnoverCount(value.financial?.turnovers?.length ?? 0);
    this.formService.setCertificationCount(value.quality?.certifications?.length ?? 0);
    this.formService.setProjectExperienceCount(value.performance?.projectExperiences?.length ?? 0);
    this.formService.patch(value);
  }

  /** Performance is a separate endpoint from the detail read. */
  private async loadSubResources(id: string): Promise<void> {
    try {
      const performance = await lastValueFrom(this.vendorService.getPerformance(id));
      this.performanceHistory.set(performance.data ?? []);
    } catch {
      // This section degrades to empty; the main record is what matters here.
    }
  }

  can(permission: string): boolean {
    return this.permissionService.hasAnyPermission([permission, PERMISSIONS.VENDORS_MANAGE]);
  }

  // ── Step state ──────────────────────────────────────────────────────

  onStepChange(index: number): void {
    this.selectedIndex.set(index);
    this.showReview.set(false);
  }

  stepState(key: VendorStepKey, index: number): 'done' | 'error' | 'edit' | 'number' {
    const group = this.formService.group(key);
    if (index === this.selectedIndex() && !this.showReview()) return 'edit';
    if (group.invalid && group.touched) return 'error';
    if (group.valid && (this.isEdit() || group.dirty || index < this.selectedIndex())) return 'done';
    return 'number';
  }

  isStepInvalid(key: VendorStepKey): boolean {
    const group = this.formService.group(key);
    return group.invalid && group.touched;
  }

  /** Drives the review panel's per-section summary. */
  sectionStatus(key: VendorStepKey): 'complete' | 'incomplete' | 'empty' {
    const group = this.formService.group(key);
    if (group.invalid) return 'incomplete';
    return group.dirty || this.isEdit() ? 'complete' : 'empty';
  }

  /** Create mode blocks Next until the current step validates. */
  canAdvance(): boolean {
    if (this.isEdit()) return true;
    return this.formService.group(this.steps[this.selectedIndex()].key).valid;
  }

  nextTooltip(): string {
    return this.canAdvance()
      ? 'Continue to the next section'
      : 'Complete the required fields on this step first';
  }

  next(): void {
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
    this.stepper?.next();
  }

  back(): void {
    if (this.showReview()) {
      this.showReview.set(false);
      return;
    }
    this.stepper?.previous();
  }

  goToStep(index: number): void {
    this.showReview.set(false);
    this.selectedIndex.set(index);
    if (this.stepper) this.stepper.selectedIndex = index;
  }

  openReview(): void {
    this.formService.markAllTouched();
    this.showReview.set(true);
  }

  closeReview(): void {
    this.showReview.set(false);
  }

  // ── Save ────────────────────────────────────────────────────────────

  /**
   * Save Draft persists whatever is filled in. A new vendor is created
   * UNDER_EVALUATION with isActive=false — the API's own holding state — so a
   * draft is never mistaken for an approved vendor.
   */
  async saveDraft(): Promise<void> {
    if (this.saving()) return;

    // Only the three fields the API insists on are needed to hold a draft.
    const identification = this.formService.group('identification');
    if (identification.invalid) {
      this.formService.markStepTouched('identification');
      this.goToStep(0);
      this.snack.open(
        'Vendor name, type and industry category are needed before a draft can be saved.',
        'Close',
        { duration: 5000 },
      );
      return;
    }

    await this.persist({ closeAfter: false, draft: true });
  }

  /** Final submission — every step must validate. */
  async submit(): Promise<void> {
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

    await this.persist({ closeAfter: false, draft: false });
  }

  async saveChanges(closeAfter: boolean): Promise<void> {
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

    await this.persist({ closeAfter, draft: false });
  }

  private async persist({ closeAfter, draft }: { closeAfter: boolean; draft: boolean }): Promise<void> {
    const id = this.vendorId();
    const value = this.formService.value();
    // The category multi-select stores ids; the API stores names.
    const resolveNames = (values: readonly string[]) => this.formService.productCategoryNames(values);

    this.saving.set(true);
    try {
      if (id) {
        // Scalars only — the API discards child collections on update.
        const res = await lastValueFrom(this.vendorService.updateVendor(id, toUpdateRequest(value, resolveNames)));
        this.vendor.set(res.data);
        this.lastSavedAt.set(new Date());
        this.formService.form.markAsPristine();
        this.snack.open('Vendor updated successfully', 'OK', { duration: 3000 });
        if (closeAfter) this.leaveTo(['/vendors']);
        return;
      }

      const res = await lastValueFrom(this.vendorService.createVendor(toCreateRequest(value, resolveNames)));
      this.applyVendor(res.data);
      this.lastSavedAt.set(new Date());
      this.formService.form.markAsPristine();

      if (draft) {
        // The vendor now exists, so child sections lock. Say so plainly rather
        // than letting the user discover it by silent no-op.
        this.snack.open(
          `Draft saved as ${res.data.code}. Addresses, banking, certificates and documents are fixed at creation and are now read-only.`,
          'OK',
          { duration: 8000 },
        );
        this.mode.set('edit');
        this.bypassGuard = true;
        await this.router.navigate(['/vendors', res.data.id, 'edit'], { replaceUrl: true });
        this.bypassGuard = false;
      } else {
        this.created.set(res.data);
      }
    } catch (err) {
      this.snack.open(this.messageFor(err as HttpErrorResponse), 'Close', {
        duration: 7000, panelClass: ['error-snackbar'],
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
      case 403: return 'You do not have permission to save this vendor.';
      case 404: return 'The selected industry category or parent company could not be found. Refresh and try again.';
      case 409: return err.error?.message || 'A vendor with these details already exists.';
      case 422: return err.error?.message || 'The submitted data could not be processed.';
      case 500: return 'Something went wrong. Please try again.';
      default:  return err?.error?.message || 'The vendor could not be saved.';
    }
  }

  // ── Success screen ──────────────────────────────────────────────────

  viewCreated(): void {
    const id = this.created()?.id;
    if (id) this.leaveTo(['/vendors', id, 'view']);
  }

  createAnother(): void {
    this.leaveTo(['/vendors', 'new']);
    // A full remount is the cleanest reset: the form service is provided per
    // workspace, so navigating away and back gives a genuinely blank slate.
    void this.router.navigate(['/vendors'], { skipLocationChange: true })
      .then(() => this.router.navigate(['/vendors/new']));
  }

  backToList(): void {
    void this.router.navigate(['/vendors']);
  }

  cancel(): void {
    this.backToList();
  }

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

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      data: {
        title: 'Unsaved Changes',
        message: this.vendorId()
          ? `${this.vendor()?.code} has unsaved changes on this form. Leave without saving them?`
          : 'You have unsaved changes to this vendor, and nothing has been saved yet. Leave without saving?',
        confirmText: 'Leave',
        cancelText: 'Stay',
        color: 'warn',
        icon: 'warning',
      },
    });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }

  // ── Header helpers ──────────────────────────────────────────────────

  protected label(value: string | null | undefined): string {
    return enumLabel(value);
  }

  protected get statusValue(): VendorStatus | null {
    return this.vendor()?.vendorStatus ?? null;
  }

  protected statusClass(status: VendorStatus | null): string {
    switch (status) {
      case VendorStatus.ACTIVE:           return 'status-chip status-chip--active';
      case VendorStatus.INACTIVE:         return 'status-chip status-chip--inactive';
      case VendorStatus.BLACKLISTED:      return 'status-chip status-chip--blacklisted';
      case VendorStatus.UNDER_EVALUATION: return 'status-chip status-chip--evaluation';
      default: return 'status-chip status-chip--new';
    }
  }
}
