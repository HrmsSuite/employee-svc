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
