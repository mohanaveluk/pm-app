import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RequisitionFormService } from '../../services/requisition-form.service';
import {
  REQUISITION_SOURCE_OPTIONS, RequisitionLineSource,
} from '../../models/material-requisition.model';
import { MaterialSourceSelectorComponent } from '../material-source-selector/material-source-selector.component';
import { MaterialSearchComponent } from '../material-search/material-search.component';
import { EarlierMrSourceComponent } from '../earlier-mr-source/earlier-mr-source.component';
import { BomSourceComponent } from '../bom-source/bom-source.component';
import { ProjectSourceComponent } from '../project-source/project-source.component';

/**
 * Step 2 — choose where to pick materials from, then enter the quantity for
 * each one needed. Every source feeds the same selected lines, so switching
 * source never loses what has been entered.
 */
@Component({
  selector: 'app-requisition-materials-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MaterialSourceSelectorComponent,
    MaterialSearchComponent, EarlierMrSourceComponent, BomSourceComponent, ProjectSourceComponent,
  ],
  templateUrl: './requisition-materials-step.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class RequisitionMaterialsStepComponent implements OnInit {
  protected readonly form = inject(RequisitionFormService);

  /** The requisition being edited, if any — it cannot be its own source. */
  readonly requisitionId = input<string | null>(null);
  /** The source to open on, e.g. when arriving from the list's Import. */
  readonly initialSource = input<RequisitionLineSource>(RequisitionLineSource.MATERIAL_MASTER);

  protected readonly Source = RequisitionLineSource;
  protected readonly source = signal<RequisitionLineSource>(RequisitionLineSource.MATERIAL_MASTER);

  /**
   * Panels are created the first time their source is chosen and then kept, so
   * a loaded earlier MR or a validated BOM is still there when the user comes
   * back to it.
   */
  protected readonly visited = signal<ReadonlySet<RequisitionLineSource>>(new Set());

  ngOnInit(): void {
    this.choose(this.initialSource());
  }

  protected choose(source: RequisitionLineSource): void {
    this.source.set(source);
    this.visited.update((set) => new Set(set).add(source));
  }

  protected sourceLabel(): string {
    return REQUISITION_SOURCE_OPTIONS.find((o) => o.value === this.source())?.label ?? '';
  }

  protected clearAll(): void {
    this.form.clearLines();
  }
}
