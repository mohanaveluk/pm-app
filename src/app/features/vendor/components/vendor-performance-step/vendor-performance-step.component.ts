import {
  ChangeDetectionStrategy, Component, ElementRef, QueryList, ViewChildren, inject, input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { VendorFormService } from '../../services/vendor-form.service';
import { COUNTRIES, countryName } from '../../../../shared/reference/countries';
import { VendorPerformance } from '../../models/vendor.model';
import { firstErrorMessage } from '../../validators/vendor.validators';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

/**
 * Step 8 — Performance History.
 *
 * Two independent things live on this step:
 *  - Declared clients/geography (chip lists, unchanged) and the vendor's own
 *    project experience — now a repeatable `projectExperiences` FormArray
 *    (up to 10 rows) instead of the old single free-text blob, so a vendor
 *    with several EPC/O&G references can list each one as its own record.
 *  - Scored performance: a separate, append-only child collection written by
 *    project and procurement workflows. This screen shows it read-only when
 *    the vendor already exists — it is never part of this form.
 */
@Component({
  selector: 'app-vendor-performance-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatButtonModule, MatChipsModule, MatTooltipModule, MatExpansionModule,
  ],
  templateUrl: './vendor-performance-step.component.html',
  styleUrl: '../vendor-step.shared.scss',
})
export class VendorPerformanceStepComponent {
  protected readonly formService = inject(VendorFormService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly readonly = input(false);
  /** Scored evaluations recorded against this vendor, when it already exists. */
  readonly performanceHistory = input<VendorPerformance[]>([]);

  protected readonly countries = COUNTRIES;
  protected readonly maxProjectExperiences = this.formService.maxProjectExperiences;

  /** One `.pe-card` per row, in FormArray order — used to scroll a new row into view. */
  @ViewChildren('projectCard', { read: ElementRef })
  private projectCards!: QueryList<ElementRef<HTMLElement>>;

  /** Collapsed-by-default is the exception, not the rule — see toggleExpanded(). */
  private readonly collapsed = new Set<number>();

  protected get group(): FormGroup {
    return this.formService.group('performance');
  }

  protected get projectExperiences(): FormArray {
    return this.formService.projectExperiences;
  }

  protected experienceGroup(index: number): FormGroup {
    return this.projectExperiences.at(index) as FormGroup;
  }

  // ── Derived display state ────────────────────────────────────────────
  // Plain getters rather than computed(): a FormArray's length is not itself
  // a signal, and this component's (click) handlers already run through
  // Angular's normal change detection, so a getter re-evaluated on every
  // check is the same information without a redundant, hand-synced signal —
  // certifications/turnovers elsewhere in this workspace read `.length` the
  // same way.

  protected get projectExperienceCount(): number {
    return this.projectExperiences.length;
  }

  protected get hasProjectExperiences(): boolean {
    return this.projectExperienceCount > 0;
  }

  protected get canAddProjectExperience(): boolean {
    return this.projectExperienceCount < this.maxProjectExperiences;
  }

  protected get maxProjectExperiencesReached(): boolean {
    return !this.canAddProjectExperience;
  }

  // ── Add / remove ──────────────────────────────────────────────────────

  protected async addProjectExperience(): Promise<void> {
    if (this.readonly()) return;
    const added = this.formService.addProjectExperience();
    if (!added) {
      // The button is already disabled at this point — this only fires if
      // something else tries to call the method, but the limit still holds.
      this.snack.open(`Maximum of ${this.maxProjectExperiences} project experiences reached`, 'Close', { duration: 4000 });
      return;
    }
    // Newly added rows start expanded and scrolled into view. setTimeout(0)
    // rather than a microtask: the new row has to actually be in the DOM
    // (i.e. Angular's next change-detection pass has run) before it can be
    // scrolled to.
    this.collapsed.delete(this.projectExperiences.length - 1);
    setTimeout(() => this.scrollToLast());
  }

  private scrollToLast(): void {
    const last = this.projectCards?.last;
    last?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * A row carrying an `id` came back from the API — removing it discards a
   * saved record, so it is confirmed first. A row added in this session has
   * no `id` yet and nothing to lose, so it is removed immediately.
   */
  protected async removeProjectExperience(index: number): Promise<void> {
    if (this.readonly()) return;
    const row = this.experienceGroup(index);
    const isExisting = !!row.get('id')?.value;

    if (isExisting) {
      const clientName = (row.get('clientName')?.value as string)?.trim();
      const projectName = (row.get('projectName')?.value as string)?.trim() || `Project Experience #${index + 1}`;
      const ref = this.dialog.open(ConfirmDialogComponent, {
        width: '460px',
        maxWidth: '95vw',
        data: {
          title: 'Remove Project Experience?',
          message: clientName
            ? `"${projectName}" for ${clientName} will be removed when you save changes.`
            : `"${projectName}" will be removed when you save changes.`,
          confirmText: 'Remove',
          color: 'warn',
          icon: 'warning',
        },
      });
      if (!(await firstValueFrom(ref.afterClosed()))) return;
    }

    this.formService.removeProjectExperience(index);
    this.collapsed.delete(index);
  }

  // ── Collapse / expand ─────────────────────────────────────────────────
  // Every card starts expanded; collapsing is purely a display convenience
  // to keep a full list of 10 from turning the step into one long scroll.

  protected isExpanded(index: number): boolean {
    return !this.collapsed.has(index);
  }

  protected setExpanded(index: number, expanded: boolean): void {
    if (expanded) this.collapsed.delete(index);
    else this.collapsed.add(index);
  }

  // ── Duplicate warning ─────────────────────────────────────────────────
  // A warning, never a block: the API has no uniqueness rule on this pair, so
  // silently refusing a legitimate repeat (a vendor really can run two
  // packages for the same client under the same project name) would be wrong.

  protected isDuplicate(index: number): boolean {
    const current = this.experienceGroup(index).getRawValue();
    const key = (v: { clientName?: string; projectName?: string }) =>
      `${(v.clientName ?? '').trim().toLowerCase()}::${(v.projectName ?? '').trim().toLowerCase()}`;
    const currentKey = key(current);
    if (!current.projectName?.trim()) return false;

    return this.projectExperiences.controls.some((control, i) => {
      if (i === index) return false;
      return key(control.getRawValue()) === currentKey;
    });
  }

  // ── Validation / misc ─────────────────────────────────────────────────

  protected rowErr(index: number, control: string, label: string): string {
    return firstErrorMessage(this.experienceGroup(index).get(control), label);
  }

  protected values(control: string): string[] {
    return (this.group.get(control)?.value as string[]) ?? [];
  }

  protected addValue(control: string, raw: string): void {
    const value = raw.trim();
    if (!value || this.values(control).includes(value)) return;
    this.group.get(control)?.setValue([...this.values(control), value]);
    this.group.markAsDirty();
  }

  protected addFromChipInput(control: string, event: MatChipInputEvent): void {
    this.addValue(control, event.value ?? '');
    event.chipInput?.clear();
  }

  protected removeValue(control: string, value: string): void {
    this.group.get(control)?.setValue(this.values(control).filter((v) => v !== value));
    this.group.markAsDirty();
  }

  protected country(code: string): string {
    return countryName(code);
  }

  protected get unusedCountries(): { code: string; name: string; flag: string }[] {
    const chosen = this.values('geographicalExperience');
    return this.countries.filter((c) => !chosen.includes(c.code));
  }
}
