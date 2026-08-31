import {
  CriticalityLevel, HazardClassification, InspectionType, MaterialDocumentType,
  MaterialSortField, MaterialStatus, PackagingType, StockingStrategy, TransportationMode,
} from './material.model';

// ── Nested section payloads (mirror the nested DTOs in create-material.dto.ts) ──

export interface MaterialTechnicalSpecRequest {
  technicalDescription?: string;
  modelPartNumber?: string;
  manufacturerName?: string;
  manufacturerPartNumber?: string;
  brand?: string;
  materialComposition?: string;
  dimensions?: string;
  weight?: string;
  colorFinish?: string;
  operatingTemperatureRange?: string;
  pressureRating?: string;
  voltageCurrentRating?: string;
  certifications?: string;
  datasheetReference?: string;
}

export interface MaterialProcurementRequest {
  preferredVendorId?: string;
  vendorPartNumber?: string;
  leadTimeDays?: number;
  minimumOrderQuantity?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  purchaseUomId?: string;
  lastPurchasePrice?: number;
  currency?: string;
  contractReference?: string;
  hsCode?: string;
  countryOfOrigin?: string;
}

export interface MaterialInventoryRequest {
  storageLocation?: string;
  warehouseBinRack?: string;
  storageConditions?: string;
  shelfLifeDays?: number;
  stockingStrategy?: StockingStrategy;
  safetyStock?: number;
  maximumStockLevel?: number;
}

export interface MaterialQualityRequest {
  inspectionType?: InspectionType;
  qualitySpecDocumentNo?: string;
  inspectionLotSize?: number;
  samplingProcedure?: string;
  testParameters?: string;
  acceptanceCriteria?: string;
  calibrationRequired?: boolean;
  calibrationIntervalDays?: number;
}

export interface MaterialAccountingRequest {
  valuationClass?: string;
  valuationType?: string;
  standardPrice?: number;
  movingAveragePrice?: number;
  costCenter?: string;
  glAccountMapping?: string;
  taxCode?: string;
}

export interface MaterialSafetyRequest {
  hazardClassification?: HazardClassification;
  msdsReferenceNo?: string;
  ppeRequirements?: string;
  handlingInstructions?: string;
  disposalInstructions?: string;
  regulatoryCompliance?: string;
}

export interface MaterialLogisticsRequest {
  packagingType?: PackagingType;
  packagingDimensions?: string;
  packagingWeight?: string;
  unitsPerPackage?: number;
  transportationMode?: TransportationMode;
  specialTransportRequirements?: string;
  barcodeQrCodeRequired?: boolean;
}

/**
 * Only `photos` remains here. The seven typed document URLs used to live on
 * this section too, but they are now managed one row at a time through the
 * dedicated `POST/DELETE /materials/:id/documents` endpoints (see
 * AddMaterialDocumentRequest below) rather than bundled into the whole-record
 * create/update payload — the register at material_documents keeps a full
 * version history that a flat "current URL" field cannot represent.
 */
export interface MaterialDocumentsRequest {
  photos?: string[];
}

/**
 * Mirrors AddMaterialDocumentDto — POST /materials/:id/documents.
 *
 * Omit `supersedesId` to file a brand-new document: for a singleton type
 * (DATASHEET, DRAWING_SKETCH, TECHNICAL_SPEC_SHEET, VENDOR_QUOTATION, MSDS) the
 * server auto-supersedes whatever is currently active; for every other type it
 * starts an independent chain alongside any existing ones (the same mechanism
 * that lets several photos coexist). Pass `supersedesId` to explicitly version
 * one specific existing document instead of leaving that choice to the server.
 */
export interface AddMaterialDocumentRequest {
  documentType: MaterialDocumentType;
  documentUrl: string;
  fileName?: string;
  mimeType?: string;
  title?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  expiryDate?: string;
  remarks?: string;
  supersedesId?: string;
}

/** Mirrors MaterialDocumentQueryDto — GET /materials/:id/documents. */
export interface MaterialDocumentQueryParams {
  documentType?: MaterialDocumentType;
  /** Defaults to false server-side: only the current version of each chain. */
  includeSuperseded?: boolean;
}

/**
 * Mirrors CreateMaterialDto. `code` is absent by design — the backend generates it
 * (MaterialCodeService) and never accepts it from the client. `status` is also
 * absent: new materials start ACTIVE and the lifecycle is driven by the dedicated
 * enable/disable/obsolete endpoints.
 */
export interface CreateMaterialRequest {
  shortDescription: string;
  materialCategoryId: string;
  materialGroupId: string;
  unitOfMeasurementId: string;
  criticalityLevel: CriticalityLevel;
  longDescription?: string;
  specialInstruction?: string;
  isSystem?: boolean;
  isStockItem?: boolean;
  isSerialized?: boolean;
  isBatchManaged?: boolean;
  remarks?: string;
  technicalSpec?: MaterialTechnicalSpecRequest;
  procurement?: MaterialProcurementRequest;
  inventory?: MaterialInventoryRequest;
  quality?: MaterialQualityRequest;
  accounting?: MaterialAccountingRequest;
  safety?: MaterialSafetyRequest;
  logistics?: MaterialLogisticsRequest;
  documents?: MaterialDocumentsRequest;
}

/** Mirrors UpdateMaterialDto = PartialType(CreateMaterialDto). */
export type UpdateMaterialRequest = Partial<CreateMaterialRequest>;

/** Mirrors MaterialQueryDto. */
export interface MaterialQueryParams {
  page: number;
  limit: number;
  sortBy: MaterialSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  materialCategoryId?: string;
  materialGroupId?: string;
  unitOfMeasurementId?: string;
  status?: MaterialStatus;
  criticalityLevel?: CriticalityLevel;
  isStockItem?: boolean;
  isSystem?: boolean;
  manufacturerName?: string;
}
