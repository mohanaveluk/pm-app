import { Injectable, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { MaterialCategoryService } from '../../material-category/services/material-category.service';
import { MaterialGroupService } from '../../material-group/services/material-group.service';
import { UnitOfMeasurementService } from '../../unit-of-measurement/services/unit-of-measurement.service';
import { MaterialCategoryOption } from '../../material-category/models/material-category.model';
import { MaterialGroupOption } from '../../material-group/models/material-group.model';
import { UnitOfMeasurementOption } from '../../unit-of-measurement/models/unit-of-measurement.model';
import { CriticalityLevel } from '../models/material.model';
import { MaterialFormValue } from './material.mapper';

/** The nine workspace steps, in order. */
export const MATERIAL_STEPS = [
  { key: 'general',     label: 'General',     icon: 'description',  title: 'General Information' },
  { key: 'technical',   label: 'Technical',   icon: 'precision_manufacturing', title: 'Technical Specifications' },
  { key: 'procurement', label: 'Procurement', icon: 'shopping_cart', title: 'Procurement Data' },
  { key: 'inventory',   label: 'Inventory',   icon: 'warehouse',    title: 'Inventory & Storage' },
  { key: 'quality',     label: 'Quality',     icon: 'fact_check',   title: 'Quality & Inspection' },
  { key: 'accounting',  label: 'Accounting',  icon: 'account_balance', title: 'Accounting & Valuation' },
  { key: 'safety',      label: 'Safety',      icon: 'health_and_safety', title: 'Safety & Compliance' },
  { key: 'logistics',   label: 'Logistics',   icon: 'local_shipping', title: 'Logistics & Packaging' },
  { key: 'documents',   label: 'Documents',   icon: 'folder_open',  title: 'Document Attachments' },
] as const;

export type MaterialStepKey = (typeof MATERIAL_STEPS)[number]['key'];

/** Safety stock must not exceed the maximum stock level when both are supplied. */
function stockRangeValidator(group: AbstractControl): ValidationErrors | null {
  const safety = group.get('safetyStock')?.value;
  const max = group.get('maximumStockLevel')?.value;
  if (safety == null || max == null || safety === '' || max === '') return null;
  return Number(safety) > Number(max) ? { stockRange: true } : null;
}

/** Calibration interval becomes required once calibration is switched on. */
function calibrationValidator(group: AbstractControl): ValidationErrors | null {
  const required = group.get('calibrationRequired')?.value === true;
  const interval = group.get('calibrationIntervalDays')?.value;
  if (!required) return null;
  return interval == null || interval === '' ? { calibrationInterval: true } : null;
}

/**
 * Owns the Material workspace's form state and reference data.
 *
 * Provided per-workspace (not root) so a fresh form and a fresh reference-data
 * fetch happen on each visit. The nine step components receive their own child
 * FormGroup from here, which keeps them independent of one another.
 */
@Injectable()
export class MaterialFormService {
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  private readonly categoryService = inject(MaterialCategoryService);
  private readonly groupService = inject(MaterialGroupService);
  private readonly uomService = inject(UnitOfMeasurementService);

  readonly steps = MATERIAL_STEPS;

  // ── Reference data ──────────────────────────────────────────────────
  readonly categories = signal<MaterialCategoryOption[]>([]);
  readonly groups = signal<MaterialGroupOption[]>([]);
  readonly uoms = signal<UnitOfMeasurementOption[]>([]);
  readonly referenceLoading = signal(true);
  readonly referenceError = signal<string | null>(null);

  readonly form: FormGroup = this.buildForm();

  /** Drives the cascade — mirrors the category control so `computed` can react to it. */
  private readonly categoryValue = toSignal(this.form.get('general.materialCategoryId')!.valueChanges, {
    initialValue: this.form.get('general.materialCategoryId')!.value as string,
  });

  /** Only the groups belonging to the selected category are ever offered. */
  readonly filteredGroups = computed(() => {
    const categoryId = this.categoryValue();
    if (!categoryId) return [] as MaterialGroupOption[];
    return this.groups().filter((g) => g.materialCategoryId === categoryId);
  });

  /** True once a category is chosen but that category has no groups yet. */
  readonly categoryHasNoGroups = computed(
    () => !!this.categoryValue() && !this.referenceLoading() && this.filteredGroups().length === 0,
  );

  constructor() {
    this.loadReferenceData();

    // Changing the category invalidates any previously chosen group.
    this.form.get('general.materialCategoryId')!.valueChanges.subscribe(() => {
      const groupControl = this.form.get('general.materialGroupId')!;
      const current = groupControl.value as string;
      if (!current) return;
      const stillValid = this.filteredGroups().some((g) => g.id === current);
      if (!stillValid) groupControl.setValue('', { emitEvent: false });
    });
  }

  // ── Form construction ───────────────────────────────────────────────

  private buildForm(): FormGroup {
    return this.fb.group({
      general: this.fb.group({
        shortDescription: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(500)]],
        longDescription: ['', [Validators.maxLength(4000)]],
        materialCategoryId: ['', [Validators.required]],
        materialGroupId: ['', [Validators.required]],
        unitOfMeasurementId: ['', [Validators.required]],
        criticalityLevel: [CriticalityLevel.MEDIUM as CriticalityLevel, [Validators.required]],
        isStockItem: [true],
        isSerialized: [false],
        isBatchManaged: [false],
        remarks: [''],
      }),
      technical: this.fb.group({
        technicalDescription: [''],
        modelPartNumber: ['', [Validators.maxLength(255)]],
        manufacturerName: ['', [Validators.maxLength(255)]],
        manufacturerPartNumber: ['', [Validators.maxLength(255)]],
        brand: ['', [Validators.maxLength(255)]],
        materialComposition: ['', [Validators.maxLength(500)]],
        dimensions: ['', [Validators.maxLength(500)]],
        weight: ['', [Validators.maxLength(100)]],
        colorFinish: ['', [Validators.maxLength(100)]],
        operatingTemperatureRange: ['', [Validators.maxLength(255)]],
        pressureRating: ['', [Validators.maxLength(100)]],
        voltageCurrentRating: ['', [Validators.maxLength(100)]],
        certifications: [''],
        datasheetReference: ['', [Validators.maxLength(500)]],
      }),
      procurement: this.fb.group({
        preferredVendorId: [''],
        vendorPartNumber: ['', [Validators.maxLength(100)]],
        leadTimeDays: [null as number | null, [Validators.min(0)]],
        minimumOrderQuantity: [null as number | null, [Validators.min(0)]],
        reorderLevel: [null as number | null, [Validators.min(0)]],
        reorderQuantity: [null as number | null, [Validators.min(0)]],
        purchaseUomId: [''],
        lastPurchasePrice: [null as number | null, [Validators.min(0)]],
        currency: ['', [Validators.minLength(3), Validators.maxLength(10)]],
        contractReference: ['', [Validators.maxLength(255)]],
        hsCode: ['', [Validators.maxLength(50)]],
        countryOfOrigin: ['', [Validators.maxLength(100)]],
      }),
      inventory: this.fb.group(
        {
          storageLocation: ['', [Validators.maxLength(255)]],
          warehouseBinRack: ['', [Validators.maxLength(100)]],
          storageConditions: [''],
          shelfLifeDays: [null as number | null, [Validators.min(0)]],
          stockingStrategy: [null as string | null],
          safetyStock: [null as number | null, [Validators.min(0)]],
          maximumStockLevel: [null as number | null, [Validators.min(0)]],
        },
        { validators: stockRangeValidator },
      ),
      quality: this.fb.group(
        {
          inspectionType: [null as string | null],
          qualitySpecDocumentNo: ['', [Validators.maxLength(255)]],
          inspectionLotSize: [null as number | null, [Validators.min(1)]],
          samplingProcedure: [''],
          testParameters: [''],
          acceptanceCriteria: [''],
          calibrationRequired: [false],
          calibrationIntervalDays: [null as number | null, [Validators.min(1)]],
        },
        { validators: calibrationValidator },
      ),
      accounting: this.fb.group({
        valuationClass: ['', [Validators.maxLength(50)]],
        valuationType: ['', [Validators.maxLength(50)]],
        standardPrice: [null as number | null, [Validators.min(0)]],
        movingAveragePrice: [null as number | null, [Validators.min(0)]],
        costCenter: ['', [Validators.maxLength(100)]],
        glAccountMapping: ['', [Validators.maxLength(50)]],
        taxCode: ['', [Validators.maxLength(20)]],
      }),
      safety: this.fb.group({
        hazardClassification: [null as string | null],
        msdsReferenceNo: ['', [Validators.maxLength(100)]],
        ppeRequirements: [''],
        handlingInstructions: [''],
        disposalInstructions: [''],
        regulatoryCompliance: [''],
      }),
      logistics: this.fb.group({
        packagingType: [null as string | null],
        packagingDimensions: ['', [Validators.maxLength(255)]],
        packagingWeight: ['', [Validators.maxLength(100)]],
        unitsPerPackage: [null as number | null, [Validators.min(1)]],
        transportationMode: [null as string | null],
        specialTransportRequirements: [''],
        barcodeQrCodeRequired: [false],
      }),
      documents: this.fb.group({
        datasheetUrl: ['', [Validators.maxLength(1000)]],
        drawingSketchUrl: ['', [Validators.maxLength(1000)]],
        technicalSpecSheetUrl: ['', [Validators.maxLength(1000)]],
        qualityCertificatesUrl: ['', [Validators.maxLength(1000)]],
        complianceCertificatesUrl: ['', [Validators.maxLength(1000)]],
        vendorQuotationUrl: ['', [Validators.maxLength(1000)]],
        inspectionReportsUrl: ['', [Validators.maxLength(1000)]],
        photos: [[] as string[]],
      }),
    });
  }

  group(key: MaterialStepKey): FormGroup {
    return this.form.get(key) as FormGroup;
  }

  value(): MaterialFormValue {
    return this.form.getRawValue() as MaterialFormValue;
  }

  patch(value: MaterialFormValue): void {
    this.form.patchValue(value);
    this.form.markAsPristine();
  }

  /** Index of the first step failing validation, or -1 when the whole form is valid. */
  firstInvalidStepIndex(): number {
    return this.steps.findIndex((step) => this.group(step.key).invalid);
  }

  markStepTouched(key: MaterialStepKey): void {
    this.group(key).markAllAsTouched();
  }

  markAllTouched(): void {
    this.form.markAllAsTouched();
  }

  // ── Reference data ──────────────────────────────────────────────────

  loadReferenceData(): void {
    this.referenceLoading.set(true);
    this.referenceError.set(null);

    forkJoin({
      categories: this.categoryService.getActiveMaterialCategories(),
      groups: this.groupService.getActiveMaterialGroups(),
      uoms: this.uomService.getActiveUnitsOfMeasurement(),
    }).subscribe({
      next: (res) => {
        this.categories.set(res.categories.data ?? []);
        this.groups.set(res.groups.data ?? []);
        this.uoms.set(res.uoms.data ?? []);
        this.referenceLoading.set(false);
      },
      error: () => {
        this.referenceError.set('Unable to load Categories, Groups and Units. Retry to continue.');
        this.referenceLoading.set(false);
        this.snack.open('Unable to load reference data for Material Master.', 'Close', {
          duration: 5000, panelClass: ['error-snackbar'],
        });
      },
    });
  }

  /** Re-fetches categories after one is created on the fly, then selects it. */
  reloadCategories(selectId?: string): void {
    this.categoryService.getActiveMaterialCategories().subscribe({
      next: (res) => {
        this.categories.set(res.data ?? []);
        if (selectId) this.form.get('general.materialCategoryId')!.setValue(selectId);
      },
      error: () => this.snack.open('Unable to refresh Material Categories.', 'Close', {
        duration: 5000, panelClass: ['error-snackbar'],
      }),
    });
  }

  /** Re-fetches groups after one is created on the fly, then selects it. */
  reloadGroups(selectId?: string): void {
    this.groupService.getActiveMaterialGroups().subscribe({
      next: (res) => {
        this.groups.set(res.data ?? []);
        if (selectId) this.form.get('general.materialGroupId')!.setValue(selectId);
      },
      error: () => this.snack.open('Unable to refresh Material Groups.', 'Close', {
        duration: 5000, panelClass: ['error-snackbar'],
      }),
    });
  }

  // ── Display helpers ─────────────────────────────────────────────────

  categoryLabel(id: string | null | undefined): string {
    const c = this.categories().find((x) => x.id === id);
    return c ? `${c.name} (${c.code})` : '—';
  }

  groupLabel(id: string | null | undefined): string {
    const g = this.groups().find((x) => x.id === id);
    return g ? `${g.name} (${g.code})` : '—';
  }

  uomLabel(id: string | null | undefined): string {
    const u = this.uoms().find((x) => x.id === id);
    if (!u) return '—';
    return u.symbol ? `${u.name} — ${u.symbol}` : u.name;
  }
}
