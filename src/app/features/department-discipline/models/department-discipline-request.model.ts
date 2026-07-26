export interface CreateDepartmentDisciplineRequest {
  organizationId: string;
  departmentId: string;
  disciplineId: string;
  displayOrder: number;
  remarks?: string;
  isActive: boolean;
}

/** One department mapped to several disciplines in a single call. */
export interface BulkCreateDepartmentDisciplineRequest {
  organizationId: string;
  departmentId: string;
  disciplineIds: string[];
  isActive: boolean;
  remarks?: string;
}

export interface UpdateDepartmentDisciplineRequest {
  departmentId: string;
  disciplineId: string;
  displayOrder: number;
  remarks?: string;
  isActive: boolean;
}

export interface MappingQueryParams {
  page: number;
  limit: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  search?: string;
  organizationId?: string;
  departmentId?: string;
  disciplineId?: string;
  isActive?: boolean;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}
