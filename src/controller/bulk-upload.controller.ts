import { Request, Response, NextFunction } from "express";
import { generateEmployeeTemplate } from "../helpers/excel-template.helper";
import { AppError } from "../helpers/error";

export class BulkUploadController {
  /**
   * GET /employees/bulk/template
   *
   * Generates and streams a company-specific Excel template file.
   * The template includes:
   *  - Amber headers for required fields, blue for optional
   *  - Dropdown lists for all enum fields
   *  - Dropdown lists for reference fields (department, designation, shift,
   *    roles, leave policies, reporting manager) populated from DB for
   *    the requesting company
   *  - A sample data row
   *  - An "Instructions" sheet with field descriptions
   */
  public async downloadTemplate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      if (!companyId) {
        res
          .status(400)
          .json({ success: false, message: "Company ID is required" });
        return;
      }

      const buffer = await generateEmployeeTemplate(companyId);

      const filename = `employee_upload_template_${Date.now()}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

      res.status(200).end(buffer);
    } catch (error) {
      if (error instanceof AppError) {
        res
          .status(error.statusCode)
          .json({ success: false, message: error.message, code: error.code });
        return;
      }
      next(error);
    }
  }
}
