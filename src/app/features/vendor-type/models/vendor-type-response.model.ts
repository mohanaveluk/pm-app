import { VendorType } from './vendor-type.model';

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

/** Mirrors VendorTypeListResponseDto. */
export interface PagedVendorTypes {
  items: VendorType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type VendorTypeResponse = ApiEnvelope<VendorType>;
export type PagedVendorTypeResponse = ApiEnvelope<PagedVendorTypes>;
export type VendorTypeOptionsResponse = ApiEnvelope<VendorType[]>;
export type VendorTypeDeleteResponse = ApiEnvelope<null>;
