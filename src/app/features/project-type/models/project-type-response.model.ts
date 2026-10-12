import { ProjectType } from './project-type.model';

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

/** Mirrors ProjectTypeListResponseDto. */
export interface PagedProjectTypes {
  items: ProjectType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ProjectTypeResponse = ApiEnvelope<ProjectType>;
export type PagedProjectTypeResponse = ApiEnvelope<PagedProjectTypes>;
export type ProjectTypeOptionsResponse = ApiEnvelope<ProjectType[]>;
export type ProjectTypeDeleteResponse = ApiEnvelope<null>;
