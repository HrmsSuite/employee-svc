import { Request, Response, NextFunction } from "express";
import { hierarchyService } from "../service";
import { ValidationError } from "../helpers/error";

export class HierarchyController {
  public async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;

      if (!employeeId || Array.isArray(employeeId)) {
        throw new ValidationError("Invalid employee id");
      }

      const companyId = req.companyId!;

      const employeeIds = await hierarchyService.getAllReports(
        companyId,
        employeeId,
      );

      return res.status(200).json({
        success: true,
        data: employeeIds,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const hierarchyController = new HierarchyController();
