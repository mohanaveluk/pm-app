import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ClientDeactivateDialogData {
  code: string;
  clientName: string;
}

/** What the dialog closes with: undefined when cancelled, otherwise the (optional) reason. */
export type ClientDeactivateDialogResult = { reason: string } | undefined;

/**
 * Confirms a deactivation and captures why. Deactivation is a soft state
 * change — the client stays, with everything that references it — so the
 * message says so, and the reason is kept for the audit history.
 */
@Component({
  selector: 'app-client-deactivate-dialog',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title class="title">
      <mat-icon color="warn">toggle_off</mat-icon>
      Deactivate Client?
    </h2>

    <mat-dialog-content>
      <p>
        <strong>{{ data.clientName }}</strong> ({{ data.code }}) will no longer be offered for
        new projects. Existing projects, documents and history keep showing this client.
      </p>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Reason (optional)</mat-label>
        <textarea
          matInput
          rows="3"
          maxlength="500"
          [formControl]="reason"
          placeholder="e.g. Contract concluded; no further work expected"
        ></textarea>
        <mat-hint align="end">{{ reason.value.length }}/500</mat-hint>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Cancel</button>
      <button mat-raised-button color="warn" type="button" (click)="confirm()">
        <mat-icon>toggle_off</mat-icon>
        Deactivate
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .title { display: flex; align-items: center; gap: 8px; }
    .full { width: 100%; margin-top: 8px; }
  `],
})
export class ClientDeactivateDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ClientDeactivateDialogComponent, ClientDeactivateDialogResult>);
  protected readonly data = inject<ClientDeactivateDialogData>(MAT_DIALOG_DATA);

  protected readonly reason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(500)],
  });

  confirm(): void {
    this.dialogRef.close({ reason: this.reason.value.trim() });
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
