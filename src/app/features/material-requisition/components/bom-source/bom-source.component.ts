import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import { RequisitionFormService } from '../../services/requisition-form.service';
import {
  BomColumns, BomPreview, RequisitionLineSource,
} from '../../models/material-requisition.model';
import { CandidateListComponent } from '../candidate-list/candidate-list.component';

const MAX_MB = 5;

/**
 * BOM / MTO source: upload a file, say which columns hold the code and the
 * quantity, validate it against the Material Master, then add the matched rows
 * with the file's quantities (which stay editable in the table).
 */
@Component({
  selector: 'app-bom-source',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule, CandidateListComponent,
  ],
  styleUrl: '../requisition-step.shared.scss',
  template: `
    <input #picker type="file" hidden accept=".xlsx,.csv" (change)="onFile($event)" />

    <div class="doc-slot">
      <div class="doc-slot__head">
        <mat-icon class="doc-slot__icon">upload_file</mat-icon>
        <div class="doc-slot__meta">
          <div class="doc-slot__label">BOM / MTO File</div>
          <div class="doc-slot__hint">Bill of materials or material take-off, first row holds the column names</div>
        </div>
      </div>

      @if (file(); as f) {
        <div class="doc-row">
          <mat-icon class="doc-row__icon">description</mat-icon>
          <div class="doc-row__meta">
            <div class="doc-row__name">{{ f.name }}</div>
            <div class="doc-row__sub">{{ sizeLabel(f.size) }}</div>
          </div>
          <button mat-icon-button type="button" matTooltip="Replace the file" (click)="picker.click()">
            <mat-icon>swap_horiz</mat-icon>
          </button>
          <button mat-icon-button type="button" color="warn" matTooltip="Remove" (click)="clear()">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      } @else {
        <div
          class="doc-dropzone doc-dropzone--compact"
          [class.doc-dropzone--active]="dragActive()"
          role="button"
          tabindex="0"
          aria-label="Choose a BOM file"
          (click)="picker.click()"
          (keydown.enter)="picker.click()"
          (keydown.space)="picker.click(); $event.preventDefault()"
          (dragover)="$event.preventDefault(); dragActive.set(true)"
          (dragleave)="dragActive.set(false)"
          (drop)="onDrop($event)"
        >
          <mat-icon>add_circle_outline</mat-icon>
          <p class="doc-dropzone__title">Add New Document</p>
          <p class="doc-dropzone__hint">Drop a file, or click · .xlsx, .csv · up to {{ maxMb }} MB</p>
        </div>
        <p class="doc-empty">No documents uploaded yet.</p>
      }
    </div>

    @if (reading()) { <p class="info-note"><mat-spinner diameter="16" /> Reading the file…</p> }
    @if (error()) {
      <div class="step-error"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div>
    }

    @if (columns(); as cols) {
      <h4 class="step-section__title" style="margin-top: 16px"><mat-icon>tune</mat-icon> Column mapping</h4>
      <div class="panel-actions">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" style="flex: 1 1 220px">
          <mat-label>Material code column *</mat-label>
          <mat-select [(ngModel)]="codeColumn">
            @for (c of cols.columns; track c) { <mat-option [value]="c">{{ c }}</mat-option> }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic" style="flex: 1 1 220px">
          <mat-label>Quantity column *</mat-label>
          <mat-select [(ngModel)]="quantityColumn">
            @for (c of cols.columns; track c) { <mat-option [value]="c">{{ c }}</mat-option> }
          </mat-select>
        </mat-form-field>

        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="!codeColumn || !quantityColumn || validating()"
          (click)="validate()"
        >
          @if (validating()) { <mat-spinner diameter="18" /> } @else { <mat-icon>fact_check</mat-icon> }
          Validate &amp; Preview
        </button>
      </div>
      <p class="info-note"><mat-icon>info</mat-icon> {{ cols.rowCount }} data row{{ cols.rowCount === 1 ? '' : 's' }} in the file.</p>
    }

    @if (preview(); as p) {
      <div class="selected-bar" style="margin-top: 8px">
        <mat-icon style="color: var(--success)">check_circle</mat-icon>
        <span><strong>{{ p.matched.length }}</strong> matched</span>
        @if (p.issues.length) {
          <mat-icon style="color: #b26a00">warning</mat-icon>
          <span><strong>{{ p.issues.length }}</strong> need attention</span>
        }
        <span class="selected-bar__spacer"></span>
        <button mat-flat-button color="primary" type="button" [disabled]="p.matched.length === 0" (click)="addMatched()">
          <mat-icon>playlist_add</mat-icon> Add {{ p.matched.length }} material{{ p.matched.length === 1 ? '' : 's' }}
        </button>
      </div>

      @if (p.issues.length) {
        <ul class="issue-list">
          @for (i of visibleIssues(); track i.rowNumber) {
            <li>Row {{ i.rowNumber }}@if (i.code) { ({{ i.code }}) } — {{ i.reason }}</li>
          }
          @if (p.issues.length > visibleIssues().length) {
            <li>…and {{ p.issues.length - visibleIssues().length }} more.</li>
          }
        </ul>
      }

      <h4 class="step-section__title" style="margin-top: 16px"><mat-icon>list_alt</mat-icon> Preview of matched materials</h4>
      <app-candidate-list
        [candidates]="p.matched"
        [source]="source"
        [sourceReference]="fileName()"
        referenceLabel="BOM Qty"
        emptyMessage="No rows could be matched."
      />
    }
  `,
})
export class BomSourceComponent {
  private readonly service = inject(MaterialRequisitionService);
  private readonly form = inject(RequisitionFormService);
  private readonly snack = inject(MatSnackBar);

  protected readonly source = RequisitionLineSource.BOM;
  protected readonly maxMb = MAX_MB;

  protected readonly file = signal<File | null>(null);
  protected readonly columns = signal<BomColumns | null>(null);
  protected readonly preview = signal<BomPreview | null>(null);
  protected readonly reading = signal(false);
  protected readonly validating = signal(false);
  protected readonly error = signal('');
  protected readonly dragActive = signal(false);

  protected codeColumn = '';
  protected quantityColumn = '';

  protected readonly fileName = computed(() => this.file()?.name ?? null);
  protected readonly visibleIssues = computed(() => (this.preview()?.issues ?? []).slice(0, 10));

  protected sizeLabel(bytes: number): string {
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  protected clear(): void {
    this.file.set(null);
    this.columns.set(null);
    this.preview.set(null);
    this.error.set('');
    this.codeColumn = '';
    this.quantityColumn = '';
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.read(file);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.read(file);
  }

  private read(file: File): void {
    this.error.set('');
    this.columns.set(null);
    this.preview.set(null);

    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      this.error.set('Use an Excel (.xlsx) or CSV file.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      this.error.set(`The file is larger than ${MAX_MB} MB.`);
      return;
    }

    this.file.set(file);
    this.reading.set(true);
    this.service.getBomColumns(file).subscribe({
      next: (res) => {
        this.columns.set(res.data);
        this.codeColumn = res.data.suggested.codeColumn ?? '';
        this.quantityColumn = res.data.suggested.quantityColumn ?? '';
        this.reading.set(false);
        // A clear-cut file goes straight to its preview.
        if (this.codeColumn && this.quantityColumn) this.validate();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err?.error?.message || 'The file could not be read.');
        this.file.set(null);
        this.reading.set(false);
      },
    });
  }

  protected validate(): void {
    const file = this.file();
    if (!file || !this.codeColumn || !this.quantityColumn) return;

    this.validating.set(true);
    this.error.set('');
    this.service.previewBom(file, this.codeColumn, this.quantityColumn).subscribe({
      next: (res) => {
        this.preview.set(res.data);
        this.validating.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err?.error?.message || 'The file could not be validated.');
        this.validating.set(false);
      },
    });
  }

  protected addMatched(): void {
    const p = this.preview();
    if (!p) return;
    const added = this.form.applyReferenceQuantities(p.matched, this.source, this.fileName());
    this.snack.open(
      `${added} material${added === 1 ? '' : 's'} added from ${this.fileName()}. Adjust the quantities in the table if needed.`,
      'OK', { duration: 4000 },
    );
  }
}
