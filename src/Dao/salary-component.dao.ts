import { SalaryComponent, SalaryComponentModel } from "@hrmssuite/persistence";
import mongoose, { Types } from "mongoose";
import { BusinessRuleError, NotFoundError } from "../helpers/error";
import { SalaryAuditLogDAO } from "./Salary-audit-log.dao";
import {
  AuditContext,
  SYSTEM_AUDIT_CONTEXT,
} from "../helpers/Auditcontext.helpers";
import { diffObjects } from "../helpers/Auditdiff.helpers";

/**
 * NOTE (carried over, unresolved by design per current constraints):
 * this DAO queries/sets `isDeleted`, which is not present on the
 * current SalaryComponentSchema/SalaryComponent type. Every query
 * below with `isDeleted: false` will match zero documents until that
 * field is added at the schema level. Flagging again here so it
 * isn't missed — not fixing it in this file since it requires the
 * schema/type change that's explicitly out of scope right now.
 */
export class SalaryComponentDAO {
  constructor(
    private readonly salaryAuditLogDAO: SalaryAuditLogDAO = new SalaryAuditLogDAO(),
  ) {}

  public async createSalaryComponent(
    companyId: string,
    data: Omit<
      SalaryComponent,
      "_id" | "companyId" | "createdAt" | "updatedAt"
    >,
    auditContext: AuditContext = SYSTEM_AUDIT_CONTEXT,
  ): Promise<SalaryComponent> {
    const companyOid = new Types.ObjectId(companyId);

    const existingComponent = await SalaryComponentModel.findOne({
      companyId: companyOid,
      name: data.name,
      isDeleted: false,
    });

    if (existingComponent) {
      throw new BusinessRuleError(
        "Salary component with this name already exists",
      );
    }

    const session = await mongoose.startSession();

    try {
      let created: SalaryComponent | undefined;

      await session.withTransaction(async () => {
        const [doc] = await SalaryComponentModel.create(
          [{ companyId: companyOid, ...data }],
          { session },
        );

        created = doc.toObject();

        await this.salaryAuditLogDAO.createAuditLog(
          {
            companyId: companyOid,
            entityType: "SALARY_COMPONENT",
            entityId: doc._id as Types.ObjectId,
            action: "CREATED",
            context: auditContext,
            after: created as unknown as Record<string, unknown>,
          },
          session,
        );
      });

      if (!created) {
        throw new Error("Failed to create salary component");
      }

      return created;
    } finally {
      await session.endSession();
    }
  }

  public async getSalaryComponentById(
    componentId: string,
    companyId: string,
  ): Promise<SalaryComponent | null> {
    return SalaryComponentModel.findOne({
      _id: new Types.ObjectId(componentId),
      companyId: new Types.ObjectId(companyId),
      isDeleted: false,
    }).lean();
  }

  public async getAllSalaryComponents(
    companyId: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: SalaryComponent[]; total: number }> {
    const filter = {
      companyId: new Types.ObjectId(companyId),
      isDeleted: false,
    };

    const [items, total] = await Promise.all([
      SalaryComponentModel.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SalaryComponentModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  public async updateSalaryComponent(
    componentId: string,
    companyId: string,
    data: Partial<SalaryComponent>,
    auditContext: AuditContext = SYSTEM_AUDIT_CONTEXT,
  ): Promise<SalaryComponent> {
    const componentOid = new Types.ObjectId(componentId);
    const companyOid = new Types.ObjectId(companyId);

    const session = await mongoose.startSession();

    try {
      let updated: SalaryComponent | undefined;

      await session.withTransaction(async () => {
        const before = await SalaryComponentModel.findOne({
          _id: componentOid,
          companyId: companyOid,
          isDeleted: false,
        })
          .session(session)
          .lean();

        if (!before) {
          throw new NotFoundError("Salary component not found");
        }

        const after = await SalaryComponentModel.findOneAndUpdate(
          { _id: componentOid, companyId: companyOid, isDeleted: false },
          { $set: { ...data, updatedAt: new Date() } },
          { new: true, runValidators: true, session },
        ).lean();

        if (!after) {
          throw new NotFoundError("Salary component not found");
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
              entityType: "SALARY_COMPONENT",
              entityId: componentOid,
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
        throw new NotFoundError("Salary component not found");
      }

      return updated;
    } finally {
      await session.endSession();
    }
  }

  public async deleteSalaryComponent(
    componentId: string,
    companyId: string,
    auditContext: AuditContext = SYSTEM_AUDIT_CONTEXT,
  ): Promise<void> {
    const componentOid = new Types.ObjectId(componentId);
    const companyOid = new Types.ObjectId(companyId);

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const component = await SalaryComponentModel.findOneAndUpdate(
          { _id: componentOid, companyId: companyOid, isDeleted: false },
          { $set: { isDeleted: true, updatedAt: new Date() } },
          { session },
        ).lean();

        if (!component) {
          throw new NotFoundError("Salary component not found");
        }

        await this.salaryAuditLogDAO.createAuditLog(
          {
            companyId: companyOid,
            entityType: "SALARY_COMPONENT",
            entityId: componentOid,
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
}
