// src/routes/employee-salary.controller.ts

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

import { AppError } from "../helpers/error";
import { EmployeeSalaryService } from "../service";

/**
 * Zod validation error formatter.
 */
const handleZodError = (error: ZodError, res: Response): void => {
  res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    })),
  });
};

/**
 * Central error responder: maps typed AppErrors (NotFoundError,
 * ValidationError, ConflictError, BusinessRuleError, ConcurrentUpdateError)
 * to their matching HTTP status; falls back to `next(error)` for anything
 * unexpected so it reaches the app-level error handler / logger.
 */
const handleKnownError = (
  error: unknown,
  res: Response,
  next: NextFunction,
): void => {
  if (error instanceof ZodError) {
    handleZodError(error, res);
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
    });
    return;
  }

  next(error);
};

export class EmployeeSalaryController {
  private employeeSalaryService: EmployeeSalaryService;

  constructor() {
    this.employeeSalaryService = new EmployeeSalaryService();
  }

  /**
   * POST /employees/:employeeId/salaries
   *
   * Create a new salary assignment for an employee.
   */
  public async createEmployeeSalary(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const rawEmployeeId = req.params.employeeId;
      if (Array.isArray(rawEmployeeId)) {
        res.status(400).json({
          success: false,
          message: "Invalid employeeId",
        });
        return;
      }
      if (!rawEmployeeId) {
        res.status(400).json({
          success: false,
          message: "Employee ID is required",
        });
        return;
      }
      const employeeId = rawEmployeeId as string;

      const salary = await this.employeeSalaryService.createEmployeeSalary(
        companyId,
        employeeId,
        req.body,
      );

      res.status(201).json({
        success: true,
        message: "Employee salary created successfully",
        data: salary,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * GET /employees/:employeeId/salaries/current
   *
   * Get current active salary of an employee.
   */
  public async getCurrentEmployeeSalary(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const rawEmployeeId = req.params.employeeId;
      if (Array.isArray(rawEmployeeId)) {
        res.status(400).json({
          success: false,
          message: "Invalid employeeId",
        });
        return;
      }
      if (!rawEmployeeId) {
        res.status(400).json({
          success: false,
          message: "Employee ID is required",
        });
        return;
      }
      const employeeId = rawEmployeeId as string;

      const salary = await this.employeeSalaryService.getCurrentEmployeeSalary(
        companyId,
        employeeId,
      );

      if (!salary) {
        res.status(404).json({
          success: false,
          message: "Active salary not found for this employee",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Current employee salary fetched successfully",
        data: salary,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * GET /employee-salaries
   *
   * Get all employee salaries for the company.
   *
   * Query:
   *  - page
   *  - limit
   *  - search
   *  - status
   *  - departmentId
   *  - salaryStructureId
   */
  public async getAllEmployeeSalaries(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const rawPage = req.query.page;
      const rawLimit = req.query.limit;
      const rawSearch = req.query.search;
      const rawStatus = req.query.status;
      const rawDepartmentId = req.query.departmentId;
      const rawSalaryStructureId = req.query.salaryStructureId;

      const page =
        typeof rawPage === "string"
          ? Math.max(1, parseInt(rawPage, 10) || 1)
          : 1;

      const limit =
        typeof rawLimit === "string"
          ? Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 50))
          : 50;

      const search =
        typeof rawSearch === "string" && rawSearch.trim()
          ? rawSearch.trim()
          : undefined;

      const status =
        typeof rawStatus === "string" && rawStatus.trim()
          ? rawStatus.trim()
          : undefined;

      const departmentId =
        typeof rawDepartmentId === "string" && rawDepartmentId.trim()
          ? rawDepartmentId.trim()
          : undefined;

      const salaryStructureId =
        typeof rawSalaryStructureId === "string" && rawSalaryStructureId.trim()
          ? rawSalaryStructureId.trim()
          : undefined;

      const result = await this.employeeSalaryService.getAllEmployeeSalaries(
        companyId,
        {
          page,
          limit,
          search,
          status,
          departmentId,
          salaryStructureId,
        },
      );

      res.status(200).json({
        success: true,
        message: "Employee salaries fetched successfully",
        data: result,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * GET /employee-salaries/:salaryId
   *
   * Get salary by ID.
   */
  public async getEmployeeSalaryById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const rawSalaryId = req.params.salaryId;
      if (Array.isArray(rawSalaryId)) {
        res.status(400).json({
          success: false,
          message: "Invalid salaryId",
        });
        return;
      }
      if (!rawSalaryId) {
        res.status(400).json({
          success: false,
          message: "Salary ID is required",
        });
        return;
      }
      const salaryId = rawSalaryId as string;

      const salary = await this.employeeSalaryService.getEmployeeSalaryById(
        companyId,
        salaryId,
      );

      res.status(200).json({
        success: true,
        message: "Employee salary fetched successfully",
        data: salary,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * GET /employees/:employeeId/salaries
   *
   * Get salary history (paginated).
   * Query:
   *  - page  (default 1)
   *  - limit (default 25, max 100)
   */
  public async getEmployeeSalaryHistory(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const rawEmployeeId = req.params.employeeId;
      if (Array.isArray(rawEmployeeId)) {
        res.status(400).json({
          success: false,
          message: "Invalid employeeId",
        });
        return;
      }
      if (!rawEmployeeId) {
        res.status(400).json({
          success: false,
          message: "Employee ID is required",
        });
        return;
      }
      const employeeId = rawEmployeeId as string;

      const rawPage = req.query.page;
      const rawLimit = req.query.limit;

      const page =
        typeof rawPage === "string"
          ? Math.max(1, parseInt(rawPage, 10) || 1)
          : 1;

      const limit =
        typeof rawLimit === "string"
          ? Math.max(1, Math.min(100, parseInt(rawLimit, 10) || 25))
          : 25;

      const result = await this.employeeSalaryService.getEmployeeSalaryHistory(
        companyId,
        employeeId,
        page,
        limit,
      );

      res.status(200).json({
        success: true,
        message: "Employee salary history fetched successfully",
        data: result,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * PUT /employee-salaries/:salaryId
   *
   * Update salary (non-status fields).
   */
  public async updateEmployeeSalary(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const rawSalaryId = req.params.salaryId;
      if (Array.isArray(rawSalaryId)) {
        res.status(400).json({
          success: false,
          message: "Invalid salaryId",
        });
        return;
      }
      if (!rawSalaryId) {
        res.status(400).json({
          success: false,
          message: "Salary ID is required",
        });
        return;
      }
      const salaryId = rawSalaryId as string;

      const updated = await this.employeeSalaryService.updateEmployeeSalary(
        companyId,
        salaryId,
        req.body,
      );

      res.status(200).json({
        success: true,
        message: "Employee salary updated successfully",
        data: updated,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * POST /employee-salaries/:salaryId/activate
   *
   * Activate salary for an employee.
   */
  public async activateEmployeeSalary(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const rawSalaryId = req.params.salaryId;
      const rawEmployeeId = req.params.employeeId;

      if (Array.isArray(rawSalaryId) || Array.isArray(rawEmployeeId)) {
        res.status(400).json({
          success: false,
          message: "Invalid salaryId or employeeId",
        });
        return;
      }

      if (!rawSalaryId || !rawEmployeeId) {
        res.status(400).json({
          success: false,
          message: "Salary ID and Employee ID are required",
        });
        return;
      }

      const salaryId = rawSalaryId as string;
      const employeeId = rawEmployeeId as string;

      const updated = await this.employeeSalaryService.activateEmployeeSalary(
        companyId,
        salaryId,
        employeeId,
      );

      res.status(200).json({
        success: true,
        message: "Employee salary activated successfully",
        data: updated,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * POST /employee-salaries/:salaryId/deactivate
   *
   * Deactivate salary.
   */
  public async deactivateEmployeeSalary(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const rawSalaryId = req.params.salaryId;
      if (Array.isArray(rawSalaryId)) {
        res.status(400).json({
          success: false,
          message: "Invalid salaryId",
        });
        return;
      }
      if (!rawSalaryId) {
        res.status(400).json({
          success: false,
          message: "Salary ID is required",
        });
        return;
      }
      const salaryId = rawSalaryId as string;

      const updated = await this.employeeSalaryService.deactivateEmployeeSalary(
        companyId,
        salaryId,
      );

      res.status(200).json({
        success: true,
        message: "Employee salary deactivated successfully",
        data: updated,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * DELETE /employee-salaries/:salaryId
   */
  public async deleteEmployeeSalary(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const rawSalaryId = req.params.salaryId;
      if (Array.isArray(rawSalaryId)) {
        res.status(400).json({
          success: false,
          message: "Invalid salaryId",
        });
        return;
      }
      if (!rawSalaryId) {
        res.status(400).json({
          success: false,
          message: "Salary ID is required",
        });
        return;
      }
      const salaryId = rawSalaryId as string;

      await this.employeeSalaryService.deleteEmployeeSalary(
        companyId,
        salaryId,
      );

      res.status(200).json({
        success: true,
        message: "Employee salary deleted successfully",
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }
}
