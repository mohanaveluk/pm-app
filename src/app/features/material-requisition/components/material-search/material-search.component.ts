import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subject, debounceTime } from 'rxjs';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import { RequisitionFormService } from '../../services/requisition-form.service';
import { RequisitionCandidate, RequisitionLineSource } from '../../models/material-requisition.model';
import { RequisitionItemsTableComponent } from '../requisition-items-table/requisition-items-table.component';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Material Master source. Starts with every active material and narrows as the
 * user searches or filters — no "Search" press needed, though the button is
 * there for those who expect it. Results are paged on the server.
 */
@Component({
  selector: 'app-material-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatPaginatorModule, RequisitionItemsTableComponent,
  ],
  templateUrl: './material-search.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class MaterialSearchComponent implements OnInit {
  private readonly service = inject(MaterialRequisitionService);
  protected readonly form = inject(RequisitionFormService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly source = RequisitionLineSource.MATERIAL_MASTER;

  protected readonly search = signal('');
  protected readonly categoryId = signal<string | null>(null);
  protected readonly groupId = signal<string | null>(null);
  protected readonly uomId = signal<string | null>(null);

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly total = signal(0);
  protected readonly results = signal<RequisitionCandidate[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  private readonly typed$ = new Subject<void>();
  /** Guards against a slow response for an older search landing after a newer one. */
  private requestId = 0;

  /** Groups of the chosen category only, so the two filters stay coherent. */
  protected readonly visibleGroups = computed(() => {
    const category = this.categoryId();
    const all = this.form.groups();
    return category ? all.filter((g) => g.materialCategoryId === category) : all;
  });

  protected readonly hasFilters = computed(
    () => !!(this.search().trim() || this.categoryId() || this.groupId() || this.uomId()),
  );

  constructor() {
    this.typed$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.run(true));
  }

  ngOnInit(): void {
    this.run(true);
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.typed$.next();
  }

  protected onCategory(id: string | null): void {
    this.categoryId.set(id);
    // A group that no longer belongs to the category is dropped.
    const group = this.groupId();
    if (group && !this.visibleGroups().some((g) => g.id === group)) this.groupId.set(null);
    this.run(true);
  }

  protected onGroup(id: string | null): void {
    this.groupId.set(id);
    this.run(true);
  }

  protected onUom(id: string | null): void {
    this.uomId.set(id);
    this.run(true);
  }

  protected searchNow(): void {
    this.run(true);
  }

  protected clear(): void {
    this.search.set('');
    this.categoryId.set(null);
    this.groupId.set(null);
    this.uomId.set(null);
    this.run(true);
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.run(false);
  }

  private run(resetPage: boolean): void {
    if (resetPage) this.pageIndex.set(0);
    const id = ++this.requestId;
    this.loading.set(true);
    this.error.set('');

    this.service.searchMaterials({
      page: this.pageIndex() + 1,
      limit: this.pageSize(),
      search: this.search().trim() || undefined,
      materialCategoryId: this.categoryId() ?? undefined,
      materialGroupId: this.groupId() ?? undefined,
      unitOfMeasurementId: this.uomId() ?? undefined,
    }).subscribe({
      next: (res) => {
        if (id !== this.requestId) return;
        this.results.set(res.data?.items ?? []);
        this.total.set(res.data?.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        if (id !== this.requestId) return;
        this.results.set([]);
        this.total.set(0);
        this.error.set('Unable to load materials. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected retry(): void {
    this.run(false);
  }
}
