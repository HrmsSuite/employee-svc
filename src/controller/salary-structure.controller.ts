// src/routes/salary-structure.controller.ts

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

import { AppError } from "../helpers/error";
import { SalaryStructureService } from "../service";

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

export class SalaryStructureController {
  private salaryStructureService: SalaryStructureService;

  constructor() {
    this.salaryStructureService = new SalaryStructureService();
  }

  /**
   * POST /salary-structures
   *
   * Create salary structure.
   */
  public async createSalaryStructure(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const structure = await this.salaryStructureService.createSalaryStructure(
        companyId,
        req.body,
      );

      res.status(201).json({
        success: true,
        message: "Salary structure created successfully",
        data: structure,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * GET /salary-structures/:structureId
   *
   * Get salary structure by ID.
   */
  public async getSalaryStructureById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;
      const rawStructureId = req.params.structureId;

      if (Array.isArray(rawStructureId)) {
        res.status(400).json({
          success: false,
          message: "Invalid structureId",
        });
        return;
      }

      if (!rawStructureId) {
        res.status(400).json({
          success: false,
          message: "Structure ID is required",
        });
        return;
      }

      const structureId = rawStructureId as string;

      const structure =
        await this.salaryStructureService.getSalaryStructureById(
          structureId,
          companyId,
        );

      if (!structure) {
        res.status(404).json({
          success: false,
          message: "Salary structure not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Salary structure fetched successfully",
        data: structure,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * GET /salary-structures
   *
   * Query params:
   *  - page  (default 1)
   *  - limit (default 50, max 100)
   */
  public async getAllSalaryStructures(
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
        await this.salaryStructureService.getAllSalaryStructures(
          companyId,
          page,
          limit,
        );

      res.status(200).json({
        success: true,
        message: "Salary structures fetched successfully",
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
   * PUT /salary-structures/:structureId
   *
   * Update salary structure.
   */
  public async updateSalaryStructure(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;
      const rawStructureId = req.params.structureId;

      if (Array.isArray(rawStructureId)) {
        res.status(400).json({
          success: false,
          message: "Invalid structureId",
        });
        return;
      }

      if (!rawStructureId) {
        res.status(400).json({
          success: false,
          message: "Structure ID is required",
        });
        return;
      }

      const structureId = rawStructureId as string;

      const updated = await this.salaryStructureService.updateSalaryStructure(
        structureId,
        companyId,
        req.body,
      );

      res.status(200).json({
        success: true,
        message: "Salary structure updated successfully",
        data: updated,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }

  /**
   * DELETE /salary-structures/:structureId
   *
   * Soft delete salary structure.
   */
  public async deleteSalaryStructure(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;
      const rawStructureId = req.params.structureId;

      if (Array.isArray(rawStructureId)) {
        res.status(400).json({
          success: false,
          message: "Invalid structureId",
        });
        return;
      }

      if (!rawStructureId) {
        res.status(400).json({
          success: false,
          message: "Structure ID is required",
        });
        return;
      }

      const structureId = rawStructureId as string;

      await this.salaryStructureService.deleteSalaryStructure(
        structureId,
        companyId,
      );

      res.status(200).json({
        success: true,
        message: "Salary structure deleted successfully",
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }
  public async changeSalaryStructureStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;
      const rawStructureId = req.params.structureId;

      if (Array.isArray(rawStructureId)) {
        res.status(400).json({
          success: false,
          message: "Invalid structureId",
        });
        return;
      }

      if (!rawStructureId) {
        res.status(400).json({
          success: false,
          message: "Structure ID is required",
        });
        return;
      }

      const structure =
        await this.salaryStructureService.changeSalaryStructureStatus(
          rawStructureId,
          companyId,
          req.body,
        );

      res.status(200).json({
        success: true,
        message: "Salary structure status updated successfully",
        data: structure,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }
}
