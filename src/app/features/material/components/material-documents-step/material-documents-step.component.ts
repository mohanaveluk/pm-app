import {
  ChangeDetectionStrategy, Component, ViewContainerRef, effect, inject, input, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, firstValueFrom, forkJoin, map, of, switchMap } from 'rxjs';
import {
  ConfirmDialogComponent, ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MaterialFormService } from '../../services/material-form.service';
import { MaterialService } from '../../services/material.service';
import { MaterialDocumentUploadService, UploadedDocument } from '../../services/material-document-upload.service';
import { MaterialDocument, MaterialDocumentType } from '../../models/material.model';

/**
 * One document *type*, backed by the versioned register (material_documents)
 * rather than a single flat URL. A type can hold several concurrent chains —
 * three separate quality certificates is normal — and each chain can carry
 * several versions, so `type` maps to a whole list in the UI, not one slot.
 */
export interface TypedDocumentSlot {
  key: string;
  documentType: MaterialDocumentType;
  label: string;
  icon: string;
  hint: string;
  /** Extensions offered in the picker and enforced before upload. */
  accept: string;
}

const DOC_TYPES = '.pdf,.doc,.docx,.xls,.xlsx';
const IMAGE_TYPES = '.png,.jpg,.jpeg,.webp';

const TYPED_SLOTS: readonly TypedDocumentSlot[] = [
  {
    key: 'datasheet',
    documentType: MaterialDocumentType.DATASHEET,
    label: 'Datasheet',
    icon: 'description',
    hint: 'Manufacturer datasheet',
    accept: DOC_TYPES,
  },
  {
    key: 'drawing',
    documentType: MaterialDocumentType.DRAWING_SKETCH,
    label: 'Drawing / Sketch',
    icon: 'architecture',
    hint: 'Isometric, GA or fabrication drawing',
    accept: `.pdf,.dwg,.dxf,${IMAGE_TYPES}`,
  },
  {
    key: 'technicalSpec',
    documentType: MaterialDocumentType.TECHNICAL_SPEC_SHEET,
    label: 'Technical Specification Sheet',
    icon: 'fact_check',
    hint: 'Engineering specification',
    accept: DOC_TYPES,
  },
  {
    key: 'qualityCertificate',
    documentType: MaterialDocumentType.QUALITY_CERTIFICATE,
    label: 'Quality Certificates',
    icon: 'verified',
    hint: 'Mill certificate, test report',
    accept: DOC_TYPES,
  },
  {
    key: 'complianceCertificate',
    documentType: MaterialDocumentType.COMPLIANCE_CERTIFICATE,
    label: 'Compliance Certificates',
    icon: 'gavel',
    hint: 'RoHS, CE, REACH',
    accept: DOC_TYPES,
  },
  {
    key: 'vendorQuotation',
    documentType: MaterialDocumentType.VENDOR_QUOTATION,
    label: 'Vendor Quotation',
    icon: 'request_quote',
    hint: 'Latest commercial quotation',
    accept: DOC_TYPES,
  },
  {
    key: 'inspectionReport',
    documentType: MaterialDocumentType.INSPECTION_REPORT,
    label: 'Inspection Reports',
    icon: 'assignment',
    hint: 'Third-party inspection results',
    accept: DOC_TYPES,
  },
] as const;

/** Photos stay a plain, unversioned array — untouched by this rewrite. */
interface PhotoSlot {
  key: string;
  control: string;
  label: string;
  icon: string;
  hint: string;
  accept: string;
  maxFiles: number;
}

const PHOTO_SLOT: PhotoSlot = {
  key: 'photos',
  control: 'photos',
  label: 'Photos',
  icon: 'photo_library',
  hint: 'Reference photos of the material as received or installed',
  accept: IMAGE_TYPES,
  maxFiles: 20,
};

/** Outcome of one photo in a multi-file batch — exactly one of the two arms. */
interface PhotoUploadResult {
  doc?: UploadedDocument;
  file?: File;
  err?: HttpErrorResponse;
}

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Step 9 — Document Attachments.
 *
 * `GET /materials/:id` now returns a `documents` array — the current version of
 * each document type, backed by the material_documents register — alongside
 * the deprecated flat columns (datasheetUrl, …) that the server keeps in sync
 * for backward compatibility only. This step no longer reads or writes those
 * flat columns at all: every typed slot below is driven entirely by
 * `GET /materials/:id/documents?includeSuperseded=true`, fetched independently
 * of the main create/update form.
 *
 * Each slot can hold several documents (a material may legitimately have
 * three separate quality certificates), and each document can have several
 * versions (a revision supersedes the one before it, which is retained rather
 * than overwritten). "Add New Document" always starts or extends a chain via
 * `POST /materials/:id/documents` with no `supersedesId` — the server decides
 * whether that auto-supersedes (datasheet, drawing, tech spec, vendor
 * quotation) or starts an independent chain (everything else). "Replace"
 * targets one specific document explicitly via `supersedesId`. "Delete" is
 * `DELETE /materials/:id/documents/:documentId`, soft, and refused with 409
 * once a purchase order has locked the material.
 *
 * Because a step-1 POST always creates the material before this, the final
 * step, becomes reachable, `materialId()` is expected to be set whenever a
 * user can interact with this component — the guard below exists only for the
 * unusual case where it briefly is not.
 *
 * `photos` is unaffected by any of this: it stays a plain, unversioned
 * `string[]` uploaded and edited exactly as before.
 */
@Component({
  selector: 'app-material-documents-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './material-documents-step.component.html',
  styleUrl: '../material-step.shared.scss',
})
export class MaterialDocumentsStepComponent {
  protected readonly formService = inject(MaterialFormService);
  private readonly materialService = inject(MaterialService);
  protected readonly uploadService = inject(MaterialDocumentUploadService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly readonly = input(false);
  /** Set once the material exists — always true by the time this step is reachable. */
  readonly materialId = input<string | null>(null);
  /**
   * Once a purchase order has been issued, the paperwork that existed at that
   * moment must be preserved unchanged — a supplier priced against exactly
   * those files. Anything filed afterward (a revised drawing, a mill
   * certificate that only arrives during fabrication) is still fair game.
   * Adding a brand-new document is never restricted, regardless of this flag.
   */
  readonly isPurchaseOrderIssued = input(false);
  readonly purchaseOrderIssuedAt = input<string | null>(null);

  protected readonly slots = TYPED_SLOTS;
  protected readonly photoSlot = PHOTO_SLOT;
  protected readonly maxPhotos = PHOTO_SLOT.maxFiles;
  protected readonly maxFileSizeMb = MAX_FILE_SIZE_MB;

  /** The full version register for this material — every type, every chain, every version. */
  protected readonly documents = signal<MaterialDocument[]>([]);
  protected readonly documentsLoading = signal(false);
  protected readonly documentsError = signal<string | null>(null);

  /** Slot keys with an upload in flight (typed slots and the photo slot share this). */
  private readonly uploading = signal<readonly string[]>([]);
  /** Slot key currently being dragged over, if any. */
  protected readonly dragSlot = signal<string | null>(null);
  protected readonly newPhotoUrl = signal('');

  /** Which document a file about to be picked will supersede, if any — set just before the input opens. */
  private pendingSlot: TypedDocumentSlot | null = null;
  private pendingSupersedesId: string | undefined;

  constructor() {
    // Reloads whenever the workspace assigns or changes the material id —
    // covers both "just created at step 1" and "editing an existing record".
    effect(() => {
      const id = this.materialId();
      if (id) this.loadDocuments(id);
      else this.documents.set([]);
    });
  }

  protected get group() {
    return this.formService.group('documents');
  }

  protected get photos(): string[] {
    return (this.group.get(PHOTO_SLOT.control)?.value as string[]) ?? [];
  }

  protected isUploading(key: string): boolean {
    return this.uploading().includes(key);
  }

  /** Every version of every chain for this type, newest version first. */
  protected documentsFor(slot: TypedDocumentSlot): MaterialDocument[] {
    return this.documents()
      .filter((d) => d.documentType === slot.documentType)
      .sort((a, b) => {
        if (b.version !== a.version) return b.version - a.version;
        return (b.uploadedAt ?? b.createdAt).localeCompare(a.uploadedAt ?? a.createdAt);
      });
  }

  /**
   * True when this document may be replaced or deleted.
   *
   * Once a purchase order is issued, only documents filed AFTER
   * `purchaseOrderIssuedAt` qualify — anything the supplier was actually
   * priced against (created before that moment) is frozen. With no PO issued,
   * every document qualifies.
   */
  protected canModify(doc: MaterialDocument): boolean {
    if (!this.isPurchaseOrderIssued()) return true;
    const lockedAt = this.purchaseOrderIssuedAt();
    if (!lockedAt) return true;
    return new Date(doc.createdAt).getTime() > new Date(lockedAt).getTime();
  }

  /** Explains a disabled Replace/Delete button — shown as its tooltip. */
  protected lockedReason(): string {
    return 'This document predates the purchase order issued against this material and is frozen. '
      + 'Add a new document instead.';
  }

  protected refreshDocuments(): void {
    const id = this.materialId();
    if (id) this.loadDocuments(id);
  }

  private loadDocuments(materialId: string): void {
    this.documentsLoading.set(true);
    this.documentsError.set(null);
    this.materialService.getMaterialDocuments(materialId, { includeSuperseded: true }).subscribe({
      next: (res) => {
        this.documents.set(res.data ?? []);
        this.documentsLoading.set(false);
      },
      error: () => {
        this.documentsError.set('Unable to load documents. Retry to try again.');
        this.documentsLoading.set(false);
      },
    });
  }

  /** Best display name for a stored document — the server's own name first. */
  protected documentName(doc: MaterialDocument): string {
    return doc.fileName || this.fileNameFromUrl(doc.documentUrl);
  }

  protected openUrl(url: string): void {
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  /** Derives a display name from a URL's last path segment. */
  protected fileNameFromUrl(url: string): string {
    try {
      const path = new URL(url).pathname;
      return decodeURIComponent(path.split('/').filter(Boolean).pop() ?? url);
    } catch {
      return url.split('/').filter(Boolean).pop() ?? url;
    }
  }

  // ── Typed document slots ────────────────────────────────────────────

  /** Opens the slot's file input for a brand-new document (no supersedesId). */
  protected addDocument(slot: TypedDocumentSlot, input: HTMLInputElement): void {
    if (this.readonly() || this.isUploading(slot.key)) return;
    this.pendingSlot = slot;
    this.pendingSupersedesId = undefined;
    input.click();
  }

  /** Opens the slot's file input to file the next version of one specific document. */
  protected replaceDocument(slot: TypedDocumentSlot, doc: MaterialDocument, input: HTMLInputElement): void {
    if (this.readonly() || this.isUploading(slot.key)) return;
    if (!this.canModify(doc)) {
      this.snack.open(this.lockedReason(), 'Close', { duration: 6000 });
      return;
    }
    this.pendingSlot = slot;
    this.pendingSupersedesId = doc.id;
    input.click();
  }

  protected onTypedFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const slot = this.pendingSlot;
    const supersedesId = this.pendingSupersedesId;
    this.pendingSlot = null;
    this.pendingSupersedesId = undefined;
    // Lets the same file be picked again right after a delete.
    input.value = '';
    if (file && slot) this.uploadTypedDocument(file, slot, supersedesId);
  }

  protected onTypedDragOver(event: DragEvent, slot: TypedDocumentSlot): void {
    event.preventDefault();
    if (!this.readonly() && !this.isUploading(slot.key)) this.dragSlot.set(slot.key);
  }

  protected onTypedDragLeave(): void {
    this.dragSlot.set(null);
  }

  protected onTypedDrop(event: DragEvent, slot: TypedDocumentSlot): void {
    event.preventDefault();
    this.dragSlot.set(null);
    if (this.readonly() || this.isUploading(slot.key)) return;
    const file = Array.from(event.dataTransfer?.files ?? [])[0];
    if (file) this.uploadTypedDocument(file, slot, undefined);
  }

  private uploadTypedDocument(file: File, slot: TypedDocumentSlot, supersedesId: string | undefined): void {
    if (!this.validate(file, slot.accept, slot.label)) return;

    const materialId = this.materialId();
    if (!materialId) {
      this.snack.open('Save the material before attaching documents.', 'Close', { duration: 5000 });
      return;
    }

    this.markUploading(slot.key, true);
    this.uploadService.upload(file).pipe(
      switchMap((uploaded) => this.materialService.addMaterialDocument(materialId, {
        documentType: slot.documentType,
        documentUrl: uploaded.url,
        fileName: uploaded.fileName,
        mimeType: uploaded.contentType,
        supersedesId,
      })),
    ).subscribe({
      next: () => {
        this.markUploading(slot.key, false);
        this.snack.open(
          `${slot.label} ${supersedesId ? 'replaced' : 'added'} (${file.name}).`,
          'Close',
          { duration: 3000 },
        );
        this.loadDocuments(materialId);
      },
      error: (err: HttpErrorResponse) => {
        this.markUploading(slot.key, false);
        this.reportFailure(slot.label, file.name, err);
      },
    });
  }

  /**
   * Removing a document is destructive — the version is gone once deleted —
   * so it goes through a confirmation, matching every other destructive action
   * in this app.
   */
  protected async deleteDocument(slot: TypedDocumentSlot, doc: MaterialDocument): Promise<void> {
    const materialId = this.materialId();
    if (!materialId) return;
    if (!this.canModify(doc)) {
      this.snack.open(this.lockedReason(), 'Close', { duration: 6000 });
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        title: `Delete ${slot.label}?`,
        message: `Remove "${this.documentName(doc)}" (version ${doc.version})? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Keep',
        color: 'warn',
        icon: 'warning',
      } satisfies ConfirmDialogData,
    });

    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;

    this.materialService.removeMaterialDocument(materialId, doc.id).subscribe({
      next: () => {
        this.snack.open(`${slot.label} deleted.`, 'Close', { duration: 3000 });
        this.loadDocuments(materialId);
      },
      error: (err: HttpErrorResponse) => {
        const message = err.status === 409
          ? (err.error?.message ?? 'This material is locked by a purchase order — documents can no longer be deleted.')
          : (err.error?.message ?? err.message ?? 'Unable to delete this document.');
        this.snack.open(message, 'Close', { duration: 7000 });
      },
    });
  }

  /** Rejects files the slot does not accept, or that exceed the size cap. */
  private validate(file: File, accept: string, label: string): boolean {
    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    const accepted = accept.split(',').map((type) => type.trim().toLowerCase());
    if (!accepted.includes(extension)) {
      this.snack.open(
        `${file.name} is not accepted for ${label}. Allowed: ${accept}`,
        'Close',
        { duration: 6000 },
      );
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      this.snack.open(`${file.name} exceeds the ${MAX_FILE_SIZE_MB} MB limit.`, 'Close', { duration: 6000 });
      return false;
    }
    return true;
  }

  private reportFailure(label: string, subject: string, err: HttpErrorResponse): void {
    const message = err.error?.message ?? err.message ?? 'Upload failed.';
    this.snack.open(`${label} — ${subject}: ${message}`, 'Close', { duration: 7000 });
  }

  private markUploading(key: string, active: boolean): void {
    this.uploading.update((keys) =>
      active ? [...keys, key] : keys.filter((k) => k !== key),
    );
  }

  // ── Photos — unversioned, unchanged from before ──────────────────────

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) this.uploadPhotos(files);
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.readonly() && !this.isUploading(PHOTO_SLOT.key)) this.dragSlot.set(PHOTO_SLOT.key);
  }

  protected onDragLeave(): void {
    this.dragSlot.set(null);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragSlot.set(null);
    if (this.readonly() || this.isUploading(PHOTO_SLOT.key)) return;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) this.uploadPhotos(files);
  }

  private uploadPhotos(files: File[]): void {
    const room = PHOTO_SLOT.maxFiles - this.photos.length;
    if (room <= 0) {
      this.snack.open(`A material can hold at most ${PHOTO_SLOT.maxFiles} photos.`, 'Close', { duration: 4000 });
      return;
    }
    const valid = files.filter((file) => this.validate(file, PHOTO_SLOT.accept, PHOTO_SLOT.label));
    if (!valid.length) return;

    if (valid.length > room) {
      this.snack.open(
        `Only ${room} more photo${room === 1 ? '' : 's'} can be added; the rest were skipped.`,
        'Close',
        { duration: 5000 },
      );
    }

    const batch = valid.slice(0, room);
    this.markUploading(PHOTO_SLOT.key, true);

    // Each upload absorbs its own failure so one bad file cannot discard the
    // photos that did make it to storage.
    const uploads = batch.map((file) =>
      this.uploadService.upload(file).pipe(
        map((doc): PhotoUploadResult => ({ doc })),
        catchError((err: HttpErrorResponse) => of<PhotoUploadResult>({ file, err })),
      ),
    );

    forkJoin(uploads).subscribe((results) => {
      this.markUploading(PHOTO_SLOT.key, false);

      const existing = this.photos;
      const added = results
        .map((result) => result.doc?.url)
        .filter((url): url is string => !!url && !existing.includes(url));
      if (added.length) {
        this.setPhotos([...existing, ...added]);
      }

      const failures = results.filter((result) => result.err);
      if (failures.length) {
        const first = failures[0];
        this.reportFailure(
          PHOTO_SLOT.label,
          failures.length === 1 ? (first.file?.name ?? 'photo') : `${failures.length} photos`,
          first.err!,
        );
      } else {
        this.snack.open(`${added.length} photo${added.length === 1 ? '' : 's'} uploaded.`, 'Close', { duration: 3000 });
      }
    });
  }

  protected addPhotoUrl(): void {
    const url = this.newPhotoUrl().trim();
    if (!url) return;
    if (this.photos.length >= this.maxPhotos) {
      this.snack.open(`A material can hold at most ${this.maxPhotos} photos.`, 'Close', { duration: 4000 });
      return;
    }
    if (this.photos.includes(url)) {
      this.snack.open('That photo URL has already been added.', 'Close', { duration: 3000 });
      return;
    }
    this.setPhotos([...this.photos, url]);
    this.newPhotoUrl.set('');
  }

  protected removePhoto(index: number): void {
    this.setPhotos(this.photos.filter((_, i) => i !== index));
  }

  private setPhotos(value: string[]): void {
    const control = this.group.get(PHOTO_SLOT.control);
    control?.setValue(value);
    control?.markAsDirty();
    this.group.markAsDirty();
  }
}
