import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { ActivityStore } from '../../store/activity.store';
import { ActivityFilter, DEFAULT_ACTIVITY_FILTER } from '../../models/activity.model';

export interface ActivityFilterDialogData {
  filter: ActivityFilter;
}

export type ActivityFilterDialogResult = ActivityFilter | undefined;

@Component({
  selector: 'app-activity-filter-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, MatDividerModule,
  ],
  templateUrl: './activity-filter-dialog.component.html',
  styleUrl: './activity-filter-dialog.component.scss',
})
export class ActivityFilterDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ActivityFilterDialogComponent, ActivityFilterDialogResult>);
  protected readonly data = inject<ActivityFilterDialogData>(MAT_DIALOG_DATA);
  protected readonly store = inject(ActivityStore);

  protected readonly form = this.fb.group({
    departmentId: this.fb.control<string | null>(this.data.filter.departmentId),
    disciplineId: this.fb.control<string | null>(this.data.filter.disciplineId),
    departmentDisciplineId: this.fb.control<string | null>(this.data.filter.departmentDisciplineId),
    moduleGroup: this.fb.control<string | null>(this.data.filter.moduleGroup),
    status: this.fb.nonNullable.control<'all' | 'active' | 'inactive'>(this.data.filter.status),
    displayOrder: this.fb.control<number | null>(this.data.filter.displayOrder),
    createdFrom: this.fb.control<Date | null>(this.data.filter.createdFrom),
    createdTo: this.fb.control<Date | null>(this.data.filter.createdTo),
    updatedFrom: this.fb.control<Date | null>(this.data.filter.updatedFrom),
    updatedTo: this.fb.control<Date | null>(this.data.filter.updatedTo),
  });

  apply(): void {
    const v = this.form.getRawValue();
    this.dialogRef.close({
      ...this.data.filter,
      departmentId: v.departmentId || null,
      disciplineId: v.disciplineId || null,
      departmentDisciplineId: v.departmentDisciplineId || null,
      moduleGroup: v.moduleGroup || null,
      status: v.status,
      displayOrder: v.displayOrder ?? null,
      createdFrom: v.createdFrom,
      createdTo: v.createdTo,
      updatedFrom: v.updatedFrom,
      updatedTo: v.updatedTo,
    });
  }

  reset(): void {
    this.form.reset({
      departmentId: null,
      disciplineId: null,
      departmentDisciplineId: null,
      moduleGroup: null,
      status: DEFAULT_ACTIVITY_FILTER.status,
      displayOrder: null,
      createdFrom: null,
      createdTo: null,
      updatedFrom: null,
      updatedTo: null,
    });
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
