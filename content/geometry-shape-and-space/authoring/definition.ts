import type {
  CourseBundle,
  GeometryShape,
  GeometryDiagram,
  Question,
} from "../../../packages/contracts/src/index.js";
export type DraftQuestion = Omit<Question, "id" | "conceptIds" | "sourceIds">;
export interface TeachingLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceIds: string[];
  beats: Array<{ title: string; text: string; diagram: GeometryDiagram }>;
  questions: DraftQuestion[];
  cards: Array<{ front: string; back: string; answerAuthority: Question["answerAuthority"] }>;
}
export function numeric(
  prompt: string,
  value: number,
  workedAnswer: string,
  hints: [string, string, string],
): DraftQuestion {
  return {
    prompt,
    responseType: "numeric",
    difficulty: 1,
    hints,
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
export const card = (front: string, value: number, back: string) => ({
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
});
export const term = (front: string, answer: string, back: string) => ({
  front,
  back,
  answerAuthority: {
    kind: "text" as const,
    acceptedIdeas: [answer],
    rejectedIdeas: [],
    exampleAnswer: back,
  },
});
export function beat(
  title: string,
  text: string,
  a: [string, GeometryShape],
  b: [string, GeometryShape],
) {
  return {
    title,
    text,
    diagram: {
      type: "geometry_explorer" as const,
      cases: [
        { id: "first", label: a[0], shape: a[1] },
        { id: "second", label: b[0], shape: b[1] },
      ],
      initialCaseId: "first",
    },
  };
}
export const angle = (degrees: number, total: 90 | 180 | 360 = 180): GeometryShape => ({
  kind: "angle",
  degrees,
  total,
});
export const triangleAngles = (a: number, b: number): GeometryShape => ({
  kind: "triangle_angles",
  a,
  b,
});
export const rect = (width: number, height: number): GeometryShape => ({
  kind: "rectangle",
  width,
  height,
});
export const triangle = (base: number, height: number, offset = 0.5): GeometryShape => ({
  kind: "triangle",
  base,
  height,
  offset,
});
export const para = (base: number, height: number, offset = 0.3): GeometryShape => ({
  kind: "parallelogram",
  base,
  height,
  offset,
});
export const trapezoid = (bottom: number, top: number, height: number): GeometryShape => ({
  kind: "trapezoid",
  bottom,
  top,
  height,
});
export const cutout = (
  width: number,
  height: number,
  cutWidth: number,
  cutHeight: number,
): GeometryShape => ({ kind: "composite", width, height, cutWidth, cutHeight });
export const circle = (radius: number): GeometryShape => ({ kind: "circle", radius });
export const similar = (width: number, height: number, factor: number): GeometryShape => ({
  kind: "similarity",
  width,
  height,
  factor,
});
export const right = (a: number, b: number): GeometryShape => ({ kind: "right_triangle", a, b });
export const distance = (x1: number, y1: number, x2: number, y2: number): GeometryShape => ({
  kind: "distance",
  x1,
  y1,
  x2,
  y2,
});
export const prism = (length: number, width: number, height: number): GeometryShape => ({
  kind: "prism",
  length,
  width,
  height,
});
const source = (
  id: string,
  book: string,
  section: string,
  slug: string,
  title: string,
): CourseBundle["sources"][number] => ({
  id,
  title,
  publisher: "OpenStax, Rice University",
  url: "https://openstax.org/books/" + book + "/pages/" + slug,
  section,
  edition: book.includes("prealgebra")
    ? "Prealgebra, second edition"
    : book.includes("intermediate")
      ? "Intermediate Algebra, second edition"
      : "Elementary Algebra, second edition",
  accessedAt: "2026-10-02",
  reuse: "reference_only",
  licence: "CC BY-NC-SA 4.0 (current web edition); reference only",
  licenceUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  attribution: "OpenStax, Rice University, " + title + ".",
  notes:
    "Subject facts and formulas checked against the cited section. Discere prose, examples, questions and diagrams are original. No publisher exercises or artwork are redistributed. Earlier downloadable editions may carry different licence notices.",
});
export const sources = [
  source(
    "geo-angles",
    "prealgebra-2e",
    "9.3, angles, triangle angle sum and the Pythagorean theorem",
    "9-3-use-properties-of-angles-triangles-and-the-pythagorean-theorem",
    "Angles, triangles and the Pythagorean theorem",
  ),
  source(
    "geo-area",
    "prealgebra-2e",
    "9.4, perimeter and area of rectangles, triangles and trapezoids",
    "9-4-use-properties-of-rectangles-triangles-and-trapezoids",
    "Rectangles, triangles and trapezoids",
  ),
  source(
    "geo-circles",
    "prealgebra-2e",
    "9.5, circles and irregular figures",
    "9-5-solve-geometry-applications-circles-and-irregular-figures",
    "Circles and irregular figures",
  ),
  source(
    "geo-solids",
    "prealgebra-2e",
    "9.6, rectangular solids, cubes and cylinders",
    "9-6-solve-geometry-applications-volume-and-surface-area",
    "Volume and surface area",
  ),
  source(
    "geo-similar",
    "elementary-algebra-2e",
    "8.7, similar figure applications",
    "8-7-solve-proportion-and-similar-figure-applications",
    "Proportion and similar figures",
  ),
  source(
    "geo-distance",
    "intermediate-algebra-2e",
    "11.1, distance formula derived from the Pythagorean theorem",
    "11-1-distance-and-midpoint-formulas-circles",
    "Distance and midpoint formulas; circles",
  ),
];
