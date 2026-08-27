import { ChangeDetectionStrategy, Component, ViewContainerRef, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, firstValueFrom, forkJoin, map, of } from 'rxjs';
import {
  ConfirmDialogComponent, ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MaterialFormService } from '../../services/material-form.service';
import { MaterialDocumentUploadService, UploadedDocument } from '../../services/material-document-upload.service';

/**
 * A logical document destination. `control` is the single source of truth for
 * where an upload lands — a file's own name never decides its destination.
 */
export interface DocumentSlot {
  key: string;
  control: string;
  label: string;
  icon: string;
  hint: string;
  /** Extensions offered in the picker and enforced before upload. */
  accept: string;
  multiple: boolean;
  maxFiles?: number;
}

const DOC_TYPES = '.pdf,.doc,.docx,.xls,.xlsx';
const IMAGE_TYPES = '.png,.jpg,.jpeg,.webp';

const DOCUMENT_SLOTS: readonly DocumentSlot[] = [
  {
    key: 'datasheet',
    control: 'datasheetUrl',
    label: 'Datasheet',
    icon: 'description',
    hint: 'Manufacturer datasheet',
    accept: DOC_TYPES,
    multiple: false,
  },
  {
    key: 'drawing',
    control: 'drawingSketchUrl',
    label: 'Drawing / Sketch',
    icon: 'architecture',
    hint: 'Isometric, GA or fabrication drawing',
    accept: `.pdf,.dwg,.dxf,${IMAGE_TYPES}`,
    multiple: false,
  },
  {
    key: 'technicalSpec',
    control: 'technicalSpecSheetUrl',
    label: 'Technical Specification Sheet',
    icon: 'fact_check',
    hint: 'Engineering specification',
    accept: DOC_TYPES,
    multiple: false,
  },
  {
    key: 'qualityCertificate',
    control: 'qualityCertificatesUrl',
    label: 'Quality Certificates',
    icon: 'verified',
    hint: 'Mill certificate, test report',
    accept: DOC_TYPES,
    multiple: false,
  },
  {
    key: 'complianceCertificate',
    control: 'complianceCertificatesUrl',
    label: 'Compliance Certificates',
    icon: 'gavel',
    hint: 'RoHS, CE, REACH',
    accept: DOC_TYPES,
    multiple: false,
  },
  {
    key: 'vendorQuotation',
    control: 'vendorQuotationUrl',
    label: 'Vendor Quotation',
    icon: 'request_quote',
    hint: 'Latest commercial quotation',
    accept: DOC_TYPES,
    multiple: false,
  },
  {
    key: 'inspectionReport',
    control: 'inspectionReportsUrl',
    label: 'Inspection Reports',
    icon: 'assignment',
    hint: 'Third-party inspection results',
    accept: DOC_TYPES,
    multiple: false,
  },
] as const;

const PHOTO_SLOT: DocumentSlot = {
  key: 'photos',
  control: 'photos',
  label: 'Photos',
  icon: 'photo_library',
  hint: 'Reference photos of the material as received or installed',
  accept: IMAGE_TYPES,
  multiple: true,
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
 * Every slot owns its own file input, so the destination control is decided by
 * the card the user acted on, never inferred from the file name. Uploads go
 * through MaterialDocumentUploadService (POST /materials/specification/document)
 * and the returned URL is written to `slot.control`. Pasting a URL stays
 * available for documents already stored elsewhere.
 */
@Component({
  selector: 'app-material-documents-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './material-documents-step.component.html',
  styleUrl: '../material-step.shared.scss',
})
export class MaterialDocumentsStepComponent {
  protected readonly formService = inject(MaterialFormService);
  protected readonly uploadService = inject(MaterialDocumentUploadService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly readonly = input(false);

  protected readonly slots = DOCUMENT_SLOTS;
  protected readonly photoSlot = PHOTO_SLOT;
  protected readonly maxPhotos = PHOTO_SLOT.maxFiles ?? 20;
  protected readonly maxFileSizeMb = MAX_FILE_SIZE_MB;

  /** Slot keys with an upload in flight. */
  private readonly uploading = signal<readonly string[]>([]);
  /** Slot key currently being dragged over, if any. */
  protected readonly dragSlot = signal<string | null>(null);
  protected readonly newPhotoUrl = signal('');

  protected get group(): FormGroup {
    return this.formService.group('documents');
  }

  protected get photos(): string[] {
    return (this.group.get(PHOTO_SLOT.control)?.value as string[]) ?? [];
  }

  protected isUploading(slot: DocumentSlot): boolean {
    return this.uploading().includes(slot.key);
  }

  protected slotValue(slot: DocumentSlot): string {
    return (this.group.get(slot.control)?.value as string) ?? '';
  }

  /**
   * Removing a document is destructive from the user's point of view — the link
   * is gone once the material is saved — so it goes through a confirmation.
   */
  protected async clearSlot(slot: DocumentSlot): Promise<void> {
    const url = this.slotValue(slot);
    if (!url) return;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        title: `Remove ${slot.label}?`,
        message: `Are you sure you want to remove "${this.fileNameFromUrl(url)}" from ${slot.label}? The attachment is cleared from this material when you save.`,
        confirmText: 'Remove',
        cancelText: 'Keep',
        color: 'warn',
        icon: 'warning',
      } satisfies ConfirmDialogData,
    });

    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;

    this.setSlotValue(slot, '');
    this.snack.open(`${slot.label} removed.`, 'Close', { duration: 3000 });
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

  // ── File selection ──────────────────────────────────────────────────

  protected onFilesSelected(event: Event, slot: DocumentSlot): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) this.handleFiles(files, slot);
    // Lets the same file be picked again after a remove.
    input.value = '';
  }

  protected onDragOver(event: DragEvent, slot: DocumentSlot): void {
    event.preventDefault();
    if (!this.readonly() && !this.isUploading(slot)) this.dragSlot.set(slot.key);
  }

  protected onDragLeave(): void {
    this.dragSlot.set(null);
  }

  protected onDrop(event: DragEvent, slot: DocumentSlot): void {
    event.preventDefault();
    this.dragSlot.set(null);
    if (this.readonly() || this.isUploading(slot)) return;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) this.handleFiles(files, slot);
  }

  private handleFiles(files: File[], slot: DocumentSlot): void {
    const selected = slot.multiple ? files : files.slice(0, 1);
    const valid = selected.filter((file) => this.validate(file, slot));
    if (!valid.length) return;

    if (slot.multiple) {
      this.uploadMany(valid, slot);
    } else {
      this.uploadOne(valid[0], slot);
    }
  }

  /** Rejects files the slot does not accept, or that exceed the size cap. */
  private validate(file: File, slot: DocumentSlot): boolean {
    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    const accepted = slot.accept.split(',').map((type) => type.trim().toLowerCase());
    if (!accepted.includes(extension)) {
      this.snack.open(
        `${file.name} is not accepted for ${slot.label}. Allowed: ${slot.accept}`,
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

  // ── Upload ──────────────────────────────────────────────────────────

  private uploadOne(file: File, slot: DocumentSlot): void {
    this.markUploading(slot, true);
    this.uploadService.upload(file).subscribe({
      next: (doc) => {
        this.setSlotValue(slot, doc.url);
        this.markUploading(slot, false);
        this.snack.open(`${doc.fileName} uploaded to ${slot.label}.`, 'Close', { duration: 3000 });
      },
      error: (err: HttpErrorResponse) => {
        this.markUploading(slot, false);
        this.reportFailure(slot, file.name, err);
      },
    });
  }

  private uploadMany(files: File[], slot: DocumentSlot): void {
    const room = (slot.maxFiles ?? files.length) - this.photos.length;
    if (room <= 0) {
      this.snack.open(`A material can hold at most ${slot.maxFiles} photos.`, 'Close', { duration: 4000 });
      return;
    }
    if (files.length > room) {
      this.snack.open(
        `Only ${room} more photo${room === 1 ? '' : 's'} can be added; the rest were skipped.`,
        'Close',
        { duration: 5000 },
      );
    }

    const batch = files.slice(0, room);
    this.markUploading(slot, true);

    // Each upload absorbs its own failure so one bad file cannot discard the
    // photos that did make it to storage.
    const uploads = batch.map((file) =>
      this.uploadService.upload(file).pipe(
        map((doc): PhotoUploadResult => ({ doc })),
        catchError((err: HttpErrorResponse) => of<PhotoUploadResult>({ file, err })),
      ),
    );

    forkJoin(uploads).subscribe((results) => {
      this.markUploading(slot, false);

      const existing = this.photos;
      const added = results
        .map((result) => result.doc?.url)
        .filter((url): url is string => !!url && !existing.includes(url));
      if (added.length) {
        this.setSlotValue(slot, [...existing, ...added]);
      }

      const failures = results.filter((result) => result.err);
      if (failures.length) {
        const first = failures[0];
        this.reportFailure(
          slot,
          failures.length === 1 ? (first.file?.name ?? 'photo') : `${failures.length} photos`,
          first.err!,
        );
      } else {
        this.snack.open(`${added.length} photo${added.length === 1 ? '' : 's'} uploaded.`, 'Close', { duration: 3000 });
      }
    });
  }

  private reportFailure(slot: DocumentSlot, subject: string, err: HttpErrorResponse): void {
    const message = err.error?.message ?? err.message ?? 'Upload failed.';
    this.snack.open(`${slot.label} — ${subject}: ${message}`, 'Close', { duration: 7000 });
  }

  private markUploading(slot: DocumentSlot, active: boolean): void {
    this.uploading.update((keys) =>
      active ? [...keys, slot.key] : keys.filter((key) => key !== slot.key),
    );
  }

  private setSlotValue(slot: DocumentSlot, value: string | string[]): void {
    const control = this.group.get(slot.control);
    control?.setValue(value);
    control?.markAsDirty();
    this.group.markAsDirty();
  }

  // ── Photos ──────────────────────────────────────────────────────────

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
    this.setSlotValue(PHOTO_SLOT, [...this.photos, url]);
    this.newPhotoUrl.set('');
  }

  protected removePhoto(index: number): void {
    this.setSlotValue(PHOTO_SLOT, this.photos.filter((_, i) => i !== index));
  }
}
