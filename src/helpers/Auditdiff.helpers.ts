import { SalaryAuditChange } from "@hrmssuite/persistence";

/**
 * Shallow top-level diff between two plain objects.
 *
 * Deliberately shallow — for nested structures like `components`
 * (an array), diffing entry-by-position is misleading (a reorder
 * looks like N changes). Instead, treat a changed array/object as a
 * single field-level change and store the whole before/after
 * sub-value; the full `before`/`after` snapshots on the audit record
 * already give you the complete picture if you need to dig in.
 */
export function diffObjects(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): { changedFields: string[]; changes: SalaryAuditChange[] } {
  const changedFields: string[] = [];
  const changes: SalaryAuditChange[] = [];

  const beforeObj = before ?? {};
  const afterObj = after ?? {};

  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

  for (const key of keys) {
    const oldValue = beforeObj[key];
    const newValue = afterObj[key];

    // JSON.stringify comparison is good enough here: these are
    // already plain snapshot objects (post .lean()/.toObject()),
    // not class instances or objects with cyclic references.
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changedFields.push(key);
      changes.push({ field: key, oldValue, newValue });
    }
  }

  return { changedFields, changes };
}
