import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runTeachingProgram, traceSearch } from "@discere/activity-engine";
import { assertEditorialApproval, loadCourseBundle, validateCourseBundle } from "../src/index.js";
const root = path.resolve(import.meta.dirname, "../../../content");
const load = (id: string) => loadCourseBundle(path.join(root, id, "bundle.json"));

describe("published foundation curriculum", () => {
  it.each(["maths-foundations", "logic-and-reasoning", "cs-basics"])(
    "publishes %s against its exact review and artwork",
    async (id) => {
      const bundle = await load(id);
      const review = JSON.parse(
        await readFile(path.join(root, id, "review/publication.json"), "utf8"),
      );
      expect(() =>
        assertEditorialApproval(bundle, review, validateCourseBundle(bundle)),
      ).not.toThrow();
      expect(
        bundle.lessons.every(
          (lesson) =>
            // A v2 lesson (Maths lesson 1 from 1.2.0) has 5–7 screens; legacy lessons have four.
            (lesson.intro ? lesson.steps.length >= 5 : lesson.steps.length === 4) &&
            lesson.flashcardIds.length === 2,
        ),
      ).toBe(true);
    },
  );

  it("recomputes every numerical Maths answer using equations and coordinates", async () => {
    const bundle = await load("maths-foundations");
    const solve = (a: number, b: number, c: number) => (c - b) / a;
    const slope = (x1: number, y1: number, x2: number, y2: number) => (y2 - y1) / (x2 - x1);
    const cases: Record<string, Record<string, number>> = {
      "what-a-letter-stands-for": {
        hook: solve(1, 5, 12),
        "3": solve(1, 5, 12),
        order: 3 * 6 - 4,
        "left-side": 2 * 4 + 1,
        try: 5 * 3 - 2,
        taxi: 3 + 2 * 7,
        "check-1": 3 * 4 + 2,
        // Moved to lesson 3 in 1.2.0 with their ids kept.
        "4": solve(3, -4, 14),
        "practice-1": solve(0.5, 1, 4),
      },
      "keeping-the-balance": {
        "2": solve(2, 0, 12),
        "3": solve(4, 0, 20),
        "4": solve(3, -9, -15),
        "practice-1": solve(5, 2, 27),
      },
      "undoing-in-the-right-order": {
        "2": solve(2, 3, 17),
        "3": solve(3, 6, 21),
        "4": solve(0.25, -2, 1.5),
        "practice-1": solve(4, -2, 14),
        "practice-2": solve(4, 1, 4),
      },
      "a-point-is-a-pair": {
        "1": [3, 2][0]!,
        "3": [-3, 2][0]!,
        "4": [4, -2][1]!,
        "practice-1": -5,
        "practice-2": 0,
      },
      "how-steep-is-it": {
        "1": 5 - 1,
        "2": slope(0, 1, 2, 5),
        "3": slope(-2, 3, 2, -1),
        "4": slope(-2, -1, 2, 1),
        "practice-2": slope(1, 4, 5, 4),
      },
      "from-equation-to-line": {
        "1": 2 * 0 + 1,
        "2": -2 + 3,
        "4": 0.5 * 4 + 2,
        "practice-1": slope(1, 2, 3, 6),
        "practice-2": solve(2, 0, 10),
      },
    };
    const ids = new Set<string>();
    for (const [lesson, casesForLesson] of Object.entries(cases))
      for (const [suffix, value] of Object.entries(casesForLesson)) {
        const id = `maths-${lesson}-${suffix}`;
        ids.add(id);
        const authority = bundle.questions.find((question) => question.id === id)?.answerAuthority;
        expect(authority?.kind, id).toBe("numeric");
        if (authority?.kind === "numeric") expect(authority.value, id).toBeCloseTo(value, 10);
      }
    expect(
      bundle.questions
        .filter((question) => question.answerAuthority.kind === "numeric")
        .map((question) => question.id)
        .sort(),
    ).toEqual([...ids].sort());
  });

  it("checks program, repair and search questions against executable teaching cases", async () => {
    const bundle = await load("cs-basics");
    for (const lesson of bundle.lessons)
      for (const step of lesson.steps) {
        const authority = bundle.questions.find(
          (question) => question.id === step.checkQuestionId,
        )?.answerAuthority;
        if (authority?.kind !== "numeric") continue;
        const spec = step.diagram!;
        let expected: number | null = null;
        if (spec.type === "program_trace") {
          let code = spec.code;
          if (step.id === "transfer") {
            if (lesson.id === "steps-a-machine-could-follow")
              code = code.replace("x = x + 3", "x = x * 3");
            if (lesson.id === "choosing-between-paths") code = code.replace("x > 3", "x >= 3");
            if (lesson.id === "doing-it-again") code = code.replace("x = x + 1", "x = x - 1");
          }
          const run = runTeachingProgram(code);
          expect(run.error, `${lesson.id}/${step.id}`).toBeNull();
          expected =
            lesson.id === "doing-it-again" && ["predict", "work"].includes(step.id)
              ? run.steps.filter((item) => item.line === 3).length
              : run.value;
        } else if (spec.type === "search_array") {
          expected = traceSearch(spec.values, spec.target, spec.strategy).length;
          if (lesson.id === "when-the-input-grows" && step.id === "transfer")
            expected = Math.floor(Math.log2(1023)) + 1;
        }
        expect(authority.value, `${lesson.id}/${step.id}`).toBe(expected);
      }
  });

  it("enumerates the original islander puzzles independently", async () => {
    const bundle = await load("logic-and-reasoning");
    const pairs = [true, false].flatMap((a) => [true, false].map((b) => ({ a, b })));
    const first = pairs.filter(({ a, b }) => a === !b);
    const bothClaims = first.filter(({ a, b }) => b === (a === b));
    const changed = pairs.filter(({ a, b }) => a === b && b === !a);
    expect(first).toHaveLength(2);
    expect(bothClaims).toEqual([{ a: true, b: false }]);
    expect(changed).toHaveLength(0);
    const count = (suffix: string) =>
      bundle.questions.find((q) => q.id === `logic-and-reasoning-knights-and-knaves-${suffix}`)
        ?.answerAuthority;
    expect(count("2")).toMatchObject({ kind: "numeric", value: first.length });
    expect(count("4")).toMatchObject({ kind: "numeric", value: changed.length });
  });
});
