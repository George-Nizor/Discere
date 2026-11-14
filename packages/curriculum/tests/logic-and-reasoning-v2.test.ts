import { existsSync, readFileSync } from "node:fs";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { assessTextAnswer } from "@discere/assessment-engine";
import { validateCourseBundle } from "../src/index.js";

/**
 * Logic and Reasoning, v2 lessons. Every numeric key and every checkable answer is recomputed here
 * from truth-table and puzzle arithmetic, not read back from the authority it checks.
 */
const candidateUrl = new URL(
  "../../../content/logic-and-reasoning/.authoring/candidate.json",
  import.meta.url,
);
const bundleUrl = new URL("../../../content/logic-and-reasoning/bundle.json", import.meta.url);
const bundle = JSON.parse(readFileSync(bundleUrl, "utf8")) as CourseBundle;

const question = (lesson: string, suffix: string): Question =>
  bundle.questions.find((item) => item.id === `logic-and-reasoning-${lesson}-${suffix}`)!;
const num = (lesson: string, suffix: string) => {
  const authority = question(lesson, suffix).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${lesson}-${suffix} is not numeric`);
  return authority.value;
};
const word = (lesson: string, suffix: string) => {
  const authority = question(lesson, suffix).answerAuthority;
  if (authority.kind !== "text") throw new Error(`${lesson}-${suffix} is not text`);
  return authority.acceptedIdeas[0]!.toLowerCase();
};
const choice = (lesson: string, suffix: string) => {
  const item = question(lesson, suffix);
  const accepted = word(lesson, suffix);
  return item.choices!.filter((c) => c.label.toLowerCase() === accepted).map((c) => c.id);
};

/** The labels of the choices, in order. */
const labels = (lesson: string, suffix: string) =>
  question(lesson, suffix).choices!.map((c) => c.label.toLowerCase());
/** The id of every question the lessons ask, so a test can say which version a lesson uses. */
const askedBy = (lessonId: string) => {
  const lesson = bundle.lessons.find((item) => item.id === lessonId)!;
  return [
    ...lesson.questionIds,
    ...lesson.steps.flatMap((step) => [
      step.checkQuestionId,
      ...(step.workedSteps ?? []).flatMap((line) => [
        line.selfExplain?.questionId,
        line.blank?.questionId,
      ]),
    ]),
  ].filter((id): id is string => Boolean(id));
};

type Row = [boolean, boolean];
const rows: Row[] = [
  [true, true],
  [true, false],
  [false, true],
  [false, false],
];
const imp = (p: boolean, q: boolean) => !p || q;
const verdict = (value: boolean) => (value ? "true" : "false");
const validity = (
  premises: (p: boolean, q: boolean) => boolean,
  conclusion: (p: boolean, q: boolean) => boolean,
) => (rows.some(([p, q]) => premises(p, q) && !conclusion(p, q)) ? "invalid" : "valid");

/** Knights and knaves: a person is consistent when their statement's truth matches their type. */
type Person = "knight" | "knave";
const people: Person[] = ["knight", "knave"];
const pairs = people.flatMap((a) => people.map((b) => [a, b] as [Person, Person]));
const holds = (speaker: Person, statement: boolean) => (speaker === "knight") === statement;

describe("Logic and Reasoning v2 lessons", () => {
  it("validates with no errors and keeps eight three-item skill checks", () => {
    const validation = validateCourseBundle(bundle);
    expect(validation.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(bundle.lessons).toHaveLength(8);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro).toBeDefined();
      expect(lesson.questionIds).toHaveLength(3);
    }
  });

  it("what-logic-operates-on", () => {
    const l = "what-logic-operates-on";
    // The soup is cold, so p ("The soup is hot") is false and ¬p is true.
    const soupIsHot = false;
    expect(word(l, "3")).toBe(verdict(!soupIsHot));
    expect(choice(l, "3")).toHaveLength(1);
    // "Close the window." gives an order: it is neither true nor false, and it is not a question.
    expect(word(l, "practice-1")).toBe("a command");
    expect(labels(l, "practice-1")).toEqual(["a claim", "a question", "a command"]);
    // A claim about a sealed jar has exactly one truth value in the actual case. If the claim is
    // false, its negation is true; the item words it as "It is true."
    expect(word(l, "practice-2")).toBe(`it is ${verdict(!false)}.`);
    expect(labels(l, "practice-2")).toEqual([
      "it is true.",
      "it is false.",
      "it depends on the claim.",
    ]);
    expect(choice(l, "practice-2")).toEqual(["a"]);
  });

  it("if-then-claims", () => {
    const l = "if-then-claims";
    expect(num(l, "2")).toBe(rows.filter(([p, q]) => imp(p, q)).length);
    // p and q both false: the claim is true, and the item words it as "It is true."
    expect(word(l, "3")).toBe(
      `it is ${verdict(imp(false, false))}, because the rule was never broken.`,
    );
    expect(choice(l, "3")).toEqual(["b"]);
    expect(word(l, "4")).toBe(verdict(imp(false, true)));
    expect(word(l, "practice-1")).toBe(verdict(imp(true, false)));
    // Numbers divisible by 4 that are odd: none exist among the options.
    const breaking = [6, 7, 8].filter((n) => n % 4 === 0 && n % 2 !== 0);
    expect(breaking).toEqual([]);
    expect(choice(l, "check-3")).toEqual(["d"]);
    // check-3-v2 (the one the lesson asks): "If divisible by 4, then divisible by 8". A number
    // breaks the rule when it is divisible by 4 and not by 8, and of 10, 24 and 28 only 28 is.
    const options = labels(l, "check-3-v2").map(Number);
    expect(options).toEqual([10, 24, 28]);
    const breaksIt = options.filter((n) => n % 4 === 0 && n % 8 !== 0);
    expect(breaksIt).toEqual([28]);
    expect(word(l, "check-3-v2")).toBe(String(breaksIt[0]));
    expect(choice(l, "check-3-v2")).toEqual(["c"]);
    expect(askedBy(l)).toContain("logic-and-reasoning-if-then-claims-check-3-v2");
    expect(askedBy(l)).not.toContain("logic-and-reasoning-if-then-claims-check-3");
  });

  it("converse-and-contrapositive", () => {
    const l = "converse-and-contrapositive";
    // q → p with q true and p false.
    expect(word(l, "1")).toBe(verdict(imp(true, false)));
    // Cases where p → q holds but the converse fails.
    expect(rows.filter(([p, q]) => imp(p, q) && !imp(q, p))).toEqual([[false, true]]);
    expect(choice(l, "3")).toEqual(["a"]);
  });

  it("knights-and-knaves", () => {
    const l = "knights-and-knaves";
    const adaSays = ([a, b]: [Person, Person]) => holds(a, b === "knave");
    const benSays = ([a, b]: [Person, Person]) => holds(b, a === b);
    expect(word(l, "1")).toBe(
      `a ${pairs.filter(([a, b]) => a === "knight" && adaSays([a, b]))[0]![1]}`,
    );
    const both = pairs.filter((p) => adaSays(p) && benSays(p));
    expect(both).toHaveLength(1);
    const caraSays = ([c, d]: [Person, Person]) => holds(c, d === "knight");
    const drewSays = ([c, d]: [Person, Person]) => holds(d, c === "knave");
    // Ada a knave: her false claim means Ben is not a knave.
    expect(word(l, "practice-1")).toBe(
      `a ${pairs.filter(([a, b]) => a === "knave" && adaSays([a, b]))[0]![1]}`,
    );
    const gusSays = ([g, h]: [Person, Person]) => holds(g, h === "knight");
    const halSays = ([g, h]: [Person, Person]) => holds(h, g !== h);
    const gh = pairs.filter((p) => gusSays(p) && halSays(p));
    expect(gh).toHaveLength(1);
    expect(word(l, "check-3")).toBe(`gus is a ${gh[0]![0]}.`);
    expect(choice(l, "check-3")).toEqual(["a"]);
    // practice-2 (retired) lists every assignment of two people; practice-2-v2 (in the lesson)
    // asks for the number of assignments of three. Two people give four, three give eight.
    const names = pairs.map(([a, b]) => `${a}–${b}`);
    expect(names).toEqual(["knight–knight", "knight–knave", "knave–knight", "knave–knave"]);
    const everyPair = `${names.slice(0, -1).join(", ")} and ${names.at(-1)}.`;
    expect(word(l, "practice-2")).toBe(everyPair.toLowerCase());
    const triples = people.flatMap((a) => people.flatMap((b) => people.map((c) => [a, b, c])));
    expect(num(l, "practice-2-v2")).toBe(triples.length);
    expect(triples.length).toBe(people.length ** 3);
    // The wrong counts the item flags: 3 × 2, 2 × 2, and 3 × 3.
    expect(
      question(l, "practice-2-v2").misconceptions!.flatMap((m) => m.match.numeric ?? []),
    ).toEqual([3 * 2, 2 * 2, 3 * 3]);
    expect(askedBy(l)).toContain("logic-and-reasoning-knights-and-knaves-practice-2-v2");
    expect(askedBy(l)).not.toContain("logic-and-reasoning-knights-and-knaves-practice-2");
    // Eli and Fay (worked example): both knights.
    const eliSays = ([e, f]: [Person, Person]) => holds(e, e === f);
    const faySays = ([e, f]: [Person, Person]) => holds(f, e === "knight");
    expect(pairs.filter((p) => eliSays(p) && faySays(p))).toEqual([["knight", "knight"]]);
  });

  it("building-a-truth-table", () => {
    const l = "building-a-truth-table";
    // "p or q" and "p" are both true while q is true: TT only.
    expect(rows.filter(([p, q]) => (p || q) && p && q)).toEqual([[true, true]]);
    expect(choice(l, "4")).toEqual(["a"]);
    // "p ∨ q" in the row where both are true: yes, the row makes it true.
    const bothTrueMakesOrTrue = rows.some(([p, q]) => p && q && (p || q));
    expect(word(l, "practice-2")).toBe(
      `${bothTrueMakesOrTrue ? "yes" : "no"}, it is ${verdict(bothTrueMakesOrTrue)} in that row.`,
    );
    expect(choice(l, "practice-2")).toEqual(["a"]);
    // "p or q" and not p forces q.
    expect(rows.filter(([p, q]) => (p || q) && !p).every(([, q]) => q)).toBe(true);
  });

  it("finding-the-conclusion", () => {
    const l = "finding-the-conclusion";
    // The teaching screen's two plain premises, p and q on their own, hold together only in TT.
    expect(rows.filter(([p, q]) => p && q)).toEqual([[true, true]]);
    expect(rows.filter(([p]) => p)).toHaveLength(2);
    expect(rows.filter(([, q]) => q)).toHaveLength(2);
    // Item 1: the claim after "Therefore" is the conclusion. Item 3: a claim given as the reason
    // after "because" is a premise.
    expect(question(l, "1").prompt).toMatch(/Therefore the torch lights\.” Is “The torch lights”/u);
    expect(word(l, "1")).toBe("a conclusion");
    expect(question(l, "3").prompt).toMatch(/because the battery is charged and/u);
    expect(word(l, "3")).toBe("a premise");
    expect(choice(l, "1")).toEqual(["b"]);
    expect(choice(l, "3")).toEqual(["a"]);
    // Role check: in "It will rain, so the match is off." the claim after "so" is the conclusion.
    const quoted = /“([^”]+)”/u.exec(question(l, "role-check").prompt)![1]!;
    const [reason, outcome] = quoted.replace(/\.$/u, "").toLowerCase().split(", so ");
    expect(outcome).toBe("the match is off");
    expect(word(l, "role-check")).toBe(outcome);
    expect(labels(l, "role-check")).toEqual([reason, outcome]);
    // Item 4: "Either … or … Not at the desk. Therefore it is in the locker." The label names the
    // parcel for "it", and the two options it was not are the premises.
    expect(question(l, "4").prompt).toContain("Therefore it is in the locker.");
    expect(word(l, "4")).toBe("the parcel is in the locker.");
    expect(labels(l, "4")).toEqual([
      "either the parcel is at the desk or it is in the locker.",
      "the parcel is not at the desk.",
      "the parcel is in the locker.",
    ]);
    expect(choice(l, "4")).toEqual(["c"]);
  });

  it("valid-but-untrue", () => {
    const l = "valid-but-untrue";
    expect(word(l, "1")).toBe(
      validity(
        (p, q) => imp(p, q) && p,
        (_p, q) => q,
      ),
    );
    expect(word(l, "3")).toBe(
      validity(
        (p, q) => imp(p, q) && q,
        (p) => p,
      ),
    );
    expect(word(l, "check-3")).toBe(
      validity(
        (p, q) => (p || q) && !p,
        (_p, q) => q,
      ),
    );
    // Worked example: p ∨ q; q; therefore p fails in FT only.
    expect(rows.filter(([p, q]) => (p || q) && q && !p)).toEqual([[false, true]]);
  });

  it("naming-the-fallacies", () => {
    const l = "naming-the-fallacies";
    // The case p false, q true refutes both invalid patterns.
    expect(rows.filter(([p, q]) => imp(p, q) && q && !p)).toEqual([[false, true]]);
    expect(rows.filter(([p, q]) => imp(p, q) && !p && q)).toEqual([[false, true]]);
    expect(choice(l, "1")).toEqual(["a"]);
    expect(word(l, "2")).toBe(verdict(!true));
    expect(word(l, "3")).toBe(
      validity(
        (p, q) => imp(p, q) && !q,
        (p) => !p,
      ),
    );
    // "If it's a bird, it has feathers. It has feathers, so it's a bird": p → q; q; therefore p.
    // Invalid, and the second premise q is the consequent, so the slip is affirming it.
    expect(word(l, "check-3")).toBe(
      `${validity(
        (p, q) => imp(p, q) && q,
        (p) => p,
      )}, because it affirms the consequent.`,
    );
    expect(choice(l, "check-3")).toEqual(["c"]);
    expect(
      validity(
        (p, q) => imp(p, q) && !p,
        (_p, q) => !q,
      ),
    ).toBe("invalid");
  });
});

/**
 * The first eight lessons are written as stories: an opener that asks nothing, teaching screens
 * that explain before any question, and a close that leads into the next lesson. These checks
 * read what was written and recompute the claims the teaching screens make.
 */
const storyLessons = [
  "what-logic-operates-on",
  "if-then-claims",
  "converse-and-contrapositive",
  "knights-and-knaves",
  "building-a-truth-table",
  "finding-the-conclusion",
  "valid-but-untrue",
  "naming-the-fallacies",
];
const proseWords = (blocks: { kind: string; text?: string }[] = []) =>
  blocks.reduce(
    (sum, block) => sum + (block.text ? block.text.split(/\s+/u).filter(Boolean).length : 0),
    0,
  );

describe("Logic and Reasoning story lessons", () => {
  for (const id of storyLessons) {
    it(`${id} has the story shape`, () => {
      const lesson = bundle.lessons.find((item) => item.id === id)!;
      expect(lesson.intro!.hook.questionId).toBeUndefined();
      const opener = proseWords(lesson.intro!.hook.blocks);
      expect(opener).toBeGreaterThanOrEqual(60);
      expect(opener).toBeLessThanOrEqual(200);
      expect(lesson.intro!.promise.split(/\s+/u).length).toBeLessThanOrEqual(25);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(8);
      expect(lesson.steps.length).toBeLessThanOrEqual(14);

      const teaching = lesson.steps.filter((step) => step.kind === "explain");
      expect(teaching.length / lesson.steps.length).toBeGreaterThanOrEqual(0.4);
      let run = 0;
      for (const step of lesson.steps) {
        run = step.kind === "explain" ? run + 1 : 0;
        expect(run).toBeLessThanOrEqual(3);
      }
      for (const step of teaching) {
        expect(step.checkQuestionId).toBeFalsy();
        const body = proseWords(step.lead) + proseWords(step.afterFigure);
        expect(body).toBeGreaterThanOrEqual(30);
        expect(body).toBeLessThanOrEqual(280);
      }
      expect(lesson.steps.some((step) => step.diagram)).toBe(true);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
      expect(lesson.questionIds).toHaveLength(3);
      expect(lesson.recap!.nextHook).toBeTruthy();

      // Every question a step asks exists, and every numeric item keeps three hints.
      const asked = lesson.steps.flatMap((step) => [
        step.checkQuestionId,
        ...(step.workedSteps ?? []).flatMap((line) => [
          line.selfExplain?.questionId,
          line.blank?.questionId,
        ]),
      ]);
      for (const questionId of [...asked, ...lesson.questionIds]) {
        if (!questionId) continue;
        const item = bundle.questions.find((entry) => entry.id === questionId);
        expect(item, questionId).toBeDefined();
        if (item!.answerAuthority.kind === "numeric") expect(item!.hints).toHaveLength(3);
      }
    });
  }

  it("has a course introduction of the agreed shape", () => {
    const intro = JSON.parse(
      readFileSync(
        new URL(
          "../../../content/logic-and-reasoning/.authoring/course-intro.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as { paragraphs: string[]; outcomes: string[]; prerequisites: string; length: string };
    const total = intro.paragraphs.join(" ").split(/\s+/u).length;
    expect(total).toBeGreaterThanOrEqual(120);
    expect(total).toBeLessThanOrEqual(200);
    expect(intro.outcomes.length).toBeGreaterThanOrEqual(3);
    expect(intro.outcomes.length).toBeLessThanOrEqual(5);
    expect(intro.length).toContain(`${bundle.lessons.length} lessons`);
  });

  it("checks the arithmetic the teaching screens rely on", () => {
    // Hallway: two lamps, each on or off, give 2 × 2 settings; a third claim doubles that.
    expect(rows).toHaveLength(2 ** 2);
    // Sam's promise: false only when you pass and no lunch is bought.
    expect(rows.filter(([p, q]) => !imp(p, q))).toEqual([[true, false]]);
    // A rectangle that is not a square leaves "square implies four sides" true.
    expect(imp(false, true)).toBe(true);
    // Contrapositive worked example: the two rows where p is true agree.
    for (const [p, q] of rows.filter(([p]) => p)) expect(imp(p, q)).toBe(imp(!q, !p));
    // The converse and the original disagree in two rows, and in only one of them does the
    // original hold: p false and q true, the case the predict screen uses.
    expect(rows.filter(([p, q]) => imp(p, q) !== imp(q, p))).toEqual([
      [true, false],
      [false, true],
    ]);
    expect(rows.filter(([p, q]) => imp(p, q) && !imp(q, p))).toEqual([[false, true]]);
    // Cleo says "Dan is a knight": two of four assignments survive, both of the same type.
    const cleo = pairs.filter(([c, d]) => holds(c, d === "knight"));
    expect(cleo).toEqual([
      ["knight", "knight"],
      ["knave", "knave"],
    ]);
    // Ada alone leaves two, Ben's sentence then leaves one with Ada a knight.
    const ada = pairs.filter(([a, b]) => holds(a, b === "knave"));
    const adaAndBen = ada.filter(([a, b]) => holds(b, a === b));
    expect(adaAndBen).toEqual([["knight", "knave"]]);
    // Rows method in the teaching screen: "p and q" is false and p is true, so q is false.
    const fit = rows.filter(([p, q]) => !(p && q) && p);
    expect(fit).toEqual([[true, false]]);
    // Only one row makes "p and q" true, and the screen's "or" example keeps three rows.
    expect(rows.filter(([p, q]) => p || q)).toHaveLength(3);
  });
});

/**
 * The last three lessons, written as stories. Each teaching screen makes a claim about the rows,
 * and these recompute them: the pattern a screen tests, the bad row it finds, and the numbers in
 * its examples.
 */
describe("Logic and Reasoning validity and fallacy lessons", () => {
  it("valid-but-untrue teaching screens", () => {
    // "p ∧ q; therefore q" has no bad row, because only TT makes the premise true and q holds there.
    expect(
      validity(
        (p, q) => p && q,
        (_p, q) => q,
      ),
    ).toBe("valid");
    expect(rows.filter(([p, q]) => p && q)).toEqual([[true, true]]);
    // "p; therefore p ∧ q" has TF as its bad row, and TT is not one.
    expect(
      validity(
        (p) => p,
        (p, q) => p && q,
      ),
    ).toBe("invalid");
    expect(rows.filter(([p, q]) => p && !(p && q))).toEqual([[true, false]]);
    // Worked example: premises p ∨ q and q hold in TT and FT, and FT is the counterexample.
    expect(rows.filter(([p, q]) => (p || q) && q)).toEqual([
      [true, true],
      [false, true],
    ]);
    // The 8 example: 6 is even and not divisible by 4, 8 is even and is, so the first premise is
    // false while the conclusion is true.
    const evens = [2, 4, 6, 8];
    expect(evens.every((n) => n % 4 === 0)).toBe(false);
    expect(evens.filter((n) => n % 4 !== 0)).toContain(6);
    expect(8 % 2 === 0 && 8 % 4 === 0).toBe(true);
    // Modus ponens is valid, the pattern in the predict screen; the swapped pattern is not, and
    // the figure's starting state (p and q true) is not its counterexample.
    expect(
      validity(
        (p, q) => imp(p, q) && p,
        (_p, q) => q,
      ),
    ).toBe("valid");
    expect(rows.filter(([p, q]) => imp(p, q) && q && !p)).toEqual([[false, true]]);
    expect(rows.filter(([p, q]) => imp(p, q) && q && !p)).not.toContainEqual([true, true]);
    // A valid argument has no counterexample, and one is enough to refute it.
  });

  it("naming-the-fallacies teaching screens", () => {
    // The street cleaner: no rain (p false), wet street (q true). The rule holds, both slips fail.
    const cleaner: Row = [false, true];
    expect(imp(...cleaner)).toBe(true);
    // Affirming the consequent: premises p → q and q hold, conclusion p fails.
    expect(imp(...cleaner) && cleaner[1] && !cleaner[0]).toBe(true);
    // Denying the antecedent: premises p → q and ¬p hold, conclusion ¬q fails.
    expect(imp(...cleaner) && !cleaner[0] && cleaner[1]).toBe(true);
    expect(rows.filter(([p, q]) => imp(p, q) && q && !p)).toEqual([cleaner]);
    expect(rows.filter(([p, q]) => imp(p, q) && !p && q)).toEqual([cleaner]);
    // Modus tollens: only FF keeps p → q and ¬q, and ¬p holds there.
    expect(rows.filter(([p, q]) => imp(p, q) && !q)).toEqual([[false, false]]);
    expect(
      validity(
        (p, q) => imp(p, q) && !q,
        (p) => !p,
      ),
    ).toBe("valid");
    // The contrapositive says what the rule says, row for row.
    for (const [p, q] of rows) expect(imp(p, q)).toBe(imp(!q, !p));
    // The converse is a different claim from the rule (the screen on affirming the consequent).
    expect(rows.some(([p, q]) => imp(p, q) !== imp(q, p))).toBe(true);
    // Questions asked in the lesson.
    expect(choice("naming-the-fallacies", "1")).toEqual(["a"]);
    expect(word("naming-the-fallacies", "2")).toBe(verdict(!cleaner[1]));
    expect(word("naming-the-fallacies", "practice-1")).toBe("consequent");
    expect(word("naming-the-fallacies", "practice-2")).toBe("antecedent");
    // The lesson asks the -v2 versions, which ask for the name of each fallacy. Both patterns are
    // invalid, and the second premise decides the name: q is the consequent of p → q, and ¬p
    // denies its antecedent.
    const l = "naming-the-fallacies";
    expect(
      validity(
        (p, q) => imp(p, q) && q,
        (p) => p,
      ),
    ).toBe("invalid");
    expect(
      validity(
        (p, q) => imp(p, q) && !p,
        (_p, q) => !q,
      ),
    ).toBe("invalid");
    const nameOf = (secondPremise: "q" | "¬p") =>
      secondPremise === "q" ? "affirming the consequent" : "denying the antecedent";
    expect(question(l, "practice-1-v2").prompt).toContain("p → q; q; therefore p");
    expect(question(l, "practice-2-v2").prompt).toContain("p → q; ¬p; therefore ¬q");
    expect(word(l, "practice-1-v2")).toBe(nameOf("q"));
    expect(word(l, "practice-2-v2")).toBe(nameOf("¬p"));
    for (const [suffix, right, wrong] of [
      ["practice-1-v2", "affirming the consequent", "denying the antecedent"],
      ["practice-2-v2", "denying the antecedent", "affirming the consequent"],
    ] as const) {
      const authority = question(l, suffix).answerAuthority;
      if (authority.kind !== "text") throw new Error(suffix);
      expect(assessTextAnswer(right, authority).correct, suffix).toBe(true);
      expect(assessTextAnswer(wrong, authority).correct, suffix).toBe(false);
      expect(assessTextAnswer("modus ponens", authority).correct, suffix).toBe(false);
    }
    expect(askedBy(l)).toEqual(
      expect.arrayContaining([
        "logic-and-reasoning-naming-the-fallacies-practice-1-v2",
        "logic-and-reasoning-naming-the-fallacies-practice-2-v2",
      ]),
    );
    expect(askedBy(l)).not.toContain("logic-and-reasoning-naming-the-fallacies-practice-1");
    expect(askedBy(l)).not.toContain("logic-and-reasoning-naming-the-fallacies-practice-2");
  });
});
