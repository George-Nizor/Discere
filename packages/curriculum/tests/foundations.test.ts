import { readFile } from "node:fs/promises";
import path from "node:path";
import { runTeachingProgram, traceSearch } from "@discere/activity-engine";
import { CourseBundleSchema } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { assertEditorialApproval, loadCourseBundle, validateCourseBundle } from "../src/index.js";
import { correctChoiceId } from "../src/lesson-projection.js";
import { historicalBundle } from "./helpers/published-history.js";

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
        "check-1": 3 * 5 + 2,
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
        // The prompt now starts from 2x = 14 (the + 3 is already undone on the screen).
        "2": solve(2, 0, 14),
        "3": solve(3, 6, 21),
        "4": solve(0.25, -2, 1.5),
        "practice-1": solve(4, -2, 14),
        "practice-2": solve(4, 1, 4),
      },
      "a-point-is-a-pair": {
        "1": [3, 2][0]!,
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
    // "a point is a pair" item 3 is now a four-option choice: "3 squares to the left of the origin
    // and 2 up". Its label is built from the givens, across move first, with the real minus sign.
    const pointLabel = (across: number, up: number) =>
      `(${across < 0 ? "−" : ""}${Math.abs(across)}, ${up < 0 ? "−" : ""}${Math.abs(up)})`;
    const pointQuestion = bundle.questions.find((q) => q.id === "maths-a-point-is-a-pair-3")!;
    expect(pointQuestion.responseType).toBe("short_text");
    // Read the givens from the prompt: N squares left of the origin, M up.
    const given = /(\d+) squares to the left of the origin and (\d+) squares up/.exec(
      pointQuestion.prompt,
    )!;
    expect(given).not.toBeNull();
    const [left, up] = [Number(given[1]), Number(given[2])];
    expect([left, up]).toEqual([3, 2]);
    const expectedPoint = pointLabel(-left, up);
    expect(pointQuestion.answerAuthority.kind).toBe("text");
    if (pointQuestion.answerAuthority.kind === "text")
      expect(pointQuestion.answerAuthority.acceptedIdeas).toEqual([expectedPoint]);
    const pointChoices = pointQuestion.choices!;
    expect(pointChoices.map((choice) => choice.label)).toEqual([
      pointLabel(left, up), // right instead of left
      pointLabel(-up, left), // the two moves swapped
      pointLabel(left, -up), // both signs reversed
      expectedPoint,
    ]);
    const markedPoint = pointChoices.find((choice) => choice.id === correctChoiceId(pointQuestion));
    expect(markedPoint?.label).toBe(expectedPoint);
    expect(pointChoices.filter((choice) => choice.label === expectedPoint)).toHaveLength(1);
    // Each wrong choice has its own feedback and the marked one has none.
    const wrongPoint = pointChoices.filter((choice) => choice.id !== markedPoint!.id);
    const flagged = pointQuestion.misconceptions!.flatMap((m) => m.match.choiceIds ?? []);
    expect(flagged.sort()).toEqual(wrongPoint.map((choice) => choice.id).sort());
    // The v2 rewrites added numeric items (hooks, checks, faded blanks). Every original item stays here.
    const numeric = bundle.questions
      .filter((question) => question.answerAuthority.kind === "numeric")
      .map((question) => question.id);
    expect(numeric).toEqual(expect.arrayContaining([...ids]));
  });

  it("checks program, repair and search questions against executable teaching cases", async () => {
    // The legacy steps these cases name; the v2 lessons are recomputed in cs-basics-v2.test.ts.
    const bundle = CourseBundleSchema.parse(historicalBundle("cs-basics"));
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
  });
});
