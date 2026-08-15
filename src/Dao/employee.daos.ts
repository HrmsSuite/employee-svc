import {
  AuditEntry,
  Employee,
  EmployeeData,
  EmployeeModel,
  LeaveBalanceModel,
  TeamModel,
  LeaveRequestModel,
  WorkflowModel,
  AttendanceRegularize,
} from "@hrmssuite/persistence";
import mongoose, { Types } from "mongoose";
import {
  EmployeeQueryFilters,
  PaginatedEmployees,
} from "../typings/employee.typings";
import { buildSetFields } from "../helpers/buildSetFields";
import {
  validateRoles,
  validateLeavePolicies,
  validateReportingManager,
  validateDepartment,
  validateDesignation,
  validateShift,
  validateUniqueFields,
  validateStatusTransition,
  validateEmploymentDates,
  validateAttendanceModeShiftCompatibility,
} from "../helpers/validation.helpers";
import {
  NotFoundError,
  BusinessRuleError,
  ConcurrentUpdateError,
} from "../helpers/error";

/** Fields projected in list view — keeps payload small */
const LIST_PROJECT = {
  "data.basic.firstName": 1,
  "data.basic.lastName": 1,
  "data.basic.email": 1,
  "data.basic.gender": 1,
  "data.basic.employeeId": 1,
  "data.basic.dateOfBirth": 1,
  "data.job.employeeStatus": 1,
  "data.basic.profilePhoto": 1,
  "data.basic.phone": 1,
  "data.job.roleIds": 1,
  "data.job.department": 1,
  "data.job.employmentType": 1,
  "data.job.attendanceMode": 1,
  "data.job.dateOfJoining": 1,
  "data.job.reportingManagerId": 1,
  "data.job.shiftId": 1,
  "data.job.leavepolicy": 1,
  "data.job.designation": 1,
  "data.job.joinDate": 1,
  "data.address.currentAddress": 1,
  "data.address.permanentAddress": 1,
  "data.address.city": 1,
  "data.address.state": 1,
  "data.address.country": 1,
  "data.address.postalCode": 1,
  "data.bank.bankName": 1,
  "data.bank.accountNumber": 1,
  "data.bank.ifscCode": 1,
  "data.bank.branch": 1,
  "data.legal.panNumber": 1,
  "data.legal.aadhaarNumber": 1,
  "data.legal.uan": 1,
  "data.documents.type": 1,
  "data.documents.name": 1,
  "data.documents.url": 1,
  "data.payroll.payrollId": 1,
  "data.payroll.payrollGroupId": 1,
  "data.payroll.payslipPreference": 1,
  "data.tax.taxRegime": 1,
  "data.tax.taxDeclarationSubmitted": 1,
  "meta.createdAt": 1,
} as const;

/**
 * Maximum number of audit trail entries kept per employee.
 * Oldest entries are sliced off once this cap is reached,
 * preventing the embedded array from growing into the 16 MB BSON limit.
 */
const AUDIT_TRAIL_CAP = 200;

/** Top-level job/basic/legal fields whose change we log as a discrete diff entry. */
const DIFF_TRACKED_PATHS: { path: string; label: string }[] = [
  { path: "data.job.roleIds", label: "roleIds" },
  { path: "data.job.reportingManagerId", label: "reportingManagerId" },
  { path: "data.job.department", label: "department" },
  { path: "data.job.designation", label: "designation" },
  { path: "data.job.shiftId", label: "shiftId" },
  { path: "data.job.leavepolicy", label: "leavepolicy" },
  { path: "data.job.employeeStatus", label: "employeeStatus" },
  { path: "data.basic.email", label: "email" },
  { path: "data.basic.phone", label: "phone" },
];

function getAtPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && acc !== null && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function serializeForDiff(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => v?.toString?.() ?? v);
  return value?.toString?.() ?? value ?? null;
}
/** Builds a { field, before, after }[] diff for only the fields that actually changed. */
function buildFieldDiff(
  before: unknown,
  afterPartial: Partial<EmployeeData>,
): { field: string; before: unknown; after: unknown }[] {
  const diffs: { field: string; before: unknown; after: unknown }[] = [];
  for (const { path, label } of DIFF_TRACKED_PATHS) {
    if (getAtPath(afterPartial, path.replace(/^data\./, "")) === undefined)
      continue;
    const beforeVal = serializeForDiff(getAtPath(before, path));
    const afterVal = serializeForDiff(getAtPath({ data: afterPartial }, path));
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      diffs.push({ field: label, before: beforeVal, after: afterVal });
    }
  }
  return diffs;
}

function arraysEqualAsStrings(
  a?: (string | Types.ObjectId)[],
  b?: (string | Types.ObjectId)[],
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const as = [...a.map((x) => x.toString())].sort();
  const bs = [...b.map((x) => x.toString())].sort();
  return as.every((v, i) => v === bs[i]);
}

// ─────────────────────────────────────────────
// DAO
// ─────────────────────────────────────────────

export class EmployeeDAO {
  // ── CREATE ──────────────────────────────────

  /**
   * Creates a new employee and seeds their leave balance atomically.
   *
   * Validation order (fail fast, cheapest checks first):
   * 1. Uniqueness (employeeId, email, phone, PAN, Aadhaar, UAN) within company
   * 2. Department / designation / shift exist and belong to company
   * 3. Roles exist, active, not deleted, belong to company, no duplicates
   * 4. Leave policies exist, not deleted, belong to company, no duplicates
   * 5. Reporting manager exists, active, same company, not self
   * 6. HRMS date/salary/status sanity checks
   *
   * All of the above are re-validated once more *inside* the transaction
   * (cheap .lean() reads on the session) immediately before the writes,
   * closing the check-then-act race between the pre-transaction reads and
   * the commit.
   *
   * @param data      - Full employee data payload
   * @param companyId - Owning company's ObjectId string
   * @returns The created Employee document
   */
  public async createEmployee(
    data: EmployeeData,
    companyId: string,
  ): Promise<Employee> {
    const reportingManagerId = data.job.reportingManagerId;

    // ---- Pre-transaction validation (read-only) ----
    await validateUniqueFields(companyId, {
      employeeId: data.basic.employeeId,
      email: data.basic.email,
      phone: data.basic.phone,
      panNumber: data.legal?.panNumber,
      aadhaarNumber: data.legal?.aadhaarNumber,
      uan: data.legal?.uan,
    });

    if (data.job.department)
      await validateDepartment(data.job.department, companyId);
    if (data.job.designation)
      await validateDesignation(data.job.designation, companyId);
    if (data.job.shiftId) await validateShift(data.job.shiftId, companyId);

    // Deduplicate array inputs
    if (data.job.roleIds) {
      data.job.roleIds = [
        ...new Set(data.job.roleIds.map((id) => id.toString())),
      ].map((id) => new Types.ObjectId(id)) as any;
    }
    if (data.job.leavepolicy) {
      data.job.leavepolicy = [
        ...new Set(data.job.leavepolicy.map((id) => id.toString())),
      ].map((id) => new Types.ObjectId(id)) as any;
    }

    // Document duplicate prevention
    if (data.documents) {
      const docTypes = new Set<string>();
      for (const doc of data.documents) {
        if (docTypes.has(doc.type)) {
          throw new BusinessRuleError(
            `Duplicate document type found: ${doc.type}`,
          );
        }
        docTypes.add(doc.type);
      }
    }

    await validateRoles(data.job.roleIds ?? [], companyId);
    const policies = await validateLeavePolicies(
      data.job.leavepolicy ?? [],
      companyId,
    );

    let manager;
    if (reportingManagerId) {
      manager = await validateReportingManager(reportingManagerId, companyId);
    }

    validateEmploymentDates({
      dateOfJoining: data.job.dateOfJoining,
      dateOfExit: data.job.dateOfExit,
    });
    validateAttendanceModeShiftCompatibility(
      data.job.attendanceMode,
      data.job.shiftId,
    );

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // ---- Re-validate uniqueness inside the transaction to close the
      // race window between the read above and this write. ----
      await validateUniqueFields(
        companyId,
        {
          employeeId: data.basic.employeeId,
          email: data.basic.email,
          phone: data.basic.phone,
          panNumber: data.legal?.panNumber,
          aadhaarNumber: data.legal?.aadhaarNumber,
          uan: data.legal?.uan,
        },
        { session },
      );

      const [created] = await EmployeeModel.create(
        [
          {
            data,
            companyId,
            meta: {
              version: 1,
              isDeleted: false,
              auditTrail: [{ action: "created", changedAt: new Date() }],
            },
          },
        ],
        { session },
      );

      if (policies.length) {
        await LeaveBalanceModel.create(
          [
            {
              companyId,
              employeeId: created._id,
              leave: policies.map((policy) => ({
                policyId: policy._id,
                total: policy.maxDaysPerYear,
                used: 0,
                balance: policy.maxDaysPerYear,
              })),
            },
          ],
          { session },
        );
      }

      if (reportingManagerId && manager) {
        const departmentId = manager.data.job.department;
        await TeamModel.updateOne(
          { reportingManagerId, companyId },
          {
            $setOnInsert: {
              companyId,
              departmentId,
              reportingManagerId,
              name: `${manager.data.basic.firstName} Team`,
              chatChannelId: null,
            },
            $addToSet: { memberIds: created._id },
            $set: { "meta.updatedAt": new Date() },
          },
          { upsert: true, session, setDefaultsOnInsert: true },
        );
      }

      await session.commitTransaction();
      return created;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ── READ (single) ────────────────────────────

  /**
   * Fetches a single employee with all related entities joined via one
   * aggregation pipeline (1 DB round-trip instead of 7 populate calls).
   *
   * @param id        - Employee ObjectId string
   * @param companyId - Owning company's ObjectId string
   * @returns Populated Employee document or null if not found / soft-deleted
   */
  public async findById(
    id: string,
    companyId: string,
  ): Promise<Employee | null> {
    const result = await EmployeeModel.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(id),
          companyId: new Types.ObjectId(companyId),
          "meta.isDeleted": false,
        },
      },
      {
        $lookup: {
          from: "designations",
          localField: "data.job.designation",
          foreignField: "_id",
          as: "data.job.designation",
          pipeline: [
            {
              $project: { "data.name": 1, "data.sortHand": 1, "data.level": 1 },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$data.job.designation",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "data.job.department",
          foreignField: "_id",
          as: "data.job.department",
          pipeline: [{ $project: { "data.name": 1 } }],
        },
      },
      {
        $lookup: {
          from: "roles",
          localField: "data.job.roleIds",
          foreignField: "_id",
          as: "data.job.roleIds",
          pipeline: [
            { $match: { isDeleted: false, isActive: true } },
            { $project: { name: 1, code: 1, type: 1 } },
          ],
        },
      },
      {
        $unwind: {
          path: "$data.job.department",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "shifts",
          localField: "data.job.shiftId",
          foreignField: "_id",
          as: "data.job.shiftId",
          pipeline: [
            {
              $project: {
                "data.name": 1,
                "data.workingHours": 1,
                "data.halfDayThreshold": 1,
                "data.startTime": 1,
                "data.endTime": 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$data.job.shiftId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "leavepolicies",
          localField: "data.job.leavepolicy",
          foreignField: "_id",
          as: "data.job.leavepolicy",
          pipeline: [
            {
              $project: {
                leaveTypeName: 1,
                maxDaysPerYear: 1,
                backdatedAllowed: 1,
                maxBackdatedDays: 1,
                advanceNoticeDays: 1,
                approvalLevels: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "data.job.reportingManagerId",
          foreignField: "_id",
          as: "data.job.reportingManagerId",
          pipeline: [
            {
              $project: {
                "data.basic.firstName": 1,
                "data.basic.lastName": 1,
                "data.basic.email": 1,
                "data.basic.profilePhoto": 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$data.job.reportingManagerId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "leavebalances",
          localField: "_id",
          foreignField: "employeeId",
          as: "leaveBalance",
          pipeline: [
            {
              $lookup: {
                from: "leavepolicies",
                localField: "leave.policyId",
                foreignField: "_id",
                as: "policyDetails",
                pipeline: [
                  { $project: { leaveTypeName: 1, maxDaysPerYear: 1 } },
                ],
              },
            },
            {
              $addFields: {
                leave: {
                  $map: {
                    input: "$leave",
                    as: "entry",
                    in: {
                      policyId: "$$entry.policyId",
                      total: "$$entry.total",
                      used: "$$entry.used",
                      balance: "$$entry.balance",
                      leaveTypeName: {
                        $let: {
                          vars: {
                            matched: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$policyDetails",
                                    as: "p",
                                    cond: {
                                      $eq: ["$$p._id", "$$entry.policyId"],
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          },
                          in: "$$matched.leaveTypeName",
                        },
                      },
                    },
                  },
                },
              },
            },
            { $project: { policyDetails: 0 } },
          ],
        },
      },
      { $unwind: { path: "$leaveBalance", preserveNullAndEmptyArrays: true } },
    ]);

    return result[0] ?? null;
  }

  // ── READ (paginated list) ────────────────────

  /**
   * Returns a paginated, filterable list of employees for a company.
   */
  public async findAllEmployees(
    companyId: string,
    filters: EmployeeQueryFilters = {},
  ): Promise<PaginatedEmployees> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, filters.limit ?? 10);
    const skip = (page - 1) * limit;

    const matchStage: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
      "meta.isDeleted": false,
    };
    if (filters.visibleEmployeeIds && filters.visibleEmployeeIds.length > 0) {
      matchStage["_id"] = {
        $in: filters.visibleEmployeeIds.map((id) => new Types.ObjectId(id)),
      };
    }

    if (filters.status) {
      matchStage["data.job.employeeStatus"] = filters.status;
    }
    if (filters.department)
      matchStage["data.job.department"] = new Types.ObjectId(
        filters.department,
      );
    if (filters.designation)
      matchStage["data.job.designation"] = new Types.ObjectId(
        filters.designation,
      );
    if (filters.search) {
      const regex = { $regex: filters.search, $options: "i" };
      matchStage["$or"] = [
        { "data.basic.firstName": regex },
        { "data.basic.lastName": regex },
        { "data.basic.email": regex },
      ];
    }

    const [result] = await EmployeeModel.aggregate([
      { $match: matchStage },
      { $sort: { _id: 1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "departments",
                localField: "data.job.department",
                foreignField: "_id",
                as: "data.job.department",
                pipeline: [{ $project: { "data.name": 1 } }],
              },
            },
            {
              $unwind: {
                path: "$data.job.department",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "designations",
                localField: "data.job.designation",
                foreignField: "_id",
                as: "data.job.designation",
                pipeline: [
                  { $project: { "data.name": 1, "data.sortHand": 1 } },
                ],
              },
            },
            {
              $lookup: {
                from: "roles",
                localField: "data.job.roleIds",
                foreignField: "_id",
                as: "data.job.roleIds",
                pipeline: [
                  { $match: { isDeleted: false, isActive: true } },
                  { $project: { name: 1, code: 1, type: 1 } },
                ],
              },
            },
            {
              $unwind: {
                path: "$data.job.designation",
                preserveNullAndEmptyArrays: true,
              },
            },
            { $project: LIST_PROJECT },
          ],
          total: [{ $count: "count" }],
        },
      },
      {
        $project: {
          employees: "$data",
          total: { $arrayElemAt: ["$total.count", 0] },
        },
      },
    ]);

    const total = result?.total ?? 0;
    const employees = result?.employees ?? [];

    return { employees, total, pages: Math.ceil(total / limit) };
  }

  // ── UPDATE ───────────────────────────────────

  /**
   * Partially updates an employee's data and, when the leave policy array
   * changes, atomically replaces all leave balance entries while carrying
   * forward previously used days per policy.
   *
   * Fixes vs. the original implementation:
   * - Leave-policy lookup now scoped by companyId (previously a cross-tenant leak)
   * - department / designation / shift are validated when present in the patch
   * - reporting manager: existence + same-company + active + not-self +
   *   circular-hierarchy are all checked before the write
   * - roleIds / leavepolicy: duplicate-id checks
   * - uniqueness (email/phone/PAN/Aadhaar/UAN/employeeId) re-checked, excluding self
   * - leave balance is only recalculated when the *set* of policy ids actually changed
   * - status transitions are validated against the allowed state machine
   * - before/after diff + a list of changed field names is stored on the audit entry
   * - reporting-manager changes get a dedicated audit entry, separate from the generic update entry
   *
   * @param id        - Employee ObjectId string
   * @param data      - Partial employee data (only provided fields are updated)
   * @param companyId - Owning company's ObjectId string
   * @param changedBy - ObjectId string of the user making the change (for audit trail)
   * @returns Updated Employee document or null if not found / soft-deleted
   */
  public async updateEmployee(
    id: string,
    data: Partial<EmployeeData>,
    companyId: string,
    changedBy?: string,
  ): Promise<Employee | null> {
    const employeeOid = new Types.ObjectId(id);
    const companyOid = new Types.ObjectId(companyId);

    // ---- Pre-transaction validation (read-only) ----
    const existingEmployee = await EmployeeModel.findOne({
      _id: employeeOid,
      companyId: companyOid,
      "meta.isDeleted": false,
    });
    if (!existingEmployee) throw new NotFoundError("Employee not found");

    await validateUniqueFields(
      companyId,
      {
        employeeId: data.basic?.employeeId,
        email: data.basic?.email,
        phone: data.basic?.phone,
        panNumber: data.legal?.panNumber,
        aadhaarNumber: data.legal?.aadhaarNumber,
        uan: data.legal?.uan,
      },
      { excludeEmployeeId: id },
    );

    if (data.job?.department)
      await validateDepartment(data.job.department, companyId);
    if (data.job?.designation)
      await validateDesignation(data.job.designation, companyId);
    if (data.job?.shiftId) await validateShift(data.job.shiftId, companyId);

    // Deduplicate array inputs
    if (data.job?.roleIds) {
      data.job.roleIds = [
        ...new Set(data.job.roleIds.map((id) => id.toString())),
      ].map((id) => new Types.ObjectId(id)) as any;
    }
    if (data.job?.leavepolicy) {
      data.job.leavepolicy = [
        ...new Set(data.job.leavepolicy.map((id) => id.toString())),
      ].map((id) => new Types.ObjectId(id)) as any;
    }

    // Document duplicate prevention
    if (data.documents) {
      const docTypes = new Set<string>();
      for (const doc of data.documents) {
        if (docTypes.has(doc.type)) {
          throw new BusinessRuleError(
            `Duplicate document type found: ${doc.type}`,
          );
        }
        docTypes.add(doc.type);
      }
    }

    if (data.job?.roleIds) await validateRoles(data.job.roleIds, companyId);

    let newPolicies: Awaited<ReturnType<typeof validateLeavePolicies>> = [];
    const oldPolicyIds: Types.ObjectId[] =
      existingEmployee.data.job.leavepolicy ?? [];
    const policyIdsChanged =
      !!data.job?.leavepolicy &&
      !arraysEqualAsStrings(
        data.job.leavepolicy,
        oldPolicyIds as unknown as string[],
      );

    if (data.job?.leavepolicy && policyIdsChanged) {
      newPolicies = await validateLeavePolicies(
        data.job.leavepolicy,
        companyId,
      );
    }

    const oldReportingManagerId =
      existingEmployee.data.job.reportingManagerId?.toString();
    const newReportingManagerId = data.job?.reportingManagerId?.toString();
    const managerChanged =
      data.job &&
      Object.prototype.hasOwnProperty.call(data.job, "reportingManagerId");
    const managerActuallyChanged =
      managerChanged && oldReportingManagerId !== newReportingManagerId;

    let newManager;
    if (managerActuallyChanged && newReportingManagerId) {
      newManager = await validateReportingManager(
        newReportingManagerId,
        companyId,
        id,
      );
    }

    if (data.job?.employeeStatus) {
      validateStatusTransition(
        existingEmployee.data.job.employeeStatus,
        data.job.employeeStatus,
      );
    }

    validateEmploymentDates({
      dateOfJoining:
        data.job?.dateOfJoining ?? existingEmployee.data.job.dateOfJoining,
      dateOfExit: data.job?.dateOfExit ?? existingEmployee.data.job.dateOfExit,
    });
    validateAttendanceModeShiftCompatibility(
      data.job?.attendanceMode ?? existingEmployee.data.job.attendanceMode,
      data.job?.shiftId ?? existingEmployee.data.job.shiftId,
    );

    // Nothing to persist? Short-circuit rather than bumping version/audit trail for a no-op.
    const setFields = buildSetFields(data);
    if (Object.keys(setFields).length === 0) {
      return existingEmployee;
    }

    const fieldDiff = buildFieldDiff(
      existingEmployee.toObject?.() ?? existingEmployee,
      data,
    );

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // Re-read inside the session to get the authoritative version for
      // optimistic locking and to re-validate uniqueness against the
      // latest state.
      const freshEmployee = await EmployeeModel.findOne({
        _id: employeeOid,
        companyId: companyOid,
        "meta.isDeleted": false,
      }).session(session);
      if (!freshEmployee) throw new NotFoundError("Employee not found");

      await validateUniqueFields(
        companyId,
        {
          employeeId: data.basic?.employeeId,
          email: data.basic?.email,
          phone: data.basic?.phone,
          panNumber: data.legal?.panNumber,
          aadhaarNumber: data.legal?.aadhaarNumber,
          uan: data.legal?.uan,
        },
        { excludeEmployeeId: id, session },
      );

      const currentVersion = freshEmployee.meta.version ?? 1;

      const auditEntry: AuditEntry = {
        action: "updated",
        changedBy: changedBy ? new Types.ObjectId(changedBy) : undefined,
        changedAt: new Date(),
        changedFields: fieldDiff.map((d) => d.field),
        diff: fieldDiff,
      } as AuditEntry;

      const pushEntries: AuditEntry[] = [auditEntry];
      if (managerActuallyChanged) {
        pushEntries.push({
          action: "reporting_manager_changed",
          changedBy: changedBy ? new Types.ObjectId(changedBy) : undefined,
          changedAt: new Date(),
          before: oldReportingManagerId ?? null,
          after: newReportingManagerId ?? null,
        } as AuditEntry);
      }
      if (data.job?.roleIds) {
        pushEntries.push({
          action: "roles_changed",
          changedBy: changedBy ? new Types.ObjectId(changedBy) : undefined,
          changedAt: new Date(),
          before: (existingEmployee.data.job.roleIds ?? []).map((r) =>
            r.toString(),
          ),
          after: data.job.roleIds.map((r) => r.toString()),
        } as AuditEntry);
      }

      const updatePayload = {
        $set: { ...setFields, "meta.version": currentVersion + 1 },
        $push: {
          "meta.auditTrail": { $each: pushEntries, $slice: -AUDIT_TRAIL_CAP },
        },
      };

      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        {
          _id: employeeOid,
          companyId: companyOid,
          "meta.isDeleted": false,
          "meta.version": currentVersion,
        },
        updatePayload,
        { returnDocument: "after", runValidators: false, session },
      );
      if (!updatedEmployee) {
        throw new ConcurrentUpdateError();
      }

      // ---- Team management on manager change ----
      if (managerActuallyChanged) {
        if (oldReportingManagerId) {
          const oldTeam = await TeamModel.findOneAndUpdate(
            {
              reportingManagerId: oldReportingManagerId,
              companyId: companyOid,
            },
            {
              $pull: { memberIds: employeeOid },
              $set: { "meta.updatedAt": new Date() },
            },
            { session, returnDocument: "after" },
          );
          // Delete the team if it's now empty (and the manager isn't the
          // sole reason it exists going forward — business rule: an empty
          // team with no members is pruned).
          if (
            oldTeam &&
            (!oldTeam.memberIds || oldTeam.memberIds.length === 0)
          ) {
            await TeamModel.deleteOne({ _id: oldTeam._id }, { session });
          }
        }

        if (newReportingManagerId && newManager) {
          if (newReportingManagerId === employeeOid.toString()) {
            throw new BusinessRuleError(
              "Manager cannot be added to their own team as a member",
            );
          }
          await TeamModel.updateOne(
            {
              reportingManagerId: newReportingManagerId,
              companyId: companyOid,
            },
            {
              $setOnInsert: {
                companyId: companyOid,
                departmentId: newManager.data.job.department,
                reportingManagerId: newManager._id,
                name: `${newManager.data.basic.firstName} Team`,
                chatChannelId: null,
              },
              $addToSet: { memberIds: employeeOid },
              $set: { "meta.updatedAt": new Date() },
            },
            { upsert: true, session, setDefaultsOnInsert: true },
          );
        }
      }

      // If the manager's own department changed elsewhere and this
      // employee's department wasn't explicitly patched, keep the team
      // record's departmentId in sync so it doesn't silently drift.
      if (data.job?.department && newReportingManagerId) {
        await TeamModel.updateMany(
          { reportingManagerId: newReportingManagerId, companyId: companyOid },
          {
            $set: {
              departmentId: data.job.department,
              "meta.updatedAt": new Date(),
            },
          },
          { session },
        );
      }

      // ---- Leave balance recalculation — only when the policy set actually changed ----
      if (policyIdsChanged) {
        const currentBalance = await LeaveBalanceModel.findOne({
          employeeId: employeeOid,
          companyId: companyOid,
        }).session(session);
        if (!currentBalance) throw new NotFoundError("Leave balance not found");

        const newLeaveEntries = newPolicies.map((policy) => {
          const oldEntry = currentBalance.leave.find(
            (l) => l.policyId.toString() === policy._id.toString(),
          );
          const alreadyUsed = oldEntry?.used ?? 0;
          const newBalance = Math.max(0, policy.maxDaysPerYear - alreadyUsed);
          return {
            policyId: policy._id,
            total: policy.maxDaysPerYear,
            used: alreadyUsed,
            balance: newBalance,
          };
        });

        await LeaveBalanceModel.findOneAndUpdate(
          { employeeId: employeeOid, companyId: companyOid },
          {
            $pull: {
              leave: {
                policyId: {
                  $in: oldPolicyIds.map(
                    (oid) => new Types.ObjectId(oid.toString()),
                  ),
                },
              },
            },
          },
          { session },
        );
        await LeaveBalanceModel.findOneAndUpdate(
          { employeeId: employeeOid, companyId: companyOid },
          { $push: { leave: { $each: newLeaveEntries } } },
          { new: true, session },
        );
      }

      await session.commitTransaction();
      return updatedEmployee;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ── SOFT DELETE ──────────────────────────────

  /**
   * Soft-deletes an employee by setting meta.isDeleted = true, after
   * confirming it's safe to do so:
   * - no pending leave requests
   * - no pending attendance regularizations
   * - no pending workflow approvals
   * - not currently managing other active employees
   *
   * Also removes the employee from any team's memberIds and, best-effort,
   * deactivates their linked account if one is tracked on the document.
   *
   * @param id        - Employee ObjectId string
   * @param companyId - Owning company's ObjectId string
   * @param changedBy - ObjectId string of the user performing the deletion
   */
  public async softDelete(
    id: string,
    companyId: string,
    changedBy?: string,
  ): Promise<void> {
    const employeeOid = new Types.ObjectId(id);
    const companyOid = new Types.ObjectId(companyId);

    const employee = await EmployeeModel.findOne({
      _id: employeeOid,
      companyId: companyOid,
      "meta.isDeleted": false,
    }).lean();
    if (!employee)
      throw new NotFoundError("Employee not found or already deleted");

    const [
      pendingLeave,
      pendingRegularization,
      pendingApproval,
      directReportsCount,
    ] = await Promise.all([
      LeaveRequestModel.countDocuments({
        employeeId: employeeOid,
        companyId: companyOid,
        status: { $in: ["pending", "approved"] },
      }),
      AttendanceRegularize.countDocuments({
        employeeId: employeeOid,
        companyId: companyOid,
        status: "PENDING",
      }),
      WorkflowModel.countDocuments({
        $or: [{ requestedBy: employeeOid }, { approverId: employeeOid }],
        companyId: companyOid,
        status: "pending",
      }),
      EmployeeModel.countDocuments({
        "data.job.reportingManagerId": employeeOid,
        companyId: companyOid,
        "meta.isDeleted": false,
        "data.job.employeeStatus": "Active",
      }),
    ]);

    if (pendingLeave > 0) {
      throw new BusinessRuleError(
        "Cannot delete employee with pending leave requests",
      );
    }
    if (pendingRegularization > 0) {
      throw new BusinessRuleError(
        "Cannot delete employee with pending attendance regularizations",
      );
    }
    if (pendingApproval > 0) {
      throw new BusinessRuleError(
        "Cannot delete employee with pending workflow approvals",
      );
    }
    if (directReportsCount > 0) {
      throw new BusinessRuleError(
        "Cannot delete employee who still manages active employees — reassign their reports first",
      );
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const deleted = await EmployeeModel.findOneAndUpdate(
        { _id: employeeOid, companyId: companyOid, "meta.isDeleted": false },
        {
          $set: {
            "meta.isDeleted": true,
            "data.job.employeeStatus": "Terminated",
          },
          $push: {
            "meta.auditTrail": {
              $each: [
                {
                  action: "deleted",
                  changedBy: changedBy
                    ? new Types.ObjectId(changedBy)
                    : undefined,
                  changedAt: new Date(),
                },
              ],
              $slice: -AUDIT_TRAIL_CAP,
            },
          },
        },
        { session },
      );
      if (!deleted)
        throw new NotFoundError("Employee not found or already deleted");

      // Remove from any team membership
      await TeamModel.updateMany(
        { companyId: companyOid, memberIds: employeeOid },
        {
          $pull: { memberIds: employeeOid },
          $set: { "meta.updatedAt": new Date() },
        },
        { session },
      );
      await TeamModel.deleteMany(
        { companyId: companyOid, memberIds: { $size: 0 } },
        { session },
      );

      // TODO: Publish EMPLOYEE_DELETED event or update a linked Auth/User model
      // to ensure account is deactivated. Since AccountModel is not in this service,
      // it should be handled via inter-service communication (e.g., event bus).
      // Example: await EventBus.publish("EMPLOYEE_DELETED", { employeeId: employeeOid, companyId: companyOid });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ── LOOKUP HELPERS ───────────────────────────

  public async findByEmail(
    email: string,
    companyId: string,
  ): Promise<Employee | null> {
    return EmployeeModel.findOne({
      "data.basic.email": email,
      companyId: new Types.ObjectId(companyId),
      "meta.isDeleted": false,
    }).lean();
  }

  public async findByEmployeeId(
    employeeId: string,
    companyId: string,
  ): Promise<Employee | null> {
    return EmployeeModel.findOne({
      "data.basic.employeeId": employeeId,
      companyId: new Types.ObjectId(companyId),
      "meta.isDeleted": false,
    }).lean();
  }
}
