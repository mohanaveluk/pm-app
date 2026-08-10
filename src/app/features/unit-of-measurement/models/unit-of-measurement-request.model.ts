import { UnitOfMeasurementSortField, UomType } from './unit-of-measurement.model';

/**
 * Mirrors CreateUnitOfMeasurementDto. `organizationId` is deliberately absent —
 * the backend resolves it from the authenticated user's token
 * (unit-of-measurement.controller.ts: `req.user.organizationId`).
 */
export interface CreateUnitOfMeasurementRequest {
  code: string;
  name: string;
  symbol?: string;
  shortName?: string;
  description?: string;
  uomType?: UomType;
  displayOrder?: number;
  isActive?: boolean;
  remarks?: string;
}

/**
 * Mirrors UpdateUnitOfMeasurementDto = PartialType(OmitType(Create, ['code'])).
 * `code` is immutable after creation and is rejected by the API, so it is
 * structurally excluded here rather than merely ignored. Every field is optional,
 * which lets the status toggle send `{ isActive }` alone instead of round-tripping
 * the whole record through the unique-name check.
 */
export interface UpdateUnitOfMeasurementRequest {
  name?: string;
  symbol?: string;
  shortName?: string;
  description?: string;
  uomType?: UomType;
  displayOrder?: number;
  isActive?: boolean;
  remarks?: string;
}

/** Mirrors UnitOfMeasurementQueryDto — note `limit`/`sortOrder`, not pageSize/sortDirection. */
export interface UnitOfMeasurementQueryParams {
  page: number;
  limit: number;
  sortBy: UnitOfMeasurementSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  uomType?: UomType;
  isActive?: boolean;
}
