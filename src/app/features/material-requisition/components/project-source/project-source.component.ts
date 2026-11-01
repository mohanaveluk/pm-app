import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import { RequisitionFormService } from '../../services/requisition-form.service';
import { RequisitionCandidate, RequisitionLineSource, SourceProject } from '../../models/material-requisition.model';
import { CandidateListComponent } from '../candidate-list/candidate-list.component';

/**
 * Other Projects source: pick another project, then copy materials from what
 * was requisitioned on it — each with the quantity requested there as a
 * reference. The requisition's own project is never offered.
 */
@Component({
  selector: 'app-project-source',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, CandidateListComponent,
  ],
  styleUrl: '../requisition-step.shared.scss',
  template: `
    <div class="panel-actions">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" style="flex: 1 1 380px; min-width: 240px">
        <mat-label>Select another project</mat-label>
        <mat-select
          [value]="selectedId()"
          (selectionChange)="choose($event.value)"
          (openedChange)="!$event && term.set('')"
        >
          <mat-option>
            <input
              class="select-search"
              type="text"
              placeholder="Search by project no., name or client…"
              aria-label="Search projects"
              [ngModel]="term()"
              (ngModelChange)="term.set($event)"
              (click)="$event.stopPropagation()"
              (keydown)="$event.stopPropagation()"
            />
          </mat-option>
          @for (p of visibleProjects(); track p.id) {
            <mat-option [value]="p.id">
              {{ p.code }} — {{ p.projectName }}@if (p.clientName) { · {{ p.clientName }} }
              ({{ p.materialCount }} material{{ p.materialCount === 1 ? '' : 's' }})
            </mat-option>
          }
          @if (visibleProjects().length === 0) {
            <mat-option disabled>{{ projectsLoading() ? 'Loading…' : 'No other projects with requisitioned materials' }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (selected()) {
        <button mat-stroked-button type="button" (click)="loadItems()" [disabled]="loading()">
          <mat-icon>refresh</mat-icon> Reload
        </button>
      }
    </div>

    @if (projectsError()) {
      <div class="step-error">
        <mat-icon>error_outline</mat-icon><span>{{ projectsError() }}</span>
        <button mat-button type="button" (click)="loadProjects()">Retry</button>
      </div>
    }

    @if (selected(); as p) {
      <p class="info-note">
        <mat-icon>folder_open</mat-icon>
        Materials requisitioned on <strong>{{ p.code }} — {{ p.projectName }}</strong>, with the quantity requested there.
      </p>
      @if (loading()) {
        <p class="info-note"><mat-spinner diameter="16" /> Loading…</p>
      }
      @if (error()) {
        <div class="step-error"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div>
      }
      <app-candidate-list
        [candidates]="candidates()"
        [source]="source"
        [sourceReference]="'Project ' + p.code"
        referenceLabel="Requested There"
        emptyMessage="No materials have been requisitioned on that project."
      />
    } @else if (!projectsLoading() && !projectsError()) {
      <p class="info-note">
        <mat-icon>info</mat-icon>
        Choose a project above to copy materials from what was requisitioned on it.
        @if (form.selectedProject(); as current) { {{ current.code }} (this requisition's project) is not listed. }
      </p>
    }
  `,
})
export class ProjectSourceComponent {
  private readonly service = inject(MaterialRequisitionService);
  protected readonly form = inject(RequisitionFormService);

  protected readonly source = RequisitionLineSource.PROJECT;

  protected readonly projects = signal<SourceProject[]>([]);
  protected readonly projectsLoading = signal(false);
  protected readonly projectsError = signal('');
  protected readonly term = signal('');
  protected readonly selectedId = signal<string | null>(null);

  protected readonly candidates = signal<RequisitionCandidate[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly selected = computed(() => this.projects().find((p) => p.id === this.selectedId()) ?? null);

  /** Search by code, name or client; the chosen project always stays listed. */
  protected readonly visibleProjects = computed(() => {
    const t = this.term().trim().toLowerCase();
    const chosen = this.selectedId();
    const all = this.projects();
    if (!t) return all;
    return all.filter((p) => p.id === chosen
      || p.code.toLowerCase().includes(t)
      || p.projectName.toLowerCase().includes(t)
      || (p.clientName ?? '').toLowerCase().includes(t));
  });

  private readonly currentProjectId = computed(() => this.form.selectedProject()?.id ?? null);

  constructor() {
    // The list leaves out the requisition's own project — reload when it changes.
    effect(() => {
      const current = this.currentProjectId();
      untracked(() => {
        if (current && this.selectedId() === current) {
          this.selectedId.set(null);
          this.candidates.set([]);
        }
        this.loadProjects();
      });
    });
  }

  loadProjects(): void {
    this.projectsLoading.set(true);
    this.projectsError.set('');
    this.service.getSourceProjects(this.currentProjectId()).subscribe({
      next: (res) => {
        this.projects.set(res.data ?? []);
        this.projectsLoading.set(false);
      },
      error: () => {
        this.projects.set([]);
        this.projectsError.set('Unable to load the other projects. Please try again.');
        this.projectsLoading.set(false);
      },
    });
  }

  protected choose(id: string | undefined): void {
    // The search box is the first option; picking it is not a choice.
    if (!id || id === this.selectedId()) return;
    this.selectedId.set(id);
    this.term.set('');
    this.loadItems();
  }

  protected loadItems(): void {
    const id = this.selectedId();
    if (!id) return;
    this.loading.set(true);
    this.error.set('');
    this.service.getProjectItems(id).subscribe({
      next: (res) => {
        this.candidates.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.candidates.set([]);
        this.error.set('Unable to load that project\'s materials. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
