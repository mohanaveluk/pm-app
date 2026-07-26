import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DepartmentDisciplineGroup } from '../../models/department-discipline.model';

export interface DepartmentDisciplineDeleteDialogData {
  group: DepartmentDisciplineGroup;
}

@Component({
  selector: 'app-department-discipline-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './department-discipline-delete-dialog.component.html',
  styleUrl: './department-discipline-delete-dialog.component.scss',
})
export class DepartmentDisciplineDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<DepartmentDisciplineDeleteDialogComponent, boolean>);
  protected readonly data = inject<DepartmentDisciplineDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
