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
  public async getMyReports(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.employeeId) {
        throw new ValidationError("Invalid employee id");
      }

      const employeeId = req.user.employeeId;

      console.log("GET_MY_REPORTS employeeId:", employeeId);

      const companyId = req.companyId!;

      const isAdmin = req.user?.role?.includes("ADMIN") ?? false;
      const visibleEmployeeIds = await hierarchyService.getVisibleEmployeeIds(
        companyId,
        employeeId,
        isAdmin,
      );

      return res.status(200).json({
        success: true,
        data: {
          me: employeeId,
          visibleEmployeeIds,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const hierarchyController = new HierarchyController();
