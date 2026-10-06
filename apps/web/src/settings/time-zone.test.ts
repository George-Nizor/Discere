import { describe, expect, it } from "vitest";
import { resolveTimeZone } from "../study/StudyPreferences.js";

const zones = ["Europe/London", "Australia/Sydney", "America/New_York", "UTC"];

describe("time zone picker", () => {
  it("accepts a zone in any case and returns its proper spelling", () => {
    expect(resolveTimeZone("australia/sydney", zones)).toEqual({ zone: "Australia/Sydney" });
    expect(resolveTimeZone("utc", zones)).toEqual({ zone: "UTC" });
  });
  it("accepts a city on its own when only one zone has that name", () => {
    expect(resolveTimeZone("new york", zones)).toEqual({ zone: "America/New_York" });
  });
  it("says what is wrong instead of a schema message", () => {
    const result = resolveTimeZone("Mars/Base", zones);
    expect("problem" in result && result.problem).toMatch(/“Mars\/Base” is not in the list/);
    expect(resolveTimeZone("  ", zones)).toHaveProperty("problem");
  });
});
