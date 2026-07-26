import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Department, DepartmentData } from '../../models/department.model';

export interface DepartmentDeleteDialogData {
  department: DepartmentData;
}

@Component({
  selector: 'app-department-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './department-delete-dialog.component.html',
  styleUrl: './department-delete-dialog.component.scss',
})
export class DepartmentDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<DepartmentDeleteDialogComponent, boolean>);
  protected readonly data = inject<DepartmentDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
