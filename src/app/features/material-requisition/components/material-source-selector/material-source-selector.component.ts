import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  REQUISITION_SOURCE_OPTIONS, RequisitionLineSource, SourceOption,
} from '../../models/material-requisition.model';

/**
 * Chooses where materials are picked from. Switching source changes only the
 * panel below — the lines already selected stay, because they live in the
 * shared requisition state, not in any one source.
 */
@Component({
  selector: 'app-material-source-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="source-grid" role="radiogroup" aria-label="Material source">
      @for (option of options; track option.value) {
        <button
          type="button"
          class="source-card"
          role="radio"
          [class.source-card--selected]="option.value === selected()"
          [class.source-card--disabled]="!option.available"
          [attr.aria-checked]="option.value === selected()"
          [attr.aria-disabled]="!option.available"
          [matTooltip]="option.available ? '' : (option.unavailableReason ?? '')"
          (click)="choose(option)"
        >
          <mat-icon>{{ option.icon }}</mat-icon>
          <span class="source-card__label">{{ option.label }}</span>
          <span class="source-card__hint">{{ option.description }}</span>
        </button>
      }
    </div>
  `,
  styles: [`
    .source-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
    }
    .source-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      background: var(--card);
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;

      mat-icon { color: var(--primary); }

      &:hover:not(.source-card--disabled) { border-color: var(--primary); }
      &:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

      &--selected {
        border-color: var(--primary);
        background: rgba(25, 118, 210, 0.06);
        box-shadow: 0 0 0 1px var(--primary);
      }

      &--disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      &__label { font-weight: 600; font-size: 0.92rem; }
      &__hint { font-size: 0.76rem; color: #6b7a99; }
    }
  `],
})
export class MaterialSourceSelectorComponent {
  readonly selected = input.required<RequisitionLineSource>();
  readonly selectedChange = output<RequisitionLineSource>();

  protected readonly options = REQUISITION_SOURCE_OPTIONS;

  protected choose(option: SourceOption): void {
    if (option.available) this.selectedChange.emit(option.value);
  }
}
