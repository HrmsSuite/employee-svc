// src/service/employee-salary.service.ts

import { EmployeeSalary } from "@hrmssuite/persistence";

import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from "../helpers/error";

import { EmployeeSalaryDAO } from "../Dao";

import {
  validateObjectId,
  validateSalaryDates,
} from "../helpers/salary.validation.helpers";

import {
  CreateEmployeeSalarySchema,
  UpdateEmployeeSalarySchema,
  CreateEmployeeSalarySchemaType,
} from "../common/validators/employee-salary.validator";
import { GetAllEmployeeSalariesOptions } from "../typings/employee.typings";

export class EmployeeSalaryService {
  private readonly employeeSalaryDAO: EmployeeSalaryDAO;

  constructor() {
    // align with your other services (e.g., SalaryComponentService)
    this.employeeSalaryDAO = new EmployeeSalaryDAO();
  }

  /**
   * Create a new salary assignment for an employee.
   */
  public async createEmployeeSalary(
    companyId: string,
    employeeId: string,
    rawBody: unknown,
  ): Promise<EmployeeSalary> {
    const parsed = CreateEmployeeSalarySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }
    const data: CreateEmployeeSalarySchemaType = parsed.data;

    validateObjectId(employeeId, "employeeId");
    if (data.salaryStructureId) {
      validateObjectId(data.salaryStructureId, "salaryStructureId");
    }

    validateSalaryDates(data.effectiveFrom, data.effectiveTo);

    return this.employeeSalaryDAO.createEmployeeSalary(companyId, employeeId, {
      salaryStructureId: data.salaryStructureId
        ? validateObjectId(data.salaryStructureId, "salaryStructureId")
        : undefined,
      salaryStructureVersion: data.salaryStructureVersion,
      payFrequency: data.payFrequency as any,
      currency: data.currency,
      components: data.components.map((c, idx) => ({
        componentId: validateObjectId(
          c.componentId,
          `components[${idx}].componentId`,
        ),
        amount: c.amount,
        percentage: c.percentage,
        calculationBase: c.calculationBase as any,
        isOverridden: c.isOverridden ?? false,
        overrideReason: c.overrideReason,
        displayOrder: c.displayOrder ?? idx,
        metadata: c.metadata,
      })),
      totals: {
        gross: data.totals.gross,
        totalDeductions: data.totals.totalDeductions,
        totalEmployerContributions: data.totals.totalEmployerContributions,
        ctc: data.totals.ctc,
        net: data.totals.net,
      },
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ?? null,
      status: data.status as any,
      source: data.source as any,
      revisionReason: data.revisionReason ?? data.remarks,
      metadata:
        data.metadata ?? (data.remarks ? { remarks: data.remarks } : undefined),
    });
  }

  public async getCurrentEmployeeSalary(
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeSalary | null> {
    validateObjectId(employeeId, "employeeId");

    return this.employeeSalaryDAO.getCurrentEmployeeSalary(
      companyId,
      employeeId,
    );
  }

  public async getEmployeeSalaryById(
    companyId: string,
    salaryId: string,
  ): Promise<EmployeeSalary> {
    validateObjectId(salaryId, "salaryId");

    const salary = await this.employeeSalaryDAO.getEmployeeSalaryById(
      salaryId,
      companyId,
    );

    if (!salary) {
      throw new NotFoundError("Employee salary not found");
    }

    return salary;
  }

  public async getAllEmployeeSalaries(
    companyId: string,
    options: GetAllEmployeeSalariesOptions = {},
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const safePage = Math.max(1, options.page ?? 1);

    const safeLimit = Math.min(100, Math.max(1, options.limit ?? 50));

    if (options.departmentId) {
      validateObjectId(options.departmentId, "departmentId");
    }

    if (options.salaryStructureId) {
      validateObjectId(options.salaryStructureId, "salaryStructureId");
    }

    const result = await this.employeeSalaryDAO.getAllEmployeeSalaries(
      companyId,
      {
        page: safePage,
        limit: safeLimit,
        search: options.search,
        status: options.status,
        departmentId: options.departmentId,
        salaryStructureId: options.salaryStructureId,
      },
    );

    return {
      items: result.items,
      total: result.total,
      page: safePage,
      limit: safeLimit,
    };
  }

  /**
   * Get salary history of an employee (paginated).
   */
  public async getEmployeeSalaryHistory(
    companyId: string,
    employeeId: string,
    page = 1,
    limit = 25,
  ): Promise<{
    items: EmployeeSalary[];
    total: number;
    page: number;
    limit: number;
  }> {
    validateObjectId(employeeId, "employeeId");

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const { items, total } =
      await this.employeeSalaryDAO.getEmployeeSalaryHistory(
        companyId,
        employeeId,
        safePage,
        safeLimit,
      );

    return { items, total, page: safePage, limit: safeLimit };
  }

  /**
   * Update an existing employee salary (non-status fields).
   */
  public async updateEmployeeSalary(
    companyId: string,
    salaryId: string,
    rawBody: unknown,
  ): Promise<EmployeeSalary> {
    validateObjectId(salaryId, "salaryId");

    const parsed = UpdateEmployeeSalarySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }
    const data = parsed.data;

    if (data.effectiveFrom || data.effectiveTo) {
      const existingSalary = await this.employeeSalaryDAO.getEmployeeSalaryById(
        salaryId,
        companyId,
      );

      if (!existingSalary) {
        throw new NotFoundError("Employee salary not found");
      }

      const effectiveFrom = data.effectiveFrom ?? existingSalary.effectiveFrom;
      validateSalaryDates(effectiveFrom, data.effectiveTo);
    }

    // This should never be true now, but kept as a defensive check.
    if ((data as { status?: unknown }).status) {
      throw new BusinessRuleError(
        "Status cannot be updated directly; use activate/deactivate endpoints",
      );
    }

    return this.employeeSalaryDAO.updateEmployeeSalary(
      salaryId,
      companyId,
      data as Partial<EmployeeSalary>,
    );
  }

  public async activateEmployeeSalary(
    companyId: string,
    salaryId: string,
    employeeId: string,
  ): Promise<EmployeeSalary> {
    validateObjectId(salaryId, "salaryId");
    validateObjectId(employeeId, "employeeId");

    const salary = await this.employeeSalaryDAO.getEmployeeSalaryById(
      salaryId,
      companyId,
    );

    if (!salary) {
      throw new NotFoundError("Employee salary not found");
    }

    if (String(salary.employeeId) !== employeeId) {
      throw new BusinessRuleError(
        "Salary does not belong to the specified employee",
      );
    }

    return this.employeeSalaryDAO.activateEmployeeSalary(
      salaryId,
      companyId,
      employeeId,
    );
  }

  public async deactivateEmployeeSalary(
    companyId: string,
    salaryId: string,
  ): Promise<EmployeeSalary> {
    validateObjectId(salaryId, "salaryId");

    return this.employeeSalaryDAO.deactivateEmployeeSalary(salaryId, companyId);
  }

  public async deleteEmployeeSalary(
    companyId: string,
    salaryId: string,
  ): Promise<void> {
    validateObjectId(salaryId, "salaryId");

    await this.employeeSalaryDAO.deleteEmployeeSalary(salaryId, companyId);
  }
}
