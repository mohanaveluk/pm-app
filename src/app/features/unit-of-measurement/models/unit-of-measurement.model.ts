/** Mirrors the backend UomType enum (unit-of-measurement/enums/uom-type.enum.ts). */
export enum UomType {
  WEIGHT = 'WEIGHT',
  VOLUME = 'VOLUME',
  LENGTH = 'LENGTH',
  AREA = 'AREA',
  EACH = 'EACH',
  TIME = 'TIME',
  TEMPERATURE = 'TEMPERATURE',
  PRESSURE = 'PRESSURE',
  POWER = 'POWER',
  ENERGY = 'ENERGY',
  OTHER = 'OTHER',
}

/** Presentation metadata for each measurement family — label, icon and chip tone. */
export interface UomTypeMeta {
  value: UomType;
  label: string;
  icon: string;
  /** Maps to a `.uom-type-chip--<tone>` modifier in the stylesheet. */
  tone: string;
  /** Shown as a tooltip / hint so users pick the right family. */
  examples: string;
}

export const UOM_TYPE_META: readonly UomTypeMeta[] = [
  { value: UomType.WEIGHT,      label: 'Weight',      icon: 'scale',            tone: 'weight',   examples: 'KG, G, TON, LB, OZ' },
  { value: UomType.VOLUME,      label: 'Volume',      icon: 'water_drop',       tone: 'volume',   examples: 'LTR, ML, M3, GAL, BBL' },
  { value: UomType.LENGTH,      label: 'Length',      icon: 'straighten',       tone: 'length',   examples: 'METER, CM, MM, KM, INCH, FOOT, YARD' },
  { value: UomType.AREA,        label: 'Area',        icon: 'crop_square',      tone: 'area',     examples: 'M2, CM2, SQFT, SQIN, ACRE' },
  { value: UomType.EACH,        label: 'Each',        icon: 'inventory_2',      tone: 'each',     examples: 'EA, PC, SET, PAIR, DOZEN, GROSS' },
  { value: UomType.TIME,        label: 'Time',        icon: 'schedule',         tone: 'time',     examples: 'HR, MIN, SEC, DAY, WEEK, MONTH, YEAR' },
  { value: UomType.TEMPERATURE, label: 'Temperature', icon: 'thermostat',       tone: 'temp',     examples: 'DEG_C, DEG_F, KELVIN' },
  { value: UomType.PRESSURE,    label: 'Pressure',    icon: 'compress',         tone: 'pressure', examples: 'BAR, PSI, KPA, MPA' },
  { value: UomType.POWER,       label: 'Power',       icon: 'bolt',             tone: 'power',    examples: 'KW, MW, HP' },
  { value: UomType.ENERGY,      label: 'Energy',      icon: 'local_fire_department', tone: 'energy', examples: 'KWH, KCAL, BTU' },
  { value: UomType.OTHER,       label: 'Other',       icon: 'more_horiz',       tone: 'other',    examples: 'Non-standard units' },
] as const;

const UOM_TYPE_META_BY_VALUE = new Map<string, UomTypeMeta>(
  UOM_TYPE_META.map((m) => [m.value, m]),
);

/** Safe lookup — falls back to OTHER if the API ever returns an unknown family. */
export function uomTypeMeta(type: UomType | string | undefined | null): UomTypeMeta {
  return UOM_TYPE_META_BY_VALUE.get(String(type)) ?? UOM_TYPE_META[UOM_TYPE_META.length - 1];
}

/** Lightweight organization reference embedded in a UOM record. */
export interface UnitOfMeasurementOrganization {
  id: string;
  name?: string;
  code?: string;
}

/**
 * Mirrors UnitOfMeasurementResponseDto exactly
 * (pm-api/src/modules/unit-of-measurement/dto/unit-of-measurement-response.dto.ts).
 */
export interface UnitOfMeasurement {
  id: string;
  dguid: string;
  organizationId: string;
  organizationName?: string;
  organization?: UnitOfMeasurementOrganization;
  /** Stable machine-readable key (KG, LTR, MTR). Immutable after creation. */
  code: string;
  name: string;
  /** Human-readable notation (kg, L, m, °C, m²) — may contain special characters. */
  symbol?: string;
  shortName?: string;
  description?: string;
  uomType: UomType;
  displayOrder: number;
  isActive: boolean;
  remarks?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Slim shape returned by GET /unit-of-measurements/active — for dropdowns. */
export interface UnitOfMeasurementOption {
  id: string;
  code: string;
  name: string;
  symbol?: string;
  shortName?: string;
  uomType: UomType;
  displayOrder: number;
}

/**
 * The five fields the backend's UnitOfMeasurementQueryDto.sortBy accepts.
 * Note uomType IS server-sortable here (unlike the parent category in Material Group);
 * symbol / status / updatedAt are not, so those columns render without a sort header.
 */
export type UnitOfMeasurementSortField = 'code' | 'name' | 'uomType' | 'displayOrder' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface UnitOfMeasurementFilter {
  search: string;
  /** null = all measurement families. */
  uomType: UomType | null;
  status: 'all' | 'active' | 'inactive';
}

export const DEFAULT_UOM_FILTER: UnitOfMeasurementFilter = {
  search: '',
  uomType: null,
  status: 'all',
};

/**
 * Backend code rule, kept in sync with CreateUnitOfMeasurementDto's @Matches:
 * letters, digits and underscore only. The `symbol` field deliberately has no
 * such restriction — it must accept °C, m², ft³ and similar notation.
 */
export const UOM_CODE_PATTERN = /^[A-Za-z0-9_]+$/;

/**
 * Downstream usage counts (Material Master, PRs, POs, Inventory). The API exposes
 * no usage endpoint yet, so the view dialog renders a "not yet available" state
 * rather than fabricating numbers.
 */
export interface UnitOfMeasurementUsage {
  materialMaster: number;
  purchaseRequisitions: number;
  purchaseOrders: number;
  inventoryItems: number;
}
