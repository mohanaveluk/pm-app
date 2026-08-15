import {
  CriticalityLevel, HazardClassification, InspectionType, MaterialSortField,
  MaterialStatus, PackagingType, StockingStrategy, TransportationMode,
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

export interface MaterialDocumentsRequest {
  datasheetUrl?: string;
  drawingSketchUrl?: string;
  technicalSpecSheetUrl?: string;
  qualityCertificatesUrl?: string;
  complianceCertificatesUrl?: string;
  vendorQuotationUrl?: string;
  inspectionReportsUrl?: string;
  photos?: string[];
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
