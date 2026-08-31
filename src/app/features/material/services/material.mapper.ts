import {
  CriticalityLevel, HazardClassification, InspectionType, Material,
  PackagingType, StockingStrategy, TransportationMode,
} from '../models/material.model';
import { CreateMaterialRequest, UpdateMaterialRequest } from '../models/material-request.model';

/**
 * The Material API is asymmetric: `GET /materials/:id` returns every section
 * **flattened** onto the root (material.service.ts spreads technicalSpec,
 * procurement, … into one object), while `POST`/`PUT` expect those same fields
 * **nested** under section keys.
 *
 * This file is the only place that knows about that asymmetry. The form model
 * mirrors the nested request shape, so:
 *   API detail  --toFormValue-->  form  --toRequest-->  API create/update
 */

/** Shape of the workspace form's `getRawValue()`. Mirrors CreateMaterialRequest. */
export interface MaterialFormValue {
  general: {
    shortDescription: string;
    longDescription: string;
    specialInstruction?: string;
    materialCategoryId: string;
    materialGroupId: string;
    unitOfMeasurementId: string;
    criticalityLevel: CriticalityLevel;
    isStockItem: boolean;
    isSerialized: boolean;
    isBatchManaged: boolean;
    remarks: string;
  };
  technical: {
    technicalDescription: string; modelPartNumber: string; manufacturerName: string;
    manufacturerPartNumber: string; brand: string; materialComposition: string;
    dimensions: string; weight: string; colorFinish: string;
    operatingTemperatureRange: string; pressureRating: string; voltageCurrentRating: string;
    certifications: string; datasheetReference: string;
  };
  procurement: {
    preferredVendorId: string; vendorPartNumber: string; leadTimeDays: number | null;
    minimumOrderQuantity: number | null; reorderLevel: number | null; reorderQuantity: number | null;
    purchaseUomId: string; lastPurchasePrice: number | null; currency: string;
    contractReference: string; hsCode: string; countryOfOrigin: string;
  };
  inventory: {
    storageLocation: string; warehouseBinRack: string; storageConditions: string;
    shelfLifeDays: number | null; stockingStrategy: StockingStrategy | null;
    safetyStock: number | null; maximumStockLevel: number | null;
  };
  quality: {
    inspectionType: InspectionType | null; qualitySpecDocumentNo: string;
    inspectionLotSize: number | null; samplingProcedure: string; testParameters: string;
    acceptanceCriteria: string; calibrationRequired: boolean; calibrationIntervalDays: number | null;
  };
  accounting: {
    valuationClass: string; valuationType: string; standardPrice: number | null;
    movingAveragePrice: number | null; costCenter: string; glAccountMapping: string; taxCode: string;
  };
  safety: {
    hazardClassification: HazardClassification | null; msdsReferenceNo: string;
    ppeRequirements: string; handlingInstructions: string; disposalInstructions: string;
    regulatoryCompliance: string;
  };
  logistics: {
    packagingType: PackagingType | null; packagingDimensions: string; packagingWeight: string;
    unitsPerPackage: number | null; transportationMode: TransportationMode | null;
    specialTransportRequirements: string; barcodeQrCodeRequired: boolean;
  };
  documents: {
    // The seven typed URLs used to live here; they are now managed one row at
    // a time via the dedicated document endpoints (see MaterialDocumentsStepComponent)
    // rather than bundled into the whole-record payload. Only `photos` remains.
    photos: string[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Trims a string and converts blanks to undefined so we never post empty strings. */
function s(value: string | null | undefined): string | undefined {
  const trimmed = (value ?? '').trim();
  return trimmed.length ? trimmed : undefined;
}

/** Normalises a numeric control: null / '' / NaN all become undefined. */
function n(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

/** Passes an enum value through, treating null/'' as "not supplied". */
function e<T extends string>(value: T | null | undefined): T | undefined {
  return value ? value : undefined;
}

/**
 * Drops keys whose value is undefined, then drops the whole section if nothing
 * is left. The backend validates nested objects, so sending `{}` or
 * `{ foo: undefined }` is noise at best and a 400 at worst.
 */
function compact<T extends object>(section: T): T | undefined {
  const entries = Object.entries(section).filter(([, v]) => v !== undefined);
  return entries.length ? (Object.fromEntries(entries) as T) : undefined;
}

// ── Form → API ────────────────────────────────────────────────────────────

/**
 * Builds the nested create/update payload from the flat-ish form value.
 * Only the five genuinely required fields are unconditional; everything else is
 * omitted when empty so the backend's optional validators are never tripped.
 */
export function toMaterialRequest(v: MaterialFormValue): CreateMaterialRequest {
  return {
    shortDescription: v.general.shortDescription.trim(),
    materialCategoryId: v.general.materialCategoryId,
    materialGroupId: v.general.materialGroupId,
    unitOfMeasurementId: v.general.unitOfMeasurementId,
    criticalityLevel: v.general.criticalityLevel,
    longDescription: s(v.general.longDescription),
    specialInstruction: s(v.general.specialInstruction),
    isStockItem: v.general.isStockItem,
    isSerialized: v.general.isSerialized,
    isBatchManaged: v.general.isBatchManaged,
    remarks: s(v.general.remarks),

    technicalSpec: compact({
      technicalDescription: s(v.technical.technicalDescription),
      modelPartNumber: s(v.technical.modelPartNumber),
      manufacturerName: s(v.technical.manufacturerName),
      manufacturerPartNumber: s(v.technical.manufacturerPartNumber),
      brand: s(v.technical.brand),
      materialComposition: s(v.technical.materialComposition),
      dimensions: s(v.technical.dimensions),
      weight: s(v.technical.weight),
      colorFinish: s(v.technical.colorFinish),
      operatingTemperatureRange: s(v.technical.operatingTemperatureRange),
      pressureRating: s(v.technical.pressureRating),
      voltageCurrentRating: s(v.technical.voltageCurrentRating),
      certifications: s(v.technical.certifications),
      datasheetReference: s(v.technical.datasheetReference),
    }),

    procurement: compact({
      preferredVendorId: s(v.procurement.preferredVendorId),
      vendorPartNumber: s(v.procurement.vendorPartNumber),
      leadTimeDays: n(v.procurement.leadTimeDays),
      minimumOrderQuantity: n(v.procurement.minimumOrderQuantity),
      reorderLevel: n(v.procurement.reorderLevel),
      reorderQuantity: n(v.procurement.reorderQuantity),
      purchaseUomId: s(v.procurement.purchaseUomId),
      lastPurchasePrice: n(v.procurement.lastPurchasePrice),
      currency: s(v.procurement.currency)?.toUpperCase(),
      contractReference: s(v.procurement.contractReference),
      hsCode: s(v.procurement.hsCode),
      countryOfOrigin: s(v.procurement.countryOfOrigin),
    }),

    inventory: compact({
      storageLocation: s(v.inventory.storageLocation),
      warehouseBinRack: s(v.inventory.warehouseBinRack),
      storageConditions: s(v.inventory.storageConditions),
      shelfLifeDays: n(v.inventory.shelfLifeDays),
      stockingStrategy: e(v.inventory.stockingStrategy),
      safetyStock: n(v.inventory.safetyStock),
      maximumStockLevel: n(v.inventory.maximumStockLevel),
    }),

    quality: compact({
      inspectionType: e(v.quality.inspectionType),
      qualitySpecDocumentNo: s(v.quality.qualitySpecDocumentNo),
      inspectionLotSize: n(v.quality.inspectionLotSize),
      samplingProcedure: s(v.quality.samplingProcedure),
      testParameters: s(v.quality.testParameters),
      acceptanceCriteria: s(v.quality.acceptanceCriteria),
      // Only sent when true — the backend treats it as an optional boolean.
      calibrationRequired: v.quality.calibrationRequired ? true : undefined,
      calibrationIntervalDays: v.quality.calibrationRequired ? n(v.quality.calibrationIntervalDays) : undefined,
    }),

    accounting: compact({
      valuationClass: s(v.accounting.valuationClass),
      valuationType: s(v.accounting.valuationType),
      standardPrice: n(v.accounting.standardPrice),
      movingAveragePrice: n(v.accounting.movingAveragePrice),
      costCenter: s(v.accounting.costCenter),
      glAccountMapping: s(v.accounting.glAccountMapping),
      taxCode: s(v.accounting.taxCode),
    }),

    safety: compact({
      hazardClassification: e(v.safety.hazardClassification),
      msdsReferenceNo: s(v.safety.msdsReferenceNo),
      ppeRequirements: s(v.safety.ppeRequirements),
      handlingInstructions: s(v.safety.handlingInstructions),
      disposalInstructions: s(v.safety.disposalInstructions),
      regulatoryCompliance: s(v.safety.regulatoryCompliance),
    }),

    logistics: compact({
      packagingType: e(v.logistics.packagingType),
      packagingDimensions: s(v.logistics.packagingDimensions),
      packagingWeight: s(v.logistics.packagingWeight),
      unitsPerPackage: n(v.logistics.unitsPerPackage),
      transportationMode: e(v.logistics.transportationMode),
      specialTransportRequirements: s(v.logistics.specialTransportRequirements),
      barcodeQrCodeRequired: v.logistics.barcodeQrCodeRequired ? true : undefined,
    }),

    documents: compact({
      photos: v.documents.photos?.length ? v.documents.photos : undefined,
    }),
  };
}

/**
 * Narrows a full request down to a single step's slice, for the incremental
 * save the workspace performs as the user advances through the wizard.
 *
 * `general` maps to the DTO's core (un-nested) fields; every other step maps to
 * its one nested section key. UpdateMaterialDto is a PartialType, so sending a
 * lone section is valid and leaves the rest of the record untouched.
 */
export function pickMaterialSection(
  request: CreateMaterialRequest,
  step: MaterialSectionKey,
): UpdateMaterialRequest {
  switch (step) {
    case 'general':
      return {
        shortDescription: request.shortDescription,
        materialCategoryId: request.materialCategoryId,
        materialGroupId: request.materialGroupId,
        unitOfMeasurementId: request.unitOfMeasurementId,
        criticalityLevel: request.criticalityLevel,
        longDescription: request.longDescription,
        specialInstruction: request.specialInstruction,
        isStockItem: request.isStockItem,
        isSerialized: request.isSerialized,
        isBatchManaged: request.isBatchManaged,
        remarks: request.remarks,
      };
    case 'technical':   return { technicalSpec: request.technicalSpec ?? {} };
    case 'procurement': return { procurement:   request.procurement   ?? {} };
    case 'inventory':   return { inventory:     request.inventory     ?? {} };
    case 'quality':     return { quality:       request.quality       ?? {} };
    case 'accounting':  return { accounting:    request.accounting    ?? {} };
    case 'safety':      return { safety:        request.safety        ?? {} };
    case 'logistics':   return { logistics:     request.logistics     ?? {} };
    case 'documents':   return { documents:     request.documents     ?? {} };
  }
}

/** Keys of the nine workspace steps, mirrored here to keep the mapper self-contained. */
export type MaterialSectionKey =
  | 'general' | 'technical' | 'procurement' | 'inventory' | 'quality'
  | 'accounting' | 'safety' | 'logistics' | 'documents';

// ── API → Form ────────────────────────────────────────────────────────────

/** Un-flattens an API detail response back into the nested form model. */
export function toMaterialFormValue(m: Material): MaterialFormValue {
  return {
    general: {
      shortDescription: m.shortDescription ?? '',
      longDescription: m.longDescription ?? '',
      specialInstruction: m.specialInstruction ?? '',
      materialCategoryId: m.materialCategoryId ?? '',
      materialGroupId: m.materialGroupId ?? '',
      unitOfMeasurementId: m.unitOfMeasurementId ?? '',
      criticalityLevel: m.criticalityLevel ?? CriticalityLevel.MEDIUM,
      isStockItem: m.isStockItem ?? true,
      isSerialized: m.isSerialized ?? false,
      isBatchManaged: m.isBatchManaged ?? false,
      remarks: m.remarks ?? '',
    },
    technical: {
      technicalDescription: m.technicalDescription ?? '',
      modelPartNumber: m.modelPartNumber ?? '',
      manufacturerName: m.manufacturerName ?? '',
      manufacturerPartNumber: m.manufacturerPartNumber ?? '',
      brand: m.brand ?? '',
      materialComposition: m.materialComposition ?? '',
      dimensions: m.dimensions ?? '',
      weight: m.weight ?? '',
      colorFinish: m.colorFinish ?? '',
      operatingTemperatureRange: m.operatingTemperatureRange ?? '',
      pressureRating: m.pressureRating ?? '',
      voltageCurrentRating: m.voltageCurrentRating ?? '',
      certifications: m.certifications ?? '',
      datasheetReference: m.datasheetReference ?? '',
    },
    procurement: {
      preferredVendorId: m.preferredVendorId ?? '',
      vendorPartNumber: m.vendorPartNumber ?? '',
      leadTimeDays: m.leadTimeDays ?? null,
      minimumOrderQuantity: m.minimumOrderQuantity ?? null,
      reorderLevel: m.reorderLevel ?? null,
      reorderQuantity: m.reorderQuantity ?? null,
      purchaseUomId: m.purchaseUomId ?? '',
      lastPurchasePrice: m.lastPurchasePrice ?? null,
      currency: m.currency ?? '',
      contractReference: m.contractReference ?? '',
      hsCode: m.hsCode ?? '',
      countryOfOrigin: m.countryOfOrigin ?? '',
    },
    inventory: {
      storageLocation: m.storageLocation ?? '',
      warehouseBinRack: m.warehouseBinRack ?? '',
      storageConditions: m.storageConditions ?? '',
      shelfLifeDays: m.shelfLifeDays ?? null,
      stockingStrategy: m.stockingStrategy ?? null,
      safetyStock: m.safetyStock ?? null,
      maximumStockLevel: m.maximumStockLevel ?? null,
    },
    quality: {
      inspectionType: m.inspectionType ?? null,
      qualitySpecDocumentNo: m.qualitySpecDocumentNo ?? '',
      inspectionLotSize: m.inspectionLotSize ?? null,
      samplingProcedure: m.samplingProcedure ?? '',
      testParameters: m.testParameters ?? '',
      acceptanceCriteria: m.acceptanceCriteria ?? '',
      calibrationRequired: m.calibrationRequired ?? false,
      calibrationIntervalDays: m.calibrationIntervalDays ?? null,
    },
    accounting: {
      valuationClass: m.valuationClass ?? '',
      valuationType: m.valuationType ?? '',
      standardPrice: m.standardPrice ?? null,
      movingAveragePrice: m.movingAveragePrice ?? null,
      costCenter: m.costCenter ?? '',
      glAccountMapping: m.glAccountMapping ?? '',
      taxCode: m.taxCode ?? '',
    },
    safety: {
      hazardClassification: m.hazardClassification ?? null,
      msdsReferenceNo: m.msdsReferenceNo ?? '',
      ppeRequirements: m.ppeRequirements ?? '',
      handlingInstructions: m.handlingInstructions ?? '',
      disposalInstructions: m.disposalInstructions ?? '',
      regulatoryCompliance: m.regulatoryCompliance ?? '',
    },
    logistics: {
      packagingType: m.packagingType ?? null,
      packagingDimensions: m.packagingDimensions ?? '',
      packagingWeight: m.packagingWeight ?? '',
      unitsPerPackage: m.unitsPerPackage ?? null,
      transportationMode: m.transportationMode ?? null,
      specialTransportRequirements: m.specialTransportRequirements ?? '',
      barcodeQrCodeRequired: m.barcodeQrCodeRequired ?? false,
    },
    documents: {
      // The seven typed URLs are intentionally not read here — see the
      // MaterialDocumentsStepComponent doc comment. `m.documents` (the
      // versioned register) is fetched and rendered independently of this form.
      photos: m.photos ?? [],
    },
  };
}
