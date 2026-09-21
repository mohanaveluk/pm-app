import { ActivitySortField } from './activity.model';

/** The department (and its mapping) is derived server-side from the discipline. */
export interface CreateActivityRequest {
  disciplineId: string;
  code?: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  moduleGroup?: string;
  icon?: string;
  routeUrl?: string;
  featureKey?: string;
  remarks?: string;
  isSystem?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
}

/** departmentDisciplineId, departmentId, and disciplineId are immutable after creation. */
export interface UpdateActivityRequest {
  code?: string;
  name?: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  moduleGroup?: string;
  icon?: string;
  routeUrl?: string;
  featureKey?: string;
  remarks?: string;
  isSystem?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface BulkActivityItem {
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder?: number;
  moduleGroup?: string;
  icon?: string;
  routeUrl?: string;
  featureKey?: string;
}

/** One Discipline, many activities in a single transaction. */
export interface BulkCreateActivityRequest {
  disciplineId: string;
  activities: BulkActivityItem[];
}

export interface ActivityQueryParams {
  page: number;
  limit: number;
  sortBy: ActivitySortField;
  sortOrder: 'ASC' | 'DESC';
  search?: string;
  departmentId?: string;
  disciplineId?: string;
  moduleGroup?: string;
  isActive?: boolean;
}
