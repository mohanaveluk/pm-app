import { ChangeDetectionStrategy, Component, computed, inject, input, model, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RfqService } from '../../services/rfq.service';
import { RfqDocument, RfqDocumentSection, formatBytes } from '../../models/rfq.model';

/** A document that can be picked instead of uploaded (from a requisition or the Vendor Master). */
export interface RfqPickableDocument {
  id: string;
  /** "MR title | document name" */
  label: string;
  documentName: string;
  documentUrl: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  sourceRequisitionId?: string | null;
}

const nameOf = (file: File): string => file.name.replace(/\.[^.]+$/, '') || file.name;

/**
 * The documents of one RFQ section: upload several at once, rename, replace,
 * delete and download — and, when `pickable` is given, pick documents from
 * the selected material requisitions (or the vendor's Vendor Master
 * documents) instead of uploading them. Works on the RFQ's whole document
 * list and touches only the rows of its own section.
 */
@Component({
  selector: 'app-rfq-documents',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './rfq-documents.component.html',
  styleUrl: './rfq-documents.component.scss',
})
export class RfqDocumentsComponent {
  private readonly service = inject(RfqService);
  private readonly snack = inject(MatSnackBar);

  /** Every document of the RFQ; this component edits only `section`'s. */
  readonly documents = model<RfqDocument[]>([]);
  readonly section = input.required<RfqDocumentSection>();
  readonly title = input<string>('Documents');
  readonly editable = input(false);
  /** Documents that can be picked; omit to offer upload only. */
  readonly pickable = input<RfqPickableDocument[] | null>(null);
  /** Which link a picked document keeps. */
  readonly pickKey = input<'sourceDocumentId' | 'vendorDocumentId'>('sourceDocumentId');
  readonly pickLabel = input('Select from Material Requisitions');
  readonly emptyText = input('No documents yet.');
  /** Rows that cannot be changed here even when the list is editable (someone else's documents). */
  readonly locked = input<(doc: RfqDocument) => boolean>(() => false);
  /** Only these rows of the section are listed here (others are shown elsewhere). */
  readonly rowFilter = input<(doc: RfqDocument) => boolean>(() => true);

  protected readonly uploading = signal(0);
  protected readonly editingIndex = signal<number | null>(null);
  protected readonly pickSearch = signal('');

  protected readonly rows = computed(() =>
    this.documents().map((doc, index) => ({ doc, index }))
      .filter((r) => r.doc.section === this.section() && this.rowFilter()(r.doc)));

  protected readonly pickedIds = computed(() => {
    const key = this.pickKey();
    return this.rows().map((r) => r.doc[key]).filter((v): v is string => !!v);
  });

  protected readonly filteredPickable = computed(() => {
    const term = this.pickSearch().trim().toLowerCase();
    const list = this.pickable() ?? [];
    return term ? list.filter((p) => p.label.toLowerCase().includes(term)) : list;
  });

  protected readonly size = formatBytes;

  protected sourceText(doc: RfqDocument): string {
    if (doc.sourceDocumentId) return doc.sourceMrNumber ? `From ${doc.sourceMrNumber}` : 'From a requisition';
    if (doc.vendorDocumentId) return 'From the Vendor Master';
    return 'Uploaded';
  }

  // ── Upload / replace ─────────────────────────────────────────────

  protected async onFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const file of files) {
      const uploaded = await this.upload(file);
      if (!uploaded) continue;
      this.documents.update((list) => [...list, {
        section: this.section(),
        documentName: nameOf(file),
        documentUrl: uploaded,
        fileName: file.name,
        mimeType: file.type || null,
        fileSizeBytes: file.size,
        sourceRequisitionId: null,
        sourceDocumentId: null,
        sourceMrNumber: null,
        vendorDocumentId: null,
      }]);
    }
  }

  protected async onReplace(index: number, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const uploaded = await this.upload(file);
    if (!uploaded) return;
    // A replaced document is the user's own file: it no longer points at its source.
    this.documents.update((list) => list.map((d, i) => i !== index ? d : {
      ...d, documentUrl: uploaded, fileName: file.name, mimeType: file.type || null, fileSizeBytes: file.size,
      sourceRequisitionId: null, sourceDocumentId: null, sourceMrNumber: null, vendorDocumentId: null,
    }));
    this.snack.open(`Replaced with ${file.name}`, 'OK', { duration: 2500 });
  }

  private async upload(file: File): Promise<string | null> {
    this.uploading.update((n) => n + 1);
    try {
      return (await lastValueFrom(this.service.uploadDocument(file))).url;
    } catch (err) {
      const message = (err as HttpErrorResponse)?.error?.message;
      this.snack.open(`${file.name}: ${typeof message === 'string' ? message : 'upload failed'}`, 'Close', {
        duration: 5000, panelClass: ['error-snackbar'],
      });
      return null;
    } finally {
      this.uploading.update((n) => n - 1);
    }
  }

  // ── Rename / delete ──────────────────────────────────────────────

  protected startRename(index: number): void {
    this.editingIndex.set(index);
  }

  protected finishRename(index: number, value: string): void {
    const name = value.trim();
    if (name) this.documents.update((list) => list.map((d, i) => i === index ? { ...d, documentName: name } : d));
    this.editingIndex.set(null);
  }

  protected remove(index: number): void {
    this.documents.update((list) => list.filter((_, i) => i !== index));
  }

  // ── Pick ─────────────────────────────────────────────────────────

  /** The picker's selection is the set of picked documents of this section. */
  protected onPick(ids: string[]): void {
    const key = this.pickKey();
    const section = this.section();
    const chosen = new Set(ids.filter(Boolean));
    const options = new Map((this.pickable() ?? []).map((p) => [p.id, p]));
    this.documents.update((list) => {
      const kept = list.filter((d) => d.section !== section || !d[key] || chosen.has(d[key]!));
      const have = new Set(kept.filter((d) => d.section === section).map((d) => d[key]));
      const added: RfqDocument[] = [...chosen].filter((id) => !have.has(id) && options.has(id)).map((id) => {
        const p = options.get(id)!;
        return {
          section,
          documentName: p.documentName,
          documentUrl: p.documentUrl,
          fileName: p.fileName,
          mimeType: p.mimeType,
          fileSizeBytes: p.fileSizeBytes,
          sourceRequisitionId: key === 'sourceDocumentId' ? p.sourceRequisitionId ?? null : null,
          sourceDocumentId: key === 'sourceDocumentId' ? p.id : null,
          sourceMrNumber: key === 'sourceDocumentId' ? p.label.split(' | ')[0] : null,
          vendorDocumentId: key === 'vendorDocumentId' ? p.id : null,
        };
      });
      return [...kept, ...added];
    });
  }

  protected stop(event: Event): void {
    event.stopPropagation();
  }
}
