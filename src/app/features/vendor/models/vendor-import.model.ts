/** Mirrors pm-api's VendorImportResult (POST /vendors/import). */
export interface VendorImportResult {
  total: number;
  created: number;
  updated: number;
  vendorTypesCreated: string[];
  materialCategoriesCreated?: string[];
  /** Rows matching an existing vendor that were left untouched. */
  skipped: number;
  items: { row: number; name: string; code: string; action: 'created' | 'updated' | 'skipped' }[];
}

/** Mirrors pm-api's VendorImportPreview (POST /vendors/import/preview). Nothing is written. */
export interface VendorImportPreview {
  total: number;
  toCreate: number;
  toUpdate: number;
  /** Rows matching an existing vendor (capped by the API; toUpdate is the full count). */
  existing: { row: number; name: string; code: string }[];
}

/** One row rejected by validation — returned with a 422, and nothing is imported. */
export interface VendorImportRowError {
  row: number;
  message: string;
}
