import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { DepartmentDisciplineGroup } from '../../models/department-discipline.model';

export interface DepartmentDisciplineViewDialogData {
  group: DepartmentDisciplineGroup;
  organizationName: string;
}

@Component({
  selector: 'app-department-discipline-view-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule, MatTableModule],
  templateUrl: './department-discipline-view-dialog.component.html',
  styleUrl: './department-discipline-view-dialog.component.scss',
})
export class DepartmentDisciplineViewDialogComponent {
  protected readonly data = inject<DepartmentDisciplineViewDialogData>(MAT_DIALOG_DATA);
  protected readonly group = this.data.group;

  protected readonly displayedColumns = ['discipline', 'status', 'remarks'];

  protected readonly activeCount = this.group.assignments.filter((a) => a.isActive).length;
  protected readonly inactiveCount = this.group.assignments.length - this.activeCount;
}
