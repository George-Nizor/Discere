import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { PhilosophyDiagramSchema } from "@discere/contracts";
import { assessTextAnswer } from "@discere/assessment-engine";
import { assertEditorialApproval, loadCourseBundle, validateCourseBundle } from "../src/index.js";
import { philosophyLessons } from "../../../content/philosophy-knowledge-mind-and-ethics/authoring/lessons.js";
import { philosophyChecks } from "../../../content/philosophy-knowledge-mind-and-ethics/authoring/course-checks.js";

/*
 * Every key below is derived here from the problem statement, without the activity engine:
 * arithmetic for numbers, a hand-written truth-table search for validity, a hand-run drinks
 * machine, and the accepted term for each named position or fallacy.
 */
type V = { p?: boolean; q?: boolean; r?: boolean };
type F = (v: V) => boolean;
const imp = (a: boolean, b: boolean) => !a || b;
function rows(letters: string[]): V[] {
  return Array.from({ length: 2 ** letters.length }, (_, i) =>
    Object.fromEntries(letters.map((l, k) => [l, ((i >> (letters.length - 1 - k)) & 1) === 0])),
  );
}
const supportRows = (letters: string[], premises: F[]) =>
  rows(letters).filter((v) => premises.every((p) => p(v))).length;
const counterexamples = (letters: string[], premises: F[], conclusion: F) =>
  rows(letters).filter((v) => premises.every((p) => p(v)) && !conclusion(v)).length;
/** Block's drinks machine run by hand: a can costs 20p. */
function cans(coins: number[]): { cans: number; change: number } {
  let credit = 0,
    count = 0,
    change = 0;
  for (const c of coins) {
    credit += c;
    if (credit >= 20) {
      count += 1;
      change += credit - 20;
      credit = 0;
    }
  }
  return { cans: count, change };
}
const posterior = (prior: number, hit: number, falseAlarm: number) =>
  (prior * hit) / (prior * hit + (1 - prior) * falseAlarm);
const maximinFloor = (...societies: number[][]) =>
  Math.max(...societies.map((s) => Math.min(...s)));
const choice = (label: string) => ({ choice: label });
type Key = number | string | { choice: string };

const expected: Record<string, Key[]> = {
  "reconstructing-arguments": [
    2,
    choice("The council should not sell the playing field"),
    "enthymeme",
    2,
    3,
    "since",
  ],
  "validity-and-soundness": [
    counterexamples(["p", "q"], [(v) => imp(v.p!, v.q!), (v) => v.q!], (v) => v.p!) > 0
      ? "invalid"
      : "valid",
    supportRows(["p", "q"], [(v) => imp(v.p!, v.q!), (v) => v.q!]),
    1,
    counterexamples(["p", "q", "r"], [(v) => imp(v.p!, v.q!), (v) => imp(v.r!, v.q!)], (v) =>
      imp(v.p!, v.r!),
    ),
    choice("At least one premise is false"),
    2 ** 4,
  ],
  "fallacies-and-charity": [
    "ad hominem",
    "straw man",
    "equivocation",
    choice("You should avoid what greatly raises your risk of a serious disease"),
    "begging the question",
    "false dilemma",
  ],
  "justified-true-belief": [
    3,
    "yes",
    "sufficient",
    "yes",
    choice("Jones will get the job"),
    "gettier",
  ],
  "scepticism-and-closure": [
    counterexamples(["p", "q"], [(v) => imp(v.p!, v.q!), (v) => !v.q], (v) => !v.p) === 0
      ? "valid"
      : "invalid",
    "moore",
    supportRows(["p", "q"], [(v) => imp(v.p!, v.q!), (v) => !v.q]),
    "closure",
    choice("Simple truths of arithmetic, such as two and three making five"),
    "i exist",
  ],
  "bayesian-evidence": [
    100 * posterior(0.1, 0.9, 0.1),
    1000 * 0.01 * 0.9 + 1000 * 0.99 * 0.1,
    0.9 / 0.1,
    100 * posterior(0.1, 0.8, 0.05),
    posterior(0.2, 0.5, 0.25),
    "base rate",
  ],
  "mind-and-body": [
    "invalid",
    "interaction",
    supportRows(["p", "q", "r"], [(v) => imp(v.p!, v.q!), (v) => imp(v.q!, v.r!), (v) => !v.r]),
    "identity theory",
    choice("If x is identical with y, then x and y share every property"),
    "property dualism",
  ],
  "functionalism-and-the-chinese-room": [
    cans([10, 10, 10]).cans,
    cans([20, 10, 20]).cans,
    "multiple realisability",
    "systems reply",
    "no",
    choice("Running a program is not by itself sufficient for understanding"),
  ],
  "personal-identity": [1, "transitivity", 2, "no", 3, choice("The person on Earth")],
  consequentialism: [
    0.6 * 100 + 0.4 * 0,
    0.9 * 20 + 0.1 * -30,
    5 - 1,
    "aggregation",
    choice("John Stuart Mill"),
    2 + 2 + 2 - (4 + 4 - 5),
  ],
  "kant-and-the-footbridge": [
    5 - 1,
    "humanity",
    "universal law",
    "double effect",
    choice("Hypothetical"),
    "means",
  ],
  "virtue-and-the-mean": [
    (2 + 10) / 2,
    "meanness",
    "habit",
    (2 + 10) / 2 - 5,
    choice("Too little"),
    "eudaimonia",
  ],
  "the-social-contract": [
    "hobbes",
    (10 + 40 + 70) / 3,
    "b",
    0.25 * 30 + 0.75 * 50,
    "consent",
    choice("They work to the greatest benefit of the least advantaged"),
  ],
};
const recall: Record<string, Key[]> = {
  "reconstructing-arguments": [2, "enthymeme"],
  "validity-and-soundness": [
    "sound",
    counterexamples(["p", "q"], [(v) => v.p! || v.q!, (v) => !v.p], (v) => v.q!),
  ],
  "fallacies-and-charity": ["ad hominem", "charity"],
  "justified-true-belief": [0, "safety"],
  "scepticism-and-closure": ["closure", "brain in a vat"],
  "bayesian-evidence": [100 * (3 / (3 + 1)), "bayes"],
  "mind-and-body": ["descartes", "leibniz"],
  "functionalism-and-the-chinese-room": ["searle", cans([10, 20]).change],
  "personal-identity": ["locke", "parfit"],
  consequentialism: [0.25 * 80 + 0.75 * -4, "bentham"],
  "kant-and-the-footbridge": ["categorical", 3 - 1],
  "virtue-and-the-mean": ["cowardice", "phronesis"],
  "the-social-contract": ["veil of ignorance", maximinFloor([12, 20, 40], [15, 18, 21])],
};
const checks: Record<string, Key[]> = {
  "starting-point": [
    2,
    counterexamples(["p", "q"], [(v) => imp(v.p!, v.q!), (v) => !v.q], (v) => !v.p) === 0
      ? choice("Valid")
      : choice("Invalid"),
    choice("Ad hominem"),
    3,
    supportRows(["p", "q"], [(v) => imp(v.p!, v.q!), (v) => v.p!]),
    100 * posterior(0.5, 0.8, 0.2),
    choice("The interaction problem"),
    cans([10, 20, 10]).cans,
    1,
    0.3 * 50 + 0.7 * 10,
    choice("Pushing in the footbridge case"),
    (4 + 12) / 2,
    maximinFloor([5, 50, 95], [20, 30, 40]),
  ],
  "bring-it-together": [
    2,
    counterexamples(["p", "q"], [(v) => v.p! || v.q!, (v) => v.p!], (v) => !v.q),
    choice("Equivocation"),
    choice("A Gettier case"),
    counterexamples(["p", "q"], [(v) => imp(v.p!, v.q!), (v) => !v.q], (v) => !v.p),
    (1000 - 1000 * 0.05) * 0.1,
    choice("The identity theory"),
    choice("Semantics"),
    2,
    0.8 * 25 + 0.2 * -40,
    choice("Categorical"),
    (1 + 9) / 2,
    0.4 * 20 + 0.6 * 70,
  ],
  "use-it-a-week-later": [
    3,
    counterexamples(
      ["p", "q"],
      [(v) => imp(v.p!, v.q!), (v) => imp(v.q!, v.p!)],
      (v) => v.p === v.q,
    ),
    choice("False dilemma"),
    2,
    choice("If I know I have hands, I know I am not a brain in a vat"),
    100 * posterior(0.25, 0.9, 0.1),
    choice("Substance dualism"),
    cans([20, 20, 10, 10]).cans,
    1,
    9 + 9 + 0 - 6 * 3,
    4 - 1,
    choice("By doing brave acts"),
    maximinFloor([8, 60, 100], [12, 15, 18], [10, 40, 70]),
  ],
};

function expectKey(
  authority: { kind: "numeric"; value: number } | { kind: "text"; acceptedIdeas: string[] },
  key: Key,
  choices?: Array<{ label: string }>,
) {
  if (typeof key === "number") {
    expect(authority.kind).toBe("numeric");
    if (authority.kind === "numeric") expect(authority.value).toBeCloseTo(key, 9);
  } else if (typeof key === "string") {
    expect(authority.kind).toBe("text");
    expect(choices).toBeUndefined();
    if (authority.kind === "text") {
      expect(authority.acceptedIdeas[0]).toBe(key);
      expect(assessTextAnswer(key, { ...authority, rejectedIdeas: [] }).correct).toBe(true);
    }
  } else {
    expect(authority.kind).toBe("text");
    if (authority.kind === "text") expect(authority.acceptedIdeas).toEqual([key.choice]);
    expect(choices?.filter((c) => assessTextAnswer(c.label, authority as never).correct)).toEqual([
      { id: expect.any(String), label: key.choice },
    ]);
  }
}

describe("independent Philosophy content review", () => {
  it.each(philosophyLessons)("recomputes every lesson key in $id", (lesson) => {
    expect(lesson.questions).toHaveLength(6);
    const keys = expected[lesson.id]!;
    expect(keys).toHaveLength(6);
    lesson.questions.forEach((q, i) => {
      expectKey(q.answerAuthority, keys[i]!, q.choices);
      if (q.answerAuthority.kind === "numeric") expect(q.hints).toHaveLength(3);
      else expect(q.hints.length).toBeGreaterThan(0);
    });
  });
  it.each(philosophyLessons)("checks fresh recall and every diagram in $id", (lesson) => {
    expect(lesson.cards).toHaveLength(2);
    expect(lesson.beats).toHaveLength(4);
    lesson.cards.forEach((card, i) => {
      expectKey(card.answerAuthority, recall[lesson.id]![i]!);
      expect(lesson.questions.some((q) => q.prompt === card.front)).toBe(false);
    });
    for (const beat of lesson.beats) {
      expect(PhilosophyDiagramSchema.safeParse(beat.diagram).success).toBe(true);
      expect(new Set(beat.diagram.cases.map((c) => c.model.kind)).size).toBe(1);
    }
  });
  it.each(philosophyChecks)("recomputes every fresh problem in $id", (check) => {
    expect(check.items).toHaveLength(13);
    expect(new Set(check.items.map((i) => i.lessonId)).size).toBe(13);
    check.items.forEach((item, i) =>
      expectKey(item.question.answerAuthority, checks[check.id]![i]!, item.question.choices),
    );
  });
  it("keeps choices under a third, prompts distinct and the delayed check after the checkpoint", () => {
    const questions = philosophyLessons.flatMap((l) => l.questions);
    const selected = questions.filter((q) => q.choices?.length).length;
    expect(selected / questions.length).toBeLessThanOrEqual(0.35);
    const prompts = [
      ...questions.map((q) => q.prompt),
      ...philosophyChecks.flatMap((c) => c.items.map((i) => i.question.prompt)),
    ];
    expect(new Set(prompts).size).toBe(prompts.length);
    expect(philosophyChecks[0]!.requiredLessonIds).toEqual([]);
    expect(philosophyChecks[2]).toMatchObject({ afterCheckId: "bring-it-together", delayDays: 7 });
  });
  it("rejects the tempting wrong verdicts on text questions", () => {
    const find = (prompt: string) =>
      philosophyLessons.flatMap((l) => l.questions).find((q) => q.prompt.startsWith(prompt))!;
    const marks = (prompt: string, answer: string) => {
      const a = find(prompt).answerAuthority;
      return a.kind === "text" && assessTextAnswer(answer, a).correct;
    };
    expect(marks("Premises: 'If it rained overnight", "valid")).toBe(false);
    expect(marks("Premises: 'If it rained overnight", "Invalid")).toBe(true);
    expect(marks("Ana looks at a usually reliable", "no")).toBe(false);
    expect(marks("In Thomson's loop case", "a means, not a side effect")).toBe(true);
    expect(marks("In Thomson's loop case", "a side effect")).toBe(false);
    expect(marks("Name the thesis, used by Putnam", "multiple realizability")).toBe(true);
  });
  it("ships the reviewed candidate, exact cover and authoring", async () => {
    const root = path.resolve(
      import.meta.dirname,
      "../../../content/philosophy-knowledge-mind-and-ethics",
    );
    const bundle = await loadCourseBundle(path.join(root, "bundle.json"));
    const review = JSON.parse(await readFile(path.join(root, "review/publication.json"), "utf8"));
    expect(() =>
      assertEditorialApproval(bundle, review, validateCourseBundle(bundle)),
    ).not.toThrow();
    for (const lesson of philosophyLessons) {
      lesson.questions.forEach((q, i) =>
        expect(
          bundle.questions.find((item) => item.id === "phil-" + lesson.id + "-" + (i + 1)),
        ).toMatchObject(q),
      );
      lesson.cards.forEach((c, i) =>
        expect(
          bundle.flashcards.find((item) => item.id === "phil-" + lesson.id + "-card-" + (i + 1)),
        ).toMatchObject(c),
      );
      const shipped = bundle.lessons.find((item) => item.id === lesson.id)!;
      expect(shipped.steps.map((s) => s.diagram)).toEqual(lesson.beats.map((b) => b.diagram));
    }
    expect(bundle.courseChecks).toEqual(philosophyChecks);
    const provenance = JSON.parse(
      await readFile(path.join(root, "assets/provenance.json"), "utf8"),
    );
    const cover = await readFile(path.join(root, "assets/cover.svg"));
    expect(createHash("sha256").update(cover).digest("hex")).toBe(provenance.sha256);
  });
});
