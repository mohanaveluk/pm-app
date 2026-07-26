/** Lightweight references embedded in a mapping record for display. */
export interface DepartmentRef {
  id: string;
  code: string;
  name: string;
}

export interface DisciplineRef {
  id: string;
  code: string;
  name: string;
}

export interface DepartmentDisciplineMapping {
  id: string;
  organizationId: string;
  departmentId: string;
  department?: DepartmentRef;
  departmentCode?: string;
  departmentName?: string;
  disciplineId: string;
  disciplineCode?: string;
  disciplineName?: string;
  discipline?: DisciplineRef;
  displayOrder: number;
  remarks?: string;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type MappingSortField = 'displayOrder' | 'createdAt' | 'updatedAt';
export type GroupSortField = 'departmentName' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

/** One discipline assignment within a department's group row — carries the
 * underlying mapping id so edits can diff against it (add/remove). */
export interface DisciplineAssignment {
  mappingId: string;
  disciplineId: string;
  discipline?: DisciplineRef;
  isActive: boolean;
  displayOrder: number;
  remarks?: string;
}

/** Client-side aggregation: one department row with all of its mapped disciplines. */
export interface DepartmentDisciplineGroup {
  departmentId: string;
  department?: DepartmentRef;
  organizationId: string;
  assignments: DisciplineAssignment[];
  createdAt: string;
  updatedAt?: string;
}

export interface MappingFilter {
  search: string;
  organizationId: string | null;
  departmentId: string | null;
  disciplineId: string | null;
  status: 'all' | 'active' | 'inactive';
  createdFrom: Date | null;
  createdTo: Date | null;
  updatedFrom: Date | null;
  updatedTo: Date | null;
}

export const DEFAULT_MAPPING_FILTER: MappingFilter = {
  search: '',
  organizationId: null,
  departmentId: null,
  disciplineId: null,
  status: 'all',
  createdFrom: null,
  createdTo: null,
  updatedFrom: null,
  updatedTo: null,
};
