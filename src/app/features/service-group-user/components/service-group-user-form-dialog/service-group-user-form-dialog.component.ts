import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators,
} from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PermissionPreview } from '../../services/service-group-user.service';
import { ServiceGroupUserStore } from '../../store/service-group-user.store';
import { AssignmentType, AvailableUserOption, ServiceGroupMembershipGroup, UserServiceGroup } from '../../models/service-group-user.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ServiceGroupPermissionPreviewComponent } from '../service-group-permission-preview/service-group-permission-preview.component';
import { UserProfilePreviewComponent } from '../user-profile-preview/user-profile-preview.component';

export interface ServiceGroupUserFormDialogData {
  mode: 'create' | 'edit';
  /** Required in edit mode. */
  serviceGroupId?: string;
}

export type ServiceGroupUserFormDialogResult = { action: 'saved' } | undefined;

const ASSIGNMENT_TYPES = Object.values(AssignmentType);

function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const from = control.get('effectiveFrom')?.value as Date | null;
  const to = control.get('effectiveTo')?.value as Date | null;
  if (from && to && new Date(to) < new Date(from)) return { dateRange: true };
  return null;
}

@Component({
  selector: 'app-service-group-user-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatAutocompleteModule, MatDatepickerModule, MatNativeDateModule, MatButtonModule, MatIconModule,
    MatSlideToggleModule, MatProgressSpinnerModule, MatDividerModule, MatTooltipModule,
    ServiceGroupPermissionPreviewComponent, UserProfilePreviewComponent,
  ],
  templateUrl: './service-group-user-form-dialog.component.html',
  styleUrl: './service-group-user-form-dialog.component.scss',
})
export class ServiceGroupUserFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ServiceGroupUserFormDialogComponent, ServiceGroupUserFormDialogResult>);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  protected readonly store = inject(ServiceGroupUserStore);
  protected readonly data = inject<ServiceGroupUserFormDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly loading = signal(this.isEdit);
  protected readonly loadError = signal('');
  protected readonly saving = this.store.saving;
  protected readonly assignmentTypes = ASSIGNMENT_TYPES;

  private currentGroup: ServiceGroupMembershipGroup | null = null;
  private existingUserIds = new Set<string>();

  protected readonly permissionPreview = signal<PermissionPreview | null>(null);
  protected readonly loadingPreview = signal(false);

  protected readonly previewUser = signal<AvailableUserOption | null>(null);
  protected readonly previewUserGroups = signal<UserServiceGroup[]>([]);
  protected readonly loadingPreviewUserGroups = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    serviceGroupId: ['', Validators.required],
    users: this.fb.array<ReturnType<typeof this.buildUserRow>>([]),
  });

  protected get userRows() {
    return this.form.controls.users;
  }

  private readonly usersValue = toSignal(this.form.controls.users.valueChanges, {
    initialValue: this.form.controls.users.value,
  });

  /** User ids selected in more than one row — surfaced as an inline error per offending row. */
  protected readonly duplicateUserIds = computed(() => {
    const seen = new Set<string>();
    const dup = new Set<string>();
    for (const row of this.usersValue()) {
      if (!row.userId) continue;
      if (seen.has(row.userId)) dup.add(row.userId);
      seen.add(row.userId);
    }
    return dup;
  });

  /** All organization users are shown here — including inactive ones, clearly labeled — so an
   * admin can see everyone available. Inactive/deleted users are still rejected server-side. */
  protected readonly selectableUsers = this.store.availableUsers;

  ngOnInit(): void {
    if (this.isEdit) {
      this.loadGroup(this.data.serviceGroupId!);
      return;
    }
    this.form.controls.serviceGroupId.valueChanges.subscribe((id) => this.onServiceGroupChange(id));
    this.addUserRow();
  }

  private async loadGroup(serviceGroupId: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const group = this.store.getGroupByServiceGroupId(serviceGroupId);
      if (!group) {
        this.loadError.set("Unable to load this Service Group's members. Please try again.");
        return;
      }
      this.currentGroup = group;
      this.existingUserIds = new Set(group.members.map((m) => m.userId));
      this.form.patchValue({ serviceGroupId });
      this.form.controls.serviceGroupId.disable();

      for (const member of group.members) {
        this.userRows.push(
          this.buildUserRow({
            userId: member.userId,
            userSearch: member.userFullName,
            isPrimary: member.isPrimary,
            assignmentType: member.assignmentType,
            effectiveFrom: member.effectiveFrom ? new Date(member.effectiveFrom) : null,
            effectiveTo: member.effectiveTo ? new Date(member.effectiveTo) : null,
            remarks: member.remarks ?? '',
          }),
        );
      }
      if (this.userRows.length === 0) this.addUserRow();

      this.form.markAsPristine();
      await this.loadPermissionPreview(serviceGroupId);
    } catch {
      this.loadError.set('Unable to load Service Group details. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private async onServiceGroupChange(serviceGroupId: string): Promise<void> {
    this.permissionPreview.set(null);
    this.existingUserIds = new Set();
    if (!serviceGroupId) return;

    const group = this.store.getGroupByServiceGroupId(serviceGroupId);
    this.existingUserIds = new Set((group?.members ?? []).map((m) => m.userId));

    await this.loadPermissionPreview(serviceGroupId);
  }

  private async loadPermissionPreview(serviceGroupId: string): Promise<void> {
    this.loadingPreview.set(true);
    try {
      const preview = await this.store.getPermissionPreview(serviceGroupId);
      this.permissionPreview.set(preview);
    } catch {
      this.permissionPreview.set(null);
    } finally {
      this.loadingPreview.set(false);
    }
  }

  private buildUserRow(initial?: {
    userId: string; userSearch: string; isPrimary: boolean; assignmentType: AssignmentType;
    effectiveFrom: Date | null; effectiveTo: Date | null; remarks: string;
  }) {
    return this.fb.nonNullable.group(
      {
        userSearch: [initial?.userSearch ?? ''],
        userId: [initial?.userId ?? '', Validators.required],
        isPrimary: [initial?.isPrimary ?? false],
        assignmentType: [initial?.assignmentType ?? AssignmentType.MANUAL],
        effectiveFrom: this.fb.control<Date | null>(initial?.effectiveFrom ?? null),
        effectiveTo: this.fb.control<Date | null>(initial?.effectiveTo ?? null),
        remarks: [initial?.remarks ?? ''],
      },
      { validators: dateRangeValidator },
    );
  }

  addUserRow(): void {
    this.userRows.push(this.buildUserRow());
  }

  removeUserRow(index: number): void {
    if (this.userRows.length > 1) this.userRows.removeAt(index);
    else this.userRows.at(0)?.reset({ userSearch: '', userId: '', isPrimary: false, assignmentType: AssignmentType.MANUAL, effectiveFrom: null, effectiveTo: null, remarks: '' });
  }

  filteredUsersForRow(row: ReturnType<typeof this.buildUserRow>): AvailableUserOption[] {
    const term = (row.controls.userSearch.value || '').trim().toLowerCase();
    const currentId = row.controls.userId.value;
    return this.selectableUsers()
      .filter((u) => u.isActive)
      .filter((u) => !term || u.fullName.toLowerCase().split(/\s+/).some((part) => part.startsWith(term)) || u.fullName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
      .filter((u) => u.id === currentId || !this.isUserSelectedElsewhere(row, u.id))
      .slice(0, 50);
  }

  private isUserSelectedElsewhere(row: ReturnType<typeof this.buildUserRow>, userId: string): boolean {
    return this.userRows.controls.some((r) => r !== row && r.controls.userId.value === userId);
  }

  onUserSelected(row: ReturnType<typeof this.buildUserRow>, user: AvailableUserOption): void {
    if (this.isUserSelectedElsewhere(row, user.id)) {
      row.patchValue({ userId: '', userSearch: '' });
      this.snack.open(`${user.fullName} is already selected in another row.`, 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
      return;
    }
    row.patchValue({ userId: user.id, userSearch: user.fullName });
    this.showUserPreview(user.id);
  }

  onUserSearchFocus(row: ReturnType<typeof this.buildUserRow>): void {
    const userId = row.controls.userId.value;
    if (userId) this.showUserPreview(userId);
  }

  userDisplayFn = (value: AvailableUserOption | string): string =>
    typeof value === 'string' ? value : (value?.fullName ?? '');

  private async showUserPreview(userId: string): Promise<void> {
    const user = await this.store.getUserOption(userId);
    this.previewUser.set(user);
    this.previewUserGroups.set([]);
    if (!user) return;

    this.loadingPreviewUserGroups.set(true);
    try {
      const groups = await this.store.getServiceGroupsForUser(userId);
      this.previewUserGroups.set(groups);
    } catch {
      this.previewUserGroups.set([]);
    } finally {
      this.loadingPreviewUserGroups.set(false);
    }
  }

  isAlreadyMember(userId: string): boolean {
    return this.existingUserIds.has(userId);
  }

  async save(): Promise<void> {
    if (this.saving()) return;

    this.form.markAllAsTouched();
    this.userRows.controls.forEach((row) => row.markAllAsTouched());

    if (this.form.invalid || this.duplicateUserIds().size > 0) return;

    const v = this.form.getRawValue();
    const users = v.users.map((u) => ({
      userId: u.userId,
      isPrimary: u.isPrimary,
      assignmentType: u.assignmentType,
      effectiveFrom: u.effectiveFrom ? new Date(u.effectiveFrom).toISOString() : undefined,
      effectiveTo: u.effectiveTo ? new Date(u.effectiveTo).toISOString() : undefined,
      remarks: u.remarks.trim() || undefined,
    }));

    try {
      if (this.isEdit && this.currentGroup) {
        await this.store.syncAssignments(this.currentGroup.serviceGroupId, { users });
      } else {
        await this.store.createAssignment({ serviceGroupId: v.serviceGroupId, users });
      }
      this.dialogRef.close({ action: 'saved' });
    } catch {
      // Store already surfaced a snackbar; keep the dialog open so the user can correct and retry.
    }
  }

  cancel(): void {
    if (!this.form.dirty) {
      this.dialogRef.close(undefined);
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        data: {
          title: 'Discard Changes?',
          message: 'You have unsaved changes. Discard them and close?',
          confirmText: 'Discard',
          color: 'warn',
          icon: 'warning',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.dialogRef.close(undefined);
      });
  }

  openServiceGroupMaster(): void {
    window.open('/admin/service-groups', '_blank');
  }

  err(control: AbstractControl | null): string {
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['required']) return 'This field is required';
    if (control.errors['dateRange']) return 'Effective To must be on or after Effective From';
    return '';
  }
}
