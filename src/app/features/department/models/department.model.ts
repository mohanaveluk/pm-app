/** Lightweight organization reference embedded in a Department record. */
export interface DepartmentOrganization {
  id: string;
  name: string;
  code?: string;
}

export interface DepartmentData {
  id: string;
  dguid: string;
  organizationId: string;
  organization?: DepartmentOrganization;
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder: number;
  remarks?: string;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Department {
  data: DepartmentData,
  message: string,
  status: boolean,
  timestamp: string
}

export type DepartmentSortField = 'code' | 'name' | 'displayOrder' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface DepartmentFilter {
  search: string;
  organizationId: string | null;
  status: 'all' | 'active' | 'inactive';
  createdFrom: Date | null;
  createdTo: Date | null;
  updatedFrom: Date | null;
  updatedTo: Date | null;
}

export const DEFAULT_DEPARTMENT_FILTER: DepartmentFilter = {
  search: '',
  organizationId: null,
  status: 'all',
  createdFrom: null,
  createdTo: null,
  updatedFrom: null,
  updatedTo: null,
};
