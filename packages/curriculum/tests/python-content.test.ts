import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { type CourseBundle, CourseBundleSchema } from "@discere/contracts";
import { assertEditorialApproval, loadCourseBundle, validateCourseBundle } from "../src/index.js";
import { historicalBundle } from "./helpers/published-history.js";
const directory = path.resolve(import.meta.dirname, "../../../content/python-for-data-analysis");
// The bundle these checks were written against: archived once the course was rewritten to v2
// (helpers/published-history.ts). Approval is checked on the current bundle.
let bundle: CourseBundle;
let current: CourseBundle;
beforeAll(async () => {
  current = await loadCourseBundle(path.join(directory, "bundle.json"));
  bundle = CourseBundleSchema.parse(historicalBundle("python-for-data-analysis"));
});
// Recompute the numeric exercises from their stated observations, outside the authoring runner.
const sums = (values: number[]) => values.reduce((a, b) => a + b, 0);
const orderFee = (units: number) => units >= 10 ? 0 : units >= 5 ? 2 : 4;
const cases: Record<string, Record<number, number>> = {
  "run-and-bind": { 1: 5 * 4, 2: 1 + 4 * 3, 5: 6 * 7, 6: (3 + 2) * 4 },
  "numbers-and-types": {
    1: Number("14") + Number("6"),
    2: Math.floor(-13 / 5),
    5: 19 - Math.floor(19 / 6) * 6,
    6: 3 ** 4,
  },
  "strings-and-slices": {
    1: "ORCHARD".slice(2, 5).length,
    3: "a\nb".length,
    5: " DATA ".trim().length,
    6: "NOTEBOOK".slice(-3).length,
  },
  "lists-and-tuples": {
    1: [1, 4, 7].length,
    4: sums([2, 5, 8, 11].slice(1, 3)),
    5: [3, 9].length,
    6: [4, 6, 4, 6, 4, 6].length,
  },
  "keys-and-sets": {
    1: Object.keys({ a: 9, b: 5 }).length,
    4: [1, 3, 5].filter((x) => [3, 4, 5].includes(x)).length,
    5: new Set([2, 2, 4, 6, 4]).size,
    6: 10,
  },
  "conditions-and-loops": {
    1: orderFee(7),
    2: sums([2, 4, 6, 8]),
    5: 2 + Math.ceil((10 - 2) / 3) * 3,
    6: 5 & 3,
  },
  "functions-and-imports": { 1: 7 * 3, 2: 6 * 5, 5: 8 * 4, 6: Math.sqrt(144) },
  "errors-and-resources": { 1: Number("24"), 2: sums([4, 6]), 5: ["8.5", "no"].length, 6: 5 + 9 },
  "arrays-and-shape": {
    1: sums([3, 5].map((x) => 2 * x)),
    2: 3 * 4,
    5: 18 / 3,
    6: [2, 3, 4].length,
  },
  "array-calculations": { 1: sums([1, 3, 5].map((x) => x + 2)), 2: 2 + 6, 5: (2 + 8) / 2, 6: 20 },
  "ranges-and-randomness": { 1: [3, 6, 9, 12].length, 2: 14, 5: 9 - 4, 6: 15 / (6 - 1) },
  "read-and-inspect": { 1: 6, 2: 3, 5: Math.min(3, 8), 6: 5 },
  "labels-and-positions": {
    1: new Map([
      [10, 4],
      [20, 7],
      [30, 9],
    ]).get(20)!,
    2: [10, 20, 30, 40].filter((x) => x >= 20 && x <= 40).length,
    5: [0, 1, 2, 3, 4, 5].slice(1, 4).length,
    6: 22,
  },
  "filters-and-columns": {
    1: [1, 4, 6, 2].filter((x) => x >= 4).length,
    2: [
      { s: "Bay", n: 2 },
      { s: "Bay", n: 5 },
      { s: "Hill", n: 7 },
    ].filter((x) => x.s === "Bay" && x.n > 3).length,
    5: 2 * 7 + 3 * 5,
    6: 5 * 3,
  },
  "missing-values": {
    1: [0, null, 4, null].filter((x) => x === null).length,
    2: (4 + 10) / 2,
    5: (3 + 0 + 9) / 3,
    6: [1, null, null, 7, 0].filter((x) => x !== null).length,
  },
  "text-and-transformations": {
    1: "  NORTH ".trim().toLowerCase().length,
    2: 2 * 2,
    5: "red,blue,gold".split(",").length,
    6: 7 + 9,
  },
  "dates-and-units": {
    1: 9,
    2: 2,
    5: 300 - 120,
    6: (Date.UTC(2026, 5, 7) - Date.UTC(2026, 5, 2)) / 86400000,
  },
  "summaries-and-groups": {
    1: sums([2, 4, 6, 20]) / 4,
    2: 2 + 6,
    5: (3 + 5) / 2,
    6: new Set(["Bay", "Hill", "Bay", "Lake"]).size,
  },
  "combine-tables": {
    1: 3 + 4,
    2: [1, 2, 3].length,
    5: 3 * 2,
    6: [1, 1, 2, 3].filter((x) => [1, 2].includes(x)).length,
  },
  "reshape-a-report": { 1: 3 * 4, 2: 3 + 9, 5: 4 * 3, 6: (4 + 10) / 2 },
  "audit-a-sales-report": {
    1: [1, 2, 2, 3].length - new Set([1, 2, 2, 3]).size,
    2: [true, false, true, true].filter(Boolean).length,
    5: 2 * 7 + 3 * 5,
    6: 2 * 7 + 3 * 5 + 4 * 6,
  },
};
describe("reviewed Python curriculum", () => {
  it.each(Object.keys(cases))("independently checks the numeric keys for %s", (id) => {
    for (const [index, value] of Object.entries(cases[id]!)) {
      const authority = bundle.questions.find(
        (q) => q.id === "python-" + id + "-" + index,
      )?.answerAuthority;
      expect(authority?.kind).toBe("numeric");
      if (authority?.kind === "numeric") expect(authority.value).toBeCloseTo(value, 9);
    }
    expect(
      bundle.questions.filter(
        (q) => q.id.startsWith("python-" + id + "-") && q.answerAuthority.kind === "numeric",
      ),
    ).toHaveLength(4);
  });
  it("publishes exactly the reviewed content and original cover", async () => {
    const review = JSON.parse(
      await readFile(path.join(directory, "review/publication.json"), "utf8"),
    );
    expect(() =>
      assertEditorialApproval(current, review, validateCourseBundle(current)),
    ).not.toThrow();
    expect(bundle.lessons).toHaveLength(21);
    expect(bundle.questions).toHaveLength(126);
    expect(bundle.flashcards).toHaveLength(42);
    for (const lesson of bundle.lessons) {
      expect(lesson.steps).toHaveLength(4);
      expect(lesson.questionIds).toHaveLength(2);
      expect(lesson.flashcardIds).toHaveLength(2);
      for (const step of lesson.steps) {
        expect(step.diagram?.type).toBe("python_execution");
        expect(JSON.stringify(step.diagram)).not.toMatch(
          /answerAuthority|acceptedIdeas|workedAnswer|\"probe\"/,
        );
      }
    }
  });
  it("keeps choice positions varied with one accepted response", () => {
    const positions = new Set<number>();
    for (const question of bundle.questions.filter((q) => q.choices)) {
      const accepted =
        question.answerAuthority.kind === "text" ? question.answerAuthority.acceptedIdeas : [];
      const correct = question.choices!.filter((choice) => accepted.includes(choice.label));
      expect(correct).toHaveLength(1);
      positions.add(question.choices!.findIndex((choice) => choice.id === correct[0]!.id));
    }
    expect(positions.size).toBe(3);
    expect(
      bundle.questions.filter((q) => q.choices).length / bundle.questions.length,
    ).toBeLessThanOrEqual(0.35);
  });
  it("retains the source guide's corrections and reproducibility evidence", async () => {
    const evidence = JSON.parse(
      await readFile(path.join(directory, "review/execution-evidence.json"), "utf8"),
    );
    expect(evidence.examples).toBe(168);
    expect(evidence.numericChecks).toBe(105);
    expect(evidence.runtime).toEqual({ python: "3.12.14", numpy: "2.3.5", pandas: "3.0.1" });
    const corpus = JSON.stringify(bundle);
    for (const phrase of [
      "arbitrary precision",
      "shallow copy",
      "unit",
      "many_to_one",
      "Copy-on-Write",
      "NaT",
    ])
      expect(corpus).toContain(phrase);
  });
});
