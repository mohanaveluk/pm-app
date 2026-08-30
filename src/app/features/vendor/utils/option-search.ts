import { signal } from '@angular/core';
import { Country } from '../../../shared/reference/countries';
import { EnumOption } from '../models/vendor.model';

/**
 * Per-dropdown search state for the inline `select-search` pattern the app uses
 * in its long `mat-select` lists (see MaterialGeneralStepComponent).
 *
 * One instance per component holds every dropdown's term, keyed by name, so a
 * step with six selects does not need six signals and six computeds. The filter
 * methods read the signal, so calling them from a template keeps OnPush change
 * detection correct.
 */
export class OptionSearch {
  private readonly terms = signal<Record<string, string>>({});

  term(key: string): string {
    return this.terms()[key] ?? '';
  }

  set(key: string, value: string): void {
    this.terms.update((current) => ({ ...current, [key]: value }));
  }

  clear(key: string): void {
    this.set(key, '');
  }

  /** Filters enum options by their human label. */
  options<T extends string>(key: string, options: readonly EnumOption<T>[]): readonly EnumOption<T>[] {
    const term = this.term(key).trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }

  /** Filters countries by name or ISO code. */
  countries(key: string, countries: readonly Country[]): readonly Country[] {
    const term = this.term(key).trim().toLowerCase();
    if (!term) return countries;
    return countries.filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(term));
  }

  /** Filters countries by name, ISO code or dialling prefix. */
  dialCodes(key: string, countries: readonly Country[]): readonly Country[] {
    const term = this.term(key).trim().toLowerCase();
    if (!term) return countries;
    return countries.filter((c) => `${c.code} ${c.name} ${c.dialCode}`.toLowerCase().includes(term));
  }
}
