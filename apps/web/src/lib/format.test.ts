import { describe, expect, it } from "vitest";
import {
  countWords,
  formatCurrent,
  formatDueCell,
  formatReturn,
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

  it("names an FSRS learning step in minutes rather than rounding it up to an hour", () => {
    expect(formatInterval(10 / (24 * 60))).toBe("10 minutes");
    expect(formatInterval(1 / (24 * 60))).toBe("1 minute");
    expect(formatInterval(6 / (24 * 60))).toBe("6 minutes");
    expect(formatInterval(1 / 24)).toBe("1 hour");
  });

  it("builds initials from a learner name", () => {
    expect(initialsOf("George Nizoridis")).toBe("GN");
    expect(initialsOf("Ada")).toBe("A");
  });

  it("names a near return in minutes rather than as a date", () => {
    const now = new Date(2026, 9, 6, 10, 0).getTime();
    const at = (minutes: number) => new Date(now + minutes * 60_000).toISOString();
    expect(formatReturn(at(1), now)).toBe("in 1 minute");
    expect(formatReturn(at(6), now)).toBe("in 6 minutes");
    expect(formatReturn(at(180), now)).toBe("in 3 hours");
    expect(formatReturn(at(24 * 60), now)).toBe("tomorrow");
    expect(formatReturn(new Date(2026, 9, 20, 9).toISOString(), now)).toMatch(
      /^on 20 October$|^on October 20$/,
    );
    expect(formatDueCell(at(6), now)).toBe("In 6 minutes");
    expect(formatReturn(at(0), now)).toBe("now");
  });
});
