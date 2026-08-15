import {
  SalaryAuditLog,
  SalaryAuditEntity,
  SalaryAuditAction,
  SalaryAuditChange,
  SalaryAuditLogModel,
} from "@hrmssuite/persistence";
import { ClientSession, Types, PipelineStage } from "mongoose";
import { AuditContext } from "../helpers/Auditcontext.helpers";

export interface CreateAuditLogInput {
  companyId: Types.ObjectId;
  entityType: SalaryAuditEntity;
  entityId: Types.ObjectId;
  employeeId?: Types.ObjectId;
  action: SalaryAuditAction;
  context: AuditContext;
  changedFields?: string[];
  changes?: SalaryAuditChange[];
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export class SalaryAuditLogDAO {
  /**
   * Write a single audit entry.
   */
  public async createAuditLog(
    input: CreateAuditLogInput,
    session?: ClientSession,
  ): Promise<SalaryAuditLog> {
    const [doc] = await SalaryAuditLogModel.create(
      [
        {
          companyId: input.companyId,
          entityType: input.entityType,
          entityId: input.entityId,
          employeeId: input.employeeId,
          action: input.action,
          performedBy: input.context.performedBy,
          source: input.context.source,
          reason: input.context.reason,
          comments: input.context.comments,
          changedFields: input.changedFields ?? [],
          changes: input.changes ?? [],
          before: input.before,
          after: input.after,
          requestId: input.context.requestId,
          metadata: input.metadata,
        },
      ],
      { session },
    );

    return doc.toObject();
  }

  /**
   * ---------------------------------------------------------------
   * ENTITY HISTORY
   * ---------------------------------------------------------------
   *
   * Returns audit history for:
   *
   * SALARY_COMPONENT
   * SALARY_STRUCTURE
   * EMPLOYEE_SALARY
   *
   * Also joins:
   *
   * - employee
   * - salary component
   * - salary structure
   * - employee salary
   */
  public async getAuditLogsForEntity(
    companyId: string,
    entityType: SalaryAuditEntity,
    entityId: string,
    page = 1,
    limit = 25,
  ): Promise<{ items: SalaryAuditLog[]; total: number }> {
    const companyOid = new Types.ObjectId(companyId);
    const entityOid = new Types.ObjectId(entityId);

    const pipeline: PipelineStage[] = [
      // -----------------------------------------------------------
      // MATCH AUDIT LOGS
      // -----------------------------------------------------------
      {
        $match: {
          companyId: companyOid,
          entityType,
          entityId: entityOid,
        },
      },

      // -----------------------------------------------------------
      // EMPLOYEE
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "employees",
          let: {
            employeeId: "$employeeId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$employeeId"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                employeeId: "$data.basic.employeeId",
                firstName: "$data.basic.firstName",
                lastName: "$data.basic.lastName",
              },
            },
          ],
          as: "employee",
        },
      },

      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: true,
        },
      },

      // -----------------------------------------------------------
      // SALARY COMPONENT
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "salarycomponents",
          let: {
            entityId: "$entityId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$_id", "$$entityId"],
                    },
                    {
                      $eq: [entityType, "SALARY_COMPONENT"],
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
                description: 1,
                type: 1,
                calculationType: 1,
                isActive: 1,
              },
            },
          ],
          as: "salaryComponent",
        },
      },

      {
        $unwind: {
          path: "$salaryComponent",
          preserveNullAndEmptyArrays: true,
        },
      },

      // -----------------------------------------------------------
      // SALARY STRUCTURE
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "salary_structures",
          let: {
            entityId: "$entityId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$_id", "$$entityId"],
                    },
                    {
                      $eq: [entityType, "SALARY_STRUCTURE"],
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
                description: 1,
                isActive: 1,
              },
            },
          ],
          as: "salaryStructure",
        },
      },

      {
        $unwind: {
          path: "$salaryStructure",
          preserveNullAndEmptyArrays: true,
        },
      },

      // -----------------------------------------------------------
      // EMPLOYEE SALARY
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "employeesalaries",
          let: {
            entityId: "$entityId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$_id", "$$entityId"],
                    },
                    {
                      $eq: [entityType, "EMPLOYEE_SALARY"],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                employeeId: 1,
                salaryStructureId: 1,
                salaryStructureVersion: 1,
                payFrequency: 1,
                currency: 1,
                totals: 1,
                effectiveFrom: 1,
                effectiveTo: 1,
                status: 1,
                source: 1,
                revisionNumber: 1,
                revisionReason: 1,
                approvedBy: 1,
                approvedAt: 1,
                rejectedBy: 1,
                rejectedAt: 1,
                rejectionReason: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
          as: "employeeSalary",
        },
      },

      {
        $unwind: {
          path: "$employeeSalary",
          preserveNullAndEmptyArrays: true,
        },
      },

      // -----------------------------------------------------------
      // SALARY STRUCTURE FROM EMPLOYEE SALARY
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "salary_structures",
          let: {
            salaryStructureId: "$employeeSalary.salaryStructureId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$salaryStructureId"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                code: 1,
                name: 1,
              },
            },
          ],
          as: "employeeSalaryStructure",
        },
      },

      {
        $unwind: {
          path: "$employeeSalaryStructure",
          preserveNullAndEmptyArrays: true,
        },
      },

      // -----------------------------------------------------------
      // FINAL SHAPE
      // -----------------------------------------------------------
      {
        $project: {
          _id: 1,

          companyId: 1,
          entityType: 1,
          entityId: 1,
          employeeId: 1,

          action: 1,

          performedBy: 1,
          source: 1,
          reason: 1,
          comments: 1,

          changedFields: 1,
          changes: 1,

          before: 1,
          after: 1,

          requestId: 1,
          metadata: 1,

          createdAt: 1,
          updatedAt: 1,

          // Joined employee
          employee: 1,

          // Joined component
          salaryComponent: 1,

          // Joined structure
          salaryStructure: 1,

          // Joined employee salary
          employeeSalary: 1,

          // Structure referenced by employee salary
          employeeSalaryStructure: 1,
        },
      },

      // -----------------------------------------------------------
      // NEWEST AUDIT FIRST
      // -----------------------------------------------------------
      {
        $sort: {
          createdAt: -1,
        },
      },

      // -----------------------------------------------------------
      // PAGINATION
      // -----------------------------------------------------------
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

    const [result] = await SalaryAuditLogModel.aggregate(pipeline);

    return {
      items: result?.items ?? [],
      total: result?.total?.[0]?.count ?? 0,
    };
  }

  /**
   * ---------------------------------------------------------------
   * EMPLOYEE SALARY HISTORY
   * ---------------------------------------------------------------
   *
   * Returns everything that happened to an employee's salary.
   */
  public async getAuditLogsForEmployee(
    companyId: string,
    employeeId: string,
    page = 1,
    limit = 25,
  ): Promise<{ items: SalaryAuditLog[]; total: number }> {
    const companyOid = new Types.ObjectId(companyId);
    const employeeOid = new Types.ObjectId(employeeId);

    const pipeline: PipelineStage[] = [
      // -----------------------------------------------------------
      // MATCH
      // -----------------------------------------------------------
      {
        $match: {
          companyId: companyOid,
          employeeId: employeeOid,
        },
      },

      // -----------------------------------------------------------
      // EMPLOYEE
      // -----------------------------------------------------------
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

      // -----------------------------------------------------------
      // ENTITY LOOKUP - SALARY COMPONENT
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "salarycomponents",
          let: {
            entityId: "$entityId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$_id", "$$entityId"],
                    },
                    {
                      $eq: ["$$ROOT.entityType", "SALARY_COMPONENT"],
                    },
                  ],
                },
              },
            },
          ],
          as: "salaryComponent",
        },
      },

      {
        $unwind: {
          path: "$salaryComponent",
          preserveNullAndEmptyArrays: true,
        },
      },

      // -----------------------------------------------------------
      // SALARY STRUCTURE
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "salary_structures",
          let: {
            entityId: "$entityId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$_id", "$$entityId"],
                    },
                    {
                      $eq: ["$$ROOT.entityType", "SALARY_STRUCTURE"],
                    },
                  ],
                },
              },
            },
          ],
          as: "salaryStructure",
        },
      },

      {
        $unwind: {
          path: "$salaryStructure",
          preserveNullAndEmptyArrays: true,
        },
      },

      // -----------------------------------------------------------
      // EMPLOYEE SALARY
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "employeesalaries",
          localField: "entityId",
          foreignField: "_id",
          as: "employeeSalary",
        },
      },

      {
        $unwind: {
          path: "$employeeSalary",
          preserveNullAndEmptyArrays: true,
        },
      },

      // -----------------------------------------------------------
      // SALARY STRUCTURE FROM EMPLOYEE SALARY
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "salary_structures",
          localField: "employeeSalary.salaryStructureId",
          foreignField: "_id",
          as: "employeeSalaryStructure",
        },
      },

      {
        $unwind: {
          path: "$employeeSalaryStructure",
          preserveNullAndEmptyArrays: true,
        },
      },

      // -----------------------------------------------------------
      // PROJECT
      // -----------------------------------------------------------
      {
        $project: {
          _id: 1,

          companyId: 1,
          entityType: 1,
          entityId: 1,
          employeeId: 1,

          action: 1,

          performedBy: 1,
          source: 1,
          reason: 1,
          comments: 1,

          changedFields: 1,
          changes: 1,

          before: 1,
          after: 1,

          requestId: 1,
          metadata: 1,

          createdAt: 1,
          updatedAt: 1,

          employee: {
            _id: "$employee._id",
            employeeId: "$employee.data.basic.employeeId",
            firstName: "$employee.data.basic.firstName",
            lastName: "$employee.data.basic.lastName",
          },

          salaryComponent: 1,
          salaryStructure: 1,
          employeeSalary: 1,
          employeeSalaryStructure: 1,
        },
      },

      // -----------------------------------------------------------
      // SORT
      // -----------------------------------------------------------
      {
        $sort: {
          createdAt: -1,
        },
      },

      // -----------------------------------------------------------
      // PAGINATION
      // -----------------------------------------------------------
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

    const [result] = await SalaryAuditLogModel.aggregate(pipeline);

    return {
      items: result?.items ?? [],
      total: result?.total?.[0]?.count ?? 0,
    };
  }

  /**
   * ---------------------------------------------------------------
   * COMPANY-WIDE SALARY AUDIT FEED
   * ---------------------------------------------------------------
   */
  public async getAuditLogsForCompany(
    companyId: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: SalaryAuditLog[]; total: number }> {
    const companyOid = new Types.ObjectId(companyId);

    const pipeline: PipelineStage[] = [
      // -----------------------------------------------------------
      // MATCH COMPANY
      // -----------------------------------------------------------
      {
        $match: {
          companyId: companyOid,
        },
      },

      // -----------------------------------------------------------
      // EMPLOYEE
      // -----------------------------------------------------------
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

      // -----------------------------------------------------------
      // SALARY COMPONENT
      // Used when the audit entity itself is SALARY_COMPONENT
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "salarycomponents",
          let: {
            entityId: "$entityId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$entityId"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                code: 1,
                name: 1,
              },
            },
          ],
          as: "salaryComponent",
        },
      },

      {
        $unwind: {
          path: "$salaryComponent",
          preserveNullAndEmptyArrays: true,
        },
      },

      // -----------------------------------------------------------
      // SALARY STRUCTURE
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "salary_structures",
          let: {
            entityId: "$entityId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$entityId"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                code: 1,
                name: 1,
              },
            },
          ],
          as: "salaryStructure",
        },
      },

      {
        $unwind: {
          path: "$salaryStructure",
          preserveNullAndEmptyArrays: true,
        },
      },

      // -----------------------------------------------------------
      // EMPLOYEE SALARY
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "employeesalaries",
          let: {
            entityId: "$entityId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$entityId"],
                },
              },
            },
          ],
          as: "employeeSalary",
        },
      },

      {
        $unwind: {
          path: "$employeeSalary",
          preserveNullAndEmptyArrays: true,
        },
      },

      // -----------------------------------------------------------
      // RESOLVE COMPONENTS USED INSIDE EMPLOYEE SALARY SNAPSHOT
      //
      // Example:
      //
      // after.components = [
      //   {
      //     componentId: ObjectId("..."),
      //     amount: 40000
      //   }
      // ]
      //
      // This lookup gets the actual component name/code from
      // salarycomponents.
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "salarycomponents",
          let: {
            componentIds: {
              $concatArrays: [
                {
                  $map: {
                    input: {
                      $ifNull: ["$before.components", []],
                    },
                    as: "component",
                    in: {
                      $convert: {
                        input: "$$component.componentId",
                        to: "objectId",
                        onError: null,
                        onNull: null,
                      },
                    },
                  },
                },
                {
                  $map: {
                    input: {
                      $ifNull: ["$after.components", []],
                    },
                    as: "component",
                    in: {
                      $convert: {
                        input: "$$component.componentId",
                        to: "objectId",
                        onError: null,
                        onNull: null,
                      },
                    },
                  },
                },
              ],
            },
          },

          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$componentIds"],
                },
              },
            },

            {
              $project: {
                _id: 1,
                code: 1,
                name: 1,
              },
            },
          ],

          as: "resolvedSalaryComponents",
        },
      },

      // -----------------------------------------------------------
      // ADD COMPONENT NAME + CODE TO BEFORE / AFTER COMPONENTS
      // -----------------------------------------------------------
      {
        $set: {
          "before.components": {
            $map: {
              input: {
                $ifNull: ["$before.components", []],
              },

              as: "component",

              in: {
                $mergeObjects: [
                  "$$component",

                  {
                    name: {
                      $let: {
                        vars: {
                          matchedComponent: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$resolvedSalaryComponents",

                                  as: "resolved",

                                  cond: {
                                    $eq: [
                                      "$$resolved._id",
                                      {
                                        $convert: {
                                          input: "$$component.componentId",
                                          to: "objectId",
                                          onError: null,
                                          onNull: null,
                                        },
                                      },
                                    ],
                                  },
                                },
                              },

                              0,
                            ],
                          },
                        },

                        in: "$$matchedComponent.name",
                      },
                    },

                    code: {
                      $let: {
                        vars: {
                          matchedComponent: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$resolvedSalaryComponents",

                                  as: "resolved",

                                  cond: {
                                    $eq: [
                                      "$$resolved._id",
                                      {
                                        $convert: {
                                          input: "$$component.componentId",
                                          to: "objectId",
                                          onError: null,
                                          onNull: null,
                                        },
                                      },
                                    ],
                                  },
                                },
                              },

                              0,
                            ],
                          },
                        },

                        in: "$$matchedComponent.code",
                      },
                    },
                  },
                ],
              },
            },
          },

          "after.components": {
            $map: {
              input: {
                $ifNull: ["$after.components", []],
              },

              as: "component",

              in: {
                $mergeObjects: [
                  "$$component",

                  {
                    name: {
                      $let: {
                        vars: {
                          matchedComponent: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$resolvedSalaryComponents",

                                  as: "resolved",

                                  cond: {
                                    $eq: [
                                      "$$resolved._id",
                                      {
                                        $convert: {
                                          input: "$$component.componentId",
                                          to: "objectId",
                                          onError: null,
                                          onNull: null,
                                        },
                                      },
                                    ],
                                  },
                                },
                              },

                              0,
                            ],
                          },
                        },

                        in: "$$matchedComponent.name",
                      },
                    },

                    code: {
                      $let: {
                        vars: {
                          matchedComponent: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$resolvedSalaryComponents",

                                  as: "resolved",

                                  cond: {
                                    $eq: [
                                      "$$resolved._id",
                                      {
                                        $convert: {
                                          input: "$$component.componentId",
                                          to: "objectId",
                                          onError: null,
                                          onNull: null,
                                        },
                                      },
                                    ],
                                  },
                                },
                              },

                              0,
                            ],
                          },
                        },

                        in: "$$matchedComponent.code",
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      // -----------------------------------------------------------
      // EMPLOYEE SALARY STRUCTURE
      // -----------------------------------------------------------
      {
        $lookup: {
          from: "salary_structures",
          localField: "employeeSalary.salaryStructureId",
          foreignField: "_id",
          as: "employeeSalaryStructure",
        },
      },

      {
        $unwind: {
          path: "$employeeSalaryStructure",
          preserveNullAndEmptyArrays: true,
        },
      },

      // -----------------------------------------------------------
      // PROJECT
      // -----------------------------------------------------------
      {
        $project: {
          _id: 1,

          companyId: 1,
          entityType: 1,
          entityId: 1,
          employeeId: 1,

          action: 1,

          performedBy: 1,
          source: 1,
          reason: 1,
          comments: 1,

          changedFields: 1,
          changes: 1,

          before: 1,
          after: 1,

          requestId: 1,
          metadata: 1,

          createdAt: 1,
          updatedAt: 1,

          employee: {
            _id: "$employee._id",
            employeeId: "$employee.data.basic.employeeId",
            firstName: "$employee.data.basic.firstName",
            lastName: "$employee.data.basic.lastName",
          },

          salaryComponent: 1,
          salaryStructure: 1,
          employeeSalary: 1,
          employeeSalaryStructure: 1,
        },
      },

      // -----------------------------------------------------------
      // SORT
      // -----------------------------------------------------------
      {
        $sort: {
          createdAt: -1,
        },
      },

      // -----------------------------------------------------------
      // PAGINATION
      // -----------------------------------------------------------
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

    const [result] = await SalaryAuditLogModel.aggregate(pipeline);

    return {
      items: result?.items ?? [],
      total: result?.total?.[0]?.count ?? 0,
    };
  }
}
