// services/SalaryAuditLog.service.ts

import { ClientSession, Types } from "mongoose";
import {
  SalaryAuditLog,
  SalaryAuditEntity,
  SalaryAuditAction,
  SalaryAuditChange,
} from "@hrmssuite/persistence";
import { AuditContext } from "../helpers/Auditcontext.helpers";
import { SalaryAuditLogDAO } from "../Dao";
import { diffObjects } from "../helpers/Auditdiff.helpers";

export interface RecordSalaryAuditInput {
  companyId: Types.ObjectId;
  entityType: SalaryAuditEntity;
  entityId: Types.ObjectId;
  employeeId?: Types.ObjectId;
  action: SalaryAuditAction;
  context: AuditContext;

  /**
   * Full before/after snapshots. Always stored as-is on the record.
   *
   * If `changedFields`/`changes` are NOT provided, they're derived
   * from these via `diffObjects`. If they ARE provided, they're
   * trusted as-is and no diff is computed — lets a caller pass a
   * curated diff (e.g. only the fields it cares to report) without
   * the service silently overriding it.
   */
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;

  changedFields?: string[];
  changes?: SalaryAuditChange[];

  metadata?: Record<string, unknown>;
}

const DEFAULT_PAGE = 1;
const DEFAULT_ENTITY_LIMIT = 25;
const DEFAULT_EMPLOYEE_LIMIT = 25;
const DEFAULT_COMPANY_LIMIT = 50;

/**
 * Application-layer wrapper around the append-only audit DAO.
 *
 * This is the ONLY place outside the DAO itself that should know
 * about diffing/context-assembly details — other domain services call
 * `recordSalaryAudit`, they don't build audit documents by hand.
 */
export class SalaryAuditLogService {
  constructor(
    private readonly dao: SalaryAuditLogDAO = new SalaryAuditLogDAO(),
  ) {}

  /**
   * Record a salary audit entry. Pass `session` when this write must
   * be atomic with the state change it documents.
   */
  public async recordSalaryAudit(
    input: RecordSalaryAuditInput,
    session?: ClientSession,
  ): Promise<SalaryAuditLog> {
    const hasExplicitDiff =
      input.changedFields !== undefined || input.changes !== undefined;

    const { changedFields, changes } = hasExplicitDiff
      ? {
          changedFields: input.changedFields ?? [],
          changes: input.changes ?? [],
        }
      : diffObjects(input.before, input.after);

    return this.dao.createAuditLog(
      {
        companyId: input.companyId,
        entityType: input.entityType,
        entityId: input.entityId,
        employeeId: input.employeeId,
        action: input.action,
        context: input.context,
        changedFields,
        changes,
        before: input.before,
        after: input.after,
        metadata: input.metadata,
      },
      session,
    );
  }

  public async getEntityHistory(
    companyId: string,
    entityType: SalaryAuditEntity,
    entityId: string,
    page = DEFAULT_PAGE,
    limit = DEFAULT_ENTITY_LIMIT,
  ): Promise<{ items: SalaryAuditLog[]; total: number }> {
    return this.dao.getAuditLogsForEntity(
      companyId,
      entityType,
      entityId,
      page,
      limit,
    );
  }

  public async getEmployeeHistory(
    companyId: string,
    employeeId: string,
    page = DEFAULT_PAGE,
    limit = DEFAULT_EMPLOYEE_LIMIT,
  ): Promise<{ items: SalaryAuditLog[]; total: number }> {
    return this.dao.getAuditLogsForEmployee(companyId, employeeId, page, limit);
  }

  public async getCompanyHistory(
    companyId: string,
    page = DEFAULT_PAGE,
    limit = DEFAULT_COMPANY_LIMIT,
  ): Promise<{ items: SalaryAuditLog[]; total: number }> {
    return this.dao.getAuditLogsForCompany(companyId, page, limit);
  }
}
