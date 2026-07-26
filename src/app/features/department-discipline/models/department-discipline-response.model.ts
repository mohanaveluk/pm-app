import { DepartmentDisciplineMapping } from './department-discipline.model';

/** Envelope shape used by every /v1/department-disciplines endpoint (same convention confirmed for /v1/disciplines). */
export interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type MappingResponse = ApiEnvelope<DepartmentDisciplineMapping>;
export type PagedMappingResponse = ApiEnvelope<PagedResult<DepartmentDisciplineMapping>>;
export type MappingListResponse = ApiEnvelope<DepartmentDisciplineMapping[]>;
