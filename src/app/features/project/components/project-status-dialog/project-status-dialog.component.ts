import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  PROJECT_STATUS_OPTIONS, PROJECT_STATUS_TRANSITIONS, ProjectStatus, projectStatusLabel,
} from '../../models/project.model';

export interface ProjectStatusDialogData {
  code: string;
  projectName: string;
  current: ProjectStatus;
  /** Statuses to offer; defaults to the transition table for `current`. */
  allowed?: readonly ProjectStatus[];
}

/** What the dialog closes with: undefined when cancelled. */
export type ProjectStatusDialogResult = { status: ProjectStatus; reason: string } | undefined;

/**
 * Picks the project's next status and captures why. Only the moves the API will
 * accept are offered, so the user cannot choose a transition that is refused.
 */
@Component({
  selector: 'app-project-status-dialog',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title class="title">
      <mat-icon>swap_horiz</mat-icon>
      Change Project Status
    </h2>

    <mat-dialog-content>
      <p>
        <strong>{{ data.projectName }}</strong> ({{ data.code }}) is currently
        <strong>{{ currentLabel }}</strong>.
      </p>

      @if (options.length === 0) {
        <p class="none">No status change is available for this project.</p>
      } @else {
        <mat-form-field appearance="outline" class="full">
          <mat-label>New status</mat-label>
          <mat-select [formControl]="status" required>
            @for (o of options; track o.value) {
              <mat-option [value]="o.value">
                <mat-icon class="opt-icon">{{ o.icon }}</mat-icon> {{ o.label }}
                <span class="opt-hint">— {{ o.hint }}</span>
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Reason (optional)</mat-label>
          <textarea
            matInput
            rows="3"
            maxlength="500"
            [formControl]="reason"
            placeholder="e.g. Awaiting client approval of the revised scope"
          ></textarea>
          <mat-hint align="end">{{ reason.value.length }}/500</mat-hint>
        </mat-form-field>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        type="button"
        [disabled]="options.length === 0 || status.invalid"
        (click)="confirm()"
      >
        <mat-icon>check</mat-icon>
        Change Status
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .title { display: flex; align-items: center; gap: 8px; }
    .full { width: 100%; margin-top: 8px; }
    .none { color: #6b7a99; }
    .opt-icon { font-size: 18px; width: 18px; height: 18px; vertical-align: middle; margin-right: 4px; }
    .opt-hint { color: #8098b8; font-size: 0.8rem; }
  `],
})
export class ProjectStatusDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ProjectStatusDialogComponent, ProjectStatusDialogResult>);
  protected readonly data = inject<ProjectStatusDialogData>(MAT_DIALOG_DATA);

  protected readonly currentLabel = projectStatusLabel(this.data.current);

  protected readonly options = PROJECT_STATUS_OPTIONS.filter((o) =>
    (this.data.allowed ?? PROJECT_STATUS_TRANSITIONS[this.data.current]).includes(o.value),
  );

  protected readonly status = new FormControl<ProjectStatus | null>(null, {
    validators: [Validators.required],
  });

  protected readonly reason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(500)],
  });

  confirm(): void {
    const status = this.status.value;
    if (!status) return;
    this.dialogRef.close({ status, reason: this.reason.value.trim() });
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
