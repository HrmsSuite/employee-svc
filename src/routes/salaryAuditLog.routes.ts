// routes/salaryAuditLog.routes.ts

import { Router } from "express";
import { SalaryAuditLogController } from "../controller";
import { authenticate } from "@hrmssuite/persistence";

const router = Router();
const controller = new SalaryAuditLogController();

/**
 * GET /salary-audit-logs
 * Get all salary audit logs for the company.
 *
 * Query:
 *  - page
 *  - limit
 */
router.get("/salary-audit-logs", authenticate, (req, res, next) =>
  controller.getAllSalaryAuditLogs(req, res, next),
);

/**
 * GET /salary-audit-logs/entities/:entityType/:entityId
 * Get audit history for a specific salary entity.
 */
router.get(
  "/salary-audit-logs/entities/:entityType/:entityId",
  authenticate,
  (req, res, next) => controller.getEntitySalaryAuditLogs(req, res, next),
);

/**
 * GET /employees/:employeeId/salary-audit-logs
 * Get salary audit history for a specific employee.
 */
router.get(
  "/employees/:employeeId/salary-audit-logs",
  authenticate,
  (req, res, next) => controller.getEmployeeSalaryAuditLogs(req, res, next),
);

export default router;
