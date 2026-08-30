import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { VendorService } from '../../services/vendor.service';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * A single document destination: one file input, one URL, one form control.
 *
 * The control passed in decides where the uploaded URL lands. Nothing here
 * inspects the file name to work out what kind of document it is — uploading
 * into one slot can never overwrite another, because each instance owns its own
 * `<input type="file">` and its own control.
 */
@Component({
  selector: 'app-vendor-file-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule],
  templateUrl: './vendor-file-upload.component.html',
  styleUrl: './vendor-file-upload.component.scss',
})
export class VendorFileUploadComponent {
  private readonly vendorService = inject(VendorService);
  private readonly snack = inject(MatSnackBar);

  /** The control that holds the stored URL. Required. */
  readonly control = input.required<FormControl>();
  readonly label = input('Document');
  readonly description = input('');
  readonly accept = input('.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg');
  readonly readonly = input(false);

  protected readonly uploading = signal(false);
  protected readonly dragActive = signal(false);
  /** Known only for a file uploaded in this session — the API stores just the URL. */
  protected readonly lastUpload = signal<{ fileName: string; sizeBytes: number; uploadedAt: string } | null>(null);

  protected readonly maxFileSizeMb = MAX_FILE_SIZE_MB;

  protected get url(): string {
    return (this.control().value as string) ?? '';
  }

  /** Falls back to the URL's last path segment for documents loaded from the API. */
  protected get displayName(): string {
    const uploaded = this.lastUpload();
    if (uploaded) return uploaded.fileName;
    try {
      const path = new URL(this.url).pathname;
      return decodeURIComponent(path.split('/').filter(Boolean).pop() ?? this.url);
    } catch {
      return this.url.split('/').filter(Boolean).pop() ?? this.url;
    }
  }

  protected get fileType(): string {
    const name = this.displayName;
    const ext = name.includes('.') ? name.split('.').pop() : '';
    return ext ? ext.toUpperCase() : 'FILE';
  }

  protected get sizeLabel(): string {
    const size = this.lastUpload()?.sizeBytes;
    if (!size) return '';
    return size >= 1024 * 1024
      ? `${(size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  protected get isPreviewable(): boolean {
    return /\.(pdf|png|jpe?g|webp|gif)$/i.test(this.displayName);
  }

  // ── Selection ───────────────────────────────────────────────────────

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.upload(file);
    // Lets the same file be picked again after a remove.
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.readonly() && !this.uploading()) this.dragActive.set(true);
  }

  protected onDragLeave(): void {
    this.dragActive.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    if (this.readonly() || this.uploading()) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.upload(file);
  }

  private validate(file: File): boolean {
    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    const accepted = this.accept().split(',').map((t) => t.trim().toLowerCase());
    if (!accepted.includes(extension)) {
      this.snack.open(
        `${file.name} is not accepted for ${this.label()}. Allowed: ${this.accept()}`,
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

  private upload(file: File): void {
    if (!this.validate(file)) return;

    this.uploading.set(true);
    this.vendorService.uploadDocument(file).subscribe({
      next: (doc) => {
        this.control().setValue(doc.url);
        this.control().markAsDirty();
        this.lastUpload.set({ fileName: doc.fileName, sizeBytes: doc.sizeBytes, uploadedAt: doc.uploadedAt });
        this.uploading.set(false);
        this.snack.open(`${doc.fileName} uploaded to ${this.label()}.`, 'Close', { duration: 3000 });
      },
      error: (err: HttpErrorResponse) => {
        this.uploading.set(false);
        const message = err.error?.message ?? err.message ?? 'Upload failed.';
        this.snack.open(`${this.label()} — ${file.name}: ${message}`, 'Close', {
          duration: 7000, panelClass: ['error-snackbar'],
        });
      },
    });
  }

  // ── Actions ─────────────────────────────────────────────────────────

  protected preview(): void {
    if (!this.url) return;
    window.open(this.url, '_blank', 'noopener');
  }

  protected remove(): void {
    this.control().setValue('');
    this.control().markAsDirty();
    this.lastUpload.set(null);
  }
}
