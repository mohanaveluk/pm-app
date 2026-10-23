import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ProjectOption } from '../../../project/models/project.model';
import { UserProjectMappingStore } from '../../store/user-project-mapping.store';
import {
  EligibleUser, UserProjectMapping, UserProjectMappingDetail, initialsOf, matchesTerm,
} from '../../models/user-project-mapping.model';

export interface UserProjectMappingDrawerData {
  /** Edit this project's mapping; omitted to assign a new project. */
  mapping?: UserProjectMapping;
}

/** A user the drawer can show: an eligible user, or one already mapped whose account was since deactivated. */
interface UserChoice extends EligibleUser {
  /** Already mapped, but no longer an active internal user — can be kept or removed, not newly added. */
  inactiveAccount?: boolean;
}

/**
 * Assign a project to internal users, or change a project's users.
 * Opened as a right-hand drawer (full screen on phones) from the list page,
 * whose store it shares.
 *
 * The selection lives in a signal of user ids, independent of the search, so
 * searching never drops a selected user. Editing starts from the users already
 * mapped and only changes what the administrator changes.
 */
@Component({
  selector: 'app-user-project-mapping-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule,
    MatCheckboxModule, MatChipsModule, MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './user-project-mapping-drawer.component.html',
  styleUrl: './user-project-mapping-drawer.component.scss',
})
export class UserProjectMappingDrawerComponent {
  protected readonly store = inject(UserProjectMappingStore);
  private readonly dialogRef = inject(MatDialogRef<UserProjectMappingDrawerComponent, boolean>);
  private readonly dialog = inject(MatDialog);
  private readonly data = inject<UserProjectMappingDrawerData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  protected readonly initialsOf = initialsOf;

  /** Edit mode once a mapping is loaded (from the list, or found for the chosen project). */
  protected readonly editing = signal<UserProjectMapping | null>(this.data.mapping ?? null);
  protected readonly isEdit = computed(() => !!this.editing());

  protected readonly projectId = signal<string | null>(this.data.mapping?.projectId ?? null);
  protected readonly selected = signal<ReadonlySet<string>>(
    new Set(this.data.mapping?.users.map((u) => u.userId) ?? []),
  );
  /** The users mapped when the drawer opened, to tell whether anything changed. */
  private readonly initialSelection = signal<ReadonlySet<string>>(new Set(this.selected()));

  protected readonly projectSearch = signal('');
  protected readonly userSearch = signal('');
  protected readonly submitted = signal(false);
  protected readonly checkingProject = signal(false);
  /** A mapping that already exists for the project picked in create mode. */
  protected readonly existing = signal<UserProjectMappingDetail | null>(null);

  // ── Project ──────────────────────────────────────────────────────

  /** The edited project, or the open project chosen from the list. */
  protected readonly project = computed<ProjectOption | null>(() => {
    const id = this.projectId();
    if (!id) return null;
    const option = this.store.projects().find((p) => p.id === id);
    if (option) return option;
    const m = this.editing();
    return m && m.projectId === id
      ? {
          id: m.projectId, code: m.projectCode, projectName: m.projectName, clientId: m.clientId,
          clientCode: m.clientCode, clientName: m.clientName, status: m.projectStatus as ProjectOption['status'],
          currencyCode: null,
        }
      : null;
  });

  /** Search by code or name; the chosen project always stays in the list so its label never blanks. */
  protected readonly visibleProjects = computed(() => {
    const term = this.projectSearch();
    const chosen = this.projectId();
    return this.store.projects().filter((p) => p.id === chosen || matchesTerm(term, p.code, p.projectName));
  });

  // ── Users ────────────────────────────────────────────────────────

  /** Eligible users, plus mapped users whose accounts were deactivated since. */
  private readonly allUsers = computed<UserChoice[]>(() => {
    const eligible = this.store.users();
    const known = new Set(eligible.map((u) => u.id));
    const stale: UserChoice[] = (this.editing()?.users ?? [])
      .filter((u) => !known.has(u.userId))
      .map((u) => ({ id: u.userId, name: u.name, email: u.email, position: u.position, role: null, inactiveAccount: true }));
    return [...eligible, ...stale];
  });

  /** Search by name, email, position or role. */
  protected readonly visibleUsers = computed(() => {
    const term = this.userSearch();
    return this.allUsers().filter((u) => matchesTerm(term, u.name, u.email, u.position, u.role));
  });

  /** The selected users, in the order of the list, for the chips. */
  protected readonly selectedUsers = computed(() => {
    const ids = this.selected();
    return this.allUsers().filter((u) => ids.has(u.id));
  });

  protected readonly selectableVisible = computed(() => this.visibleUsers().filter((u) => !u.inactiveAccount));
  protected readonly allVisibleSelected = computed(() => {
    const ids = this.selected();
    const visible = this.selectableVisible();
    return visible.length > 0 && visible.every((u) => ids.has(u.id));
  });
  protected readonly someVisibleSelected = computed(() => {
    const ids = this.selected();
    return !this.allVisibleSelected() && this.selectableVisible().some((u) => ids.has(u.id));
  });

  // ── Validation ───────────────────────────────────────────────────

  protected readonly projectError = computed(() =>
    this.submitted() && !this.projectId() ? 'Select a project' : '');
  protected readonly usersError = computed(() =>
    this.submitted() && this.selected().size === 0 ? 'Select at least one user' : '');

  protected readonly dirty = computed(() => {
    const now = this.selected();
    const before = this.initialSelection();
    if (!this.isEdit() && this.projectId()) return true;
    return now.size !== before.size || [...now].some((id) => !before.has(id));
  });

  protected readonly title = computed(() => (this.isEdit() ? 'Edit Project Mapping' : 'Assign Project'));

  constructor() {
    // Opened with disableClose: the backdrop and Esc go through cancel(), which guards unsaved changes.
    this.dialogRef.backdropClick().pipe(takeUntilDestroyed()).subscribe(() => void this.cancel());
    this.dialogRef.keydownEvents().pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e.key === 'Escape') void this.cancel();
    });
  }

  // ── Actions ──────────────────────────────────────────────────────

  async onProjectChange(projectId: string | undefined): Promise<void> {
    const previous = this.projectId();
    // The search box is the first option; picking it is not a choice.
    if (!projectId || projectId === previous) return;

    // Moving to another project with users already picked: keep or clear, never silently.
    if (previous && this.selected().size) {
      const keep = await firstValueFrom(this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
        ConfirmDialogComponent, {
          width: '440px', maxWidth: '95vw',
          data: {
            title: 'Keep the selected users?',
            message: `${this.selected().size} user(s) are selected. Keep them for the new project, or clear the selection?`,
            confirmText: 'Keep users',
            cancelText: 'Clear selection',
            icon: 'group',
          },
        },
      ).afterClosed());
      if (keep === false) this.selected.set(new Set());
    }

    this.projectId.set(projectId);
    this.projectSearch.set('');
    this.existing.set(null);
    this.checkingProject.set(true);
    try {
      this.existing.set(await this.store.findExisting(projectId));
    } catch {
      /* already surfaced */
    } finally {
      this.checkingProject.set(false);
    }
  }

  /** Switches to editing the project's existing mapping, adding what was picked so far. */
  editExisting(): void {
    const mapping = this.existing();
    if (!mapping) return;
    const mapped = new Set(mapping.users.map((u) => u.userId));
    this.editing.set(mapping);
    this.initialSelection.set(mapped);
    this.selected.set(new Set([...mapped, ...this.selected()]));
    this.existing.set(null);
  }

  toggleUser(user: UserChoice): void {
    const next = new Set(this.selected());
    if (next.has(user.id)) next.delete(user.id);
    else if (!user.inactiveAccount) next.add(user.id);
    this.selected.set(next);
  }

  removeUser(userId: string): void {
    const next = new Set(this.selected());
    next.delete(userId);
    this.selected.set(next);
  }

  /** Selects (or clears) the users the current search shows; users outside the search keep their state. */
  toggleAllVisible(): void {
    const next = new Set(this.selected());
    const visible = this.selectableVisible();
    if (this.allVisibleSelected()) visible.forEach((u) => next.delete(u.id));
    else visible.forEach((u) => next.add(u.id));
    this.selected.set(next);
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  isSelected(userId: string): boolean {
    return this.selected().has(userId);
  }

  async save(): Promise<void> {
    this.submitted.set(true);
    const projectId = this.projectId();
    if (!projectId || this.selected().size === 0 || this.existing()) return;

    const userIds = [...this.selected()];
    try {
      if (this.isEdit()) await this.store.update(projectId, userIds);
      else await this.store.create(projectId, userIds);
      this.dialogRef.close(true);
    } catch {
      /* already surfaced by the store */
    }
  }

  async cancel(): Promise<void> {
    if (this.dirty() && !this.store.saving()) {
      const discard = await firstValueFrom(this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
        ConfirmDialogComponent, {
          width: '420px', maxWidth: '95vw',
          data: {
            title: 'Discard changes?',
            message: 'The project assignment has not been saved.',
            confirmText: 'Discard',
            cancelText: 'Keep editing',
            icon: 'warning',
            color: 'warn',
          },
        },
      ).afterClosed());
      if (!discard) return;
    }
    this.dialogRef.close(false);
  }
}
