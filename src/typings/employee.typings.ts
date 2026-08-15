import { Employee } from "@hrmssuite/persistence";

export interface EmployeeQueryFilters {
  search?: string;
  department?: string;
  designation?: string;
  status?: string;
  page?: number;
  limit?: number;
  visibleEmployeeIds?: string[];
}

export interface PaginatedEmployees {
  employees: Employee[];
  total: number;
  pages: number;
}

export interface GetAllEmployeeSalariesOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  departmentId?: string;
  salaryStructureId?: string;
}

export interface GetAllEmployeeSalariesDAOOptions {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  departmentId?: string;
  salaryStructureId?: string;
}
