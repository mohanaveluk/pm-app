import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import {
  MaterialRequisitionListItem, RequisitionCandidate, RequisitionLineSource,
  requisitionStatusLabel,
} from '../../models/material-requisition.model';
import { CandidateListComponent } from '../candidate-list/candidate-list.component';

/** Earlier Material Requisition source: reuse the lines of a previous MR. */
@Component({
  selector: 'app-earlier-mr-source',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, CandidateListComponent,
  ],
  styleUrl: '../requisition-step.shared.scss',
  template: `
    <div class="panel-actions">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" style="flex: 1 1 360px; min-width: 240px">
        <mat-label>Select a previous MR</mat-label>
        <mat-select [(ngModel)]="selectedId" (ngModelChange)="onChosen()">
          <mat-option>
            <input
              class="select-search"
              type="text"
              placeholder="Search by MR number or project…"
              aria-label="Search requisitions"
              [ngModel]="term()"
              (ngModelChange)="term.set($event)"
              (click)="$event.stopPropagation()"
              (keydown)="$event.stopPropagation()"
            />
          </mat-option>
          @for (mr of visibleRequisitions(); track mr.id) {
            <mat-option [value]="mr.id">
              {{ mr.mrNumber }} — {{ mr.projectCode }} {{ mr.projectName }}
              ({{ statusLabel(mr.status) }}, {{ mr.itemCount }} items)
            </mat-option>
          }
          @if (visibleRequisitions().length === 0) {
            <mat-option disabled>{{ listLoading() ? 'Loading…' : 'No requisitions found' }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="!selectedId || loading()"
        (click)="load()"
      >
        @if (loading()) { <mat-spinner diameter="18" /> } @else { <mat-icon>download</mat-icon> }
        Load Items
      </button>
    </div>

    @if (error()) {
      <div class="step-error"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div>
    }

    @if (loadedFrom(); as ref) {
      <p class="info-note">
        <mat-icon>history</mat-icon>
        {{ candidates().length }} material{{ candidates().length === 1 ? '' : 's' }} from {{ ref }}.
        Enter the quantity to request for each one you need.
      </p>
      <app-candidate-list
        [candidates]="candidates()"
        [source]="source"
        [sourceReference]="ref"
        referenceLabel="Previous Qty"
        emptyMessage="That requisition has no materials."
      />
    } @else {
      <p class="table-empty">Choose a previous requisition and load its items.</p>
    }
  `,
})
export class EarlierMrSourceComponent implements OnInit {
  private readonly service = inject(MaterialRequisitionService);

  /** The requisition being edited — it cannot be its own source. */
  readonly currentId = input<string | null>(null);

  protected readonly source = RequisitionLineSource.EARLIER_MR;

  protected readonly requisitions = signal<MaterialRequisitionListItem[]>([]);
  protected readonly listLoading = signal(true);
  protected readonly term = signal('');
  protected selectedId: string | null = null;

  protected readonly candidates = signal<RequisitionCandidate[]>([]);
  protected readonly loadedFrom = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly visibleRequisitions = computed(() => {
    const term = this.term().trim().toLowerCase();
    const current = this.currentId();
    return this.requisitions()
      .filter((r) => r.id !== current && r.itemCount > 0)
      .filter((r) =>
        !term
        || r.mrNumber.toLowerCase().includes(term)
        || r.code.toLowerCase().includes(term)
        || (r.projectCode ?? '').toLowerCase().includes(term)
        || (r.projectName ?? '').toLowerCase().includes(term));
  });

  protected statusLabel = requisitionStatusLabel;

  ngOnInit(): void {
    this.service.getRequisitions({
      page: 1, limit: 200, sortBy: 'createdAt', sortOrder: 'DESC',
    }).subscribe({
      next: (res) => {
        this.requisitions.set(res.data?.items ?? []);
        this.listLoading.set(false);
      },
      error: () => {
        this.listLoading.set(false);
        this.error.set('Unable to load the earlier requisitions.');
      },
    });
  }

  protected onChosen(): void {
    this.error.set('');
  }

  protected load(): void {
    if (!this.selectedId) return;
    this.loading.set(true);
    this.error.set('');

    this.service.getRequisitionById(this.selectedId).subscribe({
      next: (res) => {
        const mr = res.data;
        this.candidates.set(mr.items.map((i) => ({
          materialId: i.materialId,
          code: i.materialCode,
          description: i.materialDescription,
          categoryName: null,
          groupName: null,
          uom: i.uom,
          stockOnHand: i.stockOnHand,
          referenceQty: i.requestedQty,
        })));
        this.loadedFrom.set(`MR ${mr.mrNumber}`);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load that requisition. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
