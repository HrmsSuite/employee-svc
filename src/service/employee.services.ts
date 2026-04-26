import {
  Address,
  BankDetails,
  Compensation,
  Employee,
  EmployeeData,
  LegalDetails,
} from "@hrmssuite/persistence";
import { EmployeeDAO } from "../Dao/employee.daos";
import {
  EmployeeSchema,
  EmployeeIdSchema,
  EmployeeEmailSchema,
  EmployeeIdNumberSchema,
  UpdateEmployeeSchema,
  UpdateBankSchema,
  UpdateLegalSchema,
  UpdateCompensationSchema,
  UpdateAddressSchema,
} from "../common/validators/employee.validator";
import { EmployeeQueryFilters } from "../typings/employee.typings";

export class EmployeeServices {
  private employeeDAO: EmployeeDAO;

  constructor() {
    this.employeeDAO = new EmployeeDAO();
  }

  public async createEmployee(
    data: EmployeeData,
    companyId: string,
  ): Promise<Employee> {
    EmployeeSchema.parse(data);

    try {
      const createdEmployee = await this.employeeDAO.createEmployee(data, companyId);
      return createdEmployee;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create employee";
      throw new Error(message);
    }
  }

  public async findAll(
    companyId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ employees: Employee[]; total: number; totalPages: number }> {
    try {
      const result = await this.employeeDAO.findAll(companyId, page, limit);
      return result;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch employees";
      throw new Error(message);
    }
  }

  public async findByFilters(
    companyId: string,
    filters: EmployeeQueryFilters,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ employees: Employee[]; total: number; totalPages: number }> {
    try {
      const result = await this.employeeDAO.findByFilters(companyId, filters, page, limit);
      return result;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch employees";
      throw new Error(message);
    }
  }

  public async findById(
    id: string,
    companyId: string,
  ): Promise<Employee | null> {
    EmployeeIdSchema.parse(id);

    try {
      const employee = await this.employeeDAO.findById(id, companyId);
      return employee;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch employee by id";
      throw new Error(message);
    }
  }

  public async findByEmail(
    email: string,
    companyId: string,
  ): Promise<Employee | null> {
    EmployeeEmailSchema.parse(email);

    try {
      const employee = await this.employeeDAO.findByEmail(email, companyId);
      return employee;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch employee by email";
      throw new Error(message);
    }
  }

  public async findByEmployeeId(
    employeeId: string,
    companyId: string,
  ): Promise<Employee | null> {
    EmployeeIdNumberSchema.parse(employeeId);

    try {
      const employee = await this.employeeDAO.findByEmployeeId(employeeId, companyId);
      return employee;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch employee by employee id";
      throw new Error(message);
    }
  }

  public async updateEmployee(
    id: string,
    data: Partial<EmployeeData>,
    companyId: string,
  ): Promise<Employee | null> {
    EmployeeIdSchema.parse(id);
    UpdateEmployeeSchema.parse(data);

    try {
      const updatedEmployee = await this.employeeDAO.updateEmployee(id, data, companyId);
      return updatedEmployee;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update employee";
      throw new Error(message);
    }
  }

  public async updateBankDetails(
    id: string,
    bank: Partial<BankDetails>,
    companyId: string,
  ): Promise<Employee | null> {
    EmployeeIdSchema.parse(id);
    UpdateBankSchema.parse(bank);

    try {
      const updatedEmployee = await this.employeeDAO.updateBankDetails(id, bank, companyId);
      return updatedEmployee;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update bank details";
      throw new Error(message);
    }
  }

  public async updateLegalDetails(
    id: string,
    data: Partial<LegalDetails>,
    companyId: string,
  ): Promise<Employee | null> {
    EmployeeIdSchema.parse(id);
    UpdateLegalSchema.parse(data);

    try {
      const updatedEmployee = await this.employeeDAO.updateLegalDetails(id, data, companyId);
      return updatedEmployee;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update legal details";
      throw new Error(message);
    }
  }

  public async updateCompensation(
    id: string,
    compensation: Partial<Compensation>,
    companyId: string,
  ): Promise<Employee | null> {
    EmployeeIdSchema.parse(id);
    UpdateCompensationSchema.parse(compensation);

    try {
      const updatedEmployee = await this.employeeDAO.updateCompensation(id, compensation, companyId);
      return updatedEmployee;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update compensation";
      throw new Error(message);
    }
  }

  public async updateAddress(
    id: string,
    address: Partial<Address>,
    companyId: string,
  ): Promise<Employee | null> {
    EmployeeIdSchema.parse(id);
    UpdateAddressSchema.parse(address);

    try {
      const updatedEmployee = await this.employeeDAO.updateAddress(id, address, companyId);
      return updatedEmployee;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update address";
      throw new Error(message);
    }
  }

  public async softDelete(id: string, companyId: string): Promise<void> {
    EmployeeIdSchema.parse(id);

    try {
      await this.employeeDAO.softDelete(id, companyId);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete employee";
      throw new Error(message);
    }
  }
}