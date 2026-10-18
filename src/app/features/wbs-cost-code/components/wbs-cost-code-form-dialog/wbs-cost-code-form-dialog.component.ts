import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WbsCostCodeStore } from '../../store/wbs-cost-code.store';
import { DisciplineOption, ProjectOption, WbsCostCode } from '../../models/wbs-cost-code.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

export interface WbsCostCodeFormDialogData {
  mode: 'create' | 'edit';
  wbsCostCodeId?: string;
}

export type WbsCostCodeFormDialogResult =
  | { action: 'saved'; wbsCostCode: WbsCostCode; saveAndNew: boolean }
  | undefined;

/** Values `prefill()` accepts — used by "Duplicate". */
export interface WbsCostCodePrefill {
  projectDetails: string;
  projectId: string;
  areaFacility: string;
  systemSubsystem: string;
  disciplineId: string;
  workPackage: string;
  activities: string;
  isActive: boolean;
}

/**
 * Create/Edit dialog for the WBS master. `code` is
 * server-generated (a per-organization sequence starting at 0001), so its
 * control exists only to show the value in edit mode — it is disabled and never
 * submitted to the API.
 */
@Component({
  selector: 'app-wbs-cost-code-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatSlideToggleModule,
    MatProgressSpinnerModule, MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './wbs-cost-code-form-dialog.component.html',
  styleUrl: './wbs-cost-code-form-dialog.component.scss',
})
export class WbsCostCodeFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<WbsCostCodeFormDialogComponent, WbsCostCodeFormDialogResult>);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(WbsCostCodeStore);
  protected readonly data = inject<WbsCostCodeFormDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly loading = signal(this.isEdit);
  protected readonly loadError = signal('');
  protected readonly saving = this.store.saving;

  private current: WbsCostCode | null = null;

  /** The record's own discipline, kept so it still shows if it has since been deactivated. */
  private readonly currentDiscipline = signal<DisciplineOption | null>(null);

  /** Active disciplines, plus the record's current one when it is no longer in that list. */
  protected readonly disciplineOptions = computed<DisciplineOption[]>(() => {
    const options = this.store.disciplines();
    const current = this.currentDiscipline();
    return current && !options.some((d) => d.id === current.id) ? [current, ...options] : options;
  });

  /** The record's own project, kept so it still shows if it has since closed. */
  private readonly currentProject = signal<ProjectOption | null>(null);
  /** The department of the record's own discipline, for when that discipline is no longer offered. */
  private readonly currentDepartment = signal<{ id: string; name: string } | null>(null);

  protected readonly projectSearch = signal('');

  /** Open projects, plus the record's own project when it is no longer in that list. */
  private readonly allProjects = computed<ProjectOption[]>(() => {
    const options = this.store.projects();
    const current = this.currentProject();
    return current && !options.some((p) => p.id === current.id) ? [current, ...options] : options;
  });

  /** Most matches a search shows — enough to pick from, without rendering hundreds of rows. */
  protected readonly projectListLimit = 100;

  private readonly projectMatches = computed(() => {
    const term = this.projectSearch().trim().toLowerCase();
    const all = this.allProjects();
    if (!term) return all;
    return all.filter((p) =>
      p.code.toLowerCase().includes(term)
      || p.projectName.toLowerCase().includes(term)
      || (p.clientName ?? '').toLowerCase().includes(term)
      || (p.clientCode ?? '').toLowerCase().includes(term));
  });

  protected readonly visibleProjects = computed(() => {
    const matches = this.projectMatches();
    const chosen = this.currentProject();
    const list = matches.slice(0, this.projectListLimit);
    // Never let the selected project drop out of the options, or the select shows blank.
    return chosen && !list.some((p) => p.id === chosen.id) && this.projectSearch().trim() === ''
      ? [chosen, ...list]
      : list;
  });

  protected readonly hiddenProjectCount = computed(
    () => Math.max(0, this.projectMatches().length - this.projectListLimit),
  );

  protected readonly form = this.fb.nonNullable.group({
    code: [''],
    projectId: ['', [Validators.required]],
    // `\S` rejects a value that is only whitespace, which `required` lets through.
    projectDetails: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    areaFacility: ['', [Validators.maxLength(255)]],
    systemSubsystem: ['', [Validators.maxLength(255)]],
    // '' means "no discipline" — mapped to null on save.
    disciplineId: [''],
    workPackage: ['', [Validators.maxLength(255)]],
    activities: ['', [Validators.maxLength(5000)]],
    isActive: [true],
  });

  ngOnInit(): void {
    // Display-only: the server generates the code, so it must never post.
    this.form.controls.code.disable();

    if (this.isEdit && this.data.wbsCostCodeId) {
      this.loadWbsCostCode(this.data.wbsCostCodeId);
    }
  }

  private async loadWbsCostCode(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const record = await this.store.getWbsCostCodeById(id);
      this.current = record;
      if (record.disciplineId) {
        this.currentDiscipline.set({
          id: record.disciplineId,
          name: record.disciplineName ?? record.discipline?.name ?? record.disciplineId,
          code: record.discipline?.code ?? '',
        });
      }
      if (record.projectId) {
        this.currentProject.set({
          id: record.projectId,
          code: record.projectCode ?? '',
          projectName: record.projectName ?? record.projectId,
          clientId: record.clientId ?? '',
          clientCode: record.clientCode ?? null,
          clientName: record.clientName ?? null,
          status: 'PLANNED' as ProjectOption['status'],
          currencyCode: null,
        });
      }
      if (record.disciplineId && record.departmentName) {
        this.currentDepartment.set({ id: record.disciplineId, name: record.departmentName });
      }
      this.form.patchValue({
        code: record.code,
        projectId: record.projectId ?? '',
        projectDetails: record.projectDetails,
        areaFacility: record.areaFacility ?? '',
        systemSubsystem: record.systemSubsystem ?? '',
        disciplineId: record.disciplineId ?? '',
        workPackage: record.workPackage ?? '',
        activities: record.activities ?? '',
        isActive: record.isActive,
      });
      this.form.markAsPristine();
    } catch {
      this.loadError.set('Unable to load WBS details. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async save(saveAndNew: boolean): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    // null (not undefined) for blanks: on update that is what clears a value.
    const payload = {
      projectDetails: v.projectDetails.trim(),
      projectId: v.projectId,
      areaFacility: v.areaFacility.trim() || null,
      systemSubsystem: v.systemSubsystem.trim() || null,
      disciplineId: v.disciplineId || null,
      workPackage: v.workPackage.trim() || null,
      activities: v.activities.trim() || null,
      isActive: v.isActive,
    };

    try {
      const wbsCostCode = this.isEdit && this.current
        ? await this.store.updateWbsCostCode(this.current.id, payload)
        : await this.store.createWbsCostCode(payload);

      if (saveAndNew) {
        this.resetForm();
        return;
      }
      this.dialogRef.close({ action: 'saved', wbsCostCode, saveAndNew: false });
    } catch {
      // Store already surfaced a snackbar; keep the dialog open so the user can correct and retry.
    }
  }

  /** Pre-populates the form (e.g. from "Duplicate") without touching the id being edited. */
  prefill(values: Partial<WbsCostCodePrefill>): void {
    const next = { ...values };
    // A project that has since closed is no longer selectable either.
    if (next.projectId && !this.store.projects().some((p) => p.id === next.projectId)) {
      next.projectId = '';
    }
    // A deactivated discipline is no longer selectable; carrying its id over
    // would only produce a server-side rejection, so leave the field empty.
    if (next.disciplineId && !this.store.disciplines().some((d) => d.id === next.disciplineId)) {
      next.disciplineId = '';
    }
    this.form.patchValue(next);
  }

  resetForm(): void {
    this.form.reset({
      code: '',
      projectId: '',
      projectDetails: '',
      areaFacility: '',
      systemSubsystem: '',
      disciplineId: '',
      workPackage: '',
      activities: '',
      isActive: true,
    });
    this.form.controls.code.disable();
    this.current = null;
    this.currentDiscipline.set(null);
    this.currentProject.set(null);
    this.currentDepartment.set(null);
    this.projectSearch.set('');
  }

  cancel(): void {
    if (!this.form.dirty) {
      this.dialogRef.close(undefined);
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        data: {
          title: 'Discard Changes?',
          message: 'You have unsaved changes. Discard them and close?',
          confirmText: 'Discard',
          color: 'warn',
          icon: 'warning',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.dialogRef.close(undefined);
      });
  }

  protected projectLabel(p: ProjectOption): string {
    return `${p.code} — ${p.projectName}`;
  }

  // The two read-only lines under the selects. They follow the form controls so
  // they update the moment the user picks, and never feed anything back.
  private readonly projectIdValue = toSignal(this.form.controls.projectId.valueChanges, {
    initialValue: this.form.controls.projectId.value,
  });
  private readonly disciplineIdValue = toSignal(this.form.controls.disciplineId.valueChanges, {
    initialValue: this.form.controls.disciplineId.value,
  });

  /** "0007 — Gulf Petrochemical Holdings" for the chosen project, or ''. */
  protected readonly clientText = computed(() => {
    const project = this.allProjects().find((p) => p.id === this.projectIdValue());
    if (!project?.clientName) return '';
    return project.clientCode ? `${project.clientCode} — ${project.clientName}` : project.clientName;
  });

  /** The chosen discipline's department, or ''. */
  protected readonly departmentText = computed(() => {
    const id = this.disciplineIdValue();
    if (!id) return '';
    const option = this.disciplineOptions().find((d) => d.id === id);
    return option?.department?.name ?? this.currentDepartment()?.name ?? '';
  });

  err(field: keyof typeof this.form.controls): string {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return '';
    if (control.errors['required'] || control.errors['pattern']) {
      return field === 'projectId' ? 'Select a project.' : 'WBS / Cost name is required.';
    }
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    return '';
  }
}
