import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import { RequisitionFormService } from '../../services/requisition-form.service';
import {
  DOCUMENT_TYPE_LABELS, RequisitionDocumentDraft, RequisitionDocumentType,
} from '../../models/material-requisition.model';

const MAX_FILE_MB = 25;
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.dwg';

/**
 * Supporting Documents step: the covering document (one, replaced when
 * uploaded again) and any number of specifications and project documents.
 * Files go to cloud storage straight away; the requisition keeps their URLs.
 */
@Component({
  selector: 'app-requisition-documents-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule],
  templateUrl: './requisition-documents-step.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class RequisitionDocumentsStepComponent {
  protected readonly form = inject(RequisitionFormService);
  private readonly service = inject(MaterialRequisitionService);
  private readonly snack = inject(MatSnackBar);

  protected readonly DocumentType = RequisitionDocumentType;
  protected readonly typeLabels = DOCUMENT_TYPE_LABELS;
  protected readonly accept = ACCEPT;
  protected readonly maxMb = MAX_FILE_MB;
  protected readonly acceptLabel = ACCEPT.replace(/,/g, ', ');
  protected readonly supportingTypes = [
    RequisitionDocumentType.SPECIFICATION,
    RequisitionDocumentType.PROJECT_DOCUMENT,
  ];

  protected readonly uploading = signal(false);
  protected readonly dragActive = signal(false);

  /** Set while a "replace" is waiting for the user to choose the new file. */
  private replaceKey: string | null = null;

  protected onCoveringFile(event: Event): void {
    const files = this.takeFiles(event);
    if (files[0]) void this.upload([files[0]], RequisitionDocumentType.COVERING_DOCUMENT);
  }

  protected onSupportingFiles(event: Event): void {
    void this.upload(this.takeFiles(event), RequisitionDocumentType.SPECIFICATION);
  }

  protected onDropSupporting(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) void this.upload(files, RequisitionDocumentType.SPECIFICATION);
  }

  /** Opens the file chooser for replacing one document. */
  protected startReplace(key: string, picker: HTMLInputElement): void {
    this.replaceKey = key;
    picker.click();
  }

  protected onReplaceFile(event: Event): void {
    const key = this.replaceKey;
    this.replaceKey = null;
    const [file] = this.takeFiles(event);
    if (key && file) void this.upload([file], null, key);
  }

  private takeFiles(event: Event): File[] {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    return files;
  }

  private async upload(
    files: File[],
    type: RequisitionDocumentType | null,
    replaceKey?: string,
  ): Promise<void> {
    this.uploading.set(true);
    try {
      for (const file of files) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          this.snack.open(`"${file.name}" is larger than ${MAX_FILE_MB} MB.`, 'Close', {
            duration: 5000, panelClass: ['error-snackbar'],
          });
          continue;
        }
        try {
          const res = await lastValueFrom(this.service.uploadDocument(file));
          const meta = {
            documentName: file.name.replace(/\.[^.]+$/, ''),
            documentUrl: res.url,
            fileName: file.name,
            mimeType: file.type || null,
            fileSizeBytes: file.size,
          };
          if (replaceKey) this.form.replaceDocument(replaceKey, meta);
          else if (type) this.form.addDocument({ ...meta, documentType: type });
        } catch (err) {
          const e = err as HttpErrorResponse;
          this.snack.open(`"${file.name}": ${e?.error?.message || 'the upload failed.'}`, 'Close', {
            duration: 6000, panelClass: ['error-snackbar'],
          });
        }
      }
    } finally {
      this.uploading.set(false);
    }
  }

  protected setType(doc: RequisitionDocumentDraft, type: RequisitionDocumentType): void {
    this.form.setDocumentType(doc.key, type);
  }

  protected remove(doc: RequisitionDocumentDraft): void {
    this.form.removeDocument(doc.key);
  }

  protected open(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  protected sizeLabel(bytes: number | null): string {
    if (!bytes) return '';
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}
