import { Router } from "express";
import { EmployeeSalaryController } from "../controller";
import { authenticate } from "@hrmssuite/persistence";

const router = Router();
const controller = new EmployeeSalaryController();

/**
 * POST /employees/:employeeId/salaries
 * Create a new salary assignment for an employee.
 */
router.post("/employees/:employeeId/salaries", authenticate, (req, res, next) =>
  controller.createEmployeeSalary(req, res, next),
);

/**
 * GET /employees/:employeeId/salaries/current
 * Get current active salary of an employee.
 */
router.get(
  "/employees/:employeeId/salaries/current",
  authenticate,
  (req, res, next) => controller.getCurrentEmployeeSalary(req, res, next),
);

/**
 * GET /employees/:employeeId/salaries
 * Get salary history for a specific employee.
 */
router.get("/employees/:employeeId/salaries", authenticate, (req, res, next) =>
  controller.getEmployeeSalaryHistory(req, res, next),
);

/**
 * GET /employee-salaries
 *
 * Get all employee salaries for the company.
 *
 * Query:
 *  - page
 *  - limit
 *  - search
 *  - status
 *  - departmentId
 *  - salaryStructureId
 */
router.get("/employee-salaries", authenticate, (req, res, next) =>
  controller.getAllEmployeeSalaries(req, res, next),
);

/**
 * GET /employee-salaries/:salaryId
 * Get salary by ID.
 */
router.get("/employee-salaries/:salaryId", authenticate, (req, res, next) =>
  controller.getEmployeeSalaryById(req, res, next),
);

/**
 * PUT /employee-salaries/:salaryId
 * Update salary (non-status fields).
 */
router.put("/employee-salaries/:salaryId", authenticate, (req, res, next) =>
  controller.updateEmployeeSalary(req, res, next),
);

/**
 * POST /employees/:employeeId/salaries/:salaryId/activate
 * Activate salary for an employee.
 */
router.post(
  "/employees/:employeeId/salaries/:salaryId/activate",
  authenticate,
  (req, res, next) => controller.activateEmployeeSalary(req, res, next),
);

/**
 * POST /employee-salaries/:salaryId/deactivate
 * Deactivate salary.
 */
router.post(
  "/employee-salaries/:salaryId/deactivate",
  authenticate,
  (req, res, next) => controller.deactivateEmployeeSalary(req, res, next),
);

/**
 * DELETE /employee-salaries/:salaryId
 * Delete salary.
 */
router.delete("/employee-salaries/:salaryId", authenticate, (req, res, next) =>
  controller.deleteEmployeeSalary(req, res, next),
);

export default router;
