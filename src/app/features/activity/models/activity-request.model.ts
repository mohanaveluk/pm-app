import { ActivitySortField } from './activity.model';

export interface CreateActivityRequest {
  departmentDisciplineId: string;
  departmentId: string;
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

/** One DepartmentDiscipline mapping, many activities in a single transaction. */
export interface BulkCreateActivityRequest {
  departmentDisciplineId: string;
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
  departmentDisciplineId?: string;
  moduleGroup?: string;
  isActive?: boolean;
}
