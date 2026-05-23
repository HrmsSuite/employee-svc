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
   * @throws {Error} If validation fails or the referenced leave policy does not exist
   */
  public async createEmployee(
    data: EmployeeData,
    companyId: string,
  ): Promise<Employee> {
    EmployeeSchema.parse(data);

    try {
      const createdEmployee = await this.employeeDAO.createEmployee(
        data,
        companyId,
      );
      return createdEmployee;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create employee";
      throw new Error(message);
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
      const employee = await this.employeeDAO.findById(id, companyId);
      return employee;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch employee by id";
      throw new Error(message);
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
      const employee = await this.employeeDAO.findByEmail(email, companyId);
      return employee;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch employee by email";
      throw new Error(message);
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
      const employee = await this.employeeDAO.findByEmployeeId(
        employeeId,
        companyId,
      );
      return employee;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch employee by employee id";
      throw new Error(message);
    }
  }

  /**
   * Validates and partially updates an employee's data.
   *
   * Only fields present in the payload are updated (partial patch semantics).
   * When the leave policy changes, the DAO atomically replaces the leave
   * balance entry, carrying forward any already-used days.
   *
   * Both id and data are validated before delegating to the DAO, which
   * performs the update inside a transaction with optimistic concurrency control.
   *
   * @param id        - Employee ObjectId string
   * @param data      - Partial employee data — only provided fields are updated
   * @param companyId - Owning company's ObjectId string
   * @param changedBy - ObjectId string of the user making the change (for audit trail)
   * @returns Updated Employee document, or null if not found / soft-deleted
   * @throws {Error} If validation fails, the new leave policy does not exist,
   *                 or a concurrent modification is detected
   */
  public async updateEmployee(
    id: string,
    data: Partial<EmployeeData>,
    companyId: string,
    changedBy?: string,
  ): Promise<Employee | null> {
    EmployeeIdSchema.parse(id);
    UpdateEmployeeSchema.parse(data);

    try {
      const updatedEmployee = await this.employeeDAO.updateEmployee(
        id,
        data,
        companyId,
        changedBy,
      );
      return updatedEmployee;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update employee";
      throw new Error(message);
    }
  }

  /**
   * Soft-deletes an employee by setting meta.isDeleted = true.
   *
   * The employee will no longer appear in any find queries after deletion.
   * A "deleted" audit trail entry is appended atomically in the same operation.
   * Validates the id format before delegating to the DAO.
   *
   * @param id        - Employee ObjectId string
   * @param companyId - Owning company's ObjectId string
   * @param changedBy - ObjectId string of the user performing the deletion (for audit trail)
   * @returns void
   * @throws {Error} If id validation fails, or the employee is not found / already deleted
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
      const message =
        error instanceof Error ? error.message : "Failed to delete employee";
      throw new Error(message);
    }
  }
}
