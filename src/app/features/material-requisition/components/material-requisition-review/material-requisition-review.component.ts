import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../../services';
import { RequisitionFormService } from '../../services/requisition-form.service';
import { toIsoDate } from '../../../project/services/project.mapper';
import { DOCUMENT_TYPE_LABELS, SOURCE_LABELS } from '../../models/material-requisition.model';

/**
 * Step 3 — everything that will be submitted, read-only, with what still stands
 * in the way of submitting it. Nothing is typed here.
 */
@Component({
  selector: 'app-material-requisition-review',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe, MatIconModule, MatTableModule],
  templateUrl: './material-requisition-review.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class MaterialRequisitionReviewComponent {
  protected readonly form = inject(RequisitionFormService);
  private readonly auth = inject(AuthService);

  /** The system code, when the requisition has already been saved once. */
  readonly code = input<string | null>(null);

  protected readonly typeLabels: Record<string, string> = DOCUMENT_TYPE_LABELS;
  protected readonly sourceLabels: Record<string, string> = SOURCE_LABELS;
  protected readonly lineColumns = ['no', 'code', 'description', 'uom', 'quantity', 'stock', 'source'];

  protected readonly submitter = computed(() => {
    const u = this.auth.user();
    const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
    return name || u?.email || '—';
  });

  protected value() {
    return this.form.header.getRawValue();
  }

  protected rosText(): string {
    return toIsoDate(this.value().requiredOnSiteDate);
  }

  protected issues(): string[] {
    return this.form.submitIssues();
  }

  protected warnings(): string[] {
    return this.form.warnings();
  }

  protected mrNumberText(): string {
    const typed = (this.value().mrNumber as string)?.trim();
    return typed || this.code() || 'Generated on save';
  }
}
