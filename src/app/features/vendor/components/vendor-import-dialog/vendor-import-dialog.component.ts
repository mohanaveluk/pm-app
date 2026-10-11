import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { VendorService } from '../../services/vendor.service';
import { VendorImportPreview, VendorImportResult, VendorImportRowError } from '../../models/vendor-import.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

const ACCEPT = '.xlsx,.csv,.json';
const MAX_BYTES = 5 * 1024 * 1024;

type Phase = 'select' | 'checking' | 'importing' | 'success' | 'failed';

/**
 * Import Vendors from .xlsx / .csv / .json (max 5 MB). The file is validated
 * here for type and size, then checked with POST /vendors/import/preview. New
 * vendors are always added; when some rows match vendors that already exist the
 * user is asked whether to update them (Yes) or leave them alone (No). The
 * answer goes to POST /vendors/import as updateExisting, which validates every
 * row and writes everything — including any Vendor Type or Material Category it
 * has to create — in one transaction, so a failure always means nothing was
 * imported. Closes with true if data changed.
 */
@Component({
  selector: 'app-vendor-import-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './vendor-import-dialog.component.html',
  styleUrl: './vendor-import-dialog.component.scss',
})
export class VendorImportDialogComponent {
  private readonly vendorService = inject(VendorService);
  private readonly dialogRef = inject(MatDialogRef<VendorImportDialogComponent, boolean>);
  private readonly dialog = inject(MatDialog);

  protected readonly accept = ACCEPT;
  protected readonly phase = signal<Phase>('select');
  protected readonly file = signal<File | null>(null);
  protected readonly fileError = signal('');
  protected readonly dragging = signal(false);

  protected readonly result = signal<VendorImportResult | null>(null);
  protected readonly failureMessage = signal('');
  protected readonly rowErrors = signal<VendorImportRowError[]>([]);
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

    // 1. Dry run: validates the file and finds which rows already exist.
    this.phase.set('checking');
    let updateExisting = true;
    try {
      const preview = (await firstValueFrom(this.vendorService.previewImport(file))).data;

      if (preview.toUpdate > 0) {
        const answer = await this.askToUpdateExisting(preview);
        if (answer === null) {
          // Dismissed without choosing — nothing has been written, so go back.
          this.phase.set('select');
          return;
        }
        updateExisting = answer;
      }

      // 2. The real import, with the user's answer.
      this.phase.set('importing');
      const res = await firstValueFrom(this.vendorService.importVendors(file, updateExisting));
      this.result.set(res.data);
      this.phase.set('success');
    } catch (e) {
      this.showFailure(e as HttpErrorResponse);
    }
  }

  /** true = update them, false = leave them alone, null = dialog dismissed. */
  private async askToUpdateExisting(preview: VendorImportPreview): Promise<boolean | null> {
    const names = preview.existing.slice(0, 3).map((e) => `"${e.name}"`).join(', ');
    const more = preview.toUpdate > 3 ? ` and ${preview.toUpdate - 3} more` : '';
    const newLine = preview.toCreate > 0
      ? ` The other ${preview.toCreate} new vendor${preview.toCreate === 1 ? '' : 's'} will be added either way.`
      : '';

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        title: 'Update existing vendors?',
        message:
          `${preview.toUpdate} of the ${preview.total} vendors in this file already exist (${names}${more}). \n\n` +
          `Do you want to update them with the values from the file?${newLine}`,
        confirmText: 'Yes, update them',
        cancelText: 'No, skip them',
        icon: 'sync_alt',
      },
    });
    const answer = await firstValueFrom(ref.afterClosed());
    return typeof answer === 'boolean' ? answer : null;
  }

  private showFailure(err: HttpErrorResponse): void {
    const body = err?.error;
    this.failureMessage.set(
      (Array.isArray(body?.message) ? body.message.join(' · ') : body?.message)
        || (err?.status === 413 ? 'The file is larger than the 5 MB limit.' : 'The import failed. Nothing was changed.'),
    );
    this.rowErrors.set(body?.errors ?? []);
    this.totalErrors.set(body?.totalErrors ?? (body?.errors?.length ?? 0));
    this.phase.set('failed');
  }

  tryAgain(): void {
    this.phase.set('select');
    this.rowErrors.set([]);
    this.failureMessage.set('');
  }

  close(): void {
    const r = this.result();
    // Only refresh the list when something was actually added or changed.
    this.dialogRef.close(this.phase() === 'success' && !!r && r.created + r.updated > 0);
  }

  sizeLabel(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}
