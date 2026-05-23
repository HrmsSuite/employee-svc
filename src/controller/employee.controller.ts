import { Request, Response, NextFunction } from "express";
import { EmployeeServices } from "../service/employee.services";
import { ZodError } from "zod";

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

export class EmployeeController {
  private employeeServices: EmployeeServices;

  constructor() {
    this.employeeServices = new EmployeeServices();
  }

  /**
   * POST /employees
   *
   * Creates a new employee record for the authenticated company.
   *
   * The full employee payload is read from `req.body` and validated by the
   * service layer (EmployeeSchema). On success the newly created document is
   * returned with HTTP 201.
   *
   * @param req  - Express request. Expects `req.companyId` (set by auth middleware)
   *               and a valid employee payload in `req.body`.
   * @param res  - Express response.
   *               201 – employee created, body contains the new document.
   *               400 – Zod validation error, body lists field-level issues.
   * @param next - Express next function. Called on unexpected errors.
   * @returns    Promise<void>
   */
  public async createEmployee(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;
      const createdEmployee = await this.employeeServices.createEmployee(
        req.body,
        companyId,
      );
      res.status(201).json({
        success: true,
        message: "Employee created successfully",
        data: createdEmployee,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /employees
   *
   * Returns a paginated, filterable list of employees belonging to the
   * authenticated company. All query parameters are optional.
   *
   * Supported query params:
   * - `page`        {number}  1-based page number (default: 1, min: 1)
   * - `limit`       {number}  Page size (default: 10, min: 1, max: 100)
   * - `search`      {string}  Case-insensitive match on firstName / lastName / email
   * - `department`  {string}  ObjectId — filters by data.job.department
   * - `designation` {string}  ObjectId — filters by data.job.designation
   * - `status`      {string}  Exact match on data.job.status
   *
   * Delegates to the unified `findAllEmployees` service method which resolves
   * both the paginated data and the total count in a single DB round-trip.
   *
   * @param req  - Express request. Expects `req.companyId` and optional query params.
   * @param res  - Express response.
   *               200 – paginated result containing employees array, total count,
   *                     and total pages.
   * @param next - Express next function. Called on unexpected errors.
   * @returns    Promise<void>
   */
  public async findAll(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const filters = {
        page: Math.max(1, parseInt(req.query.page as string) || 1),
        limit: Math.max(
          1,
          Math.min(100, parseInt(req.query.limit as string) || 10),
        ),
        search: req.query.search as string | undefined,
        department: req.query.department as string | undefined,
        designation: req.query.designation as string | undefined,
        status: req.query.status as string | undefined,
      };

      const result = await this.employeeServices.findAllEmployees(
        companyId,
        filters,
      );

      res.status(200).json({
        success: true,
        message: "Employees fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /employees/:id
   *
   * Fetches a single employee by their MongoDB ObjectId, with all related
   * entities (designation, department, shift, leave policy, reporting manager,
   * leave balance) populated via a single aggregation pipeline in the service.
   *
   * Responds with 404 when no active (non-deleted) employee matches the given
   * id within the authenticated company.
   *
   * @param req  - Express request. Expects `req.params.id` (MongoDB ObjectId string)
   *               and `req.companyId`.
   * @param res  - Express response.
   *               200 – fully populated employee document.
   *               400 – missing id param or Zod validation error on id format.
   *               404 – employee not found or soft-deleted.
   * @param next - Express next function. Called on unexpected errors.
   * @returns    Promise<void>
   */
  public async findById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId as string;

      if (!id) {
        res.status(400).json({ success: false, message: "ID is required" });
        return;
      }

      const employee = await this.employeeServices.findById(id, companyId);
      if (!employee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee fetched successfully",
        data: employee,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /employees/email/:email
   *
   * Fetches a single employee by their email address within the authenticated
   * company. Useful for duplicate-checks during onboarding and for
   * authentication flows that need to resolve a user record by email.
   *
   * The email format is validated by the service layer (EmployeeEmailSchema)
   * before the DB is queried.
   *
   * @param req  - Express request. Expects `req.params.email` and `req.companyId`.
   * @param res  - Express response.
   *               200 – employee document matching the email.
   *               400 – missing email param or Zod validation error on email format.
   *               404 – employee not found or soft-deleted.
   * @param next - Express next function. Called on unexpected errors.
   * @returns    Promise<void>
   */
  public async findByEmail(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const email = req.params.email as string;
      const companyId = req.companyId as string;

      if (!email) {
        res.status(400).json({ success: false, message: "Email is required" });
        return;
      }

      const employee = await this.employeeServices.findByEmail(
        email,
        companyId,
      );
      if (!employee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee fetched successfully",
        data: employee,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /employees/employee-id/:employeeId
   *
   * Fetches a single employee by their human-readable business-level ID
   * (e.g. "EMP001") within the authenticated company.
   *
   * Unlike the MongoDB ObjectId used internally, this identifier is assigned
   * during onboarding and is the primary reference used in HR documents,
   * payslips, and integrations with third-party systems.
   *
   * The employeeId format is validated by the service layer
   * (EmployeeIdNumberSchema) before the DB is queried.
   *
   * @param req  - Express request. Expects `req.params.employeeId`
   *               (business-level ID, e.g. "EMP001") and `req.companyId`.
   * @param res  - Express response.
   *               200 – employee document matching the business-level ID.
   *               400 – missing employeeId param or Zod validation error.
   *               404 – employee not found or soft-deleted.
   * @param next - Express next function. Called on unexpected errors.
   * @returns    Promise<void>
   */
  public async findByEmployeeId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const employeeId = req.params.employeeId as string;
      const companyId = req.companyId as string;

      if (!employeeId) {
        res
          .status(400)
          .json({ success: false, message: "Employee ID is required" });
        return;
      }

      const employee = await this.employeeServices.findByEmployeeId(
        employeeId,
        companyId,
      );
      if (!employee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee fetched successfully",
        data: employee,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  /**
   * PATCH /employees/:id
   *
   * Partially updates an employee's data (patch semantics — only fields
   * present in `req.body` are modified). When the leave policy changes, the
   * service atomically replaces the leave balance entry while carrying forward
   * any already-used days.
   *
   * Both the id format and the partial payload are validated by the service
   * layer (EmployeeIdSchema + UpdateEmployeeSchema) before the DB is touched.
   * The update is performed inside a transaction with optimistic concurrency
   * control to guard against lost updates.
   *
   * @param req  - Express request. Expects `req.params.id` (MongoDB ObjectId),
   *               `req.companyId`, a partial employee payload in `req.body`,
   *               and optionally `req.user.id` for the audit trail.
   * @param res  - Express response.
   *               200 – updated employee document.
   *               400 – missing id param or Zod validation error.
   *               404 – employee not found or soft-deleted.
   * @param next - Express next function. Called on unexpected errors (including
   *               concurrent-modification conflicts).
   * @returns    Promise<void>
   */
  public async updateEmployee(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId as string;

      if (!id) {
        res.status(400).json({ success: false, message: "ID is required" });
        return;
      }

      const updatedEmployee = await this.employeeServices.updateEmployee(
        id,
        req.body,
        companyId,
        req.user?.id,
      );
      if (!updatedEmployee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee updated successfully",
        data: updatedEmployee,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  /**
   * DELETE /employees/:id
   *
   * Soft-deletes an employee by setting `meta.isDeleted = true`. The employee
   * will no longer appear in any list or lookup queries after this operation.
   *
   * A "deleted" audit-trail entry is appended atomically in the same DB
   * operation. The id format is validated by the service layer
   * (EmployeeIdSchema) before anything is written. The service will throw if
   * the employee is not found or is already deleted.
   *
   * @param req  - Express request. Expects `req.params.id` (MongoDB ObjectId),
   *               `req.companyId`, and optionally `req.user.id` for the audit
   *               trail.
   * @param res  - Express response.
   *               200 – deletion acknowledged (no body data).
   *               400 – missing id param or Zod validation error on id format.
   * @param next - Express next function. Called on unexpected errors (including
   *               employee-not-found / already-deleted errors from the service).
   * @returns    Promise<void>
   */
  public async softDelete(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId as string;

      if (!id) {
        res.status(400).json({ success: false, message: "ID is required" });
        return;
      }

      await this.employeeServices.softDelete(id, companyId, req.user?.id);
      res.status(200).json({
        success: true,
        message: "Employee deleted successfully",
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }
}
