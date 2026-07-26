export interface Activity {
  id: string;
  dguid: string;
  organizationId: string;
  departmentId: string;
  departmentName: string;
  departmentCode?: string;
  disciplineId: string;
  disciplineName: string;
  disciplineCode?: string;
  departmentDisciplineId: string;
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder: number;
  moduleGroup?: string;
  icon?: string;
  routeUrl?: string;
  featureKey?: string;
  remarks?: string;
  isSystem: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Lightweight item returned by /active, /department/:id, /discipline/:id, /department-discipline/:id. */
export interface ActivityDropdownItem {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  moduleGroup?: string;
  icon?: string;
  routeUrl?: string;
  featureKey?: string;
  displayOrder: number;
}

/** One department mapped to a discipline — from GET /department-disciplines/discipline/{disciplineId}.
 * `id` is the DepartmentDiscipline mapping UUID the Activity form needs as departmentDisciplineId. */
export interface MappedDepartmentOption {
  id: string;
  departmentId: string;
  departmentName: string;
  departmentCode?: string;
  displayOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

/** Minimal shape for the Discipline/Department pickers in the form and filter dialogs. */
export interface ReferenceOption {
  id: string;
  code: string;
  name: string;
}

/** Department–Discipline Mapping option for the advanced filter dialog. */
export interface MappingOption {
  id: string;
  label: string;
}

export type ActivitySortField = 'name' | 'code' | 'displayOrder' | 'createdAt' | 'moduleGroup';
export type SortDirection = 'asc' | 'desc';

export interface ActivityFilter {
  search: string;
  organizationId: string | null;
  departmentId: string | null;
  disciplineId: string | null;
  departmentDisciplineId: string | null;
  moduleGroup: string | null;
  status: 'all' | 'active' | 'inactive';
  createdFrom: Date | null;
  createdTo: Date | null;
  updatedFrom: Date | null;
  updatedTo: Date | null;
  displayOrder: number | null;
}

export const DEFAULT_ACTIVITY_FILTER: ActivityFilter = {
  search: '',
  organizationId: null,
  departmentId: null,
  disciplineId: null,
  departmentDisciplineId: null,
  moduleGroup: null,
  status: 'all',
  createdFrom: null,
  createdTo: null,
  updatedFrom: null,
  updatedTo: null,
  displayOrder: null,
};
