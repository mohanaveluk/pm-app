import { DisciplineOption, ProjectOption, WbsCostCode } from './wbs-cost-code.model';

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

/** Mirrors WbsCostCodeListResponseDto. */
export interface PagedWbsCostCodes {
  items: WbsCostCode[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type WbsCostCodeResponse = ApiEnvelope<WbsCostCode>;
export type PagedWbsCostCodeResponse = ApiEnvelope<PagedWbsCostCodes>;
export type WbsCostCodeDeleteResponse = ApiEnvelope<null>;
export type DisciplineOptionsResponse = ApiEnvelope<DisciplineOption[]>;
export type ProjectOptionsResponse = ApiEnvelope<ProjectOption[]>;
