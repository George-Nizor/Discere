import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { CourseBundle } from "@discere/contracts";
import { validateCourseBundle } from "../src/index.js";
import { fadesOnlyTheLastLine, sameTemplate, teachingNotes } from "../src/lesson-v2.js";

const line = (text: string, blank = false) => ({
  text,
  ...(blank ? { blank: { questionId: `q-${text}` } } : {}),
});

describe("fadesOnlyTheLastLine", () => {
  it("flags a single blank on the last of three or more lines", () => {
    expect(fadesOnlyTheLastLine([line("a"), line("b"), line("c", true)])).toBe(true);
  });

  it("accepts a blank on the deciding line, or two blanks", () => {
    expect(fadesOnlyTheLastLine([line("a"), line("b", true), line("c")])).toBe(false);
    expect(fadesOnlyTheLastLine([line("a"), line("b", true), line("c", true)])).toBe(false);
  });

  it("leaves two-line examples alone, where the last line is often the only step", () => {
    expect(fadesOnlyTheLastLine([line("a"), line("b", true)])).toBe(false);
  });
});

describe("sameTemplate", () => {
  it("matches a prompt that only changes the numbers", () => {
    expect(
      sameTemplate(
        "A box of mass 4 kg is pushed with a force of 12 N. What is its acceleration?",
        "A box of mass 6 kg is pushed with a force of 30 N. What is its acceleration?",
      ),
    ).toBe(true);
  });

  it("does not match a change of situation or direction", () => {
    expect(
      sameTemplate(
        "A box of mass 4 kg is pushed with a force of 12 N. What is its acceleration?",
        "A cyclist speeds up at 2 m/s² and the bike and rider weigh 80 kg. What force is the rider supplying?",
      ),
    ).toBe(false);
  });

  it("ignores prompts too short to judge", () => {
    expect(sameTemplate("Solve for x.", "Solve for y.")).toBe(false);
  });
});

describe("teachingNotes", () => {
  const bundle = JSON.parse(
    readFileSync(
      new URL("../../../content/calculus-change-and-accumulation/bundle.json", import.meta.url),
      "utf8",
    ),
  ) as CourseBundle;

  it("reports on a reviewed course without adding to its validation issues", () => {
    const notes = teachingNotes(bundle);
    expect(notes.some((note) => note.code === "FADED_ONLY_LAST_LINE")).toBe(true);
    const codes = new Set(validateCourseBundle(bundle).issues.map((issue) => issue.code));
    expect(codes.has("FADED_ONLY_LAST_LINE")).toBe(false);
    expect(codes.has("TRANSFER_SAME_TEMPLATE")).toBe(false);
  });
});
