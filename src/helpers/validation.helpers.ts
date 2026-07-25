import { Types, ClientSession } from "mongoose";
import {
  EmployeeModel,
  RolesModel,
  LeavePolicyModel,
  DepartmentModel,
  DesignationModel,
  ShiftModel,
} from "@hrmssuite/persistence";
// NOTE: DepartmentModel / DesignationModel / ShiftModel are assumed to be
// exported from @hrmssuite/persistence (they already back the "departments",
// "designations" and "shifts" collections used in the aggregation pipelines
// in the DAO). Rename the imports here if your package exports them under
// different names.

const oid = (v: string | Types.ObjectId) =>
  v instanceof Types.ObjectId ? v : new Types.ObjectId(v);

/**
 * Every helper below:
 * - always filters by companyId (multi-tenant isolation)
 * - always excludes soft-deleted docs where the model supports it
 * - accepts an optional mongoose ClientSession so it can be safely
 *   re-run *inside* a transaction right before the write (closes the
 *   TOCTOU gap of validating before the transaction starts)
 * - uses .lean() since these are pure existence/shape checks
 */

export async function validateDepartment(
  departmentId: string | Types.ObjectId,
  companyId: string | Types.ObjectId,
  session?: ClientSession,
): Promise<void> {
  const dept = await DepartmentModel.findOne(
    {
      _id: oid(departmentId),
      companyId: oid(companyId),
      isDeleted: { $ne: true },
    },
    { _id: 1 },
  )
    .session(session ?? null)
    .lean();
  if (!dept) throw new NotFoundError("Department not found for this company");
}

export async function validateDesignation(
  designationId: string | Types.ObjectId,
  companyId: string | Types.ObjectId,
  session?: ClientSession,
): Promise<void> {
  const designation = await DesignationModel.findOne(
    {
      _id: oid(designationId),
      companyId: oid(companyId),
      isDeleted: { $ne: true },
    },
    { _id: 1 },
  )
    .session(session ?? null)
    .lean();
  if (!designation)
    throw new NotFoundError("Designation not found for this company");
}

export async function validateShift(
  shiftId: string | Types.ObjectId,
  companyId: string | Types.ObjectId,
  session?: ClientSession,
): Promise<void> {
  const shift = await ShiftModel.findOne(
    { _id: oid(shiftId), companyId: oid(companyId), isDeleted: { $ne: true } },
    { _id: 1 },
  )
    .session(session ?? null)
    .lean();
  if (!shift) throw new NotFoundError("Shift not found for this company");
}

/**
 * Validates roleIds: must exist, be active, not soft-deleted, belong to the
 * company, and contain no duplicates.
 */
export async function validateRoles(
  roleIds: (string | Types.ObjectId)[],
  companyId: string | Types.ObjectId,
  session?: ClientSession,
): Promise<void> {
  if (!roleIds || roleIds.length === 0) return;

  const asStrings = roleIds.map((r) => r.toString());
  const unique = new Set(asStrings);
  if (unique.size !== asStrings.length) {
    throw new ConflictError("Duplicate roleIds provided");
  }

  const roles = await RolesModel.find(
    {
      _id: { $in: roleIds.map(oid) },
      companyId: oid(companyId),
      isDeleted: false,
      isActive: true,
    },
    { _id: 1 },
  )
    .session(session ?? null)
    .lean();

  if (roles.length !== unique.size) {
    throw new NotFoundError(
      "One or more roles not found, inactive, deleted, or belong to another company",
    );
  }
}

/**
 * Validates leave-policy ids: must exist, not be soft-deleted, belong to the
 * company, and contain no duplicates. Returns the full policy docs so
 * callers (e.g. leave-balance seeding) don't have to re-query.
 */
export async function validateLeavePolicies(
  policyIds: (string | Types.ObjectId)[],
  companyId: string | Types.ObjectId,
  session?: ClientSession,
) {
  if (!policyIds || policyIds.length === 0) return [];

  const asStrings = policyIds.map((p) => p.toString());
  const unique = new Set(asStrings);
  if (unique.size !== asStrings.length) {
    throw new ConflictError("Duplicate leave policy IDs provided");
  }

  const policies = await LeavePolicyModel.find({
    _id: { $in: policyIds.map(oid) },
    companyId: oid(companyId),
    isDeleted: { $ne: true },
  })
    .session(session ?? null)
    .lean();

  if (policies.length !== unique.size) {
    throw new NotFoundError(
      "One or more leave policies not found, deleted, or belong to another company",
    );
  }
  return policies;
}

/**
 * Validates a reporting-manager assignment:
 * - manager must exist, belong to the same company, not be soft-deleted
 * - manager must be active (employeeStatus === "Active")
 * - manager cannot be the employee themself
 * - (if employeeId is known, i.e. update flow) assigning must not create a cycle
 */
export async function validateReportingManager(
  managerId: string | Types.ObjectId,
  companyId: string | Types.ObjectId,
  employeeId?: string | Types.ObjectId,
  session?: ClientSession,
) {
  const managerIdStr = managerId.toString();
  const companyIdStr = oid(companyId).toString();

  if (employeeId && managerIdStr === employeeId.toString()) {
    throw new BusinessRuleError(
      "An employee cannot be their own reporting manager",
    );
  }

  if (managerIdStr === companyIdStr) {
    return null;
  }

  const manager = await EmployeeModel.findOne({
    _id: oid(managerId),
    companyId: oid(companyId),
    "meta.isDeleted": false,
  }).session(session ?? null);

  if (!manager) {
    throw new NotFoundError("Reporting manager not found for this company");
  }

  if (
    manager.data.job.employeeStatus &&
    manager.data.job.employeeStatus !== "Active"
  ) {
    throw new BusinessRuleError("Reporting manager must be an active employee");
  }

  if (employeeId) {
    await validateNoCircularHierarchy(
      employeeId,
      managerId,
      companyId,
      session,
    );
  }

  return manager;
}

/**
 * Walks the proposed manager's reporting chain upward. If it ever reaches
 * `employeeId`, assigning `newManagerId` as the manager would create a
 * cycle (A → B → C → A), which is rejected. Also enforces a sane max depth
 * so a data-integrity issue elsewhere can't spin this into an infinite loop.
 */
export async function validateNoCircularHierarchy(
  employeeId: string | Types.ObjectId,
  newManagerId: string | Types.ObjectId,
  companyId: string | Types.ObjectId,
  session?: ClientSession,
  maxDepth = 50,
): Promise<void> {
  let currentId: string | undefined = newManagerId.toString();
  const targetId = employeeId.toString();
  let depth = 0;

  while (currentId && depth < maxDepth) {
    if (currentId === targetId) {
      throw new BusinessRuleError(
        "This assignment would create a circular reporting hierarchy",
      );
    }
    const current = await EmployeeModel.findOne(
      {
        _id: oid(currentId),
        companyId: oid(companyId),
        "meta.isDeleted": false,
      },
      { "data.job.reportingManagerId": 1 },
    )
      .session(session ?? null)
      .lean();

    currentId = current?.data?.job?.reportingManagerId?.toString();
    depth++;
  }

  if (depth >= maxDepth) {
    throw new BusinessRuleError(
      "Reporting hierarchy exceeds maximum allowed depth — possible data integrity issue",
    );
  }
}

export interface UniqueFieldCheck {
  email?: string;
  phone?: string;
  employeeId?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  uan?: string;
}

/**
 * Checks employeeId / email / phone / PAN / Aadhaar / UAN uniqueness
 * scoped to the company, excluding a given employee id (for updates) and,
 * by default, excluding soft-deleted records (so a rehire with the same
 * email as a previously-deleted profile is allowed). Pass
 * `includeDeleted: true` if your business rules require lifetime
 * uniqueness even across deleted employees.
 */
export async function validateUniqueFields(
  companyId: string | Types.ObjectId,
  fields: UniqueFieldCheck,
  options: {
    excludeEmployeeId?: string;
    includeDeleted?: boolean;
    session?: ClientSession;
  } = {},
): Promise<void> {
  const { excludeEmployeeId, includeDeleted = false, session } = options;

  const orClauses: Record<string, unknown>[] = [];
  if (fields.employeeId)
    orClauses.push({ "data.basic.employeeId": fields.employeeId });
  if (fields.email) orClauses.push({ "data.basic.email": fields.email });
  if (fields.phone) orClauses.push({ "data.basic.phone": fields.phone });
  if (fields.panNumber)
    orClauses.push({ "data.legal.panNumber": fields.panNumber });
  if (fields.aadhaarNumber)
    orClauses.push({ "data.legal.aadhaarNumber": fields.aadhaarNumber });
  if (fields.uan) orClauses.push({ "data.legal.uan": fields.uan });

  if (orClauses.length === 0) return;

  const query: Record<string, unknown> = {
    companyId: oid(companyId),
    $or: orClauses,
  };
  if (!includeDeleted) query["meta.isDeleted"] = false;
  if (excludeEmployeeId) query["_id"] = { $ne: oid(excludeEmployeeId) };

  const clash = await EmployeeModel.findOne(query, {
    "data.basic.employeeId": 1,
    "data.basic.email": 1,
    "data.basic.phone": 1,
    "data.legal.panNumber": 1,
    "data.legal.aadhaarNumber": 1,
    "data.legal.uan": 1,
  })
    .session(session ?? null)
    .lean();

  if (!clash) return;

  const clashedOn: string[] = [];
  if (fields.employeeId && clash.data?.basic?.employeeId === fields.employeeId)
    clashedOn.push("employeeId");
  if (fields.email && clash.data?.basic?.email === fields.email)
    clashedOn.push("email");
  if (fields.phone && clash.data?.basic?.phone === fields.phone)
    clashedOn.push("phone");
  if (fields.panNumber && clash.data?.legal?.panNumber === fields.panNumber)
    clashedOn.push("PAN");
  if (
    fields.aadhaarNumber &&
    clash.data?.legal?.aadhaarNumber === fields.aadhaarNumber
  )
    clashedOn.push("Aadhaar");
  if (fields.uan && clash.data?.legal?.uan === fields.uan)
    clashedOn.push("UAN");

  throw new ConflictError(
    `Duplicate value(s) within this company for: ${clashedOn.join(", ") || "unknown field"}`,
  );
}

/**
 * Allowed forward transitions for employeeStatus.
 * Matches the enum in employee.validator.ts: "Active" | "Inactive" | "On Leave" | "Terminated".
 * "Terminated" is treated as terminal (post-exit); adjust if your business allows rehire-in-place.
 */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  Active: ["Active", "Inactive", "On Leave", "Terminated"],
  Inactive: ["Inactive", "Active", "Terminated"],
  "On Leave": ["On Leave", "Active", "Terminated"],
  Terminated: ["Terminated"],
};

export function validateStatusTransition(
  oldStatus: string,
  newStatus: string,
): void {
  if (oldStatus === newStatus) return;
  const allowed = STATUS_TRANSITIONS[oldStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new BusinessRuleError(
      `Invalid employee status transition: ${oldStatus} → ${newStatus}`,
    );
  }
}

/**
 * Matches the fields actually present on JobDetailsSchema: `dateOfJoining`
 * (required) and `dateOfExit` (optional). If `probationEndDate` is provided,
 * it validates that the probation period falls after the joining date and
 * before the exit date.
 */
export function validateEmploymentDates(params: {
  dateOfJoining?: Date | string;
  dateOfExit?: Date | string;
  probationEndDate?: Date | string;
}): void {
  const { dateOfJoining, dateOfExit, probationEndDate } = params;
  let doj: Date | undefined;
  let exit: Date | undefined;

  if (dateOfJoining) {
    doj = new Date(dateOfJoining);
    if (Number.isNaN(doj.getTime())) {
      throw new ValidationErrorSafe("Invalid dateOfJoining");
    }
  }

  if (dateOfExit && doj) {
    exit = new Date(dateOfExit);
    if (Number.isNaN(exit.getTime())) {
      throw new ValidationErrorSafe("Invalid dateOfExit");
    }
    if (exit <= doj) {
      throw new ValidationErrorSafe("dateOfExit must be after dateOfJoining");
    }
  }

  if (probationEndDate && doj) {
    const probationEnd = new Date(probationEndDate);
    if (Number.isNaN(probationEnd.getTime())) {
      throw new ValidationErrorSafe("Invalid probationEndDate");
    }
    if (probationEnd <= doj) {
      throw new ValidationErrorSafe(
        "probationEndDate must be after dateOfJoining",
      );
    }
    if (exit && probationEnd >= exit) {
      throw new ValidationErrorSafe(
        "probationEndDate must be before dateOfExit",
      );
    }
  }
}

export function validateSalary(salary?: number): void {
  if (salary === undefined || salary === null) return;
  if (typeof salary !== "number" || Number.isNaN(salary) || salary <= 0) {
    throw new ValidationErrorSafe("salary must be a positive number");
  }
}

/**
 * Matches the enum in employee.validator.ts: "Manual" | "Biometric" | "GPS" | "Hybrid".
 * Business rule assumption: attendance modes that rely on a defined working
 * window ("Biometric", "Hybrid") need a shift assigned to validate check-in/out
 * times against. "Manual" and "GPS" don't require one. Adjust if your actual
 * rule differs.
 */
export function validateAttendanceModeShiftCompatibility(
  attendanceMode?: string,
  shiftId?: unknown,
): void {
  if (
    (attendanceMode === "Biometric" || attendanceMode === "Hybrid") &&
    !shiftId
  ) {
    throw new ValidationErrorSafe(
      `attendanceMode '${attendanceMode}' requires a shiftId to be assigned`,
    );
  }
}

// Local import indirection to avoid a circular import concern if this file
// is ever imported by errors.ts in the future — kept as a thin re-export.
import { ValidationError as ValidationErrorSafe } from "./error";
import { BusinessRuleError, ConflictError, NotFoundError } from "./error";
