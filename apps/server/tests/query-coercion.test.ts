import { describe, expect, it } from "vitest";
import { coerceQueryBoolean } from "../src/query-coercion.js";

describe("query boolean coercion", () => {
  it("coerces conventional true values", () => {
    for (const input of ["true", "1", "yes", "on"]) {
      expect(coerceQueryBoolean(input)).toBe(true);
    }
  });

  it("coerces conventional false values", () => {
    for (const input of ["false", "0", "no", "off", " FALSE "]) {
      expect(coerceQueryBoolean(input)).toBe(false);
    }
  });

  it("leaves unknown values for schema validation", () => {
    expect(coerceQueryBoolean("sometimes")).toBe("sometimes");
  });
});
