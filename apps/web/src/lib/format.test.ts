import { describe, expect, it } from "vitest";
import {
  countWords,
  formatCurrent,
  formatInterval,
  formatSavedAt,
  humaniseId,
  initialsOf,
} from "./format.js";

describe("format helpers", () => {
  it("renders a concept id as readable words", () => {
    expect(humaniseId("ohms-law")).toBe("Ohms law");
    expect(humaniseId("series_circuits")).toBe("Series circuits");
  });

  it("counts words without trailing whitespace inflation", () => {
    expect(countWords("  ")).toBe(0);
    expect(countWords("one two   three\nfour")).toBe(4);
  });

  it("keeps small currents in milliamps", () => {
    expect(formatCurrent(0.05)).toBe("50 mA");
    expect(formatCurrent(1.5)).toBe("1.50 A");
  });

  it("states when a draft was saved", () => {
    const now = Date.parse("2026-08-18T12:00:00.000Z");
    expect(formatSavedAt(null, now)).toBe("Not saved yet");
    expect(formatSavedAt("2026-08-18T11:59:40.000Z", now)).toBe("Saved just now");
    expect(formatSavedAt("2026-08-18T11:40:00.000Z", now)).toBe("Saved 20 minutes ago");
    expect(formatSavedAt("2026-08-18T09:00:00.000Z", now)).toBe("Saved 3 hours ago");
  });

  it("describes review intervals in whole units", () => {
    expect(formatInterval(0.5)).toBe("12 hours");
    expect(formatInterval(1)).toBe("1 day");
    expect(formatInterval(6.4)).toBe("6 days");
  });

  it("builds initials from a learner name", () => {
    expect(initialsOf("George Nizoridis")).toBe("GN");
    expect(initialsOf("Ada")).toBe("A");
  });
});
