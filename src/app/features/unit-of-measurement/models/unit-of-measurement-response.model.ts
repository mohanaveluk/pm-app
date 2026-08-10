import { UnitOfMeasurement, UnitOfMeasurementOption } from './unit-of-measurement.model';

/**
 * Every pm-api endpoint wraps its payload in ResponseDto
 * (pm-api/src/common/dto/response.dto.ts).
 */
export interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
  timestamp: string;
}

/** Mirrors UnitOfMeasurementListResponseDto. */
export interface PagedUnitsOfMeasurement {
  items: UnitOfMeasurement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type UnitOfMeasurementResponse = ApiEnvelope<UnitOfMeasurement>;
export type PagedUnitOfMeasurementResponse = ApiEnvelope<PagedUnitsOfMeasurement>;
export type UnitOfMeasurementOptionsResponse = ApiEnvelope<UnitOfMeasurementOption[]>;
export type UnitOfMeasurementDeleteResponse = ApiEnvelope<null>;
