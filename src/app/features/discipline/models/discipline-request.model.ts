export interface CreateDisciplineRequest {
  organizationId: string;
  code?: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder: number;
  remarks?: string;
  isActive: boolean;
}

export interface UpdateDisciplineRequest {
  code?: string;
  name: string;
  shortName?: string;
  description?: string;
  displayOrder: number;
  remarks?: string;
  isActive: boolean;
}

export interface DisciplineQueryParams {
  page: number;
  limit: number;
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
