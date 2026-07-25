import { Request, Response, NextFunction } from "express";
import { EmployeeServices } from "../service/employee.services";
import { ZodError } from "zod";
import { AppError } from "../helpers/error";

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

export class EmployeeController {
  private employeeServices: EmployeeServices;

  constructor() {
    this.employeeServices = new EmployeeServices();
  }

  public async createEmployee(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;
      const createdEmployee = await this.employeeServices.createEmployee(
        req.body,
        companyId,
      );
      res.status(201).json({
        success: true,
        message: "Employee created successfully",
        data: createdEmployee,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  public async findAll(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const filters = {
        page: Math.max(1, parseInt(req.query.page as string) || 1),
        limit: Math.max(
          1,
          Math.min(100, parseInt(req.query.limit as string) || 10),
        ),
        search: req.query.search as string | undefined,
        department: req.query.department as string | undefined,
        designation: req.query.designation as string | undefined,
        status: req.query.status as string | undefined,
      };

      const result = await this.employeeServices.findAllEmployees(
        companyId,
        filters,
      );

      res.status(200).json({
        success: true,
        message: "Employees fetched successfully",
        data: result,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  public async findById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId as string;

      if (!id) {
        res.status(400).json({ success: false, message: "ID is required" });
        return;
      }

      const employee = await this.employeeServices.findById(id, companyId);
      if (!employee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee fetched successfully",
        data: employee,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  public async findByEmail(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const email = req.params.email as string;
      const companyId = req.companyId as string;

      if (!email) {
        res.status(400).json({ success: false, message: "Email is required" });
        return;
      }

      const employee = await this.employeeServices.findByEmail(
        email,
        companyId,
      );
      if (!employee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee fetched successfully",
        data: employee,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  public async findByEmployeeId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const employeeId = req.params.employeeId as string;
      const companyId = req.companyId as string;

      if (!employeeId) {
        res
          .status(400)
          .json({ success: false, message: "Employee ID is required" });
        return;
      }

      const employee = await this.employeeServices.findByEmployeeId(
        employeeId,
        companyId,
      );
      if (!employee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee fetched successfully",
        data: employee,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  public async updateEmployee(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId as string;

      if (!id) {
        res.status(400).json({ success: false, message: "ID is required" });
        return;
      }

      const updatedEmployee = await this.employeeServices.updateEmployee(
        id,
        req.body,
        companyId,
        req.user?.id,
      );
      if (!updatedEmployee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee updated successfully",
        data: updatedEmployee,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  public async softDelete(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId as string;

      if (!id) {
        res.status(400).json({ success: false, message: "ID is required" });
        return;
      }

      await this.employeeServices.softDelete(id, companyId, req.user?.id);
      res.status(200).json({
        success: true,
        message: "Employee deleted successfully",
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }
}
