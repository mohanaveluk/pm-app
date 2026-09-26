/** Mirrors pm-api's MaterialImportResult (POST /materials/import). */
export interface MaterialImportResult {
  total: number;
  created: number;
  updated: number;
  items: { row: number; name: string; code: string; action: 'created' | 'updated' }[];
}

/** One row rejected by validation — returned with a 422, and nothing is imported. */
export interface MaterialImportRowError {
  row: number;
  message: string;
}
