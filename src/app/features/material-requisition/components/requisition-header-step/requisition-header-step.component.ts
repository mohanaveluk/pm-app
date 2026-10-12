import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
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
 * Step 1 — project, WBS / cost code, dates and references, with the supporting
 * documents beside them.
 *
 * Picking a project shows its client; picking a WBS / cost code shows the area,
 * system, discipline, department, work package and activities it carries. All
 * of that is read from the master data and never typed here.
 */
@Component({
  selector: 'app-requisition-header-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './requisition-header-step.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class RequisitionHeaderStepComponent {
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

  protected readonly today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  protected readonly projectSearch = signal('');
  protected readonly wbsSearch = signal('');
  protected readonly uploading = signal(false);
  protected readonly dragActive = signal(false);

  /** Set while a "replace" is waiting for the user to choose the new file. */
  private replaceKey: string | null = null;

  protected get header(): FormGroup {
    return this.form.header;
  }

  protected readonly visibleProjects = computed(() => {
    const term = this.projectSearch().trim().toLowerCase();
    const all = this.form.allProjects();
    return term
      ? all.filter((p) =>
          p.code.toLowerCase().includes(term)
          || p.projectName.toLowerCase().includes(term)
          || (p.clientName ?? '').toLowerCase().includes(term))
      : all;
  });

  protected readonly visibleWbs = computed(() => {
    const term = this.wbsSearch().trim().toLowerCase();
    const all = this.form.wbsCodes();
    return term
      ? all.filter((w) => w.code.toLowerCase().includes(term) || w.projectDetails.toLowerCase().includes(term))
      : all;
  });

  /** "0007 — Gulf Petrochemical Holdings" for the chosen project, or ''. */
  protected readonly clientText = computed(() => {
    const p = this.form.selectedProject();
    if (!p?.clientName) return '';
    return p.clientCode ? `${p.clientCode} — ${p.clientName}` : p.clientName;
  });

  protected err(controlName: string): string {
    const control = this.header.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['required']) {
      switch (controlName) {
        case 'projectId': return 'Select a project';
        case 'wbsCostCodeId': return 'Select a WBS / cost code';
        case 'requiredOnSiteDate': return 'Required on site date is required';
        default: return 'This field is required';
      }
    }
    if (control.errors['matDatepickerMin']) return 'The date cannot be in the past';
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    return '';
  }

  protected onProjectSelected(projectId: string): void {
    this.form.onProjectChanged(projectId);
  }

  // ── Documents ───────────────────────────────────────────────────────

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
