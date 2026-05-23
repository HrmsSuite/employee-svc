export function flattenToSetFields(
  prefix: string,
  obj: Record<string, unknown>,
  exclude: string[] = [],
  target: Record<string, unknown> = {},
): Record<string, unknown> {
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || exclude.includes(key)) return;

    const fullKey = `${prefix}.${key}`;

    if (
      Array.isArray(value) || // ← treat arrays as atomic leaf values
      value === null ||
      typeof value !== "object" ||
      value instanceof Date || // ← don't recurse into Date
      value instanceof Object.getPrototypeOf(Uint8Array) // ObjectId, Buffer, etc.
    ) {
      target[fullKey] = value;
    } else {
      // Recurse into plain nested objects
      flattenToSetFields(
        fullKey,
        value as Record<string, unknown>,
        [], // exclude only applies at top level
        target,
      );
    }
  });
  return target;
}
