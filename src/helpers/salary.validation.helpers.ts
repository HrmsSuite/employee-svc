import { Types } from "mongoose";
import { BusinessRuleError } from "../helpers/error";

/**
 * Validates whether a string is a valid MongoDB ObjectId.
 */
export function validateObjectId(
  value: string,
  fieldName: string,
): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new BusinessRuleError(`${fieldName} is invalid`);
  }

  return new Types.ObjectId(value);
}

/**
 * Validates salary amount.
 */
export function validateSalaryAmount(salary: number): void {
  if (!Number.isFinite(salary)) {
    throw new BusinessRuleError("Salary must be a valid number");
  }

  if (salary < 0) {
    throw new BusinessRuleError("Salary cannot be negative");
  }
}

/**
 * Validates effective salary dates.
 */
export function validateSalaryDates(
  effectiveFrom: Date,
  effectiveTo?: Date,
): void {
  if (effectiveTo && effectiveTo <= effectiveFrom) {
    throw new BusinessRuleError(
      "Effective to date must be greater than effective from date",
    );
  }
}

/**
 * Validates salary status.
 */
export function validateSalaryStatus(status: "ACTIVE" | "INACTIVE"): void {
  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    throw new BusinessRuleError("Invalid salary status");
  }
}
