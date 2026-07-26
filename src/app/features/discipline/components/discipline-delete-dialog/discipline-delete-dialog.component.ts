import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Discipline } from '../../models/discipline.model';

export interface DisciplineDeleteDialogData {
  discipline: Discipline;
}

@Component({
  selector: 'app-discipline-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './discipline-delete-dialog.component.html',
  styleUrl: './discipline-delete-dialog.component.scss',
})
export class DisciplineDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<DisciplineDeleteDialogComponent, boolean>);
  protected readonly data = inject<DisciplineDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
