import { Injectable, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ProjectService } from '../../project/services/project.service';
import { ProjectOption } from '../../project/models/project.model';
import { parseIsoDate, toIsoDate } from '../../project/services/project.mapper';
import { WbsCostCode } from '../../wbs-cost-code/models/wbs-cost-code.model';
import { MaterialCategoryService } from '../../material-category/services/material-category.service';
import { MaterialGroupService } from '../../material-group/services/material-group.service';
import { UnitOfMeasurementService } from '../../unit-of-measurement/services/unit-of-measurement.service';
import { MaterialCategoryOption } from '../../material-category/models/material-category.model';
import { MaterialGroupOption } from '../../material-group/models/material-group.model';
import { UnitOfMeasurementOption } from '../../unit-of-measurement/models/unit-of-measurement.model';
import { MaterialRequisitionService } from './material-requisition.service';
import {
  APPROVER_EDITABLE_STATUSES, MaterialRequisition, REVIEWER_EDITABLE_STATUSES, RequisitionCandidate,
  RequisitionDocumentDraft,
  RequisitionDocumentType, RequisitionLine, RequisitionLineSource, RequisitionParticipantRole,
  RequisitionUserOption,
} from '../models/material-requisition.model';
import { CreateMaterialRequisitionRequest } from '../models/material-requisition-request.model';

/** The three wizard steps, in order. */
export const REQUISITION_STEPS = [
  { key: 'header', label: 'Header', title: 'Header & Documents' },
  { key: 'materials', label: 'Material Source & Selection', title: 'Select Materials' },
  { key: 'review', label: 'Review & Submit', title: 'Review & Submit' },
] as const;

const n = (value: string | null | undefined): string | null => {
  const t = (value ?? '').trim();
  return t ? t : null;
};

/**
 * Owns the requisition wizard's state: the header form, the documents, the
 * reference data, and — the part every material source shares — the set of
 * selected lines.
 *
 * Provided per-wizard (not root) so each visit starts clean.
 */
@Injectable()
export class RequisitionFormService {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(MaterialRequisitionService);
  private readonly projectService = inject(ProjectService);
  private readonly categoryService = inject(MaterialCategoryService);
  private readonly groupService = inject(MaterialGroupService);
  private readonly uomService = inject(UnitOfMeasurementService);

  readonly steps = REQUISITION_STEPS;

  // ── Reference data ──────────────────────────────────────────────────
  readonly projects = signal<ProjectOption[]>([]);
  readonly wbsCodes = signal<WbsCostCode[]>([]);
  readonly wbsLoading = signal(false);
  readonly categories = signal<MaterialCategoryOption[]>([]);
  readonly groups = signal<MaterialGroupOption[]>([]);
  readonly uoms = signal<UnitOfMeasurementOption[]>([]);
  readonly referenceLoading = signal(true);
  readonly referenceError = signal<string | null>(null);

  /** Internal users who can review or approve. */
  readonly userOptions = signal<RequisitionUserOption[]>([]);
  readonly userOptionsLoading = signal(false);
  readonly userOptionsError = signal<string | null>(null);

  /**
   * Assigned users no longer in the options (deactivated since), kept so the
   * pickers still show who they are.
   */
  private readonly assignedUsers = signal<RequisitionUserOption[]>([]);

  readonly allUserOptions = computed<RequisitionUserOption[]>(() => {
    const options = this.userOptions();
    const missing = this.assignedUsers().filter((a) => !options.some((o) => o.id === a.id));
    return [...missing, ...options];
  });

  /**
   * Reviewers change until the requisition is reviewed, approvers until it is
   * approved — and only by its requester (the API's permissions say which).
   */
  readonly reviewersLocked = signal(false);
  readonly approversLocked = signal(false);

  // ── Header ──────────────────────────────────────────────────────────
  readonly header: FormGroup = this.fb.group({
    shortDescription: ['', [Validators.maxLength(200)]],
    projectId: ['', [Validators.required]],
    wbsCostCodeId: ['', [Validators.required]],
    budgetHead: ['', [Validators.maxLength(100)]],
    requiredOnSiteDate: [null as Date | null, [Validators.required]],
    mrNumber: ['', [Validators.maxLength(50)]],
    mtoReference: ['', [Validators.maxLength(100)]],
    pidReference: ['', [Validators.maxLength(100)]],
    isometricReference: ['', [Validators.maxLength(100)]],
    areaUnit: ['', [Validators.maxLength(100)]],
    remarks: ['', [Validators.maxLength(4000)]],
    reviewerIds: [[] as string[]],
    approverIds: [[] as string[]],
  });

  readonly reviewerIdsValue = toSignal(this.header.get('reviewerIds')!.valueChanges, {
    initialValue: [] as string[],
  });
  readonly approverIdsValue = toSignal(this.header.get('approverIds')!.valueChanges, {
    initialValue: [] as string[],
  });

  /** The chosen reviewers, in order. */
  readonly selectedReviewers = computed(() => this.pick(this.reviewerIdsValue() ?? []));
  /** The chosen approvers, in order. */
  readonly selectedApprovers = computed(() => this.pick(this.approverIdsValue() ?? []));

  private pick(ids: string[]): RequisitionUserOption[] {
    const all = this.allUserOptions();
    return ids
      .map((id) => all.find((u) => u.id === id))
      .filter((u): u is RequisitionUserOption => !!u);
  }

  private readonly projectIdValue = toSignal(this.header.get('projectId')!.valueChanges, {
    initialValue: this.header.get('projectId')!.value as string,
  });
  private readonly wbsIdValue = toSignal(this.header.get('wbsCostCodeId')!.valueChanges, {
    initialValue: this.header.get('wbsCostCodeId')!.value as string,
  });

  /**
   * The project the requisition is for. When editing a draft whose project has
   * since closed it is not in the open list, so `loadedProject` stands in.
   */
  private readonly loadedProject = signal<ProjectOption | null>(null);

  readonly allProjects = computed<ProjectOption[]>(() => {
    const options = this.projects();
    const own = this.loadedProject();
    return own && !options.some((p) => p.id === own.id) ? [own, ...options] : options;
  });

  readonly selectedProject = computed(
    () => this.allProjects().find((p) => p.id === this.projectIdValue()) ?? null,
  );

  readonly selectedWbs = computed(
    () => this.wbsCodes().find((w) => w.id === this.wbsIdValue()) ?? null,
  );

  // ── Documents ───────────────────────────────────────────────────────
  readonly documents = signal<RequisitionDocumentDraft[]>([]);

  readonly coveringDocument = computed(
    () => this.documents().find((d) => d.documentType === RequisitionDocumentType.COVERING_DOCUMENT) ?? null,
  );

  readonly supportingDocuments = computed(
    () => this.documents().filter((d) => d.documentType !== RequisitionDocumentType.COVERING_DOCUMENT),
  );

  // ── Lines (shared by every material source) ─────────────────────────

  /** Everything the user has typed a quantity for, keyed by material. */
  private readonly lineMap = signal<ReadonlyMap<string, RequisitionLine>>(new Map());

  /**
   * Materials shown at the top of the list, newest first. A row is pinned when
   * its quantity is committed (the field loses focus), not on every keystroke —
   * moving a row while its input is focused would drop the cursor mid-number.
   */
  private readonly pinnedIds = signal<readonly string[]>([]);

  /**
   * Materials the user ticked. A ticked material is part of the requisition
   * whether or not it has a quantity yet; one with a quantity is always
   * selected, ticked or not (see `isSelected`).
   */
  private readonly tickedIds = signal<ReadonlySet<string>>(new Set());

  /** True once a line has been entered, changed or removed since the last save. */
  private readonly linesChanged = signal(false);

  /** The requisition's lines: pinned, with a quantity above zero. */
  readonly lines = computed<RequisitionLine[]>(() => {
    const map = this.lineMap();
    return this.pinnedIds()
      .map((id) => map.get(id))
      .filter((l): l is RequisitionLine => !!l && (l.requestedQty ?? 0) > 0);
  });

  readonly lineCount = computed(() => this.lines().length);

  /** Every selected line, including ticked ones still waiting for a quantity. */
  readonly selectedLines = computed<RequisitionLine[]>(() => {
    const map = this.lineMap();
    return this.pinnedIds()
      .map((id) => map.get(id))
      .filter((l): l is RequisitionLine => !!l);
  });

  /** Selected lines that have no quantity — the requisition cannot go on until they do. */
  readonly incompleteLines = computed(
    () => this.selectedLines().filter((l) => !((l.requestedQty ?? 0) > 0)),
  );

  /** Selected = ticked, or a quantity has been entered. */
  isSelected(materialId: string): boolean {
    return this.tickedIds().has(materialId) || (this.lineMap().get(materialId)?.requestedQty ?? 0) > 0;
  }

  /**
   * The checkbox of a row. Ticking pins the row to the top straight away;
   * unticking drops the line and its quantity.
   */
  setSelected(
    candidate: RequisitionCandidate,
    selected: boolean,
    source: RequisitionLineSource,
    sourceReference: string | null,
  ): void {
    if (!selected) {
      this.removeLine(candidate.materialId);
      return;
    }
    this.linesChanged.set(true);
    this.tickedIds.update((ids) => new Set(ids).add(candidate.materialId));
    this.lineMap.update((current) => {
      if (current.has(candidate.materialId)) return current;
      const next = new Map(current);
      next.set(candidate.materialId, {
        materialId: candidate.materialId,
        code: candidate.code,
        description: candidate.description,
        uom: candidate.uom,
        categoryName: candidate.categoryName,
        requestedQty: null,
        stockOnHand: candidate.stockOnHand,
        source,
        sourceReference,
      });
      return next;
    });
    if (!this.pinnedIds().includes(candidate.materialId)) {
      this.pinnedIds.update((ids) => [candidate.materialId, ...ids]);
    }
  }

  /** The current quantity typed for a material, or null. */
  quantityOf(materialId: string): number | null {
    return this.lineMap().get(materialId)?.requestedQty ?? null;
  }

  isPinned(materialId: string): boolean {
    return this.pinnedIds().includes(materialId);
  }

  /** Records a quantity as it is typed. Empty and 0 are kept until the field is left. */
  setQuantity(
    candidate: RequisitionCandidate,
    quantity: number | null,
    source: RequisitionLineSource,
    sourceReference: string | null,
  ): void {
    const qty = quantity !== null && Number.isFinite(quantity) && quantity > 0 ? quantity : null;
    if (qty !== null || this.lineMap().has(candidate.materialId)) this.linesChanged.set(true);
    this.lineMap.update((current) => {
      const next = new Map(current);
      const existing = next.get(candidate.materialId);
      if (!existing && qty === null) return current;
      next.set(candidate.materialId, {
        materialId: candidate.materialId,
        code: candidate.code,
        description: candidate.description,
        uom: candidate.uom,
        categoryName: candidate.categoryName,
        requestedQty: qty,
        stockOnHand: candidate.stockOnHand,
        // A line keeps the source it was first picked from.
        source: existing?.source ?? source,
        sourceReference: existing?.sourceReference ?? sourceReference,
      });
      return next;
    });
  }

  /** Called when a quantity field is left: pins a filled row, drops an empty one. */
  commitQuantity(materialId: string): void {
    if (this.isSelected(materialId)) {
      if (!this.pinnedIds().includes(materialId)) {
        this.pinnedIds.update((ids) => [materialId, ...ids]);
      }
    } else {
      this.removeLine(materialId);
    }
  }

  removeLine(materialId: string): void {
    if (this.lineMap().has(materialId)) this.linesChanged.set(true);
    this.lineMap.update((current) => {
      if (!current.has(materialId)) return current;
      const next = new Map(current);
      next.delete(materialId);
      return next;
    });
    this.pinnedIds.update((ids) => ids.filter((id) => id !== materialId));
    this.tickedIds.update((ids) => {
      if (!ids.has(materialId)) return ids;
      const next = new Set(ids);
      next.delete(materialId);
      return next;
    });
  }

  clearLines(): void {
    if (this.lineMap().size > 0) this.linesChanged.set(true);
    this.lineMap.set(new Map());
    this.pinnedIds.set([]);
    this.tickedIds.set(new Set());
  }

  /**
   * Sets quantities from each candidate's reference quantity (earlier MR line,
   * BOM row …) and pins them. Candidates without a reference are left alone.
   */
  applyReferenceQuantities(
    candidates: RequisitionCandidate[],
    source: RequisitionLineSource,
    sourceReference: string | null,
  ): number {
    let applied = 0;
    for (const c of candidates) {
      if (c.referenceQty !== null && c.referenceQty > 0) {
        this.setQuantity(c, c.referenceQty, source, sourceReference);
        this.commitQuantity(c.materialId);
        applied++;
      }
    }
    return applied;
  }

  // ── Reference data ──────────────────────────────────────────────────

  loadReferenceData(): void {
    this.referenceLoading.set(true);
    this.referenceError.set(null);

    forkJoin({
      projects: this.projectService.getActiveProjects(),
      categories: this.categoryService.getActiveMaterialCategories(),
      groups: this.groupService.getActiveMaterialGroups(),
      uoms: this.uomService.getActiveUnitsOfMeasurement(),
    }).subscribe({
      next: (res) => {
        this.projects.set(res.projects.data ?? []);
        this.categories.set(res.categories.data ?? []);
        this.groups.set(res.groups.data ?? []);
        this.uoms.set(res.uoms.data ?? []);
        this.referenceLoading.set(false);
      },
      error: () => {
        this.referenceError.set('Unable to load projects and material filters.');
        this.referenceLoading.set(false);
      },
    });

    this.loadUserOptions();
  }

  /** Internal users for the reviewer / approver pickers. */
  loadUserOptions(): void {
    this.userOptionsLoading.set(true);
    this.userOptionsError.set(null);
    this.service.getParticipantOptions().subscribe({
      next: (res) => {
        this.userOptions.set(res.data ?? []);
        this.userOptionsLoading.set(false);
      },
      error: () => {
        this.userOptionsError.set('Unable to load the users who can review or approve.');
        this.userOptionsLoading.set(false);
      },
    });
  }

  /** Loads the chosen project's WBS. */
  loadWbsCodes(projectId: string | null, then?: () => void): void {
    if (!projectId) {
      this.wbsCodes.set([]);
      then?.();
      return;
    }
    this.wbsLoading.set(true);
    this.service.getWbsCostCodes(projectId).subscribe({
      next: (res) => {
        this.wbsCodes.set(res.data ?? []);
        this.wbsLoading.set(false);
        then?.();
      },
      error: () => {
        this.wbsCodes.set([]);
        this.wbsLoading.set(false);
        then?.();
      },
    });
  }

  /** The user picked a different project: the old WBS no longer applies. */
  onProjectChanged(projectId: string): void {
    this.header.get('wbsCostCodeId')!.setValue('');
    this.header.get('wbsCostCodeId')!.markAsPristine();
    this.loadWbsCodes(projectId || null);
  }

  // ── Documents ───────────────────────────────────────────────────────

  addDocument(doc: Omit<RequisitionDocumentDraft, 'key'>): void {
    const draft: RequisitionDocumentDraft = { ...doc, key: `d${Date.now()}${Math.random().toString(36).slice(2, 7)}` };
    this.documents.update((docs) =>
      // One covering document at most: a new one replaces the old.
      draft.documentType === RequisitionDocumentType.COVERING_DOCUMENT
        ? [...docs.filter((d) => d.documentType !== RequisitionDocumentType.COVERING_DOCUMENT), draft]
        : [...docs, draft],
    );
    this.header.markAsDirty();
  }

  replaceDocument(key: string, file: Omit<RequisitionDocumentDraft, 'key' | 'documentType'>): void {
    this.documents.update((docs) => docs.map((d) => (d.key === key ? { ...d, ...file } : d)));
    this.header.markAsDirty();
  }

  setDocumentType(key: string, documentType: RequisitionDocumentType): void {
    this.documents.update((docs) => docs.map((d) => (d.key === key ? { ...d, documentType } : d)));
    this.header.markAsDirty();
  }

  removeDocument(key: string): void {
    this.documents.update((docs) => docs.filter((d) => d.key !== key));
    this.header.markAsDirty();
  }

  // ── Validation / change tracking ────────────────────────────────────

  /** Anything entered that has not been saved yet. */
  hasUnsavedChanges(): boolean {
    return this.header.dirty || this.linesChanged();
  }

  /** Call after a successful save. */
  markSaved(): void {
    this.header.markAsPristine();
    this.linesChanged.set(false);
  }

  /**
   * What stops the requisition being submitted, in the order the user would fix
   * it. The server enforces the same rules; listing them here saves a round trip.
   */
  submitIssues(): string[] {
    const issues: string[] = [];
    const c = this.header.controls;

    if (!c['projectId'].value) issues.push('Select a project.');
    if (!c['wbsCostCodeId'].value) issues.push('Select a WBS.');

    const ros = c['requiredOnSiteDate'].value as Date | null;
    const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    if (!ros) issues.push('Set the required-on-site date.');
    else if (ros < today) issues.push('The required-on-site date cannot be in the past.');

    const reviewers = (c['reviewerIds'].value as string[]) ?? [];
    const approvers = (c['approverIds'].value as string[]) ?? [];
    if (!this.reviewersLocked() && !reviewers.length) issues.push('Assign at least one reviewer.');
    if (!this.approversLocked() && !approvers.length) issues.push('Assign at least one approver.');

    if (this.header.invalid && issues.length === 0) issues.push('Correct the highlighted header fields.');
    const missing = this.incompleteLines().length;
    if (missing > 0) {
      issues.push(`Enter a quantity for all the selected materials (${missing} missing).`);
    } else if (this.lineCount() === 0) {
      issues.push('Enter a quantity for at least one material.');
    }
    return issues;
  }

  /** Things worth a second look that do not block submission. */
  warnings(): string[] {
    const warnings: string[] = [];
    if (!this.coveringDocument()) warnings.push('No covering document has been attached.');
    return warnings;
  }

  // ── Value in / out ──────────────────────────────────────────────────

  /**
   * Builds the request. Only lines with a quantity above zero are sent — the
   * server ignores the rest anyway, but the review should show what is saved.
   */
  toRequest(submit: boolean): CreateMaterialRequisitionRequest {
    const v = this.header.getRawValue();
    return {
      projectId: v.projectId,
      wbsCostCodeId: v.wbsCostCodeId || null,
      budgetHead: n(v.budgetHead),
      shortDescription: n(v.shortDescription),
      requiredOnSiteDate: toIsoDate(v.requiredOnSiteDate) || null,
      mrNumber: n(v.mrNumber),
      mtoReference: n(v.mtoReference),
      pidReference: n(v.pidReference),
      isometricReference: n(v.isometricReference),
      areaUnit: n(v.areaUnit),
      remarks: n(v.remarks),
      items: this.lines().map((l) => ({
        materialId: l.materialId,
        requestedQty: l.requestedQty as number,
        source: l.source,
        sourceReference: l.sourceReference,
      })),
      documents: this.documents().map((d) => ({
        documentType: d.documentType,
        documentName: d.documentName,
        documentUrl: d.documentUrl,
        fileName: d.fileName,
        mimeType: d.mimeType,
        fileSizeBytes: d.fileSizeBytes,
      })),
      submit,
      // A locked list is left out: the API keeps it as it is.
      ...(this.reviewersLocked() ? {} : { reviewerIds: [...((v.reviewerIds as string[]) ?? [])] }),
      ...(this.approversLocked() ? {} : { approverIds: [...((v.approverIds as string[]) ?? [])] }),
    };
  }

  /** Fills the wizard from a saved requisition (editing a draft). */
  load(mr: MaterialRequisition): void {
    this.header.patchValue({
      projectId: mr.projectId,
      wbsCostCodeId: mr.wbsCostCodeId ?? '',
      budgetHead: mr.budgetHead ?? '',
      shortDescription: mr.shortDescription ?? '',
      requiredOnSiteDate: parseIsoDate(mr.requiredOnSiteDate),
      mrNumber: mr.mrNumber === mr.code ? '' : mr.mrNumber,
      mtoReference: mr.mtoReference ?? '',
      pidReference: mr.pidReference ?? '',
      isometricReference: mr.isometricReference ?? '',
      areaUnit: mr.areaUnit ?? '',
      remarks: mr.remarks ?? '',
      reviewerIds: this.participantIds(mr, RequisitionParticipantRole.REVIEWER),
      approverIds: this.participantIds(mr, RequisitionParticipantRole.APPROVER),
    });
    this.assignedUsers.set((mr.participants ?? []).map((p) => ({
      id: p.userId, name: p.userName, email: p.userEmail, position: null, role: null,
    })));
    // The API says whether this user may change them; without it, go by the status.
    this.lockParticipants(
      mr.permissions ? !mr.permissions.canEditReviewers : !REVIEWER_EDITABLE_STATUSES.includes(mr.status),
      mr.permissions ? !mr.permissions.canEditApprovers : !APPROVER_EDITABLE_STATUSES.includes(mr.status),
    );

    this.loadedProject.set({
      id: mr.projectId,
      code: mr.projectCode ?? '',
      projectName: mr.projectName ?? mr.projectId,
      clientId: '',
      clientCode: mr.clientCode,
      clientName: mr.clientName,
      status: 'ACTIVE' as ProjectOption['status'],
      currencyCode: null,
    });
    this.loadWbsCodes(mr.projectId);

    const map = new Map<string, RequisitionLine>();
    const ids: string[] = [];
    for (const item of [...mr.items].sort((a, b) => a.lineNumber - b.lineNumber)) {
      map.set(item.materialId, {
        materialId: item.materialId,
        code: item.materialCode,
        description: item.materialDescription,
        uom: item.uom,
        categoryName: null,
        requestedQty: item.requestedQty,
        stockOnHand: item.stockOnHand,
        source: item.source,
        sourceReference: item.sourceReference,
      });
      ids.push(item.materialId);
    }
    this.lineMap.set(map);
    this.pinnedIds.set(ids);
    this.tickedIds.set(new Set(ids));

    this.documents.set(mr.documents.map((d) => ({
      key: d.id,
      documentType: d.documentType,
      documentName: d.documentName,
      documentUrl: d.documentUrl,
      fileName: d.fileName,
      mimeType: d.mimeType,
      fileSizeBytes: d.fileSizeBytes,
    })));

    this.header.markAsPristine();
    this.header.markAsUntouched();
    this.linesChanged.set(false);
  }

  /** Fixes (or frees) the reviewer and approver pickers. */
  private lockParticipants(reviewersLocked: boolean, approversLocked: boolean): void {
    this.reviewersLocked.set(reviewersLocked);
    this.approversLocked.set(approversLocked);
    for (const [name, locked] of [['reviewerIds', reviewersLocked], ['approverIds', approversLocked]] as const) {
      const control = this.header.get(name)!;
      if (locked) control.disable({ emitEvent: false });
      else control.enable({ emitEvent: false });
    }
  }

  /** Sets one of the two lists from a picker. */
  setParticipants(controlName: 'reviewerIds' | 'approverIds', ids: string[]): void {
    const control = this.header.get(controlName)!;
    control.setValue([...ids]);
    control.markAsDirty();
  }

  private participantIds(mr: MaterialRequisition, role: RequisitionParticipantRole): string[] {
    return (mr.participants ?? [])
      .filter((p) => p.role === role)
      .sort((a, b) => a.sequence - b.sequence)
      .map((p) => p.userId);
  }

  /**
   * Pre-fills a NEW requisition from an earlier one (Import): header, reviewers,
   * approvers, documents and every line with its quantity. Nothing is saved;
   * the user changes what they need and saves it as a new requisition with its
   * own number. A required-on-site date already in the past is cleared.
   */
  importFrom(source: MaterialRequisition, eligible?: RequisitionUserOption[]): string[] {
    this.load(source);

    const ros = parseIsoDate(source.requiredOnSiteDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.header.patchValue({
      mrNumber: '',
      requiredOnSiteDate: ros && ros >= today ? ros : null,
    });
    // A new requisition: its reviewers and approvers are the requester's to change.
    this.lockParticipants(false, false);

    // People on the old requisition who have since been deleted or deactivated
    // (or who are no longer internal) cannot be assigned again: they are left
    // out, and their names returned so the user can be told.
    const dropped: string[] = [];
    if (eligible) {
      this.userOptions.set(eligible);
      const ok = new Set(eligible.map((u) => u.id));
      for (const name of ['reviewerIds', 'approverIds'] as const) {
        const ids = (this.header.get(name)!.value as string[]) ?? [];
        const kept = ids.filter((id) => ok.has(id));
        if (kept.length !== ids.length) {
          for (const id of ids.filter((x) => !ok.has(x))) {
            const who = (source.participants ?? []).find((p) => p.userId === id)?.userName ?? id;
            if (!dropped.includes(who)) dropped.push(who);
          }
          this.header.get(name)!.setValue(kept);
        }
      }
      this.assignedUsers.set([]);
    }

    // Each line remembers the requisition it was copied from.
    const lines = new Map<string, RequisitionLine>();
    for (const [id, line] of this.lineMap()) {
      lines.set(id, { ...line, source: RequisitionLineSource.EARLIER_MR, sourceReference: source.mrNumber });
    }
    this.lineMap.set(lines);

    this.header.markAsDirty();
    this.linesChanged.set(true);
    return dropped;
  }

  /** Back to an empty wizard — used by "Create New MR". */
  reset(): void {
    this.header.reset({
      shortDescription: '', projectId: '', wbsCostCodeId: '', budgetHead: '', requiredOnSiteDate: null, mrNumber: '',
      mtoReference: '', pidReference: '', isometricReference: '', areaUnit: '', remarks: '',
      reviewerIds: [], approverIds: [],
    });
    this.assignedUsers.set([]);
    this.lockParticipants(false, false);
    this.wbsCodes.set([]);
    this.loadedProject.set(null);
    this.documents.set([]);
    this.lineMap.set(new Map());
    this.pinnedIds.set([]);
    this.tickedIds.set(new Set());
    this.linesChanged.set(false);
    this.header.markAsPristine();
  }
}
