import { Employee, EmployeeData } from "@hrmssuite/persistence";
import { EmployeeDAO } from "../Dao/employee.daos";
import {
  EmployeeSchema,
  EmployeeIdSchema,
  EmployeeEmailSchema,
  EmployeeIdNumberSchema,
  UpdateEmployeeSchema,
} from "../common/validators/employee.validator";
import {
  EmployeeQueryFilters,
  PaginatedEmployees,
} from "../typings/employee.typings";
import { AppError, ConflictError } from "../helpers/error";

/**
 * Re-throws AppError (NotFoundError / ValidationError / ConflictError /
 * BusinessRuleError / ConcurrentUpdateError) as-is so the controller can
 * map it to the right HTTP status. Anything else gets wrapped in a plain
 * Error with a fallback message, same as before.
 */
function rethrow(error: unknown, fallbackMessage: string): never {
  if (error instanceof AppError) {
    throw error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  ) {
    const duplicateError = error as {
      keyPattern?: Record<string, unknown>;
      keyValue?: Record<string, unknown>;
    };

    const fields = Object.keys(
      duplicateError.keyPattern ?? duplicateError.keyValue ?? {},
    );

    throw new ConflictError(
      `Duplicate employee value for: ${fields.join(", ") || "a unique field"}`,
    );
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  throw new Error(message);
}

export class EmployeeServices {
  private employeeDAO: EmployeeDAO;

  constructor() {
    this.employeeDAO = new EmployeeDAO();
  }

  /**
   * Validates and creates a new employee along with their seeded leave balance.
   *
   * Validates the full payload against EmployeeSchema before delegating to the
   * DAO, which handles the atomic insert + leave balance seed inside a transaction.
   *
   * @param data      - Full employee data payload
   * @param companyId - Owning company's ObjectId string
   * @returns The newly created Employee document
   * @throws {AppError} NotFoundError / ConflictError / BusinessRuleError / ValidationError
   */
  public async createEmployee(
    data: EmployeeData,
    companyId: string,
  ): Promise<Employee> {
    const parsed = EmployeeSchema.parse(data) as unknown as EmployeeData;

    try {
      const createdEmployee = await this.employeeDAO.createEmployee(
        parsed,
        companyId,
      );
      return createdEmployee;
    } catch (error: unknown) {
      rethrow(error, "Failed to create employee");
    }
  }

  /**
   * Returns a paginated, filterable list of employees for a company.
   *
   * Delegates directly to DAO's findAllEmployees which resolves both the
   * paginated data and total count in a single DB round-trip via $facet.
   *
   * Supported filters (all optional):
   * - search      → case-insensitive match on firstName / lastName / email
   * - department  → exact ObjectId match on data.job.department
   * - designation → exact ObjectId match on data.job.designation
   * - status      → exact match on data.job.status
   * - page        → 1-based page number (default: 1)
   * - limit       → page size (default: 10)
   *
   * @param companyId - Owning company's ObjectId string
   * @param filters   - Optional filter and pagination params
   * @returns Paginated result containing employees array, total count, and total pages
   * @throws {Error} If the DB query fails
   */
  public async findAllEmployees(
    companyId: string,
    filters: EmployeeQueryFilters = {},
  ): Promise<PaginatedEmployees> {
    try {
      const result = await this.employeeDAO.findAllEmployees(
        companyId,
        filters,
      );
      return result;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch employees";
      throw new Error(message);
    }
  }

  /**
   * Fetches a single employee by their MongoDB ObjectId, with all related
   * entities (designation, department, shift, leave policy, reporting manager,
   * leave balance) populated via a single aggregation pipeline.
   *
   * Validates the id format before querying.
   *
   * @param id        - Employee ObjectId string
   * @param companyId - Owning company's ObjectId string
   * @returns Fully populated Employee document, or null if not found / soft-deleted
   * @throws {Error} If id validation fails or the DB query fails
   */
  public async findById(
    id: string,
    companyId: string,
  ): Promise<Employee | null> {
    EmployeeIdSchema.parse(id);

    try {
      return await this.employeeDAO.findById(id, companyId);
    } catch (error: unknown) {
      rethrow(error, "Failed to fetch employee by id");
    }
  }

  /**
   * Fetches a single employee by their email address within a company.
   *
   * Useful for duplicate checks on creation and authentication flows.
   * Validates the email format before querying.
   *
   * @param email     - Email address to search for
   * @param companyId - Owning company's ObjectId string
   * @returns Employee document, or null if not found / soft-deleted
   * @throws {Error} If email validation fails or the DB query fails
   */
  public async findByEmail(
    email: string,
    companyId: string,
  ): Promise<Employee | null> {
    EmployeeEmailSchema.parse(email);

    try {
      return await this.employeeDAO.findByEmail(email, companyId);
    } catch (error: unknown) {
      rethrow(error, "Failed to fetch employee by email");
    }
  }

  /**
   * Fetches a single employee by their human-readable business-level employee
   * ID (e.g. "EMP001") within a company.
   *
   * Validates the employeeId format before querying.
   *
   * @param employeeId - Business-level employee ID string (e.g. "EMP001")
   * @param companyId  - Owning company's ObjectId string
   * @returns Employee document, or null if not found / soft-deleted
   * @throws {Error} If employeeId validation fails or the DB query fails
   */
  public async findByEmployeeId(
    employeeId: string,
    companyId: string,
  ): Promise<Employee | null> {
    EmployeeIdNumberSchema.parse(employeeId);

    try {
      return await this.employeeDAO.findByEmployeeId(employeeId, companyId);
    } catch (error: unknown) {
      rethrow(error, "Failed to fetch employee by employee id");
    }
  }

  /**
   * Validates and partially updates an employee's data.
   *
   * @throws {AppError} NotFoundError / ConflictError / BusinessRuleError /
   *                     ConcurrentUpdateError / ValidationError
   */
  public async updateEmployee(
    id: string,
    data: Partial<EmployeeData>,
    companyId: string,
    changedBy?: string,
  ): Promise<Employee | null> {
    EmployeeIdSchema.parse(id);
    const parsed = UpdateEmployeeSchema.parse(data) as Partial<EmployeeData>;

    try {
      return await this.employeeDAO.updateEmployee(
        id,
        parsed,
        companyId,
        changedBy,
      );
    } catch (error: unknown) {
      rethrow(error, "Failed to update employee");
    }
  }

  /**
   * Soft-deletes an employee after the DAO confirms it's safe to do so
   * (no pending leave/attendance/approval items, no active direct reports).
   *
   * @throws {AppError} NotFoundError / BusinessRuleError
   */
  public async softDelete(
    id: string,
    companyId: string,
    changedBy?: string,
  ): Promise<void> {
    EmployeeIdSchema.parse(id);

    try {
      await this.employeeDAO.softDelete(id, companyId, changedBy);
    } catch (error: unknown) {
      rethrow(error, "Failed to delete employee");
    }
  }
}
