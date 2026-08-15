import {
  SalaryStructure,
  SalaryStructureModel,
  SalaryComponentModel,
  SalaryStructureStatus,
} from "@hrmssuite/persistence";
import mongoose, { PipelineStage, Types } from "mongoose";
import { BusinessRuleError, NotFoundError } from "../helpers/error";
import { SalaryAuditLogDAO } from "./Salary-audit-log.dao";
import {
  AuditContext,
  SYSTEM_AUDIT_CONTEXT,
} from "../helpers/Auditcontext.helpers";
import { diffObjects } from "../helpers/Auditdiff.helpers";

/**
 * Same `isDeleted` caveat as SalaryComponentDAO — queried/set here but
 * not present on the current schema/type. Not fixed in this file for
 * the same reason (schema/type changes out of scope right now).
 */
export class SalaryStructureDAO {
  constructor(
    private readonly salaryAuditLogDAO: SalaryAuditLogDAO = new SalaryAuditLogDAO(),
  ) {}

  public async createSalaryStructure(
    companyId: string,
    data: Omit<
      SalaryStructure,
      "_id" | "companyId" | "createdAt" | "updatedAt"
    >,
    auditContext: AuditContext = SYSTEM_AUDIT_CONTEXT,
  ): Promise<SalaryStructure> {
    const companyOid = new Types.ObjectId(companyId);

    const existingStructure = await SalaryStructureModel.findOne({
      companyId: companyOid,
      name: data.name,
      isDeleted: false,
    });

    if (existingStructure) {
      throw new BusinessRuleError(
        "Salary structure with this name already exists",
      );
    }

    if (data.components?.length) {
      const componentIds = data.components.map(
        (component) => new Types.ObjectId(component.componentId.toString()),
      );

      const componentCount = await SalaryComponentModel.countDocuments({
        _id: { $in: componentIds },
        companyId: companyOid,
        isDeleted: false,
      });

      if (componentCount !== componentIds.length) {
        throw new BusinessRuleError(
          "One or more salary components are invalid",
        );
      }
    }

    const session = await mongoose.startSession();

    try {
      let created: SalaryStructure | undefined;

      await session.withTransaction(async () => {
        const [doc] = await SalaryStructureModel.create(
          [{ companyId: companyOid, ...data }],
          { session },
        );

        created = doc.toObject();

        await this.salaryAuditLogDAO.createAuditLog(
          {
            companyId: companyOid,
            entityType: "SALARY_STRUCTURE",
            entityId: doc._id as Types.ObjectId,
            action: "CREATED",
            context: auditContext,
            after: created as unknown as Record<string, unknown>,
          },
          session,
        );
      });

      if (!created) {
        throw new Error("Failed to create salary structure");
      }

      return created;
    } finally {
      await session.endSession();
    }
  }

  public async getSalaryStructureById(
    structureId: string,
    companyId: string,
  ): Promise<SalaryStructure | null> {
    const structureOid = new Types.ObjectId(structureId);
    const companyOid = new Types.ObjectId(companyId);

    const result = await SalaryStructureModel.aggregate([
      /**
       * ---------------------------------------------------------
       * 1. Find salary structure
       * ---------------------------------------------------------
       */
      {
        $match: {
          _id: structureOid,
          companyId: companyOid,
          isDeleted: false,
        },
      },

      /**
       * ---------------------------------------------------------
       * 2. Lookup salary components
       * ---------------------------------------------------------
       */
      {
        $lookup: {
          from: "salarycomponents",
          let: {
            componentIds: "$components.componentId",
            companyId: "$companyId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $in: ["$_id", "$$componentIds"],
                    },
                    {
                      $eq: ["$companyId", "$$companyId"],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                code: 1,
                name: 1,
                type: 1,
                calculationType: 1,
                fixedAmount: 1,
                percentage: 1,
                formula: 1,
                calculationBase: 1,
                inclusion: 1,
                taxability: 1,
                isStatutory: 1,
                allowManualOverride: 1,
                isConfigurable: 1,
                status: 1,
                displayOrder: 1,
                unitConfig: 1,
              },
            },
          ],
          as: "salaryComponentDetails",
        },
      },

      /**
       * ---------------------------------------------------------
       * 3. Merge component details into structure.components
       * ---------------------------------------------------------
       */
      {
        $set: {
          components: {
            $map: {
              input: "$components",
              as: "structureComponent",
              in: {
                $let: {
                  vars: {
                    component: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$salaryComponentDetails",
                            as: "salaryComponent",
                            cond: {
                              $eq: [
                                "$$salaryComponent._id",
                                "$$structureComponent.componentId",
                              ],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },

                  in: {
                    componentId: "$$structureComponent.componentId",

                    code: "$$component.code",
                    name: "$$component.name",
                    type: "$$component.type",
                    calculationType: "$$component.calculationType",

                    displayOrder: "$$structureComponent.displayOrder",
                    isRequired: "$$structureComponent.isRequired",
                    allowOverride: "$$structureComponent.allowOverride",

                    fixedAmount: "$$structureComponent.fixedAmount",
                    percentage: "$$structureComponent.percentage",
                    calculationBase: "$$structureComponent.calculationBase",
                    formula: "$$structureComponent.formula",

                    minimumAmount: "$$structureComponent.minimumAmount",
                    maximumAmount: "$$structureComponent.maximumAmount",

                    inclusion: "$$component.inclusion",
                    taxability: "$$component.taxability",

                    isStatutory: "$$component.isStatutory",
                    allowManualOverride: "$$component.allowManualOverride",

                    unitConfig: "$$component.unitConfig",

                    metadata: "$$structureComponent.metadata",
                  },
                },
              },
            },
          },
        },
      },

      /**
       * ---------------------------------------------------------
       * 4. Remove temporary lookup field
       * ---------------------------------------------------------
       */
      {
        $unset: "salaryComponentDetails",
      },

      /**
       * ---------------------------------------------------------
       * 5. Return plain object
       * ---------------------------------------------------------
       */
      {
        $limit: 1,
      },
    ]);

    return result[0] ?? null;
  }

  public async getAllSalaryStructures(
    companyId: string,
    page = 1,
    limit = 50,
  ): Promise<{
    items: SalaryStructure[];
    total: number;
  }> {
    const companyOid = new Types.ObjectId(companyId);

    const skip = (page - 1) * limit;

    const pipeline: PipelineStage[] = [
      /**
       * 1. Get only structures belonging to this company
       */
      {
        $match: {
          companyId: companyOid,
          isDeleted: false,
        },
      },

      /**
       * 2. Lookup salary component documents
       *
       * Structure:
       *
       * components[].componentId
       *
       * ->
       *
       * SalaryComponent._id
       */
      {
        $lookup: {
          from: "salarycomponents",
          localField: "components.componentId",
          foreignField: "_id",
          as: "_salaryComponents",
        },
      },

      /**
       * 3. Convert each structure component into:
       *
       * {
       *   componentId,
       *   code,
       *   name,
       *   displayOrder,
       *   ...
       * }
       */
      {
        $set: {
          components: {
            $map: {
              input: "$components",
              as: "structureComponent",
              in: {
                $let: {
                  vars: {
                    component: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$_salaryComponents",
                            as: "salaryComponent",
                            cond: {
                              $eq: [
                                "$$salaryComponent._id",
                                "$$structureComponent.componentId",
                              ],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },

                  in: {
                    componentId: "$$structureComponent.componentId",

                    /**
                     * Salary Component information
                     */
                    code: "$$component.code",
                    name: "$$component.name",

                    /**
                     * Salary Structure configuration
                     */
                    displayOrder: "$$structureComponent.displayOrder",
                    isRequired: "$$structureComponent.isRequired",
                    allowOverride: "$$structureComponent.allowOverride",

                    fixedAmount: "$$structureComponent.fixedAmount",
                    percentage: "$$structureComponent.percentage",
                    calculationBase: "$$structureComponent.calculationBase",
                    formula: "$$structureComponent.formula",

                    minimumAmount: "$$structureComponent.minimumAmount",
                    maximumAmount: "$$structureComponent.maximumAmount",

                    metadata: "$$structureComponent.metadata",
                  },
                },
              },
            },
          },
        },
      },

      /**
       * 4. Remove temporary lookup field
       */
      {
        $unset: "_salaryComponents",
      },

      /**
       * 5. Sort structures
       */
      {
        $sort: {
          name: 1,
        },
      },

      /**
       * 6. Pagination
       */
      {
        $skip: skip,
      },

      {
        $limit: limit,
      },
    ];

    const countPipeline: PipelineStage[] = [
      {
        $match: {
          companyId: companyOid,
          isDeleted: false,
        },
      },
      {
        $count: "total",
      },
    ];

    const [items, countResult] = await Promise.all([
      SalaryStructureModel.aggregate(pipeline),
      SalaryStructureModel.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      items: items as SalaryStructure[],
      total,
    };
  }

  public async updateSalaryStructure(
    structureId: string,
    companyId: string,
    data: Partial<SalaryStructure>,
    auditContext: AuditContext = SYSTEM_AUDIT_CONTEXT,
  ): Promise<SalaryStructure> {
    const structureOid = new Types.ObjectId(structureId);
    const companyOid = new Types.ObjectId(companyId);

    if (data.components?.length) {
      const componentIds = data.components.map(
        (component) => new Types.ObjectId(component.componentId.toString()),
      );

      const componentCount = await SalaryComponentModel.countDocuments({
        _id: { $in: componentIds },
        companyId: companyOid,
        isDeleted: false,
      });

      if (componentCount !== componentIds.length) {
        throw new BusinessRuleError(
          "One or more salary components are invalid",
        );
      }
    }

    const session = await mongoose.startSession();

    try {
      let updated: SalaryStructure | undefined;

      await session.withTransaction(async () => {
        const before = await SalaryStructureModel.findOne({
          _id: structureOid,
          companyId: companyOid,
          isDeleted: false,
        })
          .session(session)
          .lean();

        if (!before) {
          throw new NotFoundError("Salary structure not found");
        }

        const after = await SalaryStructureModel.findOneAndUpdate(
          { _id: structureOid, companyId: companyOid, isDeleted: false },
          { $set: { ...data, updatedAt: new Date() } },
          { new: true, runValidators: true, session },
        ).lean();

        if (!after) {
          throw new NotFoundError("Salary structure not found");
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
              entityType: "SALARY_STRUCTURE",
              entityId: structureOid,
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
        throw new NotFoundError("Salary structure not found");
      }

      return updated;
    } finally {
      await session.endSession();
    }
  }

  public async deleteSalaryStructure(
    structureId: string,
    companyId: string,
    auditContext: AuditContext = SYSTEM_AUDIT_CONTEXT,
  ): Promise<void> {
    const structureOid = new Types.ObjectId(structureId);
    const companyOid = new Types.ObjectId(companyId);

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const structure = await SalaryStructureModel.findOneAndUpdate(
          { _id: structureOid, companyId: companyOid, isDeleted: false },
          { $set: { isDeleted: true, updatedAt: new Date() } },
          { session },
        ).lean();

        if (!structure) {
          throw new NotFoundError("Salary structure not found");
        }

        await this.salaryAuditLogDAO.createAuditLog(
          {
            companyId: companyOid,
            entityType: "SALARY_STRUCTURE",
            entityId: structureOid,
            action: "ARCHIVED",
            context: auditContext,
            before: { isDeleted: false },
            after: { isDeleted: true },
            changedFields: ["isDeleted"],
            changes: [{ field: "isDeleted", oldValue: false, newValue: true }],
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }
  }
  public async changeSalaryStructureStatus(
    structureId: string,
    companyId: string,
    status: SalaryStructureStatus,
    auditContext: AuditContext = SYSTEM_AUDIT_CONTEXT,
  ): Promise<SalaryStructure> {
    const structureOid = new Types.ObjectId(structureId);
    const companyOid = new Types.ObjectId(companyId);

    const session = await mongoose.startSession();

    try {
      let updated: SalaryStructure | undefined;

      await session.withTransaction(async () => {
        const before = await SalaryStructureModel.findOne({
          _id: structureOid,
          companyId: companyOid,
          isDeleted: false,
        })
          .session(session)
          .lean();

        if (!before) {
          throw new NotFoundError("Salary structure not found");
        }

        /**
         * Define allowed lifecycle transitions.
         */
        const allowedTransitions: Record<
          SalaryStructureStatus,
          SalaryStructureStatus[]
        > = {
          DRAFT: ["ACTIVE", "ARCHIVED"],
          ACTIVE: ["INACTIVE", "ARCHIVED"],
          INACTIVE: ["ACTIVE", "ARCHIVED"],
          ARCHIVED: [],
        };

        if (!allowedTransitions[before.status].includes(status)) {
          throw new BusinessRuleError(
            `Cannot change salary structure status from ${before.status} to ${status}`,
          );
        }

        const after = await SalaryStructureModel.findOneAndUpdate(
          {
            _id: structureOid,
            companyId: companyOid,
            isDeleted: false,
          },
          {
            $set: {
              status,
              updatedAt: new Date(),
            },
          },
          {
            new: true,
            runValidators: true,
            session,
          },
        ).lean();

        if (!after) {
          throw new NotFoundError("Salary structure not found");
        }

        updated = after;

        await this.salaryAuditLogDAO.createAuditLog(
          {
            companyId: companyOid,
            entityType: "SALARY_STRUCTURE",
            entityId: structureOid,
            action: "UPDATED",
            context: auditContext,
            changedFields: ["status"],
            changes: [
              {
                field: "status",
                oldValue: before.status,
                newValue: status,
              },
            ],
            before: {
              status: before.status,
            },
            after: {
              status: status,
            },
          },
          session,
        );
      });

      if (!updated) {
        throw new NotFoundError("Salary structure not found");
      }

      return updated;
    } finally {
      await session.endSession();
    }
  }
}
