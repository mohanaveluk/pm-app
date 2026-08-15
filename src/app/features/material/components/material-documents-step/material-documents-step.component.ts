import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormService } from '../../services/material-form.service';
import { MaterialDocumentUploadService } from '../../services/material-document-upload.service';

interface DocumentSlot {
  control: string;
  label: string;
  icon: string;
  hint: string;
}

const DOCUMENT_SLOTS: readonly DocumentSlot[] = [
  { control: 'datasheetUrl',             label: 'Datasheet',                   icon: 'description',  hint: 'Manufacturer datasheet' },
  { control: 'drawingSketchUrl',         label: 'Drawing / Sketch',            icon: 'architecture', hint: 'Isometric, GA or fabrication drawing' },
  { control: 'technicalSpecSheetUrl',    label: 'Technical Specification Sheet', icon: 'fact_check', hint: 'Engineering specification' },
  { control: 'qualityCertificatesUrl',   label: 'Quality Certificates',        icon: 'verified',     hint: 'Mill certificate, test report' },
  { control: 'complianceCertificatesUrl',label: 'Compliance Certificates',     icon: 'gavel',        hint: 'RoHS, CE, REACH' },
  { control: 'vendorQuotationUrl',       label: 'Vendor Quotation',            icon: 'request_quote',hint: 'Latest commercial quotation' },
  { control: 'inspectionReportsUrl',     label: 'Inspection Reports',          icon: 'assignment',   hint: 'Third-party inspection results' },
] as const;

const MAX_PHOTOS = 20;

/**
 * Step 9 — Document Attachments.
 *
 * The API stores URLs, so URL entry is the primary (and currently only working)
 * path. The drag-and-drop zone is wired to MaterialDocumentUploadService, which
 * reports itself unconfigured until a shared Document Service exists — it fails
 * loudly rather than fabricating a storage URL.
 */
@Component({
  selector: 'app-material-documents-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTooltipModule,
  ],
  templateUrl: './material-documents-step.component.html',
  styleUrl: '../material-step.shared.scss',
})
export class MaterialDocumentsStepComponent {
  protected readonly formService = inject(MaterialFormService);
  protected readonly uploadService = inject(MaterialDocumentUploadService);
  private readonly snack = inject(MatSnackBar);

  readonly readonly = input(false);

  protected readonly slots = DOCUMENT_SLOTS;
  protected readonly maxPhotos = MAX_PHOTOS;
  protected readonly dragActive = signal(false);
  protected readonly newPhotoUrl = signal('');

  protected get group(): FormGroup {
    return this.formService.group('documents');
  }

  protected get photos(): string[] {
    return (this.group.get('photos')?.value as string[]) ?? [];
  }

  protected slotValue(control: string): string {
    return (this.group.get(control)?.value as string) ?? '';
  }

  protected clearSlot(control: string): void {
    this.group.get(control)?.setValue('');
    this.group.markAsDirty();
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

  // ── Photos ──────────────────────────────────────────────────────────

  protected addPhoto(): void {
    const url = this.newPhotoUrl().trim();
    if (!url) return;
    if (this.photos.length >= MAX_PHOTOS) {
      this.snack.open(`A material can hold at most ${MAX_PHOTOS} photos.`, 'Close', { duration: 4000 });
      return;
    }
    if (this.photos.includes(url)) {
      this.snack.open('That photo URL has already been added.', 'Close', { duration: 3000 });
      return;
    }
    this.group.get('photos')?.setValue([...this.photos, url]);
    this.group.markAsDirty();
    this.newPhotoUrl.set('');
  }

  protected removePhoto(index: number): void {
    const next = this.photos.filter((_, i) => i !== index);
    this.group.get('photos')?.setValue(next);
    this.group.markAsDirty();
  }

  // ── Drag & drop ─────────────────────────────────────────────────────

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.readonly()) this.dragActive.set(true);
  }

  protected onDragLeave(): void {
    this.dragActive.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) this.handleFiles(files);
  }

  protected onBrowse(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) this.handleFiles(files);
    input.value = '';
  }

  private handleFiles(files: File[]): void {
    if (!this.uploadService.isConfigured) {
      this.snack.open(this.uploadService.unavailableReason, 'Close', { duration: 7000 });
      return;
    }
    // A configured implementation resolves to a stored URL, which then populates
    // the matching slot or the photo grid.
    files.forEach((file) => {
      this.uploadService.upload(file).subscribe({
        next: (doc) => {
          if (doc.contentType.startsWith('image/')) {
            this.group.get('photos')?.setValue([...this.photos, doc.url]);
          } else {
            this.group.get('datasheetUrl')?.setValue(doc.url);
          }
          this.group.markAsDirty();
        },
        error: (err: Error) => this.snack.open(err.message, 'Close', { duration: 7000 }),
      });
    });
  }
}
