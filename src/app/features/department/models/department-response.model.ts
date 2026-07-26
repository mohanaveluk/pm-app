import { Department } from './department.model';

export interface DepartmentResponse {
  success: boolean;
  message?: string;
  data: Department;
}

export interface PagedDepartmentResponse {
  data: Department[];
  totalCount: number;
  page: number;
  pageSize: number;
}
