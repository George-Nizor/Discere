/**
 * Coerce a conventional URL query value into a boolean without treating every
 * non-empty string as true. Unknown values are returned unchanged so Zod can
 * report a validation error at the HTTP boundary.
 */
export function coerceQueryBoolean(value: unknown): unknown {
  if (typeof value === "boolean" || value === undefined) return value;
  if (typeof value !== "string") return value;

  switch (value.trim().toLocaleLowerCase()) {
    case "true":
    case "1":
    case "yes":
    case "on":
      return true;
    case "false":
    case "0":
    case "no":
    case "off":
      return false;
    default:
      return value;
  }
}
