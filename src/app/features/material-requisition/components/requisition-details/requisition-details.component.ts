import { RequisitionChecklistTableComponent } from '../requisition-checklist-table/requisition-checklist-table.component';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  DOCUMENT_TYPE_LABELS, MaterialRequisition, SOURCE_LABELS, requisitionStatusLabel,
} from '../../models/material-requisition.model';

/**
 * Everything a requisition says — header, references, materials, documents —
 * read-only. Shared by the view, review and approval screens so all three show
 * exactly the same thing.
 */
@Component({
  selector: 'app-requisition-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, DatePipe, MatButtonModule, MatIconModule, MatTableModule, MatTooltipModule,
    RequisitionChecklistTableComponent,
  ],
  templateUrl: './requisition-details.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class RequisitionDetailsComponent {
  readonly mr = input.required<MaterialRequisition>();

  protected readonly typeLabels: Record<string, string> = DOCUMENT_TYPE_LABELS;
  protected readonly sourceLabels: Record<string, string> = SOURCE_LABELS;
  protected readonly lineColumns = ['no', 'code', 'description', 'uom', 'quantity', 'stock', 'source'];

  protected statusText(status: string): string {
    return requisitionStatusLabel(status);
  }

  protected clientText(mr: MaterialRequisition): string {
    if (!mr.clientName) return '—';
    return mr.clientCode ? `${mr.clientCode} — ${mr.clientName}` : mr.clientName;
  }

  protected open(url: string): void {
    window.open(url, '_blank', 'noopener');
  }
}
