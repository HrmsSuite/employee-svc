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
      const companyId = req.companyId!;

      // JWT contains: role: "admin"
      const isAdmin = req.user?.role?.toLowerCase() === "admin";

      // Admin can access all employees without an employeeId
      if (isAdmin) {
        const visibleEmployeeIds = await hierarchyService.getVisibleEmployeeIds(
          companyId,
          "", // not required for admin
          true,
        );

        return res.status(200).json({
          success: true,
          data: {
            me: null,
            visibleEmployeeIds,
          },
        });
      }

      // Non-admins must have an employeeId
      if (!req.user?.employeeId) {
        throw new ValidationError("Invalid employee id");
      }

      const employeeId = req.user.employeeId;

      const visibleEmployeeIds = await hierarchyService.getVisibleEmployeeIds(
        companyId,
        employeeId,
        false,
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
