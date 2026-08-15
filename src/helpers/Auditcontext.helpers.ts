import { Types } from "mongoose";
import { SalaryAuditSource } from "@hrmssuite/persistence";

/**
 * Actor/request context threaded from controller -> service -> DAO so
 * audit entries can record who did what and from where.
 *
 * This is a plain application-layer type, not part of the persistence
 * package — it does not touch SalaryAuditLog's schema or type.
 */
export interface AuditContext {
  performedBy?: Types.ObjectId;
  source: SalaryAuditSource;
  reason?: string;
  comments?: string;
  requestId?: string;
}

/**
 * Default context for internal/system-triggered writes
 * (migrations, scheduled jobs, background reconciliation, etc).
 */
export const SYSTEM_AUDIT_CONTEXT: AuditContext = {
  source: "SYSTEM",
};
