// The answer-leak audit (learning-experience spec 7.5). Before a learner answers a graded step,
// its diagram may show givens only. This renders every graded step's diagram with
// showResults=false and looks for the expected answer in the visible text and accessible names.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { LearningDiagram as DiagramSpec } from "@discere/contracts";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LearningDiagram } from "./LearningDiagram.js";

// Vitest runs from apps/web; jsdom gives import.meta.url an http scheme, so resolve from there.
const CONTENT = path.resolve(process.cwd(), "../../content");

interface Choice {
  id: string;
  label: string;
}
interface Question {
  id: string;
  prompt: string;
  choices?: Choice[];
  answerAuthority:
    | { kind: "numeric"; value: number; unit?: string }
    | { kind: "text"; acceptedIdeas: string[] };
}
interface Step {
  id: string;
  checkQuestionId?: string;
  diagram?: DiagramSpec;
  blocks?: { kind: string; text?: string }[];
}
interface Bundle {
  course: { id: string; catalogueVisibility?: string };
  lessons: { id: string; steps: Step[] }[];
  questions: Question[];
}

interface GradedStep {
  key: string;
  diagram: DiagramSpec;
  question: Question;
}

function gradedSteps(): GradedStep[] {
  const steps: GradedStep[] = [];
  for (const entry of readdirSync(CONTENT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    let bundle: Bundle;
    try {
      bundle = JSON.parse(readFileSync(path.join(CONTENT, entry.name, "bundle.json"), "utf8"));
    } catch {
      continue;
    }
    if (bundle.course.catalogueVisibility === "archived") continue;
    const questions = new Map(bundle.questions.map((question) => [question.id, question]));
    for (const lesson of bundle.lessons) {
      for (const step of lesson.steps) {
        if (!step.diagram || !step.checkQuestionId) continue;
        const question = questions.get(step.checkQuestionId);
        if (!question) continue;
        steps.push({
          key: `${bundle.course.id}/${lesson.id}/${step.id}`,
          diagram: step.diagram,
          question,
        });
      }
    }
  }
  return steps;
}

/**
 * Text inside `[data-scale]` is a scale or an index (axis ticks, node numbers, line numbers, a
 * clock that follows a slider). It locates things on the figure and states no quantity, so the
 * audit does not read it.
 */
/**
 * Every piece of text a learner could read or hear: each element's own text (so "Row {n}" reads
 * as one phrase), and accessible names.
 */
function renderedText(root: HTMLElement): string[] {
  const parts: string[] = [];
  for (const element of [root, ...root.querySelectorAll("*")]) {
    if (element.closest("[data-scale]")) continue;
    const own = [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? "")
      .join("")
      .trim();
    if (own) parts.push(own);
    for (const name of ["aria-label", "title", "aria-valuetext"]) {
      const value = element.getAttribute(name);
      if (value) parts.push(value);
    }
  }
  return parts;
}

/**
 * An ordinal names an item ("Line 7", "Premise 2", "Hour 3"); it does not state a quantity.
 * Stripped before searching so that counting labels are not read as answers.
 */
const ORDINAL =
  /\b(?:line|lines|premise|stage|hour|observation|step|scene|round|time|case|row|column|trial|item|act|week|day|year|level|L|S|P|Q|x|y)\s?[−-]?\d+(?:\.\d+)?\b/gi;

/** The ways a diagram would print this value. */
function numberForms(value: number): string[] {
  const forms = new Set<string>();
  forms.add(Number(value.toFixed(4)).toString());
  for (const digits of [0, 1, 2, 3]) {
    const fixed = value.toFixed(digits);
    if (Math.abs(Number(fixed) - value) <= Math.max(1e-9, Math.abs(value) * 1e-3)) {
      forms.add(fixed);
      forms.add(Number(fixed).toLocaleString("en-GB", { maximumFractionDigits: digits }));
    }
  }
  return [...forms].flatMap((form) => [form, form.replace("-", "−")]);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/** A number standing on its own: not part of a longer number or a name such as "CO2". */
function numberPattern(form: string): RegExp {
  const sign = /^[−-]/.test(form) ? "" : "(?<![−-])";
  return new RegExp(`(?<![\\w.,])${sign}${escapeRegExp(form)}(?![\\d]|[.,]\\d)`);
}

function promptMentions(question: Question, forms: string[]): boolean {
  const prompt = question.prompt.replaceAll(/(\d),(\d)/g, "$1$2");
  return forms.some((form) => numberPattern(form.replaceAll(",", "")).test(prompt));
}

/**
 * Fields that hold what a figure computes rather than what it is given: a query's result table,
 * a Python run's watched values and output, the line on which a sonnet turns, a machine's output.
 */
const RESULT_FIELDS = new Set(["result", "steps", "turn", "output"]);
/** Numbers written into the diagram's authored givens. */
function authoredNumbers(spec: DiagramSpec): number[] {
  const numbers: number[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "number") numbers.push(value);
    else if (typeof value === "string") {
      for (const match of value
        .replaceAll(/(\d),(\d)/g, "$1$2")
        .matchAll(/(?<![\w.])\d+(?:\.\d+)?/g))
        numbers.push(Number(match[0]));
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object")
      for (const [key, inner] of Object.entries(value)) if (!RESULT_FIELDS.has(key)) visit(inner);
  };
  visit(spec);
  return numbers;
}

interface Leak {
  /** "code": the figure computed the answer; "content": the answer is written into the givens. */
  level: "code" | "content";
  detail: string;
}

function numericLeak(step: GradedStep, parts: string[]): Leak | null {
  const authority = step.question.answerAuthority;
  if (authority.kind !== "numeric") return null;
  const forms = numberForms(authority.value);
  if (promptMentions(step.question, forms)) return null;
  for (const part of parts) {
    const text = part.replaceAll(ORDINAL, " ");
    const form = forms.find((candidate) => numberPattern(candidate).test(text));
    if (!form) continue;
    const authored = authoredNumbers(step.diagram).some(
      (number) => Math.abs(Math.abs(number) - Math.abs(authority.value)) < 1e-9,
    );
    return {
      level: authored ? "content" : "code",
      detail: `"${part.slice(0, 120)}" shows ${form}`,
    };
  }
  return null;
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
/** A choice question leaks when the correct choice is printed and no wrong choice is. */
function choiceLeak(step: GradedStep, parts: string[]): Leak | null {
  const { question } = step;
  if (question.answerAuthority.kind !== "text" || !question.choices) return null;
  const ideas = question.answerAuthority.acceptedIdeas.map(normalise);
  const correct = question.choices.filter((choice) => ideas.includes(normalise(choice.label)));
  const wrong = question.choices.filter((choice) => !correct.includes(choice));
  if (correct.length !== 1 || wrong.length === 0) return null;
  const label = normalise(correct[0]?.label ?? "");
  if (label.length < 3 || normalise(question.prompt).includes(label)) return null;
  const printed = parts.map(normalise);
  const shows = (text: string) => printed.some((part) => part === text);
  if (!shows(label)) return null;
  if (wrong.some((choice) => shows(normalise(choice.label)))) return null;
  const authored = JSON.stringify(step.diagram).toLowerCase().includes(label);
  return {
    level: authored ? "content" : "code",
    detail: `the correct choice "${correct[0]?.label}" is printed and no other choice is`,
  };
}

/**
 * Code-level matches that are coincidences: the figure computes a different quantity that
 * happens to equal the answer. Each entry says why it is not a leak.
 */
const ALLOWED: Record<string, string> = {
  "economics-markets-and-strategy/price-elasticity/transfer":
    "0% is the price-change slider at rest; the answer is a £0 change in revenue.",
  "linear-algebra-vectors-and-maps/solve-by-row-reduction/transfer":
    "The screen-reader caption gives the shape of the given augmented matrix (2 rows); x₁ is 2.",
  "linear-algebra-vectors-and-maps/basis-and-dimension/check":
    "The caption gives the given augmented matrix's shape (3 columns); c₁ happens to be 3.",
  "probability-statistics/same-centre-different-spread/work":
    "Variance divides by the number of observations (4), a given count; the range is also 4.",
};

/**
 * Built-in maths, logic and CS diagrams live in LearningDiagram.tsx, which the lead is reworking.
 * Remove an entry once its diagram masks the asked value.
 */
const LEAD_OWNED_PENDING = new Set<string>([]);

function audit(): { code: string[]; content: string[] } {
  const code: string[] = [];
  const content: string[] = [];
  for (const step of gradedSteps()) {
    const view = render(<LearningDiagram spec={step.diagram} showResults={false} />);
    const parts = renderedText(view.container);
    view.unmount();
    const leak = numericLeak(step, parts) ?? choiceLeak(step, parts);
    if (!leak) continue;
    const line = `${step.key} [${step.diagram.type}] ${leak.detail}`;
    if (leak.level === "content") content.push(line);
    else if (!(step.key in ALLOWED) && !LEAD_OWNED_PENDING.has(step.diagram.type)) code.push(line);
  }
  return { code, content };
}

describe("answer-leak audit", () => {
  it("finds graded steps with diagrams", () => {
    expect(gradedSteps().length).toBeGreaterThan(500);
  });
  it("masks every computed answer until the learner has answered", () => {
    const { code, content } = audit();
    // Authored givens that state the answer need a content fix, not a code fix. Set
    // DISCERE_LEAK_REPORT=1 to list them.
    if (process.env["DISCERE_LEAK_REPORT"])
      process.stdout.write(`Content-level (${content.length}):\n${content.join("\n")}\n`);
    expect(code).toEqual([]);
  }, 120_000);
});
