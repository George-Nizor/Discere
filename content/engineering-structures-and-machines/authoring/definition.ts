import type {
  CourseBundle,
  EngineeringDiagram,
  EngineeringModel,
  Question,
} from "../../../packages/contracts/src/index.js";

export type DraftQuestion = Omit<Question, "id" | "conceptIds" | "sourceIds">;
export interface TeachingLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceIds: string[];
  beats: Array<{ title: string; text: string; diagram: EngineeringDiagram }>;
  questions: DraftQuestion[];
  cards: Array<{ front: string; back: string; answerAuthority: Question["answerAuthority"] }>;
}

/** A calculated answer. Tolerance is absolute; rounded answers state their rounding in the prompt. */
export function numeric(
  prompt: string,
  value: number,
  workedAnswer: string,
  hints: [string, string, string],
  unit: string,
  tolerance = 1e-6,
): DraftQuestion {
  return {
    prompt,
    responseType: "numeric",
    difficulty: 1,
    hints,
    answerAuthority: {
      kind: "numeric",
      value,
      unit,
      absoluteTolerance: tolerance,
      relativeTolerance: 0,
      workedAnswer,
    },
  };
}
/** A one-word or short-phrase answer, marked by the accepted idea and its listed alternatives. */
export function word(
  prompt: string,
  accepted: string[],
  rejected: string[],
  exampleAnswer: string,
  hint: string,
): DraftQuestion {
  return {
    prompt,
    responseType: "short_text",
    difficulty: 1,
    hints: [hint],
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [accepted[0]!],
      ...(accepted.length > 1 ? { acceptedAlternatives: accepted.slice(1) } : {}),
      rejectedIdeas: rejected,
      exampleAnswer,
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
export function card(front: string, value: number, back: string, unit: string, tolerance = 1e-6) {
  return {
    front,
    back,
    answerAuthority: {
      kind: "numeric" as const,
      value,
      unit,
      absoluteTolerance: tolerance,
      relativeTolerance: 0,
      workedAnswer: back,
    },
  };
}
export function beat(
  title: string,
  text: string,
  ...cases: Array<[string, EngineeringModel]>
): { title: string; text: string; diagram: EngineeringDiagram } {
  return {
    title,
    text,
    diagram: {
      type: "engineering_explorer",
      cases: cases.map(([label, model], i) => ({
        id: ["first", "second", "third"][i]!,
        label,
        model,
      })),
      initialCaseId: "first",
    },
  };
}

// ---------------------------------------------------------------------------
// Model builders. They hold only given values.
// ---------------------------------------------------------------------------

type Force = {
  label: string;
  magnitude: number;
  angle: number;
  slope?: { run: number; rise: number };
};
export const point = (unit: "N" | "kN", ...forces: Force[]): EngineeringModel => ({
  kind: "concurrent",
  unit,
  forces,
});
export const f = (label: string, magnitude: number, angle: number): Force => ({
  label,
  magnitude,
  angle,
});
/** A force along a slope triangle; the angle is the same direction, kept for drawing. */
export const fs = (label: string, magnitude: number, run: number, rise: number): Force => ({
  label,
  magnitude,
  angle: (Math.atan2(rise, run) * 180) / Math.PI,
  slope: { run, rise },
});
export const bar = (
  unit: "N" | "kN",
  ...forces: Array<[label: string, position: number, magnitude: number, angle: number]>
): EngineeringModel => ({
  kind: "moment",
  unit,
  forces: forces.map(([label, position, magnitude, angle]) => ({
    label,
    position,
    magnitude,
    angle,
  })),
});
export const beam = (
  length: number,
  supports: [number, number] | "cantilever",
  pointLoads: Array<[position: number, magnitude: number]>,
  spreadLoads: Array<[start: number, end: number, intensity: number]> = [],
  display: "reactions" | "shear" | "moment" = "reactions",
): EngineeringModel => ({
  kind: "beam",
  support: supports === "cantilever" ? "cantilever" : "simple",
  length,
  ...(supports === "cantilever" ? {} : { supports }),
  pointLoads: pointLoads.map(([position, magnitude]) => ({ position, magnitude })),
  spreadLoads: spreadLoads.map(([start, end, intensity]) => ({ start, end, intensity })),
  display,
});
/** A triangular truss: pin A at the origin, roller B at the span, apex C, load at C. */
export const triangle = (span: number, height: number, load: number): EngineeringModel => ({
  kind: "truss",
  nodes: [
    { id: "A", x: 0, y: 0 },
    { id: "B", x: span, y: 0 },
    { id: "C", x: span / 2, y: height },
  ],
  members: [
    ["A", "C"],
    ["B", "C"],
    ["A", "B"],
  ],
  pin: "A",
  roller: "B",
  loads: [{ node: "C", fx: 0, fy: -load }],
});
/** The triangle with its tie split at D under the apex and a vertical DC added. */
export const kingpost = (
  span: number,
  height: number,
  load: number,
  loadAt: "C" | "D" = "C",
): EngineeringModel => ({
  kind: "truss",
  nodes: [
    { id: "A", x: 0, y: 0 },
    { id: "B", x: span, y: 0 },
    { id: "C", x: span / 2, y: height },
    { id: "D", x: span / 2, y: 0 },
  ],
  members: [
    ["A", "C"],
    ["B", "C"],
    ["A", "D"],
    ["D", "B"],
    ["D", "C"],
  ],
  pin: "A",
  roller: "B",
  loads: [{ node: loadAt, fx: 0, fy: -load }],
});
/** A two-panel Warren truss: bottom A, D, B; top C, E; load at the bottom middle joint D. */
export const warren = (panel: number, height: number, load: number): EngineeringModel => ({
  kind: "truss",
  nodes: [
    { id: "A", x: 0, y: 0 },
    { id: "D", x: panel, y: 0 },
    { id: "B", x: 2 * panel, y: 0 },
    { id: "C", x: panel / 2, y: height },
    { id: "E", x: 1.5 * panel, y: height },
  ],
  members: [
    ["A", "D"],
    ["D", "B"],
    ["A", "C"],
    ["C", "D"],
    ["D", "E"],
    ["E", "B"],
    ["C", "E"],
  ],
  pin: "A",
  roller: "B",
  loads: [{ node: "D", fx: 0, fy: -load }],
});
export const tensile = (
  material: string,
  modulus: number,
  yieldStress: number,
  ultimateStress: number,
  area: number,
  length: number,
  load: number,
): EngineeringModel => ({
  kind: "stress_strain",
  material,
  modulus,
  yieldStress,
  ultimateStress,
  area,
  length,
  load,
});
export const steel = (area: number, length: number, load: number, yieldStress = 250) =>
  tensile("Structural steel", 200, yieldStress, 400, area, length, load);
export const aluminium = (area: number, length: number, load: number) =>
  tensile("Aluminium alloy", 70, 240, 290, area, length, load);
export const rect = (width: number, depth: number, moment: number): EngineeringModel => ({
  kind: "section",
  shape: "rectangle",
  width,
  depth,
  moment,
});
export const ibeam = (
  width: number,
  depth: number,
  flange: number,
  web: number,
  moment: number,
): EngineeringModel => ({ kind: "section", shape: "i_beam", width, depth, flange, web, moment });
export const cantilever = (
  length: number,
  load: number,
  modulus: number,
  secondMoment: number,
): EngineeringModel => ({ kind: "cantilever", length, load, modulus, secondMoment });
export const lever = (
  leverClass: "first" | "second" | "third",
  effortArm: number,
  loadArm: number,
  load: number,
): EngineeringModel => ({ kind: "lever", leverClass, effortArm, loadArm, load });
export const pulley = (
  strands: number,
  load: number,
  lift: number,
  efficiency = 1,
  liftSpeed?: number,
): EngineeringModel => ({
  kind: "pulley",
  strands,
  load,
  lift,
  efficiency,
  ...(liftSpeed === undefined ? {} : { liftSpeed }),
});
export const gears = (
  stages: Array<[driver: number, driven: number]>,
  inputSpeed: number,
  inputTorque: number,
  efficiency = 1,
  idler?: number,
): EngineeringModel => ({
  kind: "gears",
  stages: stages.map(([driver, driven]) => ({ driver, driven })),
  ...(idler === undefined ? {} : { idler }),
  inputSpeed,
  inputTorque,
  efficiency,
});

// ---------------------------------------------------------------------------
// Sources. Every one is reference-only: Discere's prose, problems and drawings are original.
// ---------------------------------------------------------------------------

const accessedAt = "2026-10-06";
const byNcSa = "https://creativecommons.org/licenses/by-nc-sa/4.0/";
const universityPhysics = (id: string, section: string, title: string, slug: string) => ({
  id,
  title,
  publisher: "OpenStax, Rice University",
  url: "https://openstax.org/books/university-physics-volume-1/pages/" + slug,
  section: section + ", " + title,
  edition: "University Physics Volume 1",
  accessedAt,
  reuse: "reference_only" as const,
  licence: "CC BY-NC-SA 4.0 (current web edition); reference only",
  licenceUrl: byNcSa,
  attribution:
    "William Moebs, Samuel J. Ling and Jeff Sanny, OpenStax, University Physics Volume 1, " +
    section +
    ".",
  notes:
    "Checked on 6 October 2026: the OpenStax page states CC BY-NC-SA 4.0. Used to check definitions and standard relationships. Discere prose, examples, problems and SVGs are original; no publisher text, exercises or figures are redistributed.",
});
const collegePhysics = (id: string, section: string, title: string, slug: string) => ({
  ...universityPhysics(id, section, title, slug),
  url: "https://openstax.org/books/college-physics-2e/pages/" + slug,
  edition: "College Physics, second edition",
  attribution:
    "Paul Peter Urone and Roger Hinrichs, OpenStax, College Physics 2e, " + section + ".",
});
const statics = (id: string, section: string, title: string, page: string) => ({
  id,
  title,
  publisher: "Daniel Baker and William Haynes, Engineering Statics: Open and Interactive",
  url: "https://engineeringstatics.org/" + page,
  section: section + ", " + title,
  edition: "Engineering Statics: Open and Interactive, online edition",
  accessedAt,
  reuse: "reference_only" as const,
  licence: "CC BY-NC-SA 4.0; reference only",
  licenceUrl: byNcSa,
  attribution:
    "Daniel Baker and William Haynes, Engineering Statics: Open and Interactive, " + section + ".",
  notes:
    "Licence read from the book's preface on 6 October 2026. Used to check method and sign conventions only; its interactive figures, text and exercises are not reused.",
});
const mit = (id: string, section: string) => ({
  id,
  title: "Mechanics & Materials I (2.001), Fall 2006",
  publisher: "MIT OpenCourseWare",
  url: "https://ocw.mit.edu/courses/2-001-mechanics-materials-i-fall-2006/pages/lecture-notes/",
  section,
  edition: "Fall 2006 course materials",
  accessedAt,
  reuse: "reference_only" as const,
  licence: "CC BY-NC-SA 4.0; reference only",
  licenceUrl: byNcSa,
  attribution:
    "Carol Livermore, Henrik Schmidt, James H. Williams and Simona Socrate, 2.001 Mechanics & Materials I, MIT OpenCourseWare, " +
    section +
    ".",
  notes:
    "Licence read from the course page on 6 October 2026. Used to check beam relations; lecture notes are not redistributed.",
});
export const sources: CourseBundle["sources"] = [
  universityPhysics("engr-up-torque", "10.6", "Torque", "10-6-torque"),
  universityPhysics(
    "engr-up-rotation",
    "10.3",
    "Relating Angular and Translational Quantities",
    "10-3-relating-angular-and-translational-quantities",
  ),
  universityPhysics(
    "engr-up-rotational-power",
    "10.8",
    "Work and Power for Rotational Motion",
    "10-8-work-and-power-for-rotational-motion",
  ),
  universityPhysics(
    "engr-up-equilibrium",
    "12.1",
    "Conditions for Static Equilibrium",
    "12-1-conditions-for-static-equilibrium",
  ),
  universityPhysics(
    "engr-up-equilibrium-examples",
    "12.2",
    "Examples of Static Equilibrium",
    "12-2-examples-of-static-equilibrium",
  ),
  universityPhysics(
    "engr-up-stress",
    "12.3",
    "Stress, Strain, and Elastic Modulus",
    "12-3-stress-strain-and-elastic-modulus",
  ),
  universityPhysics(
    "engr-up-plasticity",
    "12.4",
    "Elasticity and Plasticity",
    "12-4-elasticity-and-plasticity",
  ),
  collegePhysics("engr-cp-machines", "9.5", "Simple Machines", "9-5-simple-machines"),
  collegePhysics("engr-cp-power", "7.7", "Power", "7-7-power"),
  statics("engr-es-moment", "4.1", "Moment of a Force", "moment-of-force.html"),
  statics(
    "engr-es-equilibrium",
    "5.3",
    "Equations of Equilibrium",
    "Chapter_05-equations-of-equilibrium.html",
  ),
  statics("engr-es-joints", "6.4", "Method of Joints", "method-of-joints.html"),
  statics("engr-es-shear-moment", "8.4", "Shear and Bending Moment Diagrams", "VM_diagrams.html"),
  statics(
    "engr-es-area-moment",
    "10.2",
    "Moments of Inertia of Common Shapes",
    "MOI-common-shapes.html",
  ),
  mit("engr-mit-bending", "Lectures 20–21, Pure Bending and the Moment-curvature Relationship"),
  mit("engr-mit-deflection", "Lecture 22, Beam Deflection"),
];
