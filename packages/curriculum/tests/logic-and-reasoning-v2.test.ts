import { existsSync, readFileSync } from "node:fs";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
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
const bundle = JSON.parse(
  readFileSync(existsSync(candidateUrl) ? candidateUrl : bundleUrl, "utf8"),
) as CourseBundle;

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

type Row = [boolean, boolean];
const rows: Row[] = [
  [true, true],
  [true, false],
  [false, true],
  [false, false],
];
const imp = (p: boolean, q: boolean) => !p || q;
const verdict = (value: boolean) => (value ? "true" : "false");
const validity = (premises: (p: boolean, q: boolean) => boolean, conclusion: (p: boolean, q: boolean) => boolean) =>
  rows.some(([p, q]) => premises(p, q) && !conclusion(p, q)) ? "invalid" : "valid";

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
    expect([true, false]).toHaveLength(num(l, "2"));
    // A claim about a sealed jar has exactly one truth value in the actual case.
    expect(num(l, "check-3")).toBe(1);
    expect(word(l, "3")).toBe(verdict(!true));
    expect(word(l, "practice-2")).toBe(verdict(!false));
  });

  it("if-then-claims", () => {
    const l = "if-then-claims";
    expect(num(l, "2")).toBe(rows.filter(([p, q]) => imp(p, q)).length);
    expect(num(l, "practice-2")).toBe(rows.filter(([p, q]) => !imp(p, q)).length);
    expect(word(l, "3")).toBe(verdict(imp(false, false)));
    expect(word(l, "4")).toBe(verdict(imp(false, true)));
    expect(word(l, "practice-1")).toBe(verdict(imp(true, false)));
    expect(choice(l, "1")).toEqual(["a"]);
    // Numbers divisible by 4 that are odd: none exist among the options.
    const breaking = [6, 7, 8].filter((n) => n % 4 === 0 && n % 2 !== 0);
    expect(breaking).toEqual([]);
    expect(choice(l, "check-3")).toEqual(["d"]);
  });

  it("converse-and-contrapositive", () => {
    const l = "converse-and-contrapositive";
    expect(num(l, "2")).toBe(rows.filter(([p, q]) => imp(p, q) !== imp(!q, !p)).length);
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
    expect(word(l, "1")).toBe(pairs.filter(([a, b]) => a === "knight" && adaSays([a, b]))[0]![1]);
    expect(num(l, "2")).toBe(pairs.filter(adaSays).length);
    const both = pairs.filter((p) => adaSays(p) && benSays(p));
    expect(both).toHaveLength(1);
    expect(word(l, "3")).toBe(both[0]![0]);
    const caraSays = ([c, d]: [Person, Person]) => holds(c, d === "knight");
    const drewSays = ([c, d]: [Person, Person]) => holds(d, c === "knave");
    expect(num(l, "4")).toBe(pairs.filter((p) => caraSays(p) && drewSays(p)).length);
    // Ada a knave: her false claim means Ben is not a knave.
    expect(word(l, "practice-1")).toBe(pairs.filter(([a, b]) => a === "knave" && adaSays([a, b]))[0]![1]);
    expect(num(l, "practice-2")).toBe(people.length ** 2);
    const gusSays = ([g, h]: [Person, Person]) => holds(g, h === "knight");
    const halSays = ([g, h]: [Person, Person]) => holds(h, g !== h);
    const gh = pairs.filter((p) => gusSays(p) && halSays(p));
    expect(gh).toHaveLength(1);
    expect(word(l, "check-3")).toBe(gh[0]![0]);
    // Eli and Fay (worked example): both knights.
    const eliSays = ([e, f]: [Person, Person]) => holds(e, e === f);
    const faySays = ([e, f]: [Person, Person]) => holds(f, e === "knight");
    expect(pairs.filter((p) => eliSays(p) && faySays(p))).toEqual([["knight", "knight"]]);
  });

  it("building-a-truth-table", () => {
    const l = "building-a-truth-table";
    expect(num(l, "1")).toBe(2 * 2);
    expect(num(l, "2")).toBe(rows.filter(([p, q]) => p && q).length);
    expect(num(l, "3")).toBe(rows.filter(([p, q]) => p || q).length);
    expect(num(l, "practice-1")).toBe(2 ** 3);
    expect(num(l, "check-3")).toBe(rows.filter(([p, q]) => !(p || q)).length);
    // "p or q" and "p" are both true while q is true: TT only.
    expect(rows.filter(([p, q]) => (p || q) && p && q)).toEqual([[true, true]]);
    expect(choice(l, "4")).toEqual(["a"]);
    expect(word(l, "practice-2")).toBe(rows.some(([p, q]) => p && q && (p || q)) ? "yes" : "no");
    // "p or q" and not p forces q.
    expect(rows.filter(([p, q]) => (p || q) && !p).every(([, q]) => q)).toBe(true);
  });

  it("finding-the-conclusion", () => {
    const l = "finding-the-conclusion";
    expect(num(l, "2")).toBe(rows.filter(([p, q]) => imp(p, q) && p).length);
  });

  it("valid-but-untrue", () => {
    const l = "valid-but-untrue";
    expect(num(l, "2")).toBe(rows.filter(([p, q]) => imp(p, q) && p && !q).length);
    expect(num(l, "practice-2")).toBe(1);
    expect(word(l, "1")).toBe(validity((p, q) => imp(p, q) && p, (_p, q) => q));
    expect(word(l, "3")).toBe(validity((p, q) => imp(p, q) && q, (p) => p));
    expect(word(l, "check-3")).toBe(validity((p, q) => (p || q) && !p, (_p, q) => q));
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
    expect(word(l, "3")).toBe(validity((p, q) => imp(p, q) && !q, (p) => !p));
    expect(word(l, "check-3")).toBe(validity((p, q) => imp(p, q) && q, (p) => p));
    expect(validity((p, q) => imp(p, q) && !p, (_p, q) => !q)).toBe("invalid");
  });
});
