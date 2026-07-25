/**
 * Custom error hierarchy for the Employee domain.
 *
 * Using typed errors instead of plain `new Error("...")` lets the
 * controller map failures to the correct HTTP status code without
 * string-matching messages, and lets services/DAO callers branch on
 * `instanceof` instead of parsing text.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Referenced entity (employee, department, designation, shift, role, policy...) does not exist / is soft-deleted */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, "NOT_FOUND");
  }
}

/** Payload is structurally or semantically invalid (bad dates, negative salary, etc.) */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

/** Would violate a uniqueness constraint (duplicate email/phone/PAN/employeeId/etc.) */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

/** Violates a domain/business rule (circular hierarchy, invalid status transition, pending approvals block delete, etc.) */
export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422, "BUSINESS_RULE_VIOLATION");
  }
}

/** Optimistic-locking version mismatch — caller should retry */
export class ConcurrentUpdateError extends AppError {
  constructor(
    message: string = "Concurrent modification detected — please retry.",
  ) {
    super(message, 409, "CONCURRENT_UPDATE");
  }
}
