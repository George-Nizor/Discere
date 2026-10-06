import type {
  CourseBundle,
  LinearAlgebraModel as Model,
  LinearAlgebraDiagram,
  Question,
} from "../../../packages/contracts/src/index.js";
import { numericLadder } from "./hints.js";
export type DraftQuestion = Omit<Question, "id" | "conceptIds" | "sourceIds">;
export type NumericDraftQuestion = DraftQuestion & {
  responseType: "numeric";
  answerAuthority: Extract<Question["answerAuthority"], { kind: "numeric" }>;
};
export type Probe = { op: string; [key: string]: unknown };
export const numericProbes = new WeakMap<Question["answerAuthority"], Probe>();
export const numericChecks: Array<{ prompt: string; value: number; probe: Probe }> = [];
export interface Task {
  title: string;
  text: string;
  model: Model;
  compare: Model;
  question: DraftQuestion;
}
export interface TeachingLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceIds: string[];
  beats: Array<{ title: string; text: string; diagram: LinearAlgebraDiagram }>;
  questions: DraftQuestion[];
  cards: Array<{ front: string; back: string; answerAuthority: Question["answerAuthority"] }>;
}
export function num(
  prompt: string,
  value: number,
  workedAnswer: string,
  hint: string | string[],
  probe: Probe,
): NumericDraftQuestion {
  numericChecks.push({ prompt, value, probe });
  const question: NumericDraftQuestion = {
    prompt,
    responseType: "numeric",
    difficulty: 1,
    hints: numericLadder(hint, probe),
    answerAuthority: {
      kind: "numeric",
      value,
      unit: "",
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer,
    },
  };
  numericProbes.set(question.answerAuthority, probe);
  return question;
}
export function choice(
  prompt: string,
  labels: string[],
  correct: number,
  reason: string,
  hint: string | string[],
): DraftQuestion {
  return {
    prompt,
    responseType: "short_text",
    difficulty: 1,
    hints: Array.isArray(hint) ? hint : [hint],
    choices: labels.map((label, i) => ({ id: String(i + 1), label })),
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [labels[correct]!],
      rejectedIdeas: [],
      exampleAnswer: reason,
    },
  };
}
export function recall(front: string, value: number, back: string, probe: Probe) {
  const q = num(front, value, back, [], probe);
  return { front, back, answerAuthority: q.answerAuthority };
}
export const p = (model: Model, select?: number | [number, number]): Probe => ({
  op: "model",
  model,
  ...(select === undefined ? {} : { select }),
});
export const t = (
  title: string,
  text: string,
  model: Model,
  compare: Model,
  question: DraftQuestion,
): Task => ({ title, text, model, compare, question });
export function lesson(
  id: string,
  title: string,
  summary: string,
  moduleId: string,
  sourceIds: string[],
  tasks: [Task, Task, Task, Task],
  practice: [DraftQuestion, DraftQuestion],
  cards: TeachingLesson["cards"],
): TeachingLesson {
  return {
    id,
    title,
    summary,
    moduleId,
    sourceIds,
    beats: tasks.map((x) => ({
      title: x.title,
      text: x.text,
      diagram: {
        type: "linear_algebra_explorer",
        initialCaseId: "first",
        cases: [
          { id: "first", label: "Example", model: x.model },
          { id: "second", label: "Compare", model: x.compare },
        ],
      },
    })),
    questions: [...tasks.map((x) => x.question), ...practice],
    cards,
  };
}
export const add = (u: [number, number], v: [number, number]): Model => ({
  kind: "vector_sum",
  u,
  v,
});
export const scale = (v: [number, number], scalar: number): Model => ({
  kind: "scaled_vector",
  v,
  scale: scalar,
});
export const dot = (u: [number, number], v: [number, number]): Model => ({
  kind: "dot_product",
  u,
  v,
});
export const length = (v: [number, number]): Model => ({ kind: "vector_length", v });
export const projection = (v: [number, number], direction: [number, number]): Model => ({
  kind: "projection",
  v,
  direction,
});
export const transpose = (matrix: number[][]): Model => ({
  kind: "matrix",
  operation: "transpose",
  matrix,
});
export const apply = (matrix: number[][], vector: number[]): Model => ({
  kind: "matrix",
  operation: "apply",
  matrix,
  vector,
});
export const multiply = (matrix: number[][], second: number[][]): Model => ({
  kind: "matrix",
  operation: "multiply",
  matrix,
  second,
});
export const inverse = (matrix: number[][]): Model => ({
  kind: "matrix",
  operation: "inverse",
  matrix,
});
export const determinant = (matrix: number[][]): Model => ({
  kind: "matrix",
  operation: "determinant",
  matrix,
});
export const system = (matrix: number[][], rhs: number[]): Model => ({
  kind: "system",
  matrix,
  rhs,
});
export const span = (vectors: [number, number][]): Model => ({ kind: "span", vectors });
export const eigen = (matrix: number[][], vector: [number, number]): Model => ({
  kind: "eigen",
  matrix,
  vector,
});
export const svd = (matrix: number[][]): Model => ({ kind: "svd", matrix });
const chapters = [
  ["lin-vectors", "2.1", "Vectors", "vectors"],
  ["lin-span", "2.2", "Vector Equations and Spans", "spans"],
  ["lin-equations", "2.3", "Matrix Equations", "matrix-equations"],
  ["lin-solutions", "2.4", "Solution Sets", "solution-sets"],
  ["lin-independence", "2.5", "Linear Independence", "linear-independence"],
  ["lin-subspaces", "2.6", "Subspaces", "subspaces"],
  ["lin-basis", "2.7", "Basis and Dimension", "dimension"],
  ["lin-coordinates", "2.8", "Bases as Coordinate Systems", "bases-as-coord-systems"],
  ["lin-rank", "2.9", "The Rank Theorem", "rank-thm"],
  ["lin-transform", "3.3", "Linear Transformations", "linear-transformations"],
  ["lin-product", "3.4", "Matrix Multiplication", "matrix-multiplication"],
  ["lin-inverse", "3.5", "Matrix Inverses", "matrix-inverses"],
  ["lin-row", "1.2", "Row Reduction", "row-reduction"],
  ["lin-determinant", "4.3", "Determinants and Volumes", "determinants-volumes"],
  ["lin-eigen", "5.1", "Eigenvalues and Eigenvectors", "eigenvectors"],
  ["lin-diagonal", "5.4", "Diagonalization", "diagonalization"],
  ["lin-dot", "6.1", "Dot Products and Orthogonality", "dot-product"],
  ["lin-projection", "6.3", "Orthogonal Projection", "projections"],
  ["lin-orthogonal", "6.4", "Orthogonal Sets", "orthogonal-sets"],
  ["lin-fit", "6.5", "The Method of Least Squares", "least-squares"],
];
export const sources: CourseBundle["sources"] = chapters.map(([id, section, title, slug]) => ({
  id: id!,
  title: title!,
  publisher: "Dan Margalit and Joseph Rabinoff, Georgia Institute of Technology",
  url: "https://textbooks.math.gatech.edu/ila/" + slug + ".html",
  section: section! + ", " + title,
  edition: "Interactive Linear Algebra, online edition",
  accessedAt: "2026-10-02",
  reuse: "reference_only",
  licence: "GNU Free Documentation License; reference only",
  licenceUrl: "https://textbooks.math.gatech.edu/ila/appendix-gfdl.html",
  attribution: "Dan Margalit and Joseph Rabinoff, Interactive Linear Algebra, " + section + ".",
  notes:
    "Mathematical relationships checked against this primary textbook section. All Discere explanations, numbers, problems, diagrams and artwork are original; no textbook exercise or media is redistributed.",
}));
sources.push({
  id: "lin-svd",
  title: "Lecture 29: Singular value decomposition",
  publisher: "Massachusetts Institute of Technology, OpenCourseWare",
  url: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-29-singular-value-decomposition/",
  section: "Lecture 29, orthogonal factors and singular values",
  edition: "18.06 Linear Algebra, Spring 2010; lecture recorded Fall 1999",
  accessedAt: "2026-10-02",
  reuse: "reference_only",
  licence: "CC BY-NC-SA 4.0; reference only",
  licenceUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  attribution: "Gilbert Strang, MIT OpenCourseWare 18.06, Lecture 29.",
  notes:
    "The lecture page and its official transcript establish the SVD relationships. Original Discere examples are independently checked with NumPy; the lecture's exercises, video and transcript are not redistributed.",
});
sources.push({
  id: "lin-notion-outline",
  title: "Mathematics (1): Linear Algebra curriculum",
  publisher: "George's Notion learning library",
  url: "https://app.notion.com/p/3ebea4c04f4c8196bc01fe4799235753",
  section: "Linear Algebra, nine-part curriculum outline",
  edition: "Owner note, revision 2026-09-30T10:38:46.111Z",
  licenceUrl: "https://app.notion.com/p/3ebea4c04f4c8196bc01fe4799235753",
  accessedAt: "2026-10-02",
  reuse: "reference_only",
  licence: "Private owner notes; used under the owner's curriculum request",
  attribution: "George's Mathematics (1) learning note.",
  notes:
    "Planning source, not mathematical answer authority. Read all retrieved textual content; temporary media links are omitted from the retained snapshot. Embedded images, linked books and any inaccessible blocks are not claimed as read. The malformed dot-product notation is corrected against the primary textbook.",
});

export const fit = (matrix: number[][], rhs: number[]): Model => ({
  kind: "least_squares",
  matrix,
  rhs,
});
