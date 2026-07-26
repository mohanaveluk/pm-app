import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Department, DepartmentData } from '../../models/department.model';

export interface DepartmentViewDialogData {
  department: DepartmentData;
}

@Component({
  selector: 'app-department-view-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule],
  templateUrl: './department-view-dialog.component.html',
  styleUrl: './department-view-dialog.component.scss',
})
export class DepartmentViewDialogComponent {
  protected readonly data = inject<DepartmentViewDialogData>(MAT_DIALOG_DATA);
  protected readonly department = this.data.department;
}
