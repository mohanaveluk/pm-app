/**
 * Derives a backend-compliant master-data code from a human-entered name.
 *
 * Both CreateMaterialCategoryDto and CreateMaterialGroupDto enforce
 * `@Matches(/^[A-Za-z0-9_]+$/)` with `@Length(1, 30)` and auto-uppercase the
 * value server-side, so the derived code must contain letters, digits and
 * underscores only.
 *
 *   'Raw Material'   -> 'RAW_MATERIAL'
 *   'Pipe Fittings'  -> 'PIPE_FITTINGS'
 *   'Valves & Seals' -> 'VALVES_SEALS'
 *   'A/C Units'      -> 'A_C_UNITS'
 *
 * Returns '' when the name has no usable characters, which the callers treat as
 * "ask the user for a better name" rather than posting an invalid code.
 */
export function deriveMasterCode(name: string, maxLength = 30): string {
  const cleaned = (name ?? '')
    .trim()
    .toUpperCase()
    // Anything that is not a letter or digit becomes a separator.
    .replace(/[^A-Z0-9]+/g, '_')
    // Collapse runs and trim leading/trailing separators.
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!cleaned) return '';

  if (cleaned.length <= maxLength) return cleaned;

  // Truncate without leaving a dangling separator.
  return cleaned.slice(0, maxLength).replace(/_+$/, '');
}
