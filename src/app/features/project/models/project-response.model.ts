import { Project, ProjectManagerOption, ProjectOption, ProjectSummary } from './project.model';

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

/** Mirrors ProjectListResponseDto. */
export interface PagedProjects {
  items: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ProjectResponse = ApiEnvelope<Project>;
export type PagedProjectResponse = ApiEnvelope<PagedProjects>;
export type ProjectOptionsResponse = ApiEnvelope<ProjectOption[]>;
export type ProjectManagersResponse = ApiEnvelope<ProjectManagerOption[]>;
export type ProjectSummaryResponse = ApiEnvelope<ProjectSummary>;
export type ProjectDeleteResponse = ApiEnvelope<null>;
