import { EmployeeData } from "@hrmssuite/persistence";
import { flattenToSetFields } from "./flattenToSetFields";
import { Types } from "mongoose";

/**
 * Builds the $set fields map from a partial EmployeeData payload.
 *
 * @param data - Partial employee data sent by the caller
 * @returns Flattened dot-notation record safe for MongoDB $set
 */
export function buildSetFields(
  data: Partial<EmployeeData>,
): Record<string, unknown> {
  const set: Record<string, unknown> = {};

  if (data.basic)
    flattenToSetFields(
      "data.basic",
      data.basic as unknown as Record<string, unknown>,
      [],
      set,
    );
  if (data.job)
    flattenToSetFields(
      "data.job",
      data.job as unknown as Record<string, unknown>,
      ["leavepolicy"],  
      set,
    );

  if (data.job?.leavepolicy !== undefined) {
    set["data.job.leavepolicy"] = data.job.leavepolicy.map(
      (id) => new Types.ObjectId(id),
    );
  }
  if (data.compensation)
    flattenToSetFields(
      "data.compensation",
      data.compensation as unknown as Record<string, unknown>,
      ["salaryHistory"],
      set,
    );
  if (data.address)
    flattenToSetFields(
      "data.address",
      data.address as unknown as Record<string, unknown>,
      [],
      set,
    );
  if (data.payroll)
    flattenToSetFields(
      "data.payroll",
      data.payroll as unknown as Record<string, unknown>,
      [],
      set,
    );
  if (data.bank)
    flattenToSetFields(
      "data.bank",
      data.bank as unknown as Record<string, unknown>,
      [],
      set,
    );
  if (data.legal)
    flattenToSetFields(
      "data.legal",
      data.legal as unknown as Record<string, unknown>,
      [],
      set,
    );
  if (data.tax)
    flattenToSetFields(
      "data.tax",
      data.tax as unknown as Record<string, unknown>,
      [],
      set,
    );

  // Documents is an array — replace entirely
  if (data.documents !== undefined) set["data.documents"] = data.documents;

  return set;
}
