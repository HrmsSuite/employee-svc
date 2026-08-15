import {
  EmployeeSalary,
  EmployeeSalaryModel,
  EmployeeModel,
  SalaryStructureModel,
} from "@hrmssuite/persistence";
import mongoose, { Types } from "mongoose";
import { BusinessRuleError, NotFoundError } from "../helpers/error";
import { SalaryAuditLogDAO } from "./Salary-audit-log.dao";
import {
  AuditContext,
  SYSTEM_AUDIT_CONTEXT,
} from "../helpers/Auditcontext.helpers";
import { diffObjects } from "../helpers/Auditdiff.helpers";
import { GetAllEmployeeSalariesDAOOptions } from "../typings/employee.typings";

/** Mongo duplicate-key error code */
const MONGO_DUPLICATE_KEY = 11000;

export class EmployeeSalaryDAO {
  constructor(
    private readonly salaryAuditLogDAO: SalaryAuditLogDAO = new SalaryAuditLogDAO(),
  ) {}

  /**
   * Create salary assignment for an employee.
   *
   * revisionNumber is computed server-side inside the transaction —
   * never trusted from the caller.
   *
   * KNOWN RESIDUAL RISK (documented, not silently fixed): without a
   * partial unique index on { companyId, employeeId, status: "ACTIVE" }
   * at the schema level, the app-level "existing ACTIVE" check plus
   * transaction snapshot isolation narrows the race window for two
   * concurrent ACTIVE creates, but does not close it with the same
   * guarantee a DB constraint would. Explicit snapshot read concern
   * is set below to make this as tight as possible without a schema
   * change.
   */
  public async createEmployeeSalary(
    companyId: string,
    employeeId: string,
    data: Omit<
      EmployeeSalary,
      | "_id"
      | "companyId"
      | "employeeId"
      | "revisionNumber"
      | "createdAt"
      | "updatedAt"
    >,
    auditContext: AuditContext = SYSTEM_AUDIT_CONTEXT,
  ): Promise<EmployeeSalary> {
    const companyOid = new Types.ObjectId(companyId);
    const employeeOid = new Types.ObjectId(employeeId);

    const employee = await EmployeeModel.findOne({
      _id: employeeOid,
      companyId: companyOid,
      "meta.isDeleted": false,
    }).lean();

    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    if (data.salaryStructureId) {
      const salaryStructure = await SalaryStructureModel.findOne({
        _id: new Types.ObjectId(data.salaryStructureId.toString()),
        companyId: companyOid,
        isDeleted: false,
      }).lean();

      if (!salaryStructure) {
        throw new NotFoundError("Salary structure not found");
      }
    }

    const session = await mongoose.startSession();

    try {
      let created: EmployeeSalary | undefined;

      await session.withTransaction(
        async () => {
          if (data.status === "ACTIVE") {
            const existingActive = await EmployeeSalaryModel.findOne({
              companyId: companyOid,
              employeeId: employeeOid,
              status: "ACTIVE",
            }).session(session);

            if (existingActive) {
              throw new BusinessRuleError(
                "Employee already has an active salary",
              );
            }
          }

          const lastRevision = await EmployeeSalaryModel.findOne({
            companyId: companyOid,
            employeeId: employeeOid,
          })
            .sort({ revisionNumber: -1 })
            .select({ revisionNumber: 1 })
            .session(session)
            .lean();

          const nextRevisionNumber = (lastRevision?.revisionNumber ?? 0) + 1;

          const [doc] = await EmployeeSalaryModel.create(
            [
              {
                companyId: companyOid,
                employeeId: employeeOid,
                ...data,
                revisionNumber: nextRevisionNumber,
              },
            ],
            { session },
          );

          created = doc.toObject();

          await this.salaryAuditLogDAO.createAuditLog(
            {
              companyId: companyOid,
              entityType: "EMPLOYEE_SALARY",
              entityId: doc._id as Types.ObjectId,
              employeeId: employeeOid,
              action: "CREATED",
              context: auditContext,
              after: created as unknown as Record<string, unknown>,
              metadata: { revisionNumber: nextRevisionNumber },
            },
            session,
          );
        },
        {
          // Tightens the race window on the ACTIVE-salary check as
          // much as possible without a schema-level unique index.
          readConcern: "snapshot",
          writeConcern: { w: "majority" },
        },
      );

      if (!created) {
        throw new Error("Failed to create employee salary");
      }

      return created;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: number }).code === MONGO_DUPLICATE_KEY
      ) {
        throw new BusinessRuleError(
          "A conflicting salary revision was created concurrently. Please retry.",
        );
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  public async getCurrentEmployeeSalary(
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeSalary | null> {
    return EmployeeSalaryModel.findOne({
      companyId: new Types.ObjectId(companyId),
      employeeId: new Types.ObjectId(employeeId),
      status: "ACTIVE",
    }).lean();
  }

  public async getEmployeeSalaryById(
    salaryId: string,
    companyId: string,
  ): Promise<EmployeeSalary | null> {
    const salaryOid = new Types.ObjectId(salaryId);
    const companyOid = new Types.ObjectId(companyId);

    const [result] = await EmployeeSalaryModel.aggregate([
      {
        $match: {
          _id: salaryOid,
          companyId: companyOid,
        },
      },

      // Employee
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Salary Structure
      {
        $lookup: {
          from: "salary_structures",
          localField: "salaryStructureId",
          foreignField: "_id",
          as: "salaryStructure",
        },
      },
      {
        $unwind: {
          path: "$salaryStructure",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Salary Components
      {
        $unwind: {
          path: "$components",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "salarycomponents",
          localField: "components.componentId",
          foreignField: "_id",
          as: "salaryComponent",
        },
      },
      {
        $unwind: {
          path: "$salaryComponent",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Rebuild the document
      {
        $group: {
          _id: "$_id",

          companyId: { $first: "$companyId" },
          employeeId: { $first: "$employeeId" },
          salaryStructureId: { $first: "$salaryStructureId" },
          salaryStructureVersion: {
            $first: "$salaryStructureVersion",
          },

          payFrequency: { $first: "$payFrequency" },
          currency: { $first: "$currency" },

          totals: { $first: "$totals" },

          effectiveFrom: { $first: "$effectiveFrom" },
          effectiveTo: { $first: "$effectiveTo" },

          status: { $first: "$status" },
          source: { $first: "$source" },
          revisionNumber: { $first: "$revisionNumber" },
          revisionReason: { $first: "$revisionReason" },

          approvedBy: { $first: "$approvedBy" },
          approvedAt: { $first: "$approvedAt" },

          rejectedBy: { $first: "$rejectedBy" },
          rejectedAt: { $first: "$rejectedAt" },
          rejectionReason: { $first: "$rejectionReason" },

          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },

          employee: {
            $first: {
              _id: "$employee._id",
              employeeId: "$employee.data.basic.employeeId",
              firstName: "$employee.data.basic.firstName",
              lastName: "$employee.data.basic.lastName",
            },
          },

          salaryStructure: {
            $first: {
              _id: "$salaryStructure._id",
              code: "$salaryStructure.code",
              name: "$salaryStructure.name",
            },
          },

          components: {
            $push: {
              componentId: "$components.componentId",
              code: "$salaryComponent.code",
              name: "$salaryComponent.name",

              amount: "$components.amount",
              percentage: "$components.percentage",

              calculationBase: "$components.calculationBase",

              isOverridden: "$components.isOverridden",
              overrideReason: "$components.overrideReason",

              displayOrder: "$components.displayOrder",
            },
          },
        },
      },

      // Remove the fake component generated when components is empty
      {
        $set: {
          components: {
            $filter: {
              input: "$components",
              as: "component",
              cond: {
                $ne: ["$$component.componentId", null],
              },
            },
          },
        },
      },
    ]);

    return result ?? null;
  }

  public async getAllEmployeeSalaries(
    companyId: string,
    options: GetAllEmployeeSalariesDAOOptions,
  ): Promise<{
    items: any[];
    total: number;
  }> {
    const companyOid = new Types.ObjectId(companyId);

    const { page, limit, search, status, departmentId, salaryStructureId } =
      options;

    const match: Record<string, any> = {
      companyId: companyOid,
    };

    if (status) {
      match.status = status;
    }

    if (salaryStructureId) {
      match.salaryStructureId = new Types.ObjectId(salaryStructureId);
    }

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: match,
      },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee",
        },
      },

      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "salary_structures",
          localField: "salaryStructureId",
          foreignField: "_id",
          as: "salaryStructure",
        },
      },

      {
        $unwind: {
          path: "$salaryStructure",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$components",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "salarycomponents",
          localField: "components.componentId",
          foreignField: "_id",
          as: "salaryComponent",
        },
      },

      {
        $unwind: {
          path: "$salaryComponent",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",

          companyId: { $first: "$companyId" },
          employeeId: { $first: "$employeeId" },
          salaryStructureId: { $first: "$salaryStructureId" },
          salaryStructureVersion: {
            $first: "$salaryStructureVersion",
          },

          payFrequency: { $first: "$payFrequency" },
          currency: { $first: "$currency" },

          totals: { $first: "$totals" },

          effectiveFrom: { $first: "$effectiveFrom" },
          effectiveTo: { $first: "$effectiveTo" },

          status: { $first: "$status" },
          source: { $first: "$source" },
          revisionNumber: { $first: "$revisionNumber" },

          revisionReason: { $first: "$revisionReason" },

          approvedBy: { $first: "$approvedBy" },
          approvedAt: { $first: "$approvedAt" },

          rejectedBy: { $first: "$rejectedBy" },
          rejectedAt: { $first: "$rejectedAt" },
          rejectionReason: { $first: "$rejectionReason" },

          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          employee: {
            $first: {
              _id: "$employee._id",
              employeeId: "$employee.data.basic.employeeId",
              firstName: "$employee.data.basic.firstName",
              lastName: "$employee.data.basic.lastName",

              departmentId: "$employee.data.job.department",
              designationId: "$employee.data.job.designation",
            },
          },
          salaryStructure: {
            $first: {
              _id: "$salaryStructure._id",
              code: "$salaryStructure.code",
              name: "$salaryStructure.name",
              category: "$salaryStructure.category",
              payFrequency: "$salaryStructure.payFrequency",
              version: "$salaryStructure.version",
            },
          },
          components: {
            $push: {
              _id: "$components.componentId",

              code: "$salaryComponent.code",
              name: "$salaryComponent.name",

              amount: "$components.amount",
              percentage: "$components.percentage",

              calculationBase: "$components.calculationBase",

              isOverridden: "$components.isOverridden",
              overrideReason: "$components.overrideReason",

              displayOrder: "$components.displayOrder",
            },
          },
        },
      },
      ...(search
        ? [
            {
              $match: {
                $or: [
                  {
                    "employee.employeeId": {
                      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                      $options: "i",
                    },
                  },
                  {
                    "employee.firstName": {
                      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                      $options: "i",
                    },
                  },
                  {
                    "employee.lastName": {
                      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                      $options: "i",
                    },
                  },
                  {
                    "salaryStructure.code": {
                      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                      $options: "i",
                    },
                  },
                  {
                    "salaryStructure.name": {
                      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                      $options: "i",
                    },
                  },
                ],
              },
            },
          ]
        : []),
      ...(departmentId
        ? [
            {
              $match: {
                "employee.departmentId": new Types.ObjectId(departmentId),
              },
            },
          ]
        : []),
      {
        $sort: {
          "employee.firstName": 1,
          "employee.lastName": 1,
        },
      },

      {
        $facet: {
          items: [
            {
              $skip: (page - 1) * limit,
            },
            {
              $limit: limit,
            },
          ],

          total: [
            {
              $count: "count",
            },
          ],
        },
      },
    ];

    const [result] = await EmployeeSalaryModel.aggregate(pipeline);

    return {
      items: result?.items ?? [],
      total: result?.total?.[0]?.count ?? 0,
    };
  }

  public async getEmployeeSalaryHistory(
    companyId: string,
    employeeId: string,
    page = 1,
    limit = 25,
  ): Promise<{ items: EmployeeSalary[]; total: number }> {
    const companyOid = new Types.ObjectId(companyId);
    const employeeOid = new Types.ObjectId(employeeId);

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          companyId: companyOid,
          employeeId: employeeOid,
        },
      },

      // Employee
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Salary Structure
      {
        $lookup: {
          from: "salary_structures",
          localField: "salaryStructureId",
          foreignField: "_id",
          as: "salaryStructure",
        },
      },
      {
        $unwind: {
          path: "$salaryStructure",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Components
      {
        $unwind: {
          path: "$components",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Salary Component
      {
        $lookup: {
          from: "salarycomponents",
          localField: "components.componentId",
          foreignField: "_id",
          as: "salaryComponent",
        },
      },
      {
        $unwind: {
          path: "$salaryComponent",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Rebuild salary document
      {
        $group: {
          _id: "$_id",

          companyId: { $first: "$companyId" },
          employeeId: { $first: "$employeeId" },

          salaryStructureId: {
            $first: "$salaryStructureId",
          },

          salaryStructureVersion: {
            $first: "$salaryStructureVersion",
          },

          payFrequency: {
            $first: "$payFrequency",
          },

          currency: {
            $first: "$currency",
          },

          totals: {
            $first: "$totals",
          },

          effectiveFrom: {
            $first: "$effectiveFrom",
          },

          effectiveTo: {
            $first: "$effectiveTo",
          },

          status: {
            $first: "$status",
          },

          source: {
            $first: "$source",
          },

          revisionNumber: {
            $first: "$revisionNumber",
          },

          revisionReason: {
            $first: "$revisionReason",
          },

          approvedBy: {
            $first: "$approvedBy",
          },

          approvedAt: {
            $first: "$approvedAt",
          },

          rejectedBy: {
            $first: "$rejectedBy",
          },

          rejectedAt: {
            $first: "$rejectedAt",
          },

          rejectionReason: {
            $first: "$rejectionReason",
          },

          createdAt: {
            $first: "$createdAt",
          },

          updatedAt: {
            $first: "$updatedAt",
          },

          // Employee basic details
          employee: {
            $first: {
              _id: "$employee._id",
              employeeId: "$employee.data.basic.employeeId",
              firstName: "$employee.data.basic.firstName",
              lastName: "$employee.data.basic.lastName",
            },
          },

          // Salary structure basic details
          salaryStructure: {
            $first: {
              _id: "$salaryStructure._id",
              code: "$salaryStructure.code",
              name: "$salaryStructure.name",
            },
          },

          // Salary component basic details
          components: {
            $push: {
              componentId: "$components.componentId",

              code: "$salaryComponent.code",
              name: "$salaryComponent.name",

              amount: "$components.amount",
              percentage: "$components.percentage",

              calculationBase: "$components.calculationBase",

              isOverridden: "$components.isOverridden",
              overrideReason: "$components.overrideReason",

              displayOrder: "$components.displayOrder",
            },
          },
        },
      },

      // Remove fake component when salary has no components
      {
        $set: {
          components: {
            $filter: {
              input: "$components",
              as: "component",
              cond: {
                $ne: ["$$component.componentId", null],
              },
            },
          },
        },
      },

      // Sort salary revisions newest first
      {
        $sort: {
          effectiveFrom: -1,
          revisionNumber: -1,
        },
      },

      // Pagination
      {
        $facet: {
          items: [
            {
              $skip: (page - 1) * limit,
            },
            {
              $limit: limit,
            },
          ],
          total: [
            {
              $count: "count",
            },
          ],
        },
      },
    ];

    const [result] = await EmployeeSalaryModel.aggregate(pipeline);

    return {
      items: result?.items ?? [],
      total: result?.total?.[0]?.count ?? 0,
    };
  }

  /**
   * Update employee salary (non-status fields).
   *
   * Wrapped in a transaction now (it wasn't before) so the update and
   * its audit entry are atomic — otherwise a crash between the two
   * writes leaves an update with no audit trail.
   */
  public async updateEmployeeSalary(
    salaryId: string,
    companyId: string,
    data: Partial<EmployeeSalary>,
    auditContext: AuditContext = SYSTEM_AUDIT_CONTEXT,
  ): Promise<EmployeeSalary> {
    const {
      status: _status,
      companyId: _companyId,
      employeeId: _employeeId,
      _id,
      revisionNumber: _revisionNumber,
      ...safeData
    } = data;

    const salaryOid = new Types.ObjectId(salaryId);
    const companyOid = new Types.ObjectId(companyId);

    const session = await mongoose.startSession();

    try {
      let updated: EmployeeSalary | undefined;

      await session.withTransaction(async () => {
        const before = await EmployeeSalaryModel.findOne({
          _id: salaryOid,
          companyId: companyOid,
        })
          .session(session)
          .lean();

        if (!before) {
          throw new NotFoundError("Employee salary not found");
        }

        const after = await EmployeeSalaryModel.findOneAndUpdate(
          { _id: salaryOid, companyId: companyOid },
          { $set: { ...safeData, updatedAt: new Date() } },
          { new: true, runValidators: true, session },
        ).lean();

        if (!after) {
          throw new NotFoundError("Employee salary not found");
        }

        updated = after;

        const { changedFields, changes } = diffObjects(
          before as unknown as Record<string, unknown>,
          after as unknown as Record<string, unknown>,
        );

        if (changedFields.length > 0) {
          await this.salaryAuditLogDAO.createAuditLog(
            {
              companyId: companyOid,
              entityType: "EMPLOYEE_SALARY",
              entityId: salaryOid,
              employeeId: before.employeeId as Types.ObjectId,
              action: "UPDATED",
              context: auditContext,
              changedFields,
              changes,
              before: before as unknown as Record<string, unknown>,
              after: after as unknown as Record<string, unknown>,
            },
            session,
          );
        }
      });

      if (!updated) {
        throw new NotFoundError("Employee salary not found");
      }

      return updated;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Activate employee salary.
   *
   * Deactivates any currently active salary first, atomically, and
   * logs both the ACTIVATED and DEACTIVATED transitions in the same
   * transaction as the state change.
   */
  public async activateEmployeeSalary(
    salaryId: string,
    companyId: string,
    employeeId: string,
    auditContext: AuditContext = SYSTEM_AUDIT_CONTEXT,
  ): Promise<EmployeeSalary> {
    const companyOid = new Types.ObjectId(companyId);
    const employeeOid = new Types.ObjectId(employeeId);
    const salaryOid = new Types.ObjectId(salaryId);

    const session = await mongoose.startSession();

    try {
      let result: EmployeeSalary | undefined;

      await session.withTransaction(
        async () => {
          const salary = await EmployeeSalaryModel.findOne({
            _id: salaryOid,
            companyId: companyOid,
            employeeId: employeeOid,
          }).session(session);

          if (!salary) {
            throw new NotFoundError("Employee salary not found");
          }

          const previouslyActive = await EmployeeSalaryModel.find({
            companyId: companyOid,
            employeeId: employeeOid,
            status: "ACTIVE",
            _id: { $ne: salaryOid },
          })
            .session(session)
            .lean();

          if (previouslyActive.length > 0) {
            await EmployeeSalaryModel.updateMany(
              {
                companyId: companyOid,
                employeeId: employeeOid,
                status: "ACTIVE",
                _id: { $ne: salaryOid },
              },
              { $set: { status: "INACTIVE", updatedAt: new Date() } },
            ).session(session);

            for (const prev of previouslyActive) {
              await this.salaryAuditLogDAO.createAuditLog(
                {
                  companyId: companyOid,
                  entityType: "EMPLOYEE_SALARY",
                  entityId: prev._id as Types.ObjectId,
                  employeeId: employeeOid,
                  action: "DEACTIVATED",
                  context: auditContext,
                  before: { status: "ACTIVE" },
                  after: { status: "INACTIVE" },
                  changedFields: ["status"],
                  changes: [
                    {
                      field: "status",
                      oldValue: "ACTIVE",
                      newValue: "INACTIVE",
                    },
                  ],
                  metadata: {
                    reason: "superseded-by-activation",
                    supersededBy: salaryOid,
                  },
                },
                session,
              );
            }
          }

          const previousStatus = salary.status;
          salary.status = "ACTIVE";
          salary.updatedAt = new Date();
          await salary.save({ session });

          result = salary.toObject();

          await this.salaryAuditLogDAO.createAuditLog(
            {
              companyId: companyOid,
              entityType: "EMPLOYEE_SALARY",
              entityId: salaryOid,
              employeeId: employeeOid,
              action: "ACTIVATED",
              context: auditContext,
              before: { status: previousStatus },
              after: { status: "ACTIVE" },
              changedFields: ["status"],
              changes: [
                {
                  field: "status",
                  oldValue: previousStatus,
                  newValue: "ACTIVE",
                },
              ],
            },
            session,
          );
        },
        {
          readConcern: "snapshot",
          writeConcern: { w: "majority" },
        },
      );

      if (!result) {
        throw new Error("Failed to activate employee salary");
      }

      return result;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: number }).code === MONGO_DUPLICATE_KEY
      ) {
        throw new BusinessRuleError(
          "Another active salary was created concurrently. Please retry.",
        );
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  public async deactivateEmployeeSalary(
    salaryId: string,
    companyId: string,
    auditContext: AuditContext = SYSTEM_AUDIT_CONTEXT,
  ): Promise<EmployeeSalary> {
    const salaryOid = new Types.ObjectId(salaryId);
    const companyOid = new Types.ObjectId(companyId);

    const session = await mongoose.startSession();

    try {
      let updated: EmployeeSalary | undefined;

      await session.withTransaction(async () => {
        const salary = await EmployeeSalaryModel.findOneAndUpdate(
          { _id: salaryOid, companyId: companyOid, status: "ACTIVE" },
          { $set: { status: "INACTIVE", updatedAt: new Date() } },
          { new: true, runValidators: true, session },
        ).lean();

        if (!salary) {
          throw new NotFoundError("Active employee salary not found");
        }

        updated = salary;

        await this.salaryAuditLogDAO.createAuditLog(
          {
            companyId: companyOid,
            entityType: "EMPLOYEE_SALARY",
            entityId: salaryOid,
            employeeId: salary.employeeId as Types.ObjectId,
            action: "DEACTIVATED",
            context: auditContext,
            before: { status: "ACTIVE" },
            after: { status: "INACTIVE" },
            changedFields: ["status"],
            changes: [
              { field: "status", oldValue: "ACTIVE", newValue: "INACTIVE" },
            ],
          },
          session,
        );
      });

      if (!updated) {
        throw new NotFoundError("Active employee salary not found");
      }

      return updated;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Delete employee salary.
   * Prefer deactivation for historical salary records.
   *
   * Note: SalaryAuditAction has no "DELETED" value in the current
   * enum, so this logs "CANCELLED" as the closest fit. Flagging this
   * rather than silently picking something — if a hard delete should
   * be distinguishable from a cancellation in reports, that needs a
   * new enum value (a type change, which is out of scope right now).
   */
  public async deleteEmployeeSalary(
    salaryId: string,
    companyId: string,
    auditContext: AuditContext = SYSTEM_AUDIT_CONTEXT,
  ): Promise<void> {
    const salaryOid = new Types.ObjectId(salaryId);
    const companyOid = new Types.ObjectId(companyId);

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const deleted = await EmployeeSalaryModel.findOneAndDelete(
          { _id: salaryOid, companyId: companyOid },
          { session },
        ).lean();

        if (!deleted) {
          throw new NotFoundError("Employee salary not found");
        }

        await this.salaryAuditLogDAO.createAuditLog(
          {
            companyId: companyOid,
            entityType: "EMPLOYEE_SALARY",
            entityId: salaryOid,
            employeeId: deleted.employeeId as Types.ObjectId,
            action: "CANCELLED",
            context: auditContext,
            before: deleted as unknown as Record<string, unknown>,
            metadata: { hardDelete: true },
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }
  }
}
