import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { MaterialService } from '../../services/material.service';
import { MaterialImportResult, MaterialImportRowError } from '../../models/material-import.model';

const ACCEPT = '.xlsx,.csv,.json';
const MAX_BYTES = 5 * 1024 * 1024;

type Phase = 'select' | 'importing' | 'success' | 'failed';

/**
 * Import Materials from .xlsx / .csv / .json (max 5 MB). The file is validated
 * here for type and size, then sent to POST /materials/import, which reads it,
 * validates every row and writes everything in one transaction — so a failure
 * always means nothing was imported. Closes with true if data changed.
 */
@Component({
  selector: 'app-material-import-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './material-import-dialog.component.html',
  styleUrl: './material-import-dialog.component.scss',
})
export class MaterialImportDialogComponent {
  private readonly materialService = inject(MaterialService);
  private readonly dialogRef = inject(MatDialogRef<MaterialImportDialogComponent, boolean>);

  protected readonly accept = ACCEPT;
  protected readonly phase = signal<Phase>('select');
  protected readonly file = signal<File | null>(null);
  protected readonly fileError = signal('');
  protected readonly dragging = signal(false);

  protected readonly result = signal<MaterialImportResult | null>(null);
  protected readonly failureMessage = signal('');
  protected readonly rowErrors = signal<MaterialImportRowError[]>([]);
  protected readonly totalErrors = signal(0);

  onPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = input.files?.[0];
    input.value = '';
    if (picked) this.setFile(picked);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const dropped = event.dataTransfer?.files?.[0];
    if (dropped) this.setFile(dropped);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  private setFile(file: File): void {
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    if (!ACCEPT.split(',').includes(ext)) {
      this.file.set(null);
      this.fileError.set('Unsupported file type. Choose an .xlsx, .csv or .json file.');
      return;
    }
    if (file.size === 0) {
      this.file.set(null);
      this.fileError.set('The file is empty.');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.file.set(null);
      this.fileError.set(`The file is ${this.sizeLabel(file.size)} - the maximum is 5 MB.`);
      return;
    }
    this.fileError.set('');
    this.file.set(file);
  }

  clearFile(): void {
    this.file.set(null);
    this.fileError.set('');
  }

  async startImport(): Promise<void> {
    const file = this.file();
    if (!file || this.phase() === 'importing') return;

    this.phase.set('importing');
    try {
      const res = await firstValueFrom(this.materialService.importMaterials(file));
      this.result.set(res.data);
      this.phase.set('success');
    } catch (e) {
      const err = e as HttpErrorResponse;
      const body = err?.error;
      this.failureMessage.set(
        (Array.isArray(body?.message) ? body.message.join(' · ') : body?.message)
          || (err?.status === 413 ? 'The file is larger than the 5 MB limit.' : 'The import failed. Nothing was changed.'),
      );
      this.rowErrors.set(body?.errors ?? []);
      this.totalErrors.set(body?.totalErrors ?? (body?.errors?.length ?? 0));
      this.phase.set('failed');
    }
  }

  tryAgain(): void {
    this.phase.set('select');
    this.rowErrors.set([]);
    this.failureMessage.set('');
  }

  close(): void {
    this.dialogRef.close(this.phase() === 'success');
  }

  sizeLabel(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}
