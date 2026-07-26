import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Placeholder for the future Excel/CSV Activity import wizard. Real file
 * parsing and column mapping aren't implemented server-side yet — this keeps
 * the toolbar's "Import" action discoverable without a dead button.
 */
@Component({
  selector: 'app-activity-import-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './activity-import-dialog.component.html',
  styleUrl: './activity-import-dialog.component.scss',
})
export class ActivityImportDialogComponent {}
