/** Lightweight organization reference embedded in a Discipline record. */
export interface DisciplineOrganization {
  id: string;
  name: string;
  code?: string;
}

/** Lightweight department reference embedded in a Discipline record. */
export interface DisciplineDepartment {
  id: string;
  name?: string;
  code?: string;
}

export interface Discipline {
  id: string;
  dguid: string;
  organizationId: string;
  organization?: DisciplineOrganization;
  code: string;
  name: string;
  departmentId?: string;
  department?: DisciplineDepartment;
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

/**
 * list            — the table, paged
 * departmentTable — the same table, rows grouped under a heading row per department
 * department      — a card per department
 */
export type DisciplineViewMode = 'list' | 'departmentTable' | 'department';

/** A heading row of the department-wise table. */
export interface DisciplineGroupRow {
  groupHeader: true;
  departmentId: string | null;
  departmentName: string;
  departmentCode: string | null;
  count: number;
  activeCount: number;
}

export type DisciplineTableRow = Discipline | DisciplineGroupRow;

/** One department and its disciplines, for the department-wise view. */
export interface DisciplineDepartmentGroup {
  /** null for disciplines filed under no department. */
  departmentId: string | null;
  departmentName: string;
  departmentCode: string | null;
  disciplines: Discipline[];
  activeCount: number;
}
export type SortDirection = 'asc' | 'desc';

export interface DisciplineFilter {
  search: string;
  organizationId: string | null;
  departmentId: string | null;
  status: 'all' | 'active' | 'inactive';
  createdFrom: Date | null;
  createdTo: Date | null;
  updatedFrom: Date | null;
  updatedTo: Date | null;
}

export const DEFAULT_DISCIPLINE_FILTER: DisciplineFilter = {
  search: '',
  organizationId: null,
  departmentId: null,
  status: 'all',
  createdFrom: null,
  createdTo: null,
  updatedFrom: null,
  updatedTo: null,
};
