import { Discipline } from './discipline.model';

/** Envelope shape used by every /v1/disciplines endpoint. */
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

export type DisciplineResponse = ApiEnvelope<Discipline>;
export type PagedDisciplineResponse = ApiEnvelope<PagedResult<Discipline>>;
export type DisciplineListResponse = ApiEnvelope<Discipline[]>;
