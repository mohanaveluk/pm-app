/** Lightweight organization reference embedded in a Discipline record. */
export interface DisciplineOrganization {
  id: string;
  name: string;
  code?: string;
}

export interface Discipline {
  id: string;
  dguid: string;
  organizationId: string;
  organization?: DisciplineOrganization;
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

export type DisciplineSortField = 'code' | 'name' | 'displayOrder' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface DisciplineFilter {
  search: string;
  organizationId: string | null;
  status: 'all' | 'active' | 'inactive';
  createdFrom: Date | null;
  createdTo: Date | null;
  updatedFrom: Date | null;
  updatedTo: Date | null;
}

export const DEFAULT_DISCIPLINE_FILTER: DisciplineFilter = {
  search: '',
  organizationId: null,
  status: 'all',
  createdFrom: null,
  createdTo: null,
  updatedFrom: null,
  updatedTo: null,
};
