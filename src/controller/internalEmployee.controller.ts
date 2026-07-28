import {
  Request,
  Response,
  NextFunction,
} from "express";

import { AccessScopeResult } from "@hrmssuite/persistence";
import { internalEmployeeService } from "../service";
 

export class InternalEmployeeController {
  public async searchEmployees(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const companyId = req.companyId!;

      const accessScope =
        req.body as AccessScopeResult;

      const employees =
        await internalEmployeeService.searchEmployees(
          companyId,
          accessScope,
        );

      return res.status(200).json({
        success: true,
        data: employees,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const internalEmployeeController =
  new InternalEmployeeController();