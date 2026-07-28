import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ServiceGroupStore } from '../../store/service-group.store';
import { ServiceGroupListItem } from '../../models/service-group.model';

export interface ServiceGroupCopyDialogData {
  /** The target group whose activities/permissions will be replaced. */
  group: ServiceGroupListItem;
}

export type ServiceGroupCopyDialogResult = { action: 'copied' } | undefined;

@Component({
  selector: 'app-service-group-copy-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatAutocompleteModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './service-group-copy-dialog.component.html',
  styleUrl: './service-group-copy-dialog.component.scss',
})
export class ServiceGroupCopyDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ServiceGroupCopyDialogComponent, ServiceGroupCopyDialogResult>);
  protected readonly store = inject(ServiceGroupStore);
  protected readonly data = inject<ServiceGroupCopyDialogData>(MAT_DIALOG_DATA);

  protected readonly saving = this.store.saving;
  protected readonly searching = signal(false);
  protected readonly selectedSource = signal<ServiceGroupListItem | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    sourceSearch: ['', Validators.required],
  });

  protected readonly sourceOptions = toSignal(
    this.form.controls.sourceSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => {
        const current = this.selectedSource();
        if (current && term === current.name) return of([current]);
        this.selectedSource.set(null);
        if (!term || term.trim().length < 1) return of([]);
        this.searching.set(true);
        return this.store.searchGroupOptions(term).pipe(
          map((results) => results.filter((g) => g.id !== this.data.group.id)),
          tap(() => this.searching.set(false)),
        );
      }),
    ),
    { initialValue: [] as ServiceGroupListItem[] },
  );

  displaySource = (group: ServiceGroupListItem | string): string =>
    typeof group === 'string' ? group : (group?.name ?? '');

  onSourceSelected(group: ServiceGroupListItem): void {
    this.selectedSource.set(group);
    this.form.controls.sourceSearch.setValue(group.name, { emitEvent: false });
  }

  async copy(): Promise<void> {
    const source = this.selectedSource();
    if (this.saving() || !source) return;
    try {
      await this.store.copyPermissions(this.data.group.id, { sourceServiceGroupId: source.id });
      this.dialogRef.close({ action: 'copied' });
    } catch {
      // Store already surfaced a snackbar; keep the dialog open so the user can correct and retry.
    }
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
