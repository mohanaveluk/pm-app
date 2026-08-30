import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Client-side mirrors of the constraints in pm-api's CreateVendorDto. Keeping
 * the same rules here means the user sees the problem inline instead of as a
 * 400 after submitting a nine-step form.
 */

/**
 * Matches the DTO's PHONE_REGEX exactly: optional leading '+', then 6–20
 * characters of digits, spaces, hyphens, parentheses or dots. Deliberately
 * permissive — an EPC vendor register spans dozens of dialling plans.
 */
export const PHONE_PATTERN = /^\+?[0-9\s\-().]{6,20}$/;

export function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').toString().trim();
  if (!value) return null;
  return PHONE_PATTERN.test(value) ? null : { phone: true };
}

/**
 * The API validates URLs with `require_protocol` and `require_tld`, so a bare
 * domain is rejected. Any public TLD passes — .com, .ae, .co.uk, .in.
 */
export function urlValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').toString().trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { url: true };
    // Requires a dotted host with a TLD of at least two characters.
    return /^[^\s.]+(\.[^\s.]+)+$/.test(url.hostname) ? null : { url: true };
  } catch {
    return { url: true };
  }
}

/**
 * Rejects blank members of a multi-select value.
 *
 * A `mat-select multiple` pushes `undefined` into its array when an option with
 * no `[value]` is clicked — which is what the inline search row is. That row is
 * now disabled, so this is the second line of defence: it keeps a malformed
 * array from ever reaching the API as `[null]` or `[undefined]`.
 */
export function nonBlankEntriesValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!Array.isArray(value)) return null;
  const hasBlank = value.some((entry) => entry === null || entry === undefined || `${entry}`.trim() === '');
  return hasBlank ? { blankEntry: true } : null;
}

/** Rejects negative numbers while leaving blank values to `required`. */
export function nonNegativeValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;
  return Number(value) < 0 ? { nonNegative: true } : null;
}

/** Caps decimal places, matching the DTO's `maxDecimalPlaces`. */
export function decimalPlacesValidator(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') return null;
    const decimals = String(value).split('.')[1];
    return decimals && decimals.length > max ? { decimalPlaces: { max } } : null;
  };
}

/** Financial year sanity — the DTO enforces 1900–2200. */
export function financialYearValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;
  const year = Number(value);
  if (!Number.isInteger(year)) return { financialYear: true };
  return year < 1900 || year > 2200 ? { financialYear: true } : null;
}

/**
 * Cross-field date ordering: `end` must not precede `start`. Applied to a group
 * so the message can sit under the field the user is most likely looking at.
 */
export function dateOrderValidator(startKey: string, endKey: string, errorKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(startKey)?.value;
    const end = group.get(endKey)?.value;
    if (!start || !end) return null;
    return new Date(end) < new Date(start) ? { [errorKey]: true } : null;
  };
}

/**
 * "Other" tax regimes must name themselves — the API stores the free-text value
 * in `taxDocumentNumber`, so leaving it blank loses the information entirely.
 */
export function otherTaxTypeValidator(group: AbstractControl): ValidationErrors | null {
  const type = group.get('taxDocumentType')?.value;
  const number = (group.get('taxDocumentNumber')?.value ?? '').toString().trim();
  if (type !== 'OTHER') return null;
  return number ? null : { taxTypeUnspecified: true };
}

/** Turns a control's errors into the single message shown beneath it. */
export function firstErrorMessage(control: AbstractControl | null, label = 'This field'): string {
  if (!control || !control.errors || (!control.touched && !control.dirty)) return '';
  const e = control.errors;
  if (e['required']) return `${label} is required`;
  if (e['minlength']) return `${label} must be at least ${e['minlength'].requiredLength} characters`;
  if (e['maxlength']) return `${label} must be ${e['maxlength'].requiredLength} characters or fewer`;
  if (e['email']) return 'Enter a valid email address';
  if (e['phone']) return 'Enter a valid phone number (digits, spaces, hyphens or brackets)';
  if (e['url']) return 'Enter a full URL including https://';
  if (e['nonNegative']) return `${label} cannot be negative`;
  if (e['min']) return `${label} must be at least ${e['min'].min}`;
  if (e['max']) return `${label} must be ${e['max'].max} or less`;
  if (e['decimalPlaces']) return `Use at most ${e['decimalPlaces'].max} decimal places`;
  if (e['financialYear']) return 'Enter a valid four-digit year';
  if (e['blankEntry']) return `${label} contains a blank entry — remove it and pick a value`;
  if (e['pattern']) return `${label} is not in the expected format`;
  return `${label} is invalid`;
}
