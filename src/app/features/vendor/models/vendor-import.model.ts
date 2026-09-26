/** Mirrors pm-api's VendorImportResult (POST /vendors/import). */
export interface VendorImportResult {
  total: number;
  created: number;
  updated: number;
  vendorTypesCreated: string[];
  items: { row: number; name: string; code: string; action: 'created' | 'updated' }[];
}

/** One row rejected by validation — returned with a 422, and nothing is imported. */
export interface VendorImportRowError {
  row: number;
  message: string;
}
