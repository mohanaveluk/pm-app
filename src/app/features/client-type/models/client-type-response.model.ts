import { ClientType } from './client-type.model';

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

/** Mirrors ClientTypeListResponseDto. */
export interface PagedClientTypes {
  items: ClientType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ClientTypeResponse = ApiEnvelope<ClientType>;
export type PagedClientTypeResponse = ApiEnvelope<PagedClientTypes>;
export type ClientTypeOptionsResponse = ApiEnvelope<ClientType[]>;
export type ClientTypeDeleteResponse = ApiEnvelope<null>;
