import {
  ChangeDetectionStrategy, Component, ViewContainerRef, effect, inject, input, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, switchMap } from 'rxjs';
import {
  ConfirmDialogComponent, ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { VendorService } from '../../services/vendor.service';
import { VendorDocument } from '../../models/vendor.model';
import { VENDOR_DOCUMENT_SLOTS, VendorTypedDocumentSlot } from '../../services/vendor-form.service';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Step 10 — Documents.
 *
 * Fully decoupled from the reactive form: every card is backed by the
 * versioned register (vendor_documents), fetched via
 * GET /vendors/:id/documents?includeSuperseded=true and mutated through
 * POST/DELETE /vendors/:id/documents[/:documentId] — mirroring the pattern
 * already built for Material Documents. Add/Replace/Delete take effect
 * immediately, independently of the workspace's Save/Submit, and stay
 * available for the vendor's entire lifecycle: there is no purchase-order
 * lock or "locked after creation" restriction on documents here.
 *
 * A brand-new vendor has no id yet — Save Draft is what creates one — so
 * every card shows a "save first" hint until `vendorId()` is set.
 */
@Component({
  selector: 'app-vendor-documents-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './vendor-documents-step.component.html',
  styleUrl: '../vendor-step.shared.scss',
})
export class VendorDocumentsStepComponent {
  private readonly vendorService = inject(VendorService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly readonly = input(false);
  /** Set once the vendor has been created (Save Draft or Submit). */
  readonly vendorId = input<string | null>(null);

  protected readonly slots = VENDOR_DOCUMENT_SLOTS;
  protected readonly maxFileSizeMb = MAX_FILE_SIZE_MB;

  /** The full version register for this vendor — every type, every chain, every version. */
  protected readonly documents = signal<VendorDocument[]>([]);
  protected readonly documentsLoading = signal(false);
  protected readonly documentsError = signal<string | null>(null);

  /** Slot keys with an upload in flight. */
  private readonly uploading = signal<readonly string[]>([]);
  /** Slot key currently being dragged over, if any. */
  protected readonly dragSlot = signal<string | null>(null);

  /** Which document a file about to be picked will supersede, if any — set just before the input opens. */
  private pendingSlot: VendorTypedDocumentSlot | null = null;
  private pendingSupersedesId: string | undefined;

  constructor() {
    // Reloads whenever the workspace assigns or changes the vendor id —
    // covers both "just saved as a draft" and "editing an existing record".
    effect(() => {
      const id = this.vendorId();
      if (id) this.loadDocuments(id);
      else this.documents.set([]);
    });
  }

  protected isUploading(key: string): boolean {
    return this.uploading().includes(key);
  }

  /** Every version of every chain for this type, newest version first. */
  protected documentsFor(slot: VendorTypedDocumentSlot): VendorDocument[] {
    return this.documents()
      .filter((d) => d.documentType === slot.documentType)
      .sort((a, b) => {
        if (b.version !== a.version) return b.version - a.version;
        return (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? '');
      });
  }

  protected refreshDocuments(): void {
    const id = this.vendorId();
    if (id) this.loadDocuments(id);
  }

  private loadDocuments(vendorId: string): void {
    this.documentsLoading.set(true);
    this.documentsError.set(null);
    this.vendorService.getDocuments(vendorId, { includeSuperseded: true }).subscribe({
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
  protected documentName(doc: VendorDocument): string {
    return doc.fileName || this.fileNameFromUrl(doc.documentUrl);
  }

  protected openUrl(url: string): void {
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  protected sizeLabel(bytes: number | undefined): string {
    if (!bytes) return '';
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  /** Derives a display name from a URL's last path segment. */
  private fileNameFromUrl(url: string): string {
    try {
      const path = new URL(url).pathname;
      return decodeURIComponent(path.split('/').filter(Boolean).pop() ?? url);
    } catch {
      return url.split('/').filter(Boolean).pop() ?? url;
    }
  }

  /** Opens the slot's file input for a brand-new document (no supersedesId). */
  protected addDocument(slot: VendorTypedDocumentSlot, input: HTMLInputElement): void {
    if (this.readonly() || this.isUploading(slot.key) || !this.vendorId()) return;
    this.pendingSlot = slot;
    this.pendingSupersedesId = undefined;
    input.click();
  }

  /** Opens the slot's file input to file the next version of one specific document. */
  protected replaceDocument(slot: VendorTypedDocumentSlot, doc: VendorDocument, input: HTMLInputElement): void {
    if (this.readonly() || this.isUploading(slot.key) || !this.vendorId()) return;
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

  protected onTypedDragOver(event: DragEvent, slot: VendorTypedDocumentSlot): void {
    event.preventDefault();
    if (!this.readonly() && !this.isUploading(slot.key) && this.vendorId()) this.dragSlot.set(slot.key);
  }

  protected onTypedDragLeave(): void {
    this.dragSlot.set(null);
  }

  protected onTypedDrop(event: DragEvent, slot: VendorTypedDocumentSlot): void {
    event.preventDefault();
    this.dragSlot.set(null);
    if (this.readonly() || this.isUploading(slot.key) || !this.vendorId()) return;
    const file = Array.from(event.dataTransfer?.files ?? [])[0];
    if (file) this.uploadTypedDocument(file, slot, undefined);
  }

  private uploadTypedDocument(file: File, slot: VendorTypedDocumentSlot, supersedesId: string | undefined): void {
    if (!this.validate(file, slot.accept, slot.label)) return;

    const vendorId = this.vendorId();
    if (!vendorId) {
      this.snack.open('Save the vendor before attaching documents.', 'Close', { duration: 5000 });
      return;
    }

    this.markUploading(slot.key, true);
    this.vendorService.uploadDocument(file).pipe(
      switchMap((uploaded) => this.vendorService.addDocument(vendorId, {
        documentType: slot.documentType,
        documentUrl: uploaded.url,
        fileName: uploaded.fileName,
        mimeType: uploaded.contentType,
        fileSizeBytes: uploaded.sizeBytes,
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
        this.loadDocuments(vendorId);
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
  protected async deleteDocument(slot: VendorTypedDocumentSlot, doc: VendorDocument): Promise<void> {
    const vendorId = this.vendorId();
    if (!vendorId) return;

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

    this.vendorService.removeDocument(vendorId, doc.id).subscribe({
      next: () => {
        this.snack.open(`${slot.label} deleted.`, 'Close', { duration: 3000 });
        this.loadDocuments(vendorId);
      },
      error: (err: HttpErrorResponse) => {
        const message = err.error?.message ?? err.message ?? 'Unable to delete this document.';
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
}
