import { Client, ClientAuditEntry, ClientDocument, ClientListItem, ClientOption } from './client.model';

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

/** Mirrors ClientListResponseDto. */
export interface PagedClients {
  items: ClientListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ClientResponse = ApiEnvelope<Client>;
export type PagedClientResponse = ApiEnvelope<PagedClients>;
export type ClientOptionsResponse = ApiEnvelope<ClientOption[]>;
export type ClientDeleteResponse = ApiEnvelope<null>;
export type ClientDocumentResponse = ApiEnvelope<ClientDocument>;
export type ClientDocumentsResponse = ApiEnvelope<ClientDocument[]>;
export type ClientDocumentDeleteResponse = ApiEnvelope<null>;
export type ClientAuditResponse = ApiEnvelope<ClientAuditEntry[]>;

/** POST /clients/documents/upload returns the stored URL (not wrapped in ResponseDto). */
export interface ClientDocumentUploadResponse {
  message: string;
  url: string;
}
