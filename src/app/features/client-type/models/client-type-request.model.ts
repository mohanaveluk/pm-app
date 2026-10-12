import { ClientTypeSortField } from './client-type.model';

/**
 * Mirrors CreateClientTypeDto. `code` is deliberately absent — it is
 * server-generated as a per-organization sequence starting at 0001
 * (client-type.controller.ts: "Supplying it has no effect").
 */
export interface CreateClientTypeRequest {
  name: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  remarks?: string;
}

/** Mirrors UpdateClientTypeDto = PartialType(CreateClientTypeDto). Code stays immutable. */
export type UpdateClientTypeRequest = Partial<CreateClientTypeRequest>;

/** Mirrors ClientTypeQueryDto — note `limit`/`sortOrder`, not pageSize/sortDirection. */
export interface ClientTypeQueryParams {
  page: number;
  limit: number;
  sortBy: ClientTypeSortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  isActive?: boolean;
}
