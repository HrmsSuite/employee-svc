// controllers/SalaryAuditLog.controller.ts

import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { SalaryAuditEntity } from "@hrmssuite/persistence";
import { SalaryAuditLogService } from "../service";

const VALID_ENTITY_TYPES: SalaryAuditEntity[] = [
  "SALARY_COMPONENT",
  "SALARY_STRUCTURE",
  "EMPLOYEE_SALARY",
];

// Hard ceiling regardless of what the client asks for — the
// company-wide feed in particular can't page through unbounded rows.
const MAX_LIMIT = 100;

function parsePagination(
  req: Request,
  defaultLimit: number,
): { page: number; limit: number } {
  const rawPage = Number.parseInt(String(req.query.page ?? ""), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawLimit = Number.parseInt(String(req.query.limit ?? ""), 10);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : defaultLimit;

  return { page, limit };
}

/**
 * Express can type route params as string | string[] depending on
 * the installed Express/Node typings.
 *
 * This helper guarantees that controllers only pass a single string
 * to the service layer.
 */
function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

/**
 * Pulls the tenant company from the authenticated request rather than
 * a URL param, matching how EmployeeSalaryController scopes its own
 * routes — a caller can't page through another company's audit trail
 * by editing a companyId in the path, because there isn't one.
 *
 * NOTE: adjust this to whatever `authenticate` actually attaches
 * (req.user.companyId / req.auth.companyId / etc.) — placeholder
 * shape assumed here.
 */
function getCompanyId(req: Request): string {
  return (req as any).user.companyId as string;
}

/**
 * Read-only controller for the salary audit trail. Deliberately has
 * no create/update/delete handlers — audit entries are written only
 * by the domain services that own the underlying state change, via
 * SalaryAuditLogService.recordSalaryAudit, not through this API.
 */
export class SalaryAuditLogController {
  constructor(
    private readonly service: SalaryAuditLogService = new SalaryAuditLogService(),
  ) {}

  /**
   * GET /salary-audit-logs
   * Company-wide salary audit feed.
   */
  public async getAllSalaryAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = getCompanyId(req);
      const { page, limit } = parsePagination(req, 50);

      const result = await this.service.getCompanyHistory(
        companyId,
        page,
        limit,
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /employees/:employeeId/salary-audit-logs
   * Salary audit history for a specific employee.
   */
  public async getEmployeeSalaryAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = getCompanyId(req);
      const employeeId = getSingleParam(req.params.employeeId);

      if (!employeeId || !Types.ObjectId.isValid(employeeId)) {
        res.status(400).json({ message: "Invalid employeeId" });
        return;
      }

      const { page, limit } = parsePagination(req, 25);

      const result = await this.service.getEmployeeHistory(
        companyId,
        employeeId,
        page,
        limit,
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /salary-audit-logs/entities/:entityType/:entityId
   * Audit history for a specific salary entity
   * (component/structure/employee-salary).
   */
  public async getEntitySalaryAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = getCompanyId(req);

      const entityType = getSingleParam(req.params.entityType);
      const entityId = getSingleParam(req.params.entityId);

      if (!entityId || !Types.ObjectId.isValid(entityId)) {
        res.status(400).json({ message: "Invalid entityId" });
        return;
      }

      if (
        !entityType ||
        !VALID_ENTITY_TYPES.includes(entityType as SalaryAuditEntity)
      ) {
        res.status(400).json({
          message: `Invalid entityType. Expected one of: ${VALID_ENTITY_TYPES.join(
            ", ",
          )}`,
        });
        return;
      }

      const { page, limit } = parsePagination(req, 25);

      const result = await this.service.getEntityHistory(
        companyId,
        entityType as SalaryAuditEntity,
        entityId,
        page,
        limit,
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
