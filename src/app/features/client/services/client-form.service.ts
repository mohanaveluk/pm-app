import { Injectable, inject, signal } from '@angular/core';
import {
  AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors,
  ValidatorFn, Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ClientTypeService } from '../../client-type/services/client-type.service';
import { ClientType } from '../../client-type/models/client-type.model';
import { IndustryCategoryService } from '../../industry-category/services/industry-category.service';
import { IndustryCategoryOption } from '../../industry-category/models/industry-category.model';
import { ProjectTypeService } from '../../project-type/services/project-type.service';
import { ProjectType } from '../../project-type/models/project-type.model';
import { ClientService } from './client.service';
import { ClientOption } from '../models/client.model';
import {
  AddressFormValue, ClientFormValue, ContactFormValue, blankAddress, blankClientFormValue,
  blankContact,
} from './client.mapper';

/** The six workspace steps, in order. */
export const CLIENT_STEPS = [
  { key: 'general',    label: 'Overview',         icon: 'business',   title: 'Basic Information' },
  { key: 'addresses',  label: 'Addresses',        icon: 'location_on', title: 'Addresses & Regional Settings' },
  { key: 'contacts',   label: 'Contacts',         icon: 'contacts',   title: 'Contacts' },
  { key: 'commercial', label: 'Commercial & Tax', icon: 'gavel',      title: 'Legal, Commercial & Tax' },
  { key: 'defaults',   label: 'Project Defaults', icon: 'tune',       title: 'Project & Operational Defaults' },
  { key: 'documents',  label: 'Documents',        icon: 'folder_open', title: 'Client Documents' },
] as const;

export type ClientStepKey = (typeof CLIENT_STEPS)[number]['key'];

const WEBSITE_PATTERN = /^(https?:\/\/)?([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(:\d+)?(\/\S*)?$/;
const REGISTRATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-./ ]{1,48}[A-Za-z0-9]$/;
const LOCAL_NUMBER_PATTERN = /^[0-9\s\-().]{4,20}$/;

/** Applies `pattern` only when the field has a value — these fields are optional. */
function optionalPattern(pattern: RegExp): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '') as string;
    return !value.trim() || pattern.test(value.trim()) ? null : { pattern: true };
  };
}

/** A phone / mobile number needs its country code, because the API stores "+code number". */
function phoneCodeValidator(group: AbstractControl): ValidationErrors | null {
  const errors: ValidationErrors = {};
  const has = (name: string) => !!String(group.get(name)?.value ?? '').trim();
  if (has('phoneNumber') && !has('phoneCode')) errors['phoneCodeRequired'] = true;
  if (has('mobileNumber') && !has('mobileCode')) errors['mobileCodeRequired'] = true;
  return Object.keys(errors).length ? errors : null;
}

/**
 * Owns the Client workspace's form state and reference data.
 *
 * Provided per-workspace (not root) so a fresh form and a fresh reference-data
 * fetch happen on each visit. Each step component receives its own child
 * FormGroup from here, which keeps the steps independent of one another.
 */
@Injectable()
export class ClientFormService {
  private readonly fb = inject(FormBuilder);
  private readonly clientTypeService = inject(ClientTypeService);
  private readonly industryService = inject(IndustryCategoryService);
  private readonly projectTypeService = inject(ProjectTypeService);
  private readonly clientService = inject(ClientService);

  readonly steps = CLIENT_STEPS;

  // ── Reference data ──────────────────────────────────────────────────
  readonly clientTypes = signal<ClientType[]>([]);
  readonly industries = signal<IndustryCategoryOption[]>([]);
  readonly projectTypes = signal<ProjectType[]>([]);
  readonly parentOptions = signal<ClientOption[]>([]);
  readonly referenceLoading = signal(true);
  readonly referenceError = signal<string | null>(null);

  readonly form: FormGroup = this.buildForm();

  constructor() {
    this.loadReferenceData();
  }

  // ── Reference data ──────────────────────────────────────────────────

  loadReferenceData(): void {
    this.referenceLoading.set(true);
    this.referenceError.set(null);

    forkJoin({
      types: this.clientTypeService.getActiveClientTypes(),
      industries: this.industryService.getActiveIndustryCategories(),
      projectTypes: this.projectTypeService.getActiveProjectTypes(),
      parents: this.clientService.getActiveClients(),
    }).subscribe({
      next: (res) => {
        this.clientTypes.set(res.types.data ?? []);
        this.industries.set(res.industries.data ?? []);
        this.projectTypes.set(res.projectTypes.data ?? []);
        this.parentOptions.set(res.parents.data ?? []);
        this.referenceLoading.set(false);
      },
      error: () => {
        this.referenceError.set('Unable to load client types, industries and project types.');
        this.referenceLoading.set(false);
      },
    });
  }

  clientTypeLabel(id: string | null | undefined): string {
    return this.clientTypes().find((t) => t.id === id)?.name ?? '—';
  }

  industryLabel(id: string | null | undefined): string {
    return this.industries().find((i) => i.id === id)?.name ?? '—';
  }

  parentLabel(id: string | null | undefined): string {
    const p = this.parentOptions().find((c) => c.id === id);
    return p ? (p.displayName || p.clientName) : '—';
  }

  // ── Form construction ───────────────────────────────────────────────

  private buildForm(): FormGroup {
    return this.fb.group({
      general: this.fb.group({
        clientName: ['', [Validators.required, Validators.maxLength(255)]],
        displayName: ['', [Validators.maxLength(100)]],
        clientTypeId: ['', [Validators.required]],
        industryCategoryId: [''],
        parentClientId: [''],
        countryCode: [''],
        website: ['', [Validators.maxLength(255), optionalPattern(WEBSITE_PATTERN)]],
        description: ['', [Validators.maxLength(4000)]],
        notes: ['', [Validators.maxLength(4000)]],
      }),
      addresses: this.fb.group({
        operationalAddressSameAsRegistered: [true],
        timeZone: [''],
        preferredLanguage: [''],
        registered: this.buildAddressGroup(),
        operational: this.fb.array<FormGroup>([]),
      }),
      contacts: this.fb.group({
        items: this.fb.array<FormGroup>([]),
      }),
      commercial: this.fb.group({
        legalEntityName: ['', [Validators.maxLength(255)]],
        legalEntityType: [''],
        registrationNumber: ['', [optionalPattern(REGISTRATION_PATTERN)]],
        taxRegistrationNumber: ['', [optionalPattern(REGISTRATION_PATTERN)]],
        externalBusinessId: ['', [Validators.maxLength(50)]],
        contractingEntityName: ['', [Validators.maxLength(255)]],
        defaultCurrencyCode: [''],
        defaultPaymentTerms: [''],
        contractReferenceFormat: ['', [Validators.maxLength(100)]],
        purchaseOrderReferenceFormat: ['', [Validators.maxLength(100)]],
        defaultIncoterms: [''],
        taxRegion: ['', [Validators.maxLength(100)]],
        dateFormat: [''],
      }),
      defaults: this.fb.group({
        defaultProjectTypeId: [''],
        defaultProjectCurrencyCode: [''],
        measurementSystem: [''],
        documentNumberingScheme: ['', [Validators.maxLength(100)]],
        defaultWbsTemplate: ['', [Validators.maxLength(100)]],
        defaultCostCodeScheme: ['', [Validators.maxLength(100)]],
        defaultApprovalWorkflow: ['', [Validators.maxLength(100)]],
        defaultProcurementTerms: ['', [Validators.maxLength(255)]],
        documentPortalUrl: ['', [Validators.maxLength(500), optionalPattern(WEBSITE_PATTERN)]],
        requiresClientApproval: [false],
        requiresDocumentControl: [false],
      }),
      // The Documents step has no form fields — its records go through their
      // own endpoints — but keeps a group so it takes part in step states.
      documents: this.fb.group({}),
    });
  }

  private buildAddressGroup(): FormGroup {
    return this.fb.group({
      id: [''],
      label: ['', [Validators.maxLength(100)]],
      addressLine1: ['', [Validators.maxLength(255)]],
      addressLine2: ['', [Validators.maxLength(255)]],
      city: ['', [Validators.maxLength(100)]],
      state: ['', [Validators.maxLength(100)]],
      postalCode: ['', [Validators.maxLength(20)]],
      countryCode: [''],
      isActive: [true],
    });
  }

  private buildContactGroup(value: ContactFormValue = blankContact()): FormGroup {
    return this.fb.group(
      {
        id: [value.id],
        contactName: [value.contactName, [Validators.required, Validators.maxLength(255)]],
        jobTitle: [value.jobTitle, [Validators.maxLength(150)]],
        department: [value.department, [Validators.maxLength(100)]],
        contactRole: [value.contactRole],
        email: [value.email, [Validators.email, Validators.maxLength(255)]],
        phoneCode: [value.phoneCode],
        phoneNumber: [value.phoneNumber, [optionalPattern(LOCAL_NUMBER_PATTERN)]],
        mobileCode: [value.mobileCode],
        mobileNumber: [value.mobileNumber, [optionalPattern(LOCAL_NUMBER_PATTERN)]],
        preferredContactMethod: [value.preferredContactMethod],
        isPrimary: [value.isPrimary],
        isProjectContact: [value.isProjectContact],
        isProcurementContact: [value.isProcurementContact],
        isFinanceContact: [value.isFinanceContact],
        isActive: [value.isActive],
      },
      { validators: [phoneCodeValidator] },
    );
  }

  // ── Accessors ───────────────────────────────────────────────────────

  group(key: ClientStepKey): FormGroup {
    return this.form.get(key) as FormGroup;
  }

  get registeredAddress(): FormGroup {
    return this.form.get('addresses.registered') as FormGroup;
  }

  get operationalAddresses(): FormArray<FormGroup> {
    return this.form.get('addresses.operational') as FormArray<FormGroup>;
  }

  get contacts(): FormArray<FormGroup> {
    return this.form.get('contacts.items') as FormArray<FormGroup>;
  }

  // ── Repeating groups ────────────────────────────────────────────────

  addOperationalAddress(value: AddressFormValue = blankAddress()): void {
    const group = this.buildAddressGroup();
    group.patchValue(value);
    this.operationalAddresses.push(group);
    this.operationalAddresses.markAsDirty();
  }

  removeOperationalAddress(index: number): void {
    this.operationalAddresses.removeAt(index);
    this.operationalAddresses.markAsDirty();
  }

  addContact(value: ContactFormValue = blankContact()): void {
    // A first contact becomes the primary by default — the common case, and
    // "one primary contact recommended".
    const initial = this.contacts.length === 0 ? { ...value, isPrimary: true } : value;
    this.contacts.push(this.buildContactGroup(initial));
    this.contacts.markAsDirty();
  }

  removeContact(index: number): void {
    this.contacts.removeAt(index);
    this.contacts.markAsDirty();
  }

  /** Makes one contact the primary and clears the flag on every other. */
  setPrimaryContact(index: number): void {
    this.contacts.controls.forEach((group, i) => {
      group.get('isPrimary')?.setValue(i === index, { emitEvent: false });
    });
    this.contacts.markAsDirty();
  }

  // ── Value in / out ──────────────────────────────────────────────────

  value(): ClientFormValue {
    return this.form.getRawValue() as ClientFormValue;
  }

  /** Replaces the whole form with a record, rebuilding the repeating groups. */
  patch(value: ClientFormValue): void {
    this.operationalAddresses.clear();
    this.contacts.clear();

    this.form.patchValue({
      general: value.general,
      addresses: {
        operationalAddressSameAsRegistered: value.addresses.operationalAddressSameAsRegistered,
        timeZone: value.addresses.timeZone,
        preferredLanguage: value.addresses.preferredLanguage,
        registered: value.addresses.registered,
      },
      commercial: value.commercial,
      defaults: value.defaults,
    });

    value.addresses.operational.forEach((a) => {
      const group = this.buildAddressGroup();
      group.patchValue(a);
      this.operationalAddresses.push(group);
    });
    value.contacts.items.forEach((c) => this.contacts.push(this.buildContactGroup(c)));

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  /** Back to an empty form — used by "Create Another". */
  reset(): void {
    this.patch(blankClientFormValue());
  }

  // ── Validation helpers ──────────────────────────────────────────────

  markStepTouched(key: ClientStepKey): void {
    this.group(key).markAllAsTouched();
  }

  markAllTouched(): void {
    this.form.markAllAsTouched();
  }

  firstInvalidStepIndex(): number {
    return this.steps.findIndex((step) => this.group(step.key).invalid);
  }
}
