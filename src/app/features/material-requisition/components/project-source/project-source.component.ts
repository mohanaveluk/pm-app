import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import { RequisitionFormService } from '../../services/requisition-form.service';
import { RequisitionCandidate, RequisitionLineSource } from '../../models/material-requisition.model';
import { CandidateListComponent } from '../candidate-list/candidate-list.component';

/**
 * Project / WBS source: the materials already requisitioned on the chosen
 * project, each with the quantity requested so far as a reference.
 */
@Component({
  selector: 'app-project-source',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatSlideToggleModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    CandidateListComponent,
  ],
  styleUrl: '../requisition-step.shared.scss',
  template: `
    @if (!form.selectedProject()) {
      <div class="step-caution">
        <mat-icon>info</mat-icon>
        <span>Choose a project in the Header step to see the materials used on it.</span>
      </div>
    } @else {
      <div class="panel-actions">
        <span>
          Materials requisitioned on <strong>{{ form.selectedProject()!.code }} — {{ form.selectedProject()!.projectName }}</strong>
        </span>
        @if (form.selectedWbs()) {
          <mat-slide-toggle [checked]="onlyWbs()" (change)="setOnlyWbs($event.checked)" color="primary">
            Only {{ form.selectedWbs()!.code }}
          </mat-slide-toggle>
        }
        <button mat-stroked-button type="button" (click)="load()" [disabled]="loading()">
          <mat-icon>refresh</mat-icon> Reload
        </button>
      </div>

      @if (loading()) {
        <p class="info-note"><mat-spinner diameter="16" /> Loading…</p>
      }
      @if (error()) {
        <div class="step-error"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div>
      }

      <app-candidate-list
        [candidates]="candidates()"
        [source]="source"
        [sourceReference]="reference()"
        referenceLabel="Requested So Far"
        emptyMessage="No materials have been requisitioned on this project yet."
      />
    }
  `,
})
export class ProjectSourceComponent implements OnInit {
  private readonly service = inject(MaterialRequisitionService);
  protected readonly form = inject(RequisitionFormService);

  protected readonly source = RequisitionLineSource.PROJECT;

  protected readonly candidates = signal<RequisitionCandidate[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly onlyWbs = signal(false);

  protected reference(): string | null {
    const p = this.form.selectedProject();
    return p ? `Project ${p.code}` : null;
  }

  ngOnInit(): void {
    this.load();
  }

  protected setOnlyWbs(value: boolean): void {
    this.onlyWbs.set(value);
    this.load();
  }

  protected load(): void {
    const project = this.form.selectedProject();
    if (!project) return;

    this.loading.set(true);
    this.error.set('');
    const wbs = this.onlyWbs() ? this.form.selectedWbs()?.id : null;

    this.service.getProjectItems(project.id, wbs).subscribe({
      next: (res) => {
        this.candidates.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.candidates.set([]);
        this.error.set('Unable to load the project\'s materials. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
