import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VendorDocumentSlot, VendorFormService } from '../../services/vendor-form.service';
import { VendorFileUploadComponent } from '../vendor-file-upload/vendor-file-upload.component';
import { VendorDocument, enumLabel } from '../../models/vendor.model';

/**
 * Step 10 — Documents.
 *
 * Ten fixed slots, each owning its own file input and its own form control. The
 * slot decides which VendorDocumentType the URL is filed under; the file name
 * never does, so uploading into one slot can never overwrite another.
 */
@Component({
  selector: 'app-vendor-documents-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatTooltipModule,
    VendorFileUploadComponent,
  ],
  templateUrl: './vendor-documents-step.component.html',
  styleUrl: '../vendor-step.shared.scss',
})
export class VendorDocumentsStepComponent {
  protected readonly formService = inject(VendorFormService);

  readonly readonly = input(false);
  /** Documents already stored against the vendor, listed in edit/view mode. */
  readonly existingDocuments = input<VendorDocument[]>([]);

  protected readonly slots = this.formService.documentSlots;

  protected get group(): FormGroup {
    return this.formService.group('documents');
  }

  protected control(slot: VendorDocumentSlot): FormControl {
    return this.group.get(slot.key) as FormControl;
  }

  protected label(value: string | null | undefined): string {
    return enumLabel(value);
  }

  protected sizeLabel(bytes: number | undefined): string {
    if (!bytes) return '';
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  protected open(url: string): void {
    if (url) window.open(url, '_blank', 'noopener');
  }
}
