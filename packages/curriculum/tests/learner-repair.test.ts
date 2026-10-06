import { readFileSync } from "node:fs";
import { assessNumericAnswer, assessTextAnswer } from "@discere/assessment-engine";
import { CourseBundleSchema } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { bundleDigest } from "../src/index.js";
import { publishedBundle } from "./helpers/published-history.js";

const read = (p: string) =>
  JSON.parse(readFileSync(new URL("../../../" + p, import.meta.url), "utf8"));
const courses = ["chemistry-atoms-to-reactions", "probability-statistics", "maths-foundations"];

describe("second learner grading repair", () => {
  for (const id of courses)
    it(id + " changes only recorded marking authorities", () => {
      const record = read("content/" + id + "/review/learner-refinement-2.json");
      const b = CourseBundleSchema.parse(publishedBundle(id, record.publishedBundleSha256));
      expect(bundleDigest(b)).toBe(record.publishedBundleSha256);
      const restored = structuredClone(b) as unknown as Record<string | number, unknown>;
      for (const delta of record.deltas) {
        expect(delta.path).toContain("answerAuthority");
        let target = restored;
        for (const key of delta.path.slice(0, -1)) target = target[key] as typeof target;
        const key = delta.path.at(-1);
        expect(target[key]).toEqual(delta.after);
        target[key] = delta.before;
      }
      expect(bundleDigest(CourseBundleSchema.parse(restored))).toBe(record.previousBundleSha256);
    });

  it("accepts each explicitly declared chemistry quantity, and rejects a different kind", () => {
    const b = CourseBundleSchema.parse(read("content/chemistry-atoms-to-reactions/bundle.json"));
    const authorities = [
      ...b.questions,
      ...b.flashcards,
      ...(b.courseChecks ?? []).flatMap((s) => s.items.map((i) => i.question)),
    ].map((q) => q.answerAuthority);
    const named = authorities.filter((a) => a?.kind === "numeric" && a.unit);
    expect(named).toHaveLength(99);
    for (const a of named) {
      if (a?.kind !== "numeric") throw Error("Expected numeric");
      expect(assessNumericAnswer(String(a.value) + " " + a.unit, a).correct).toBe(true);
      expect(assessNumericAnswer(String(a.value), a).correct).toBe(true);
      expect(assessNumericAnswer(String(a.value) + " m", a).error).toBe("unit_mismatch");
    }
    const sulfur = b.flashcards.find((c) => c.id === "chem-what-makes-an-element-card-2")!;
    if (sulfur.answerAuthority?.kind !== "numeric") throw Error("Expected numeric");
    expect(assessNumericAnswer("16 electrons", sulfur.answerAuthority).correct).toBe(true);
    expect(assessNumericAnswer("16 protons", sulfur.answerAuthority).correct).toBe(false);
  });

  it("accepts percentages only for the 22 declared probabilities", () => {
    const b = CourseBundleSchema.parse(read("content/probability-statistics/bundle.json"));
    const authorities = [
      ...b.questions,
      ...b.flashcards,
      ...(b.courseChecks ?? []).flatMap((s) => s.items.map((i) => i.question)),
    ].map((q) => q.answerAuthority);
    const probabilities = authorities.filter(
      (a) => a?.kind === "numeric" && a.unit === "probability",
    );
    expect(probabilities).toHaveLength(22);
    for (const a of probabilities) {
      if (a?.kind !== "numeric") throw Error("Expected numeric");
      const percentage = Math.round(a.value * 100 * 1e12) / 1e12;
      expect(assessNumericAnswer(percentage + "%", a).correct).toBe(true);
      expect(assessNumericAnswer(String(a.value), a).correct).toBe(true);
      expect(assessNumericAnswer(percentage + "%", { ...a, unit: "" }).error).toBe("unit_mismatch");
    }
    const dice = b.questions.find((q) => q.id === "stats-counting-outcomes-5")!;
    if (dice.answerAuthority?.kind !== "numeric") throw Error("Expected numeric");
    expect(assessNumericAnswer("25%", dice.answerAuthority).correct).toBe(true);
    expect(assessNumericAnswer("25", dice.answerAuthority).correct).toBe(false);
  });

  it("accepts zero with a reason, but rejects its negation and different divisors", () => {
    const b = CourseBundleSchema.parse(read("content/maths-foundations/bundle.json"));
    const authority = b.flashcards.find((c) => c.id === "maths-keeping-the-balance-card-2")!
      .answerAuthority!;
    if (authority.kind !== "text") throw Error("Expected text");
    for (const answer of ["0", "zero", "Zero, because division by zero is undefined."])
      expect(assessTextAnswer(answer, authority).correct, answer).toBe(true);
    for (const answer of ["1", "10", "not zero", "nonzero", "zero is allowed"])
      expect(assessTextAnswer(answer, authority).correct, answer).toBe(false);
  });
});
