import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { ServiceGroupUserStore } from '../../store/service-group-user.store';
import { AssignmentType, DEFAULT_SERVICE_GROUP_USER_FILTER, ServiceGroupUserFilter } from '../../models/service-group-user.model';

export interface ServiceGroupUserFilterDialogData {
  filter: ServiceGroupUserFilter;
}

export type ServiceGroupUserFilterDialogResult = ServiceGroupUserFilter | undefined;

function toIso(date: Date | null): string | null {
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fromIso(iso: string | null): Date | null {
  return iso ? new Date(iso) : null;
}

@Component({
  selector: 'app-service-group-user-filter-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatDatepickerModule, MatNativeDateModule, MatCheckboxModule, MatDividerModule,
  ],
  templateUrl: './service-group-user-filter-dialog.component.html',
  styleUrl: './service-group-user-filter-dialog.component.scss',
})
export class ServiceGroupUserFilterDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ServiceGroupUserFilterDialogComponent, ServiceGroupUserFilterDialogResult>);
  protected readonly data = inject<ServiceGroupUserFilterDialogData>(MAT_DIALOG_DATA);
  protected readonly store = inject(ServiceGroupUserStore);

  protected readonly assignmentTypes = Object.values(AssignmentType);

  protected readonly form = this.fb.group({
    serviceGroupId: this.fb.control<string | null>(this.data.filter.serviceGroupId),
    assignmentType: this.fb.control<AssignmentType | null>(this.data.filter.assignmentType),
    status: this.fb.nonNullable.control<'all' | 'active' | 'inactive'>(this.data.filter.status),
    primaryOnly: this.fb.nonNullable.control(this.data.filter.primaryOnly),
    createdFrom: this.fb.control<Date | null>(fromIso(this.data.filter.createdFrom)),
    createdTo: this.fb.control<Date | null>(fromIso(this.data.filter.createdTo)),
  });

  apply(): void {
    const v = this.form.getRawValue();
    this.dialogRef.close({
      ...this.data.filter,
      serviceGroupId: v.serviceGroupId || null,
      assignmentType: v.assignmentType || null,
      status: v.status,
      primaryOnly: v.primaryOnly,
      createdFrom: toIso(v.createdFrom),
      createdTo: toIso(v.createdTo),
    });
  }

  reset(): void {
    this.form.reset({
      serviceGroupId: null,
      assignmentType: null,
      status: DEFAULT_SERVICE_GROUP_USER_FILTER.status,
      primaryOnly: false,
      createdFrom: null,
      createdTo: null,
    });
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
