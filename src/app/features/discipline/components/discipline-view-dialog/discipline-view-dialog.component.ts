import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Discipline } from '../../models/discipline.model';

export interface DisciplineViewDialogData {
  discipline: Discipline;
}

@Component({
  selector: 'app-discipline-view-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule],
  templateUrl: './discipline-view-dialog.component.html',
  styleUrl: './discipline-view-dialog.component.scss',
})
export class DisciplineViewDialogComponent {
  protected readonly data = inject<DisciplineViewDialogData>(MAT_DIALOG_DATA);
  protected readonly discipline = this.data.discipline;
}
