import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RequisitionFormService } from '../../services/requisition-form.service';

/**
 * Step 1 — Header: short description, project, WBS, dates and references.
 * (Supporting documents and the reviewers / approvers have steps of their own.)
 *
 * Picking a project shows its client; picking a WBS shows the area,
 * system, discipline, department, work package and activities it carries. All
 * of that is read from the master data and never typed here.
 */
@Component({
  selector: 'app-requisition-header-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './requisition-header-step.component.html',
  styleUrl: '../requisition-step.shared.scss',
})
export class RequisitionHeaderStepComponent {
  protected readonly form = inject(RequisitionFormService);

  protected readonly today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  protected readonly projectSearch = signal('');
  protected readonly wbsSearch = signal('');

  protected get header(): FormGroup {
    return this.form.header;
  }

  protected readonly visibleProjects = computed(() => {
    const term = this.projectSearch().trim().toLowerCase();
    const all = this.form.allProjects();
    return term
      ? all.filter((p) =>
          p.code.toLowerCase().includes(term)
          || p.projectName.toLowerCase().includes(term)
          || (p.clientName ?? '').toLowerCase().includes(term))
      : all;
  });

  protected readonly visibleWbs = computed(() => {
    const term = this.wbsSearch().trim().toLowerCase();
    const all = this.form.wbsCodes();
    return term
      ? all.filter((w) => w.code.toLowerCase().includes(term) || w.projectDetails.toLowerCase().includes(term))
      : all;
  });

  /** "0007 — Gulf Petrochemical Holdings" for the chosen project, or ''. */
  protected readonly clientText = computed(() => {
    const p = this.form.selectedProject();
    if (!p?.clientName) return '';
    return p.clientCode ? `${p.clientCode} — ${p.clientName}` : p.clientName;
  });

  protected err(controlName: string): string {
    const control = this.header.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['required']) {
      switch (controlName) {
        case 'projectId': return 'Select a project';
        case 'wbsCostCodeId': return 'Select a WBS';
        case 'requiredOnSiteDate': return 'Required on site date is required';
        default: return 'This field is required';
      }
    }
    if (control.errors['matDatepickerMin']) return 'The date cannot be in the past';
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    return '';
  }

  protected onProjectSelected(projectId: string): void {
    this.form.onProjectChanged(projectId);
  }
}
