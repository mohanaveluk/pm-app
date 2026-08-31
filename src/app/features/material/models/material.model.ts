// ── Enums (mirror pm-api/src/modules/material/enums/*) ────────────────────

export enum MaterialStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OBSOLETE = 'OBSOLETE',
}

export enum CriticalityLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum InspectionType {
  INCOMING = 'INCOMING',
  IN_PROCESS = 'IN_PROCESS',
  FINAL = 'FINAL',
  NONE = 'NONE',
}

export enum StockingStrategy {
  MAKE_TO_STOCK = 'MAKE_TO_STOCK',
  MAKE_TO_ORDER = 'MAKE_TO_ORDER',
  CONSIGNMENT = 'CONSIGNMENT',
  NO_STOCK = 'NO_STOCK',
}

export enum PackagingType {
  BOX = 'BOX', DRUM = 'DRUM', PALLET = 'PALLET', BAG = 'BAG', REEL = 'REEL',
  BUNDLE = 'BUNDLE', CYLINDER = 'CYLINDER', CRATE = 'CRATE', LOOSE = 'LOOSE', OTHER = 'OTHER',
}

export enum TransportationMode {
  AIR = 'AIR', SEA = 'SEA', ROAD = 'ROAD', RAIL = 'RAIL',
  MULTIMODAL = 'MULTIMODAL', COURIER = 'COURIER',
}

export enum HazardClassification {
  NON_HAZARDOUS = 'NON_HAZARDOUS', FLAMMABLE = 'FLAMMABLE', TOXIC = 'TOXIC',
  CORROSIVE = 'CORROSIVE', EXPLOSIVE = 'EXPLOSIVE', OXIDIZING = 'OXIDIZING',
  RADIOACTIVE = 'RADIOACTIVE', ENVIRONMENTAL = 'ENVIRONMENTAL',
}

/**
 * Mirrors pm-api's MaterialDocumentType. The first seven map 1:1 onto the
 * deprecated flat URL columns (datasheetUrl, …) that the Documents step used to
 * read and write directly; the register at `material_documents` is now the
 * source of truth for all of them, and those flat columns are only kept in
 * sync server-side for backward compatibility. PHOTO is handled separately —
 * `photos` stays a plain string array, unversioned, exactly as before.
 */
export enum MaterialDocumentType {
  DATASHEET = 'DATASHEET',
  DRAWING_SKETCH = 'DRAWING_SKETCH',
  TECHNICAL_SPEC_SHEET = 'TECHNICAL_SPEC_SHEET',
  QUALITY_CERTIFICATE = 'QUALITY_CERTIFICATE',
  COMPLIANCE_CERTIFICATE = 'COMPLIANCE_CERTIFICATE',
  VENDOR_QUOTATION = 'VENDOR_QUOTATION',
  INSPECTION_REPORT = 'INSPECTION_REPORT',
  PHOTO = 'PHOTO',
  MSDS = 'MSDS',
  MILL_CERTIFICATE = 'MILL_CERTIFICATE',
  TEST_REPORT = 'TEST_REPORT',
  INSTALLATION_MANUAL = 'INSTALLATION_MANUAL',
  WARRANTY = 'WARRANTY',
  OTHER = 'OTHER',
}

/**
 * Mirrors MaterialDocumentResponseDto. A revision is a new row — `version`
 * increments, `supersedesId` points at the row it replaced, and that row's
 * `isActive` flips to false but is retained. Types outside
 * SINGLETON_DOCUMENT_TYPES (DATASHEET, DRAWING_SKETCH, TECHNICAL_SPEC_SHEET,
 * VENDOR_QUOTATION, MSDS) hold several independent, concurrently-active chains
 * — e.g. three separate quality certificates, each with its own version history.
 */
export interface MaterialDocument {
  id: string;
  dguid: string;
  materialId: string;
  documentType: MaterialDocumentType;
  documentUrl: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  title?: string;
  version: number;
  /** The document row this version replaced, if any. */
  supersedesId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  expiryDate?: string;
  /** False once a newer version supersedes this row. */
  isActive: boolean;
  /** Derived server-side: expiryDate is in the past. */
  isExpired: boolean;
  daysToExpiry?: number;
  /** True when migrated from a legacy flat URL column rather than an upload. */
  isMigrated: boolean;
  remarks?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Presentation metadata ─────────────────────────────────────────────────

export interface EnumOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export const MATERIAL_STATUS_OPTIONS: readonly EnumOption<MaterialStatus>[] = [
  { value: MaterialStatus.ACTIVE,   label: 'Active',   hint: 'Selectable for new transactions' },
  { value: MaterialStatus.INACTIVE, label: 'Inactive', hint: 'Excluded from new transactions; history intact' },
  { value: MaterialStatus.OBSOLETE, label: 'Obsolete', hint: 'Permanently retired; cannot be re-activated' },
] as const;

export const CRITICALITY_OPTIONS: readonly EnumOption<CriticalityLevel>[] = [
  { value: CriticalityLevel.HIGH,   label: 'High',   hint: 'Shortage causes plant or project shutdown' },
  { value: CriticalityLevel.MEDIUM, label: 'Medium', hint: 'Important, but short-term workarounds exist' },
  { value: CriticalityLevel.LOW,    label: 'Low',    hint: 'Standard consumables and non-critical items' },
] as const;

export const INSPECTION_TYPE_OPTIONS: readonly EnumOption<InspectionType>[] = [
  { value: InspectionType.INCOMING,   label: 'Incoming',   hint: 'On goods receipt at the warehouse' },
  { value: InspectionType.IN_PROCESS, label: 'In-process', hint: 'During manufacturing or installation' },
  { value: InspectionType.FINAL,      label: 'Final',      hint: 'Final acceptance before delivery' },
  { value: InspectionType.NONE,       label: 'None',       hint: 'No inspection required' },
] as const;

export const STOCKING_STRATEGY_OPTIONS: readonly EnumOption<StockingStrategy>[] = [
  { value: StockingStrategy.MAKE_TO_STOCK, label: 'Make to Stock', hint: 'Maintain buffer stock; replenish on reorder point' },
  { value: StockingStrategy.MAKE_TO_ORDER, label: 'Make to Order', hint: 'Procure only when project/PR demand exists' },
  { value: StockingStrategy.CONSIGNMENT,   label: 'Consignment',   hint: 'Vendor-owned stock stored at site' },
  { value: StockingStrategy.NO_STOCK,      label: 'No Stock',      hint: 'Direct-charge items; never warehoused' },
] as const;

export const PACKAGING_TYPE_OPTIONS: readonly EnumOption<PackagingType>[] = [
  { value: PackagingType.BOX, label: 'Box' }, { value: PackagingType.DRUM, label: 'Drum' },
  { value: PackagingType.PALLET, label: 'Pallet' }, { value: PackagingType.BAG, label: 'Bag' },
  { value: PackagingType.REEL, label: 'Reel' }, { value: PackagingType.BUNDLE, label: 'Bundle' },
  { value: PackagingType.CYLINDER, label: 'Cylinder' }, { value: PackagingType.CRATE, label: 'Crate' },
  { value: PackagingType.LOOSE, label: 'Loose' }, { value: PackagingType.OTHER, label: 'Other' },
] as const;

export const TRANSPORT_MODE_OPTIONS: readonly EnumOption<TransportationMode>[] = [
  { value: TransportationMode.AIR, label: 'Air' }, { value: TransportationMode.SEA, label: 'Sea' },
  { value: TransportationMode.ROAD, label: 'Road' }, { value: TransportationMode.RAIL, label: 'Rail' },
  { value: TransportationMode.MULTIMODAL, label: 'Multimodal' }, { value: TransportationMode.COURIER, label: 'Courier' },
] as const;

export const HAZARD_OPTIONS: readonly EnumOption<HazardClassification>[] = [
  { value: HazardClassification.NON_HAZARDOUS, label: 'Non-hazardous' },
  { value: HazardClassification.FLAMMABLE,     label: 'Flammable' },
  { value: HazardClassification.TOXIC,         label: 'Toxic' },
  { value: HazardClassification.CORROSIVE,     label: 'Corrosive' },
  { value: HazardClassification.EXPLOSIVE,     label: 'Explosive' },
  { value: HazardClassification.OXIDIZING,     label: 'Oxidizing' },
  { value: HazardClassification.RADIOACTIVE,   label: 'Radioactive' },
  { value: HazardClassification.ENVIRONMENTAL, label: 'Environmentally harmful' },
] as const;

/** Hazard classes that warrant a visible caution treatment in the UI. */
export const HAZARDOUS_CLASSES: ReadonlySet<string> = new Set<string>([
  HazardClassification.FLAMMABLE, HazardClassification.TOXIC, HazardClassification.CORROSIVE,
  HazardClassification.EXPLOSIVE, HazardClassification.OXIDIZING, HazardClassification.RADIOACTIVE,
  HazardClassification.ENVIRONMENTAL,
]);

// ── Read model ────────────────────────────────────────────────────────────

/**
 * Mirrors MaterialResponseDto. Note this is **flat** — the backend spreads every
 * nested section onto the root of the response (material.service.ts `toResponse`),
 * while create/update expect those same fields **nested** under `technicalSpec`,
 * `procurement`, etc. `material.mapper.ts` is the single place that bridges the two.
 */
export interface Material {
  id: string;
  dguid: string;
  organizationId: string;
  code: string;
  shortDescription: string;
  longDescription?: string;
  specialInstruction?: string;
  status: MaterialStatus;
  criticalityLevel: CriticalityLevel;
  isSystem: boolean;
  isStockItem: boolean;
  isSerialized: boolean;
  isBatchManaged: boolean;
  remarks?: string;

  materialCategoryId: string;
  materialGroupId: string;
  unitOfMeasurementId: string;
  materialCategory?: { id: string; code?: string; name?: string };
  materialGroup?: { id: string; code?: string; name?: string };
  unitOfMeasurement?: { id: string; code?: string; name?: string; symbol?: string };

  // Technical
  technicalDescription?: string; modelPartNumber?: string; manufacturerName?: string;
  manufacturerPartNumber?: string; brand?: string; materialComposition?: string;
  dimensions?: string; weight?: string; colorFinish?: string;
  operatingTemperatureRange?: string; pressureRating?: string; voltageCurrentRating?: string;
  certifications?: string; datasheetReference?: string;

  // Procurement
  preferredVendorId?: string; vendorPartNumber?: string; leadTimeDays?: number;
  minimumOrderQuantity?: number; reorderLevel?: number; reorderQuantity?: number;
  purchaseUomId?: string; lastPurchasePrice?: number; currency?: string;
  contractReference?: string; hsCode?: string; countryOfOrigin?: string;

  // Inventory
  storageLocation?: string; warehouseBinRack?: string; storageConditions?: string;
  shelfLifeDays?: number; stockingStrategy?: StockingStrategy;
  safetyStock?: number; maximumStockLevel?: number;

  // Quality
  inspectionType?: InspectionType; qualitySpecDocumentNo?: string; inspectionLotSize?: number;
  samplingProcedure?: string; testParameters?: string; acceptanceCriteria?: string;
  calibrationRequired?: boolean; calibrationIntervalDays?: number;

  // Accounting
  valuationClass?: string; valuationType?: string; standardPrice?: number;
  movingAveragePrice?: number; costCenter?: string; glAccountMapping?: string; taxCode?: string;

  // Safety
  hazardClassification?: HazardClassification; msdsReferenceNo?: string; ppeRequirements?: string;
  handlingInstructions?: string; disposalInstructions?: string; regulatoryCompliance?: string;

  // Logistics
  packagingType?: PackagingType; packagingDimensions?: string; packagingWeight?: string;
  unitsPerPackage?: number; transportationMode?: TransportationMode;
  specialTransportRequirements?: string; barcodeQrCodeRequired?: boolean;

  // Documents
  // The flat URL fields below are DEPRECATED — the server still populates them
  // (kept in sync from `documents` for backward compatibility) but the
  // Documents step no longer reads or writes them: `documents` is the source of
  // truth for everything except `photos`, which stays a plain unversioned array.
  datasheetUrl?: string; drawingSketchUrl?: string; technicalSpecSheetUrl?: string;
  qualityCertificatesUrl?: string; complianceCertificatesUrl?: string;
  vendorQuotationUrl?: string; inspectionReportsUrl?: string; photos?: string[];
  /** Current active version of each document type. Full history (including
   *  superseded versions) comes from GET /materials/:id/documents. */
  documents?: MaterialDocument[];

  // ── Purchase-order lock ─────────────────────────────────────────────
  // Once an order is issued the specification freezes (update/delete are
  // refused server-side); documents remain the deliberate exception, but the
  // Documents step still protects paperwork that predates the lock — see
  // MaterialDocumentsStepComponent's doc comment.
  isPurchaseOrderIssued?: boolean;
  purchaseOrderIssuedAt?: string;
  purchaseOrderReference?: string;

  // Audit
  createdBy?: string; updatedBy?: string; createdAt: string; updatedAt?: string;
}

/** Mirrors MaterialListItemDto — the slimmer shape returned by the paginated list. */
export interface MaterialListItem {
  id: string;
  dguid: string;
  code: string;
  shortDescription: string;
  longDescription?: string;
  specialInstruction?: string;
  materialCategoryId: string;
  materialGroupId: string;
  unitOfMeasurementId: string;
  status: MaterialStatus;
  criticalityLevel: CriticalityLevel;
  isSystem: boolean;
  isStockItem: boolean;
  isSerialized: boolean;
  isBatchManaged: boolean;
  manufacturerName?: string;
  modelPartNumber?: string;
  createdAt: string;
  updatedAt?: string;
  materialCategoryName?: string;
  materialGroupName?: string;
  uomSymbol?: string;
}

/** Mirrors MaterialDropdownDto. */
export interface MaterialOption {
  id: string;
  dguid: string;
  code: string;
  shortDescription: string;
  unitOfMeasurementId: string;
  status: MaterialStatus;
  criticalityLevel: CriticalityLevel;
  isStockItem: boolean;
}

// ── List state ────────────────────────────────────────────────────────────

/** Backend accepts any string for sortBy; these are the ones the grid offers. */
export type MaterialSortField = 'code' | 'shortDescription' | 'status' | 'criticalityLevel' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface MaterialFilter {
  search: string;
  materialCategoryId: string | null;
  materialGroupId: string | null;
  unitOfMeasurementId: string | null;
  status: MaterialStatus | null;
  criticalityLevel: CriticalityLevel | null;
  manufacturerName: string;
  isStockItem: boolean | null;
}

export const DEFAULT_MATERIAL_FILTER: MaterialFilter = {
  search: '',
  materialCategoryId: null,
  materialGroupId: null,
  unitOfMeasurementId: null,
  status: null,
  criticalityLevel: null,
  manufacturerName: '',
  isStockItem: null,
};

/**
 * Audit-trail entry. The backend exposes no audit endpoint yet, so the view
 * screen renders a "not yet available" panel; this type is the extension point
 * a future `GET /materials/:id/audit` would populate.
 */
export interface MaterialAuditEntry {
  at: string;
  by: string;
  action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'DELETED';
  field?: string;
  oldValue?: string;
  newValue?: string;
}
