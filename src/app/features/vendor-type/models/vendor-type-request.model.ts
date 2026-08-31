import { VendorTypeSortField } from './vendor-type.model';

/**
 * Mirrors CreateVendorTypeDto. `code` is deliberately absent — it is
 * server-generated as a per-organization sequence starting at 0001
 * (vendor-type.controller.ts: "Supplying it has no effect").
 */
export interface CreateVendorTypeRequest {
  name: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  remarks?: string;
}

/** Mirrors UpdateVendorTypeDto = PartialType(CreateVendorTypeDto). Code stays immutable. */
export type UpdateVendorTypeRequest = Partial<CreateVendorTypeRequest>;

/** Mirrors VendorTypeQueryDto — note `limit`/`sortOrder`, not pageSize/sortDirection. */
export interface VendorTypeQueryParams {
  page: number;
  limit: number;
  sortBy: VendorTypeSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  isActive?: boolean;
}
