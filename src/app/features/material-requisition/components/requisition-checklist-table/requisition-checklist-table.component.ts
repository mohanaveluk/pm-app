import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CHECKLIST_CONFIGS, ChecklistKind } from '../../models/requisition-checklist.model';

/**
 * Read-only Compliance or Deviation table — on Review & Submit and on the
 * requisition's view page.
 */
@Component({
  selector: 'app-requisition-checklist-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  styleUrl: '../requisition-step.shared.scss',
  styles: [`
    .chk-ro { overflow-x: auto; }
    .chk-ro table { width: 100%; min-width: 620px; border-collapse: collapse; font-size: 0.86rem; }
    .chk-ro th { text-align: left; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: #8098b8; padding: 6px 8px; border-bottom: 1px solid var(--border); }
    .chk-ro td { padding: 8px; border-bottom: 1px solid var(--border); vertical-align: top; white-space: pre-line; }
    .chk-ro tr:last-child td { border-bottom: 0; }
    .chk-ro .sr { width: 40px; color: #7d93ad; }
    .chk-ro .yn { width: 110px; }
    .yes, .no { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; font-size: 0.8rem; }
    .yes { color: var(--success); } .no { color: #b26a00; }
    .yes mat-icon, .no mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .muted { color: #8a9bb0; font-style: italic; margin: 0; }
  `],
  template: `
    @let cfg = config();
    <section class="step-section">
      <h3 class="step-section__title"><mat-icon>{{ cfg.icon }}</mat-icon> {{ cfg.title }} ({{ rows().length }})</h3>
      @if (rows().length) {
        <div class="chk-ro">
          <table [attr.aria-label]="cfg.title + ' items'">
            <thead>
              <tr>
                <th class="sr">Sr#</th>
                @for (col of cfg.columns; track col.key) {
                  <th [class.yn]="col.type === 'check'">{{ col.label }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track $index; let i = $index) {
                <tr>
                  <td class="sr">{{ i + 1 }}</td>
                  @for (col of cfg.columns; track col.key) {
                    @if (col.type === 'check') {
                      <td class="yn">
                        @if (row[col.key]) { <span class="yes"><mat-icon>check_circle</mat-icon> Yes</span> }
                        @else { <span class="no"><mat-icon>cancel</mat-icon> No</span> }
                      </td>
                    } @else {
                      <td>{{ row[col.key] || '—' }}</td>
                    }
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="muted">No {{ cfg.title.toLowerCase() }} items.</p>
      }
    </section>
  `,
})
export class RequisitionChecklistTableComponent {
  readonly kind = input.required<ChecklistKind>();
  /** Saved items, or the wizard's rows as plain values. */
  // An older API response may not carry the list at all.
  readonly items = input<ReadonlyArray<object> | null | undefined>([]);

  protected readonly config = computed(() => CHECKLIST_CONFIGS[this.kind()]);
  protected readonly rows = computed(() => (this.items() ?? []) as ReadonlyArray<Record<string, unknown>>);
}
