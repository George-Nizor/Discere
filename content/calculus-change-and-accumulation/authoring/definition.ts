import type {
  CourseBundle,
  CalculusModel,
  CalculusDiagram,
  Question,
} from "../../../packages/contracts/src/index.js";
export type DraftQuestion = Omit<Question, "id" | "conceptIds" | "sourceIds">;
export interface TeachingLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceIds: string[];
  beats: Array<{ title: string; text: string; diagram: CalculusDiagram }>;
  questions: DraftQuestion[];
  cards: Array<{ front: string; back: string; answerAuthority: Question["answerAuthority"] }>;
}
export function numeric(
  prompt: string,
  value: number,
  workedAnswer: string,
  hint: string,
): DraftQuestion {
  return {
    prompt,
    responseType: "numeric",
    difficulty: 1,
    hints: [hint],
    answerAuthority: {
      kind: "numeric",
      value,
      unit: "",
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer,
    },
  };
}
export function choose(
  prompt: string,
  labels: string[],
  correct: number,
  reason: string,
  hint: string,
): DraftQuestion {
  return {
    prompt,
    responseType: "short_text",
    difficulty: 1,
    hints: [hint],
    choices: labels.map((label, i) => ({ id: String(i + 1), label })),
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [labels[correct]!],
      rejectedIdeas: [],
      exampleAnswer: reason,
    },
  };
}
export function card(front: string, value: number, back: string) {
  return {
    front,
    back,
    answerAuthority: {
      kind: "numeric" as const,
      value,
      unit: "",
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer: back,
    },
  };
}
export function beat(
  title: string,
  text: string,
  a: [string, CalculusModel],
  b: [string, CalculusModel],
) {
  return {
    title,
    text,
    diagram: {
      type: "calculus_explorer" as const,
      cases: [
        { id: "first", label: a[0], model: a[1] },
        { id: "second", label: b[0], model: b[1] },
      ],
      initialCaseId: "first",
    },
  };
}
export const limit = (
  coefficients: number[],
  at: number,
  hole = false,
  pointValue?: number,
): CalculusModel => ({
  kind: "limit",
  coefficients,
  at,
  hole,
  ...(pointValue === undefined ? {} : { pointValue }),
});
export const jump = (left: number, right: number, at = 0): CalculusModel => ({
  kind: "jump",
  at,
  left,
  right,
});
export const secant = (coefficients: number[], at: number, span = 1): CalculusModel => ({
  kind: "secant",
  coefficients,
  at,
  span,
});
export const tangent = (coefficients: number[], at: number): CalculusModel => ({
  kind: "tangent",
  coefficients,
  at,
});
export const primitive = (coefficients: number[], constant = 0): CalculusModel => ({
  kind: "primitive",
  coefficients,
  constant,
});
export const area = (
  coefficients: number[],
  from: number,
  to: number,
  display: "rectangles" | "integral" = "integral",
  rectangles = 4,
  method: "left" | "right" | "midpoint" = "left",
): CalculusModel => ({ kind: "area", coefficients, from, to, display, rectangles, method });
const sections = [
  ["cal-limit", "2.2", "The limit of a function", "2-2-the-limit-of-a-function"],
  ["cal-continuity", "2.4", "Continuity", "2-4-continuity"],
  ["cal-derivative", "3.1", "Defining the derivative", "3-1-defining-the-derivative"],
  ["cal-rules", "3.3", "Differentiation rules", "3-3-differentiation-rules"],
  ["cal-chain", "3.6", "The chain rule", "3-6-the-chain-rule"],
  ["cal-extrema", "4.3", "Maxima and minima", "4-3-maxima-and-minima"],
  ["cal-antiderivative", "4.10", "Antiderivatives", "4-10-antiderivatives"],
  ["cal-rectangles", "5.1", "Approximating areas", "5-1-approximating-areas"],
  ["cal-integral", "5.2", "The definite integral", "5-2-the-definite-integral"],
  [
    "cal-fundamental",
    "5.3",
    "The fundamental theorem of calculus",
    "5-3-the-fundamental-theorem-of-calculus",
  ],
  [
    "cal-net",
    "5.4",
    "Integration formulas and the net change theorem",
    "5-4-integration-formulas-and-the-net-change-theorem",
  ],
];
export const sources: CourseBundle["sources"] = sections.map(([id, section, title, slug]) => ({
  id: id!,
  title: title!,
  publisher: "OpenStax, Rice University",
  url: "https://openstax.org/books/calculus-volume-1/pages/" + slug,
  section: section! + ", " + title,
  edition: "Calculus Volume 1",
  accessedAt: "2026-10-02",
  reuse: "reference_only",
  licence: "CC BY-NC-SA 4.0 (current web edition); reference only",
  licenceUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  attribution: "Gilbert Strang and Edwin Herman, OpenStax, Calculus Volume 1, " + section + ".",
  notes:
    "Standard mathematical relationships checked against this section. Discere prose, problems, SVGs and examples are original. No publisher exercises or media redistributed.",
}));
