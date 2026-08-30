/**
 * ISO 3166-1 alpha-2 country reference with dialling codes.
 *
 * The Vendor API validates `countryOfRegistration` and address `country` with
 * `@IsISO31661Alpha2()`, so the alpha-2 `code` — not the display name — is what
 * gets persisted. `dialCode` and `flag` exist purely for the phone-number input:
 * the flag is never stored, and the dial code is concatenated into the phone
 * string only when the user has supplied a number.
 */
export interface Country {
  /** ISO 3166-1 alpha-2 — the value sent to the API. */
  code: string;
  name: string;
  /** E.164 dialling prefix, including the leading '+'. */
  dialCode: string;
  /** Emoji flag, for display only. */
  flag: string;
}

export const COUNTRIES: readonly Country[] = [
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { code: 'AR', name: 'Argentina',            dialCode: '+54',  flag: '🇦🇷' },
  { code: 'AT', name: 'Austria',              dialCode: '+43',  flag: '🇦🇹' },
  { code: 'AU', name: 'Australia',            dialCode: '+61',  flag: '🇦🇺' },
  { code: 'BD', name: 'Bangladesh',           dialCode: '+880', flag: '🇧🇩' },
  { code: 'BE', name: 'Belgium',              dialCode: '+32',  flag: '🇧🇪' },
  { code: 'BH', name: 'Bahrain',              dialCode: '+973', flag: '🇧🇭' },
  { code: 'BR', name: 'Brazil',               dialCode: '+55',  flag: '🇧🇷' },
  { code: 'CA', name: 'Canada',               dialCode: '+1',   flag: '🇨🇦' },
  { code: 'CH', name: 'Switzerland',          dialCode: '+41',  flag: '🇨🇭' },
  { code: 'CL', name: 'Chile',                dialCode: '+56',  flag: '🇨🇱' },
  { code: 'CN', name: 'China',                dialCode: '+86',  flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia',             dialCode: '+57',  flag: '🇨🇴' },
  { code: 'CZ', name: 'Czechia',              dialCode: '+420', flag: '🇨🇿' },
  { code: 'DE', name: 'Germany',              dialCode: '+49',  flag: '🇩🇪' },
  { code: 'DK', name: 'Denmark',              dialCode: '+45',  flag: '🇩🇰' },
  { code: 'DZ', name: 'Algeria',              dialCode: '+213', flag: '🇩🇿' },
  { code: 'EG', name: 'Egypt',                dialCode: '+20',  flag: '🇪🇬' },
  { code: 'ES', name: 'Spain',                dialCode: '+34',  flag: '🇪🇸' },
  { code: 'ET', name: 'Ethiopia',             dialCode: '+251', flag: '🇪🇹' },
  { code: 'FI', name: 'Finland',              dialCode: '+358', flag: '🇫🇮' },
  { code: 'FR', name: 'France',               dialCode: '+33',  flag: '🇫🇷' },
  { code: 'GB', name: 'United Kingdom',       dialCode: '+44',  flag: '🇬🇧' },
  { code: 'GH', name: 'Ghana',                dialCode: '+233', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece',               dialCode: '+30',  flag: '🇬🇷' },
  { code: 'HK', name: 'Hong Kong',            dialCode: '+852', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary',              dialCode: '+36',  flag: '🇭🇺' },
  { code: 'ID', name: 'Indonesia',            dialCode: '+62',  flag: '🇮🇩' },
  { code: 'IE', name: 'Ireland',              dialCode: '+353', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel',               dialCode: '+972', flag: '🇮🇱' },
  { code: 'IN', name: 'India',                dialCode: '+91',  flag: '🇮🇳' },
  { code: 'IQ', name: 'Iraq',                 dialCode: '+964', flag: '🇮🇶' },
  { code: 'IR', name: 'Iran',                 dialCode: '+98',  flag: '🇮🇷' },
  { code: 'IT', name: 'Italy',                dialCode: '+39',  flag: '🇮🇹' },
  { code: 'JO', name: 'Jordan',               dialCode: '+962', flag: '🇯🇴' },
  { code: 'JP', name: 'Japan',                dialCode: '+81',  flag: '🇯🇵' },
  { code: 'KE', name: 'Kenya',                dialCode: '+254', flag: '🇰🇪' },
  { code: 'KR', name: 'South Korea',          dialCode: '+82',  flag: '🇰🇷' },
  { code: 'KW', name: 'Kuwait',               dialCode: '+965', flag: '🇰🇼' },
  { code: 'LK', name: 'Sri Lanka',            dialCode: '+94',  flag: '🇱🇰' },
  { code: 'MA', name: 'Morocco',              dialCode: '+212', flag: '🇲🇦' },
  { code: 'MX', name: 'Mexico',               dialCode: '+52',  flag: '🇲🇽' },
  { code: 'MY', name: 'Malaysia',             dialCode: '+60',  flag: '🇲🇾' },
  { code: 'NG', name: 'Nigeria',              dialCode: '+234', flag: '🇳🇬' },
  { code: 'NL', name: 'Netherlands',          dialCode: '+31',  flag: '🇳🇱' },
  { code: 'NO', name: 'Norway',               dialCode: '+47',  flag: '🇳🇴' },
  { code: 'NZ', name: 'New Zealand',          dialCode: '+64',  flag: '🇳🇿' },
  { code: 'OM', name: 'Oman',                 dialCode: '+968', flag: '🇴🇲' },
  { code: 'PE', name: 'Peru',                 dialCode: '+51',  flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines',          dialCode: '+63',  flag: '🇵🇭' },
  { code: 'PK', name: 'Pakistan',             dialCode: '+92',  flag: '🇵🇰' },
  { code: 'PL', name: 'Poland',               dialCode: '+48',  flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal',             dialCode: '+351', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar',                dialCode: '+974', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania',              dialCode: '+40',  flag: '🇷🇴' },
  { code: 'RU', name: 'Russia',               dialCode: '+7',   flag: '🇷🇺' },
  { code: 'SA', name: 'Saudi Arabia',         dialCode: '+966', flag: '🇸🇦' },
  { code: 'SE', name: 'Sweden',               dialCode: '+46',  flag: '🇸🇪' },
  { code: 'SG', name: 'Singapore',            dialCode: '+65',  flag: '🇸🇬' },
  { code: 'TH', name: 'Thailand',             dialCode: '+66',  flag: '🇹🇭' },
  { code: 'TR', name: 'Türkiye',              dialCode: '+90',  flag: '🇹🇷' },
  { code: 'TW', name: 'Taiwan',               dialCode: '+886', flag: '🇹🇼' },
  { code: 'UA', name: 'Ukraine',              dialCode: '+380', flag: '🇺🇦' },
  { code: 'US', name: 'United States',        dialCode: '+1',   flag: '🇺🇸' },
  { code: 'VN', name: 'Vietnam',              dialCode: '+84',  flag: '🇻🇳' },
  { code: 'ZA', name: 'South Africa',         dialCode: '+27',  flag: '🇿🇦' },
] as const;

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function countryByCode(code: string | null | undefined): Country | undefined {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined;
}

export function countryName(code: string | null | undefined): string {
  return countryByCode(code)?.name ?? code ?? '—';
}

/**
 * Splits a stored phone string into its dial code and the local number, so an
 * existing record round-trips back into the country selector + number input.
 * Falls back to an empty dial code when nothing matches — the number is never
 * silently altered.
 */
export function splitPhone(value: string | null | undefined): { dialCode: string; number: string } {
  const raw = (value ?? '').trim();
  if (!raw.startsWith('+')) return { dialCode: '', number: raw };

  // Longest prefix wins: '+1' must not shadow '+971'.
  const match = [...COUNTRIES]
    .map((c) => c.dialCode)
    .sort((a, b) => b.length - a.length)
    .find((dial) => raw.startsWith(dial));

  return match
    ? { dialCode: match, number: raw.slice(match.length).trim() }
    : { dialCode: '', number: raw };
}

/** Joins a dial code and local number back into the stored representation. */
export function joinPhone(dialCode: string, phoneNumber: string): string {
  const number = (phoneNumber ?? '').trim();
  if (!number) return '';
  const dial = (dialCode ?? '').trim();
  return dial ? `${dial} ${number}` : number;
}
