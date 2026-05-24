import {
  AuditEntry,
  Employee,
  EmployeeData,
  EmployeeModel,
  LeaveBalanceModel,
  LeavePolicyModel,
} from "@hrmssuite/persistence";
import mongoose, { Types } from "mongoose";
import {
  EmployeeQueryFilters,
  PaginatedEmployees,
} from "../typings/employee.typings";
import { buildSetFields } from "../helpers/buildSetFields";

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
  "data.job.department": 1,
  "data.job.employmentType": 1,
  "data.job.attendanceMode": 1,
  "data.job.dateOfJoining": 1,
  "data.job.reportingManagerId": 1,
  "data.job.shiftId": 1,
  "data.job.leavepolicy": 1,
  "data.job.designation": 1,
  "data.job.joinDate": 1,
  "data.compensation.salary": 1,
  "data.compensation.payFrequency": 1,
  "data.compensation.salaryStructure.basic": 1,
  "data.compensation.salaryStructure.hra": 1,
  "data.compensation.salaryStructure.allowances": 1,
  "data.compensation.salaryStructure.gross": 1,
  "data.compensation.salaryStructure.effectiveFrom": 1,
  "data.compensation.salaryHistory": 1,
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

// ─────────────────────────────────────────────
// DAO
// ─────────────────────────────────────────────

export class EmployeeDAO {
  // ── CREATE ──────────────────────────────────

  /**
   * Creates a new employee and seeds their leave balance atomically.
   *
   * Steps (inside a single transaction):
   * 1. Validate all leave policies exist (read-only — done before transaction)
   * 2. Insert the employee document
   * 3. Seed a LeaveBalance document with one entry per policy
   *
   * @param data      - Full employee data payload
   * @param companyId - Owning company's ObjectId string
   * @returns The created Employee document
   * @throws Error if any referenced leave policy is not found
   */
  public async createEmployee(
    data: EmployeeData,
    companyId: string,
  ): Promise<Employee> {
    // Validate all policy IDs before starting transaction — read-only
    const policyIds = data.job.leavepolicy;

    const policies = await LeavePolicyModel.find({
      _id: { $in: policyIds },
    });

    if (policies.length !== policyIds.length) {
      throw new Error("One or more leave policies not found");
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

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
   * Joins:
   * - designations       → data.job.designation
   * - departments        → data.job.department
   * - shifts             → data.job.shiftId
   * - leavepolicies      → data.job.leavepolicy
   * - employees (self)   → data.job.reportingManagerId  (name + email only)
   * - leavebalances      → leaveBalance
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

      // designation
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

      // department
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

      // shift
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

      // leave policy — array so NO $unwind
      {
        $lookup: {
          from: "leavepolicies",
          localField: "data.job.leavepolicy",
          foreignField: "_id",
          as: "data.job.leavepolicy",
          pipeline: [{ $project: { leaveTypeName: 1, maxDaysPerYear: 1 } }],
        },
      },

      // reporting manager (only essential fields)
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
   *
   * Uses $facet so total count and paginated data are fetched in ONE DB call.
   * Lookups run only inside the paginated branch (not for the count branch)
   * to avoid unnecessary work.
   *
   * Supported filters:
   * - search      → case-insensitive match on firstName / lastName / email
   * - department  → exact ObjectId match on data.job.department
   * - designation → exact ObjectId match on data.job.designation
   * - status      → exact match on data.job.status
   * - page        → 1-based page number (default: 1)
   * - limit       → page size (default: 10)
   *
   * @param companyId - Owning company's ObjectId string
   * @param filters   - Optional filter + pagination params
   * @returns Paginated result: employees array, total count, total pages
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

    if (filters.status) matchStage["data.job.status"] = filters.status;
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

    return {
      employees,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  // ── UPDATE ───────────────────────────────────

  /**
   * Partially updates an employee's data and, when the leave policy array
   * changes, atomically replaces all leave balance entries while carrying
   * forward previously used days per policy.
   *
   * Leave policy change logic:
   *   - All old policy entries removed from leave[] via $filter + $in
   *   - New policy entries appended via $concatArrays
   *   - used days carried forward per matching policyId
   *   - balance = newPolicy.maxDaysPerYear - usedDays (floored at 0)
   *
   * @param id        - Employee ObjectId string
   * @param data      - Partial employee data (only provided fields are updated)
   * @param companyId - Owning company's ObjectId string
   * @param changedBy - ObjectId string of the user making the change (for audit trail)
   * @returns Updated Employee document or null if not found / soft-deleted
   * @throws Error if any new leave policy is not found
   * @throws Error if employee or leave balance is not found
   * @throws Error if concurrent modification is detected
   */
  public async updateEmployee(
    id: string,
    data: Partial<EmployeeData>,
    companyId: string,
    changedBy?: string,
  ): Promise<Employee | null> {
    let newPolicies: InstanceType<typeof LeavePolicyModel>[] = [];
    if (data.job?.leavepolicy && data.job.leavepolicy.length > 0) {
      const policyObjectIds = data.job.leavepolicy.map(
        (id) => new Types.ObjectId(id),
      );
      newPolicies = await LeavePolicyModel.find({
        _id: { $in: policyObjectIds },
      });
      if (newPolicies.length !== data.job.leavepolicy.length) {
        throw new Error("One or more leave policies not found");
      }
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const employeeOid = new Types.ObjectId(id);
      const companyOid = new Types.ObjectId(companyId);

      const setFields = buildSetFields(data);
      const auditEntry: AuditEntry = {
        action: "updated",
        changedBy: changedBy ? new Types.ObjectId(changedBy) : undefined,
        changedAt: new Date(),
      };

      // Read current document inside transaction for version + old policy IDs
      const existingEmployee = await EmployeeModel.findOne({
        _id: employeeOid,
        companyId: companyOid,
        "meta.isDeleted": false,
      }).session(session);

      if (!existingEmployee) throw new Error("Employee not found");

      const oldPolicyIds: Types.ObjectId[] =
        existingEmployee.data.job.leavepolicy; // Types.ObjectId[]
      const currentVersion = existingEmployee.meta.version ?? 1;

      const updatePayload = {
        $set: {
          ...setFields,
          "meta.version": currentVersion + 1,
        },
        $push: {
          "meta.auditTrail": {
            $each: [auditEntry],
            $slice: -AUDIT_TRAIL_CAP,
          },
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
        {
          returnDocument: "after",
          runValidators: false,
          session,
        },
      );
      if (!updatedEmployee) {
        throw new Error(
          "Concurrent modification detected — please retry the update.",
        );
      }

      // Handle leave policy array change
      if (newPolicies.length > 0) {
        const currentBalance = await LeaveBalanceModel.findOne({
          employeeId: employeeOid,
          companyId: companyOid,
        }).session(session);

        if (!currentBalance) throw new Error("Leave balance not found");

        // Build new leave entries — carry forward used days if policy already existed
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

        // Stage 1: Remove all old policy entries
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

        // Stage 2: Append all new policy entries
        await LeaveBalanceModel.findOneAndUpdate(
          { employeeId: employeeOid, companyId: companyOid },
          {
            $push: {
              leave: { $each: newLeaveEntries },
            },
          },
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
   * Soft-deletes an employee by setting meta.isDeleted = true.
   * The employee will no longer appear in any findOne / findAll queries.
   * Also appends a "deleted" audit trail entry (capped at AUDIT_TRAIL_CAP).
   *
   * Single-document update is already atomic — no transaction needed.
   *
   * @param id        - Employee ObjectId string
   * @param companyId - Owning company's ObjectId string
   * @param changedBy - ObjectId string of the user performing the deletion
   * @throws Error if the employee is not found or already deleted
   */
  public async softDelete(
    id: string,
    companyId: string,
    changedBy?: string,
  ): Promise<void> {
    const deleted = await EmployeeModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        companyId: new Types.ObjectId(companyId),
        "meta.isDeleted": false,
      },
      {
        $set: { "meta.isDeleted": true },
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
    );

    if (!deleted) throw new Error("Employee not found or already deleted");
  }

  // ── LOOKUP HELPERS ───────────────────────────

  /**
   * Finds an employee by their email address within a company.
   *
   * @param email     - Email address to search for
   * @param companyId - Owning company's ObjectId string
   * @returns Employee document or null
   */
  public async findByEmail(
    email: string,
    companyId: string,
  ): Promise<Employee | null> {
    return EmployeeModel.findOne({
      "data.basic.email": email,
      companyId: new Types.ObjectId(companyId),
      "meta.isDeleted": false,
    });
  }

  /**
   * Finds an employee by their human-readable employeeId (e.g. "EMP001")
   * within a company.
   *
   * @param employeeId - Business-level employee ID string
   * @param companyId  - Owning company's ObjectId string
   * @returns Employee document or null
   */
  public async findByEmployeeId(
    employeeId: string,
    companyId: string,
  ): Promise<Employee | null> {
    return EmployeeModel.findOne({
      "data.basic.employeeId": employeeId,
      companyId: new Types.ObjectId(companyId),
      "meta.isDeleted": false,
    });
  }
}
