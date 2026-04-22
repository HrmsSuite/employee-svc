import { Department, DepartmentData } from "@hrmssuite/persistence";
import { DepartmentDAO } from "../Dao/department.daos";
import {
  DepartmentSchema,
  DepartmentIdSchema,
  DepartmentNameSchema,
  UpdateDepartmentSchema,
} from "../common/validators/department.validator";

const departmentDAO = new DepartmentDAO();

export class DepartmentServices {
  public async createDepartment(data: Department, companyId: string): Promise<Department> {
    DepartmentSchema.parse(data);

    try {
      const createdDepartment = await departmentDAO.createDepartmentDao(data, companyId);
      return createdDepartment;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create department";
      throw new Error(message);
    }
  }

  public async findAll(companyId: string): Promise<Department[]> {
    try {
      const departments = await departmentDAO.findAllDepartment(companyId);
      return departments;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch departments";
      throw new Error(message);
    }
  }

  public async findByDepartment(id: string, companyId: string): Promise<Department | null> {
    DepartmentIdSchema.parse(id);

    try {
      const department = await departmentDAO.findById(id, companyId);
      return department;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch department by id";
      throw new Error(message);
    }
  }

  public async findByName(name: string, companyId: string): Promise<Department | null> {
    DepartmentNameSchema.parse(name);

    try {
      const department = await departmentDAO.findByName(name, companyId);
      return department;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch department by name";
      throw new Error(message);
    }
  }

  public async updateDepartment(
    id: string,
    data: Partial<DepartmentData>,
    companyId: string,
  ): Promise<Department | null> {
    DepartmentIdSchema.parse(id);
    UpdateDepartmentSchema.parse(data);

    try {
      const updatedDepartment = await departmentDAO.updateDepartment(id, data, companyId);
      return updatedDepartment;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update department";
      throw new Error(message);
    }
  }

  public async softDelete(id: string, companyId: string): Promise<void> {
    DepartmentIdSchema.parse(id);

    try {
      await departmentDAO.softDelete(id, companyId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete department";
      throw new Error(message);
    }
  }
}