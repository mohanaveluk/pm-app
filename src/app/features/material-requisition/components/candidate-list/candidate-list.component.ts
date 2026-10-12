import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RequisitionCandidate, RequisitionLineSource } from '../../models/material-requisition.model';
import { RequisitionFormService } from '../../services/requisition-form.service';
import { RequisitionItemsTableComponent } from '../requisition-items-table/requisition-items-table.component';

/**
 * A source that hands over a ready list (an earlier MR, the project's history,
 * a validated BOM): searched and paged in the browser, quantities entered in
 * the shared table.
 */
@Component({
  selector: 'app-candidate-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatPaginatorModule, RequisitionItemsTableComponent,
  ],
  templateUrl: './candidate-list.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class CandidateListComponent {
  private readonly form = inject(RequisitionFormService);
  private readonly snack = inject(MatSnackBar);

  readonly candidates = input.required<RequisitionCandidate[]>();
  readonly source = input.required<RequisitionLineSource>();
  readonly sourceReference = input<string | null>(null);
  readonly referenceLabel = input<string | null>(null);
  readonly emptyMessage = input('No materials to show.');

  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);

  protected readonly matches = computed(() => {
    const term = this.search().trim().toLowerCase();
    const all = this.candidates();
    return term
      ? all.filter((c) => c.code.toLowerCase().includes(term) || c.description.toLowerCase().includes(term))
      : all;
  });

  protected readonly page = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.matches().slice(start, start + this.pageSize());
  });

  protected readonly hasReferenceQuantities = computed(
    () => this.candidates().some((c) => c.referenceQty !== null && c.referenceQty > 0),
  );

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  protected clearSearch(): void {
    this.search.set('');
    this.pageIndex.set(0);
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  /** Requests the source's own quantity for every material that has one. */
  protected useReferenceQuantities(): void {
    const applied = this.form.applyReferenceQuantities(
      this.candidates(), this.source(), this.sourceReference(),
    );
    this.snack.open(
      applied ? `Quantities set for ${applied} material${applied === 1 ? '' : 's'}.` : 'Nothing to copy.',
      'OK', { duration: 3000 },
    );
  }
}
