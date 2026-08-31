import { Injectable, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { IndustryCategoryService } from '../../industry-category/services/industry-category.service';
import { IndustryCategoryOption } from '../../industry-category/models/industry-category.model';
import { MaterialCategoryService } from '../../material-category/services/material-category.service';
import { MaterialCategoryOption } from '../../material-category/models/material-category.model';
import { VendorService } from './vendor.service';
import { VendorFormValue } from './vendor.mapper';
import {
  DeliveryCapability, PaymentMethod, PaymentTerms, ReviewCycle, RiskCategory,
  TaxDocumentType, VendorAddressType, VendorClassification, VendorDocumentType,
  VendorOption,
} from '../models/vendor.model';
import { VendorTypeService } from '../../vendor-type/services/vendor-type.service';
import { VendorType } from '../../vendor-type/models/vendor-type.model';
import {
  dateOrderValidator, decimalPlacesValidator, financialYearValidator,
  nonBlankEntriesValidator, nonNegativeValidator, otherTaxTypeValidator,
  phoneValidator, urlValidator,
} from '../validators/vendor.validators';

/** The eleven workspace steps, in order. */
export const VENDOR_STEPS = [
  { key: 'identification', label: 'Identification', icon: 'badge',              title: 'Vendor Identification' },
  { key: 'contact',        label: 'Contact',        icon: 'contact_mail',       title: 'Contact Information' },
  { key: 'legal',          label: 'Legal',          icon: 'gavel',              title: 'Statutory & Legal' },
  { key: 'banking',        label: 'Banking',        icon: 'account_balance',    title: 'Banking Information' },
  { key: 'financial',      label: 'Financial',      icon: 'payments',           title: 'Financial & Commercial' },
  { key: 'technical',      label: 'Technical',      icon: 'precision_manufacturing', title: 'Technical Capability' },
  { key: 'quality',        label: 'Quality & HSE',  icon: 'health_and_safety',  title: 'Quality, HSE & Compliance' },
  { key: 'performance',    label: 'Performance',    icon: 'insights',           title: 'Performance History' },
  { key: 'logistics',      label: 'Logistics',      icon: 'local_shipping',     title: 'Logistics & Supply Chain' },
  { key: 'documents',      label: 'Documents',      icon: 'folder_open',        title: 'Documents' },
  { key: 'evaluation',     label: 'Evaluation',     icon: 'fact_check',         title: 'Evaluation & Approval' },
] as const;

export type VendorStepKey = (typeof VENDOR_STEPS)[number]['key'];

/**
 * The ten document slots from the Vendor Master spec, each bound to a
 * VendorDocumentType. The slot — never the file name — decides where an
 * uploaded URL lands.
 */
export interface VendorDocumentSlot {
  key: string;
  label: string;
  description: string;
  documentType: VendorDocumentType;
  accept: string;
}

const DOC_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';

export const VENDOR_DOCUMENT_SLOTS: readonly VendorDocumentSlot[] = [
  { key: 'companyProfile',    label: 'Company Profile',            description: 'Corporate profile or capability statement', documentType: VendorDocumentType.COMPANY_PROFILE,     accept: DOC_TYPES },
  { key: 'tradeLicense',      label: 'Trade License Copy',         description: 'Valid trade or commercial licence',         documentType: VendorDocumentType.TRADE_LICENSE,       accept: DOC_TYPES },
  { key: 'taxRegistration',   label: 'Tax Registration Certificate', description: 'VAT / GST / national tax certificate',    documentType: VendorDocumentType.TAX_REGISTRATION,    accept: DOC_TYPES },
  { key: 'bankLetter',        label: 'Bank Letter / Cancelled Cheque', description: 'Bank account verification',             documentType: VendorDocumentType.BANK_LETTER,         accept: DOC_TYPES },
  { key: 'isoCertificate',    label: 'ISO Certificates',           description: 'ISO 9001 / 14001 / 45001 certificates',     documentType: VendorDocumentType.ISO_CERTIFICATE,     accept: DOC_TYPES },
  { key: 'productCatalogue',  label: 'Product Catalogues',         description: 'Catalogues or technical datasheets',        documentType: VendorDocumentType.PRODUCT_CATALOGUE,   accept: DOC_TYPES },
  { key: 'financialStatement',label: 'Financial Statements',       description: 'Audited financial statements',              documentType: VendorDocumentType.FINANCIAL_STATEMENT, accept: DOC_TYPES },
  { key: 'hsePolicy',         label: 'HSE Policy Documents',       description: 'Health, safety and environment policy',     documentType: VendorDocumentType.HSE_POLICY,          accept: DOC_TYPES },
  { key: 'pastPo',            label: 'Past PO Copies',             description: 'Reference purchase orders or contracts',    documentType: VendorDocumentType.PAST_PO,             accept: DOC_TYPES },
  { key: 'clientTestimonial', label: 'Client Testimonials',        description: 'Performance or completion certificates',    documentType: VendorDocumentType.CLIENT_TESTIMONIAL,  accept: DOC_TYPES },
];

/**
 * Owns the Vendor workspace's form state and reference data.
 *
 * Provided per-workspace (not root) so a fresh form and a fresh reference-data
 * fetch happen on each visit. The eleven step components each receive their own
 * child FormGroup from here, which keeps them independent of one another.
 */
@Injectable()
export class VendorFormService {
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  private readonly industryCategoryService = inject(IndustryCategoryService);
  private readonly materialCategoryService = inject(MaterialCategoryService);
  private readonly vendorTypeService = inject(VendorTypeService);
  private readonly vendorService = inject(VendorService);

  readonly steps = VENDOR_STEPS;
  readonly documentSlots = VENDOR_DOCUMENT_SLOTS;

  // ── Reference data ──────────────────────────────────────────────────
  readonly industryCategories = signal<IndustryCategoryOption[]>([]);
  readonly materialCategories = signal<MaterialCategoryOption[]>([]);
  readonly vendorTypes = signal<VendorType[]>([]);
  readonly parentVendors = signal<VendorOption[]>([]);
  readonly referenceLoading = signal(true);
  readonly referenceError = signal<string | null>(null);

  readonly form: FormGroup = this.buildForm();

  /** Excludes the vendor being edited so it cannot become its own parent. */
  private readonly editingVendorId = signal<string | null>(null);

  readonly parentVendorOptions = computed(() => {
    const selfId = this.editingVendorId();
    return this.parentVendors().filter((v) => v.id !== selfId);
  });

  constructor() {
    this.loadReferenceData();
    this.sanitizeMultiSelects();
  }

  /**
   * Strips blank members from the multi-select controls.
   *
   * `mat-select multiple` appends `undefined` to its value when an option
   * carrying no `[value]` is activated — the inline search row is exactly that.
   * The row is disabled in the template, but a stray blank would otherwise sit
   * in the array invisibly and be posted to the API, so it is removed here as
   * well as rejected by nonBlankEntriesValidator.
   */
  private sanitizeMultiSelects(): void {
    for (const path of ['identification.productCategories', 'logistics.transportModesSupported']) {
      const control = this.form.get(path);
      control?.valueChanges.subscribe((value) => {
        if (!Array.isArray(value)) return;
        const cleaned = value.filter((entry) => entry !== null && entry !== undefined && `${entry}`.trim() !== '');
        if (cleaned.length !== value.length) {
          control.setValue(cleaned, { emitEvent: false });
        }
      });
    }
  }

  /**
   * The Industry Category is no longer shown on the form, but the API still
   * requires `industryCategoryId` (@IsUUID @IsNotEmpty) and still derives the
   * vendor-code prefix from the linked category's name. So the control is kept
   * in the form and filled with the organization's first active category —
   * lowest displayOrder, so the choice is deterministic rather than arbitrary.
   *
   * When pm-api starts deriving the prefix from vendorType, this method and the
   * hidden control can both be deleted.
   */
  private applyDefaultIndustryCategory(): void {
    const control = this.form.get('identification.industryCategoryId');
    if (!control || control.value) return;

    const first = [...this.industryCategories()]
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))[0];
    if (first) control.setValue(first.id, { emitEvent: false });
  }

  /** False when the org has no active Industry Category — creation would 400. */
  readonly canIssueVendorCode = computed(() => this.industryCategories().length > 0);

  /** Display label for a material category, by id or by stored name. */
  materialCategoryLabel(idOrName: string): string {
    const match = this.materialCategories().find((c) => c.id === idOrName || c.name === idOrName);
    return match ? match.name : idOrName;
  }

  /**
   * Turns the selected category ids into the names the API stores.
   * `technical.productCategories` is a free string array server-side, so values
   * it cannot resolve (a category renamed or removed since) pass through
   * untouched rather than being silently dropped.
   */
  productCategoryNames(values: readonly string[]): string[] {
    return values.map((value) => this.materialCategoryLabel(value));
  }

  /** Inverse of productCategoryNames, for rehydrating the select on load. */
  productCategoryIds(values: readonly string[]): string[] {
    return values.map((value) => {
      const match = this.materialCategories().find((c) => c.name === value || c.id === value);
      return match ? match.id : value;
    });
  }

  setEditingVendorId(id: string | null): void {
    this.editingVendorId.set(id);
  }

  // ── Reference data ──────────────────────────────────────────────────

  loadReferenceData(): void {
    this.referenceLoading.set(true);
    this.referenceError.set(null);

    forkJoin({
      industry: this.industryCategoryService.getActiveIndustryCategories(),
      materials: this.materialCategoryService.getActiveMaterialCategories(),
      vendorTypes: this.vendorTypeService.getActiveVendorTypes(),
      vendors: this.vendorService.getActiveVendors(),
    }).subscribe({
      next: (res) => {
        this.industryCategories.set(res.industry.data ?? []);
        this.materialCategories.set(res.materials.data ?? []);
        this.vendorTypes.set(res.vendorTypes.data ?? []);
        this.parentVendors.set(res.vendors.data ?? []);
        this.referenceLoading.set(false);
        this.applyDefaultIndustryCategory();
      },
      error: () => {
        this.referenceError.set('Some reference data could not be loaded. Refresh to try again.');
        this.referenceLoading.set(false);
        this.snack.open('Unable to load reference data for the Vendor form.', 'Close', {
          duration: 5000, panelClass: ['error-snackbar'],
        });
      },
    });
  }

  /**
   * Re-fetches material categories after one is created inline, then adds it to
   * the selection so the user does not have to hunt for it in the reopened list.
   */
  refreshMaterialCategories(selectId?: string): void {
    this.materialCategoryService.getActiveMaterialCategories().subscribe({
      next: (res) => {
        this.materialCategories.set(res.data ?? []);
        if (!selectId) return;
        // The multi-select binds ids, so the new category is added by id.
        const control = this.form.get('identification.productCategories');
        const current = (control?.value as string[]) ?? [];
        if (!current.includes(selectId)) {
          control?.setValue([...current, selectId]);
          control?.markAsDirty();
        }
      },
      error: () => {
        this.snack.open('Material Categories could not be refreshed.', 'Close', { duration: 4000 });
      },
    });
  }

  /** Re-fetches industry categories after one is created inline, then selects it. */
  refreshIndustryCategories(selectId?: string): void {
    this.industryCategoryService.getActiveIndustryCategories().subscribe({
      next: (res) => {
        this.industryCategories.set(res.data ?? []);
        if (selectId) {
          this.form.get('identification.industryCategoryId')?.setValue(selectId);
          this.form.get('identification.industryCategoryId')?.markAsDirty();
        }
      },
      error: () => {
        this.snack.open('Industry Categories could not be refreshed.', 'Close', { duration: 4000 });
      },
    });
  }

  industryCategoryLabel(id: string | null | undefined): string {
    if (!id) return '—';
    const match = this.industryCategories().find((c) => c.id === id);
    return match ? `${match.code} — ${match.name}` : '—';
  }

  vendorTypeLabel(id: string | null | undefined): string {
    if (!id) return '—';
    const match = this.vendorTypes().find((t) => t.id === id);
    return match ? match.name : '—';
  }

  parentVendorLabel(id: string | null | undefined): string {
    if (!id) return '—';
    const match = this.parentVendors().find((v) => v.id === id);
    return match ? `${match.code} — ${match.vendorName}` : '—';
  }

  // ── Form access ─────────────────────────────────────────────────────

  group(key: VendorStepKey): FormGroup {
    return this.form.get(key) as FormGroup;
  }

  array(path: string): FormArray {
    return this.form.get(path) as FormArray;
  }

  value(): Record<string, unknown> {
    return this.form.getRawValue() as Record<string, unknown>;
  }

  /** Index of the first step failing validation, or -1 when the form is valid. */
  firstInvalidStepIndex(): number {
    return this.steps.findIndex((step) => this.group(step.key).invalid);
  }

  markStepTouched(key: VendorStepKey): void {
    this.group(key).markAllAsTouched();
  }

  markAllTouched(): void {
    this.form.markAllAsTouched();
  }

  // ── Form construction ───────────────────────────────────────────────

  private buildForm(): FormGroup {
    return this.fb.group({
      // ── 1. Identification ───────────────────────────────────────────
      identification: this.fb.group({
        vendorName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
        vendorDescription: ['', [Validators.maxLength(4000)]],
        tradeName: ['', [Validators.maxLength(255)]],
        vendorTypeId: [null as string | null, [Validators.required]],
        industryCategoryId: [''],
        // Material categories the vendor supplies. Persisted as
        // technical.productCategories (a string[] of names) — the API has no
        // category-id column on the vendor, so names are what it stores.
        productCategories: [[] as string[], [Validators.required, nonBlankEntriesValidator]],
        parentCompanyId: [''],
        remarks: [''],
      }),

      // ── 2. Contact ──────────────────────────────────────────────────
      // Phone numbers are split into dial code + number for entry and rejoined
      // by the mapper; the API stores a single string.
      contact: this.fb.group({
        primaryContactPerson: ['', [Validators.required, Validators.maxLength(255)]],
        designation: ['', [Validators.maxLength(150)]],
        email: ['', [Validators.email, Validators.maxLength(255)]],
        mobileDialCode: [''],
        mobileNumber: ['', [phoneValidator]],
        landlineDialCode: [''],
        landlineNumber: ['', [phoneValidator]],
        website: ['', [urlValidator, Validators.maxLength(500)]],
        countryOfRegistration: [''],
        // vendor_addresses is a repeatable child table keyed by addressType,
        // not three fixed slots: a vendor may register several workshops,
        // warehouses, branches or site offices.
        addresses: this.fb.array([this.addressGroup(VendorAddressType.REGISTERED, true)]),
      }),

      // ── 3. Statutory & legal ────────────────────────────────────────
      legal: this.fb.group(
        {
          businessRegistrationNumber: ['', [Validators.maxLength(100)]],
          taxRegistrationNumber: ['', [Validators.maxLength(100)]],
          taxDocumentType: [null as TaxDocumentType | null],
          taxDocumentNumber: ['', [Validators.maxLength(100)]],
          importExportCode: ['', [Validators.maxLength(100)]],
          msmeSmeRegistration: ['', [Validators.maxLength(100)]],
        },
        { validators: otherTaxTypeValidator },
      ),

      // ── 4. Banking ──────────────────────────────────────────────────
      // One primary bank account plus the vendor-level commercial terms.
      banking: this.fb.group({
        bankName: ['', [Validators.maxLength(255)]],
        branch: ['', [Validators.maxLength(255)]],
        accountHolderName: ['', [Validators.maxLength(255)]],
        accountNumber: ['', [Validators.maxLength(100), Validators.pattern(/^[A-Za-z0-9-]*$/)]],
        iban: ['', [Validators.maxLength(50), Validators.pattern(/^[A-Za-z0-9]*$/)]],
        swiftCode: ['', [Validators.maxLength(20), Validators.pattern(/^[A-Za-z0-9]*$/)]],
        bankCurrency: ['', [Validators.maxLength(10)]],
        paymentTerms: [null as PaymentTerms | null],
        paymentMilestones: [''],
        preferredPaymentMethod: [null as PaymentMethod | null],
      }),

      // ── 5. Financial & commercial ───────────────────────────────────
      financial: this.fb.group({
        currency: ['', [Validators.maxLength(10)]],
        creditLimitRequested: [null as number | null, [nonNegativeValidator, decimalPlacesValidator(4)]],
        creditRating: ['', [Validators.maxLength(50)]],
        auditedFinancialStatementsUrl: ['', [urlValidator]],
        priceStructure: [''],
        discountTerms: [''],
        contractReferenceNumbers: [[] as string[]],
        insuranceCoverage: [''],
        turnovers: this.fb.array([
          this.turnoverGroup(),
          this.turnoverGroup(),
          this.turnoverGroup(),
        ]),
      }),

      // ── 6. Technical capability ─────────────────────────────────────
      technical: this.fb.group({
        // productCategories lives on the Identification step — see that group.
        serviceCategories: [[] as string[]],
        technicalExpertiseAreas: [''],
        manufacturingCapabilities: [''],
        productionCapacity: [''],
        keyEquipmentList: [''],
        qualityControlProcesses: [''],
        technicalDatasheets: [[] as string[]],
        complianceStandards: [''],
      }),

      // ── 7. Quality, HSE & compliance ────────────────────────────────
      quality: this.fb.group({
        qualityManagementSystemDetails: [''],
        hsePolicyUrl: ['', [urlValidator]],
        incidentAccidentHistory: [''],
        csrCompliance: [''],
        ethicalSourcingPolicy: [''],
        antiBriberyPolicy: [''],
        certifications: this.fb.array([] as FormGroup[]),
      }),

      // ── 8. Performance history ──────────────────────────────────────
      performance: this.fb.group({
        majorClients: [[] as string[]],
        projectExperience: [''],
        pastPoContractReferences: [''],
        blacklistingHistory: [''],
        geographicalExperience: [[] as string[]],
      }),

      // ── 9. Logistics & supply chain ─────────────────────────────────
      logistics: this.fb.group({
        standardLeadTimeDays: [null as number | null, [nonNegativeValidator, Validators.min(0)]],
        minimumOrderQuantity: [null as number | null, [nonNegativeValidator, decimalPlacesValidator(4)]],
        deliveryCapability: [null as DeliveryCapability | null],
        warehouseLocations: [[] as string[]],
        transportModesSupported: [[] as string[]],
        exportDocumentationCapability: [false],
      }),

      // ── 10. Documents ───────────────────────────────────────────────
      // One control per slot, keyed by slot.key — never by file name.
      documents: this.fb.group(
        Object.fromEntries(
          VENDOR_DOCUMENT_SLOTS.map((slot) => [slot.key, this.fb.control('')]),
        ),
      ),

      // ── 11. Evaluation & approval ───────────────────────────────────
      evaluation: this.fb.group(
        {
          vendorEvaluationScore: [null as number | null, [Validators.min(0), Validators.max(100), decimalPlacesValidator(2)]],
          riskCategory: [null as RiskCategory | null],
          vendorClassification: [null as VendorClassification | null],
          approvalReference: ['', [Validators.maxLength(100)]],
          approvalDate: [null as Date | null],
          reviewCycle: [null as ReviewCycle | null],
          nextReviewDate: [null as Date | null],
        },
        { validators: dateOrderValidator('approvalDate', 'nextReviewDate', 'reviewBeforeApproval') },
      ),
    });
  }

  /** One vendor_addresses row. Field lengths mirror the entity's columns. */
  private addressGroup(addressType = VendorAddressType.REGISTERED, isPrimary = false): FormGroup {
    return this.fb.group({
      addressType: [addressType as VendorAddressType, [Validators.required]],
      addressLine1: ['', [Validators.maxLength(255)]],
      addressLine2: ['', [Validators.maxLength(255)]],
      city: ['', [Validators.maxLength(100)]],
      state: ['', [Validators.maxLength(100)]],
      postalCode: ['', [Validators.maxLength(20)]],
      country: [''],
      phoneNumber: ['', [phoneValidator, Validators.maxLength(30)]],
      email: ['', [Validators.email, Validators.maxLength(255)]],
      isPrimary: [isPrimary],
      remarks: [''],
    });
  }

  get addresses(): FormArray {
    return this.form.get('contact.addresses') as FormArray;
  }

  addAddress(addressType = VendorAddressType.CORPORATE): void {
    this.addresses.push(this.addressGroup(addressType, this.addresses.length === 0));
    this.form.markAsDirty();
  }

  removeAddress(index: number): void {
    this.addresses.removeAt(index);
    this.form.markAsDirty();
  }

  /**
   * Exactly one address may be primary — the API mirrors it onto the vendor —
   * so selecting one clears the flag on the others.
   */
  setPrimaryAddress(index: number): void {
    this.addresses.controls.forEach((control, i) => {
      control.get('isPrimary')?.setValue(i === index, { emitEvent: false });
    });
    this.form.markAsDirty();
  }

  /** Resizes the address array to match a loaded vendor before patching. */
  setAddressCount(count: number): void {
    const target = Math.max(count, 1);
    while (this.addresses.length > target) this.addresses.removeAt(this.addresses.length - 1);
    while (this.addresses.length < target) this.addAddress();
  }

  private turnoverGroup(): FormGroup {
    return this.fb.group({
      financialYear: [null as number | null, [financialYearValidator]],
      turnover: [null as number | null, [nonNegativeValidator, decimalPlacesValidator(4)]],
      currency: ['', [Validators.maxLength(10)]],
      isAudited: [false],
      financialStatementUrl: ['', [urlValidator]],
    });
  }

  // ── Child arrays ────────────────────────────────────────────────────

  get certifications(): FormArray {
    return this.form.get('quality.certifications') as FormArray;
  }

  addCertification(): void {
    this.certifications.push(
      this.fb.group({
        certificationName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
        certificateNumber: ['', [Validators.maxLength(100)]],
        issuingAuthority: ['', [Validators.maxLength(255)]],
        issueDate: [null as Date | null],
        expiryDate: [null as Date | null],
        scopeOfCertification: ['', [Validators.maxLength(100)]],
        documentUrl: ['', [urlValidator]],
      }, { validators: dateOrderValidator('issueDate', 'expiryDate', 'expiryBeforeIssue') }),
    );
    this.form.markAsDirty();
  }

  removeCertification(index: number): void {
    this.certifications.removeAt(index);
    this.form.markAsDirty();
  }

  get turnovers(): FormArray {
    return this.form.get('financial.turnovers') as FormArray;
  }

  addTurnover(): void {
    this.turnovers.push(this.turnoverGroup());
    this.form.markAsDirty();
  }

  removeTurnover(index: number): void {
    this.turnovers.removeAt(index);
    this.form.markAsDirty();
  }

  /**
   * Copies the registered address onto another row, keeping that row's own type
   * and primary flag — only the postal fields are duplicated.
   */
  copyRegisteredAddressTo(index: number): void {
    const source = this.addresses.controls
      .find((control) => control.get('addressType')?.value === VendorAddressType.REGISTERED);
    const target = this.addresses.at(index);
    if (!source || !target || source === target) return;

    const { addressLine1, addressLine2, city, state, postalCode, country } = source.value;
    target.patchValue({ addressLine1, addressLine2, city, state, postalCode, country });
    this.form.markAsDirty();
  }

  /** Rebuilds the certifications array to match a loaded vendor. */
  setCertificationCount(count: number): void {
    while (this.certifications.length > count) this.certifications.removeAt(this.certifications.length - 1);
    while (this.certifications.length < count) this.addCertification();
  }

  /** Rebuilds the turnover rows to match a loaded vendor (minimum of three). */
  setTurnoverCount(count: number): void {
    const target = Math.max(count, 3);
    while (this.turnovers.length > target) this.turnovers.removeAt(this.turnovers.length - 1);
    while (this.turnovers.length < target) this.addTurnover();
  }

  patch(value: VendorFormValue): void {
    this.form.patchValue(value);
    this.form.markAsPristine();
  }

  /** Defaults applied to a brand-new vendor, matching the API's own defaults. */
  applyCreateDefaults(): void {
    this.form.get('contact.mobileDialCode')?.setValue('');
    this.form.get('logistics.exportDocumentationCapability')?.setValue(false);
    this.form.get('identification.vendorTypeId')?.setValue(null);
    this.form.markAsPristine();
  }

  readonly addressTypes = VendorAddressType;
}
