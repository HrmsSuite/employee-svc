// src/routes/salary-component.controller.ts

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

import { AppError } from "../helpers/error";
import { SalaryComponentService } from "../service";

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

export class SalaryComponentController {
  private salaryComponentService: SalaryComponentService;

  constructor() {
    this.salaryComponentService = new SalaryComponentService();
  }

  /**
   * POST /salary-components
   *
   * Create a salary component.
   */
  public async createSalaryComponent(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const component = await this.salaryComponentService.createSalaryComponent(
        companyId,
        req.body,
      );

      res.status(201).json({
        success: true,
        message: "Salary component created successfully",
        data: component,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * GET /salary-components/:componentId
   *
   * Get salary component by ID.
   */
  public async getSalaryComponentById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;
      const rawComponentId = req.params.componentId;

      if (Array.isArray(rawComponentId)) {
        res.status(400).json({
          success: false,
          message: "Invalid componentId",
        });
        return;
      }

      if (!rawComponentId) {
        res.status(400).json({
          success: false,
          message: "Component ID is required",
        });
        return;
      }

      const componentId = rawComponentId as string;

      const component =
        await this.salaryComponentService.getSalaryComponentById(
          componentId,
          companyId,
        );

      if (!component) {
        res.status(404).json({
          success: false,
          message: "Salary component not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Salary component fetched successfully",
        data: component,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * GET /salary-components
   *
   * Query params:
   *  - page  (default 1)
   *  - limit (default 50, max 100)
   */
  public async getAllSalaryComponents(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const rawPage = req.query.page;
      const rawLimit = req.query.limit;

      const page =
        typeof rawPage === "string"
          ? Math.max(1, parseInt(rawPage, 10) || 1)
          : 1;

      const limit =
        typeof rawLimit === "string"
          ? Math.max(1, Math.min(100, parseInt(rawLimit, 10) || 50))
          : 50;

      const { items, total } =
        await this.salaryComponentService.getAllSalaryComponents(
          companyId,
          page,
          limit,
        );

      res.status(200).json({
        success: true,
        message: "Salary components fetched successfully",
        data: {
          items,
          total,
          page,
          limit,
        },
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * PUT /salary-components/:componentId
   *
   * Update salary component.
   */
  public async updateSalaryComponent(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;
      const rawComponentId = req.params.componentId;

      if (Array.isArray(rawComponentId)) {
        res.status(400).json({
          success: false,
          message: "Invalid componentId",
        });
        return;
      }

      if (!rawComponentId) {
        res.status(400).json({
          success: false,
          message: "Component ID is required",
        });
        return;
      }

      const componentId = rawComponentId as string;

      const updated = await this.salaryComponentService.updateSalaryComponent(
        componentId,
        companyId,
        req.body,
      );

      res.status(200).json({
        success: true,
        message: "Salary component updated successfully",
        data: updated,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * DELETE /salary-components/:componentId
   *
   * Soft delete salary component.
   */
  public async deleteSalaryComponent(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;
      const rawComponentId = req.params.componentId;

      if (Array.isArray(rawComponentId)) {
        res.status(400).json({
          success: false,
          message: "Invalid componentId",
        });
        return;
      }

      if (!rawComponentId) {
        res.status(400).json({
          success: false,
          message: "Component ID is required",
        });
        return;
      }

      const componentId = rawComponentId as string;

      await this.salaryComponentService.deleteSalaryComponent(
        componentId,
        companyId,
      );

      res.status(200).json({
        success: true,
        message: "Salary component deleted successfully",
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }
}
