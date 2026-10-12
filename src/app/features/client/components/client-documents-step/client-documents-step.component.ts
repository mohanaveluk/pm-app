import {
  ChangeDetectionStrategy, Component, effect, inject, input, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  CLIENT_DOCUMENT_TYPE_OPTIONS, ClientDocument, ClientDocumentType, clientLabel,
} from '../../models/client.model';
import { ClientService } from '../../services/client.service';

const MAX_FILE_SIZE_MB = 25;
const EXPIRING_SOON_DAYS = 30;

interface UploadedFile {
  url: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Step 6 — client documents: registration and tax certificates, contract
 * frameworks, NDAs, client specifications, templates and procedures.
 *
 * Only metadata and the file's URL are stored; the file itself goes to cloud
 * storage through the upload endpoint. The step needs the client to exist, so
 * before it is created the step explains that instead of showing a form.
 */
@Component({
  selector: 'app-client-documents-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './client-documents-step.component.html',
  styleUrl: '../client-step.shared.scss',
})
export class ClientDocumentsStepComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clientService = inject(ClientService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  /** Set once the client has been persisted. */
  readonly clientId = input<string | null>(null);

  protected readonly typeOptions = CLIENT_DOCUMENT_TYPE_OPTIONS;
  protected readonly maxFileSizeMb = MAX_FILE_SIZE_MB;
  protected readonly accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';

  protected readonly documents = signal<ClientDocument[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly uploading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dragActive = signal(false);
  protected readonly uploaded = signal<UploadedFile | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    documentType: [ClientDocumentType.BUSINESS_REGISTRATION as ClientDocumentType, [Validators.required]],
    documentName: ['', [Validators.required, Validators.maxLength(255)]],
    documentNumber: ['', [Validators.maxLength(100)]],
    issueDate: [''],
    expiryDate: [''],
    documentVersion: ['', [Validators.maxLength(30)]],
    remarks: ['', [Validators.maxLength(2000)]],
  });

  constructor() {
    // Load the register as soon as a client id is available (edit mode, or the
    // moment step 1 has created the client).
    effect(() => {
      const id = this.clientId();
      if (id) void this.load(id);
      else this.documents.set([]);
    });
  }

  protected label(value: string): string {
    return clientLabel(value);
  }

  private async load(clientId: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const res = await lastValueFrom(this.clientService.getDocuments(clientId));
      this.documents.set(res.data ?? []);
    } catch {
      this.loadError.set('Unable to load the documents. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  protected retry(): void {
    const id = this.clientId();
    if (id) void this.load(id);
  }

  // ── File selection / upload ────────────────────────────────────────

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.upload(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  protected onDragLeave(): void {
    this.dragActive.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.upload(file);
  }

  private async upload(file: File): Promise<void> {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      this.snack.open(`The file is larger than ${MAX_FILE_SIZE_MB} MB.`, 'Close', {
        duration: 5000, panelClass: ['error-snackbar'],
      });
      return;
    }

    this.uploading.set(true);
    try {
      const res = await lastValueFrom(this.clientService.uploadDocument(file));
      this.uploaded.set({ url: res.url, fileName: file.name, sizeBytes: file.size, mimeType: file.type });

      // Offer the file name as the document name until the user types their own.
      const name = this.form.controls.documentName;
      if (!name.value.trim()) name.setValue(file.name.replace(/\.[^.]+$/, ''));
    } catch (err) {
      this.snack.open(this.messageFor(err as HttpErrorResponse, 'The file could not be uploaded.'), 'Close', {
        duration: 6000, panelClass: ['error-snackbar'],
      });
    } finally {
      this.uploading.set(false);
    }
  }

  protected clearUpload(): void {
    this.uploaded.set(null);
  }

  // ── Register / remove ──────────────────────────────────────────────

  protected get canSubmit(): boolean {
    return this.form.valid && !!this.uploaded() && !this.saving() && !this.uploading();
  }

  protected get datesInvalid(): boolean {
    const { issueDate, expiryDate } = this.form.getRawValue();
    return !!issueDate && !!expiryDate && expiryDate < issueDate;
  }

  protected async addDocument(): Promise<void> {
    const clientId = this.clientId();
    const file = this.uploaded();
    if (!clientId || !file) return;

    if (this.form.invalid || this.datesInvalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.saving.set(true);
    try {
      await lastValueFrom(this.clientService.addDocument(clientId, {
        documentType: v.documentType,
        documentName: v.documentName.trim(),
        documentNumber: v.documentNumber.trim() || null,
        issueDate: v.issueDate || null,
        expiryDate: v.expiryDate || null,
        documentUrl: file.url,
        fileName: file.fileName,
        mimeType: file.mimeType || null,
        fileSizeBytes: file.sizeBytes,
        documentVersion: v.documentVersion.trim() || null,
        remarks: v.remarks.trim() || null,
      }));
      this.snack.open('Document added', 'OK', { duration: 3000 });
      this.form.reset({
        documentType: v.documentType, documentName: '', documentNumber: '', issueDate: '',
        expiryDate: '', documentVersion: '', remarks: '',
      });
      this.uploaded.set(null);
      await this.load(clientId);
    } catch (err) {
      this.snack.open(this.messageFor(err as HttpErrorResponse, 'The document could not be added.'), 'Close', {
        duration: 6000, panelClass: ['error-snackbar'],
      });
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeDocument(doc: ClientDocument): Promise<void> {
    const clientId = this.clientId();
    if (!clientId) return;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: {
        title: 'Remove Document?',
        message: `Remove "${doc.documentName}" from this client? The file is no longer listed here.`,
        confirmText: 'Remove',
        color: 'warn',
        icon: 'delete',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;

    try {
      await lastValueFrom(this.clientService.removeDocument(clientId, doc.id));
      this.snack.open('Document removed', 'OK', { duration: 3000 });
      await this.load(clientId);
    } catch (err) {
      this.snack.open(this.messageFor(err as HttpErrorResponse, 'The document could not be removed.'), 'Close', {
        duration: 6000, panelClass: ['error-snackbar'],
      });
    }
  }

  protected openUrl(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  // ── Display helpers ────────────────────────────────────────────────

  protected isExpiringSoon(doc: ClientDocument): boolean {
    if (!doc.expiryDate || doc.isExpired) return false;
    const days = (new Date(doc.expiryDate).getTime() - Date.now()) / 86_400_000;
    return days <= EXPIRING_SOON_DAYS;
  }

  protected sizeLabel(bytes: number | null): string {
    if (!bytes) return '';
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  private messageFor(err: HttpErrorResponse, fallback: string): string {
    switch (err?.status) {
      case 0:   return 'Cannot reach the server. Check your connection and try again.';
      case 400: return err.error?.message || fallback;
      case 403: return 'You do not have permission to change client documents.';
      case 413: return `The file is larger than ${MAX_FILE_SIZE_MB} MB.`;
      default:  return err?.error?.message || fallback;
    }
  }
}
