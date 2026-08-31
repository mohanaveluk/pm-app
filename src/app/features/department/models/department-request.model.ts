export interface CreateDepartmentRequest {
  organizationId: string;
  code?: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder: number;
  remarks?: string;
  isActive: boolean;
}

export interface UpdateDepartmentRequest {
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder: number;
  remarks?: string;
  isActive: boolean;
}

export interface DepartmentQueryParams {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  search?: string;
  organizationId?: string;
  isActive?: boolean;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}
