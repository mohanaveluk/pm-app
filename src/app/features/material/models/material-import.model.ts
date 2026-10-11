/** Mirrors pm-api's MaterialImportResult (POST /materials/import). */
export interface MaterialImportResult {
  total: number;
  created: number;
  updated: number;
  /** Rows matching an existing material that were left untouched. */
  skipped: number;
  items: { row: number; name: string; code: string; action: 'created' | 'updated' | 'skipped' }[];
}

/** Mirrors pm-api's MaterialImportPreview (POST /materials/import/preview). Nothing is written. */
export interface MaterialImportPreview {
  total: number;
  toCreate: number;
  toUpdate: number;
  /** Rows matching an existing material (capped by the API; toUpdate is the full count). */
  existing: { row: number; name: string; code: string }[];
}

/** One row rejected by validation — returned with a 422, and nothing is imported. */
export interface MaterialImportRowError {
  row: number;
  message: string;
}
