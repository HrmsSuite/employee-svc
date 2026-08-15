import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

import { AppError } from "../helpers/error";
import { processEmployeeBulkUpload } from "../helpers/employee-bulk-upload.helper";

const handleKnownError = (
  error: unknown,
  res: Response,
  next: NextFunction,
): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  next(error);
};

export class EmployeeBulkUploadController {
  /**
   * POST /employees/bulk/upload
   *
   * Accepts an Excel file, parses rows, and upserts employees.
   */
  public async upload(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      if (!companyId) {
        res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
        return;
      }

      if (!req.file || !req.file.buffer) {
        res.status(400).json({
          success: false,
          message: "Excel file is required",
        });
        return;
      }

      const result = await processEmployeeBulkUpload(
        companyId,
        req.file.buffer,
        req.user?.id,
      );

      res.status(200).json({
        success: true,
        message: "Employee bulk upload processed",
        data: result,
      });
    } catch (error) {
      handleKnownError(error, res, next);
    }
  }
}
