import type {
  CourseBundle,
  MechanicsModel,
  MechanicsDiagram,
  Question,
} from "../../../packages/contracts/src/index.js";
export type DraftQuestion = Omit<Question, "id" | "conceptIds" | "sourceIds">;
export interface TeachingLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceIds: string[];
  beats: Array<{ title: string; text: string; diagram: MechanicsDiagram }>;
  questions: DraftQuestion[];
  cards: Array<{ front: string; back: string; answerAuthority: Question["answerAuthority"] }>;
}
export function numeric(
  prompt: string,
  value: number,
  workedAnswer: string,
  hints: [string, string, string],
  unit: string,
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
export function card(front: string, value: number, back: string, unit: string) {
  return {
    front,
    back,
    answerAuthority: {
      kind: "numeric" as const,
      value,
      unit,
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer: back,
    },
  };
}
export function beat(
  title: string,
  text: string,
  a: [string, MechanicsModel],
  b: [string, MechanicsModel],
) {
  return {
    title,
    text,
    diagram: {
      type: "mechanics_explorer" as const,
      cases: [
        { id: "first", label: a[0], model: a[1] },
        { id: "second", label: b[0], model: b[1] },
      ],
      initialCaseId: "first",
    },
  };
}
export const trip = (
  points: Array<[number, number]>,
  display: "track" | "position_graph" = "track",
): MechanicsModel => ({ kind: "journey", points: points.map(([t, x]) => ({ t, x })), display });
export const motion = (
  v0: number,
  acceleration: number,
  duration: number,
  x0 = 0,
  axis: "horizontal" | "vertical" = "horizontal",
  display: "track" | "velocity_graph" = "track",
): MechanicsModel => ({ kind: "motion", x0, v0, acceleration, duration, axis, display });
export const change = (v0: number, v1: number, duration: number): MechanicsModel => ({
  kind: "velocity_change",
  v0,
  v1,
  duration,
});
export const forces = (
  mass: number,
  right: number,
  left = 0,
  v0 = 0,
  duration = 2,
): MechanicsModel => ({ kind: "forces", mass, right, left, v0, duration });
export const support = (mass: number, gravity = 10, acceleration = 0): MechanicsModel => ({
  kind: "support",
  mass,
  gravity,
  acceleration,
});
export const pair = (
  massA: number,
  massB: number,
  force: number,
  duration = 2,
): MechanicsModel => ({ kind: "interaction", massA, massB, force, duration });
export const friction = (
  mass: number,
  applied: number,
  v0 = 0,
  muStatic = 0.5,
  muKinetic = 0.3,
  gravity = 10,
  duration = 2,
): MechanicsModel => ({
  kind: "friction",
  mass,
  gravity,
  applied,
  muStatic,
  muKinetic,
  v0,
  duration,
});
export const work = (
  force: number,
  distance: number,
  alignment: "with" | "against" | "perpendicular" = "with",
): MechanicsModel => ({ kind: "work", force, distance, alignment });
export const kinetic = (mass: number, speed: number): MechanicsModel => ({
  kind: "kinetic",
  mass,
  speed,
});
export const lift = (
  mass: number,
  fromHeight: number,
  toHeight: number,
  gravity = 10,
): MechanicsModel => ({ kind: "lift", mass, gravity, fromHeight, toHeight });
export const drop = (
  mass: number,
  height: number,
  thermalLoss = 0,
  initialSpeed = 0,
  gravity = 10,
): MechanicsModel => ({ kind: "energy_drop", mass, gravity, height, initialSpeed, thermalLoss });
export const power = (
  inputEnergy: number,
  usefulEnergy: number,
  duration: number,
): MechanicsModel => ({ kind: "power", inputEnergy, usefulEnergy, duration });
export const impulse = (
  mass: number,
  v0: number,
  force: number,
  duration: number,
): MechanicsModel => ({ kind: "impulse", mass, v0, force, duration });
export const collision = (
  massA: number,
  massB: number,
  velocityA: number,
  velocityB: number,
): MechanicsModel => ({ kind: "collision", massA, massB, velocityA, velocityB });
const sections = [
  ["phys-displacement", "2.1", "Displacement", "2-1-displacement"],
  ["phys-velocity", "2.3", "Time, velocity and speed", "2-3-time-velocity-and-speed"],
  ["phys-acceleration", "2.4", "Acceleration", "2-4-acceleration"],
  [
    "phys-kinematics",
    "2.5",
    "Motion equations for constant acceleration",
    "2-5-motion-equations-for-constant-acceleration-in-one-dimension",
  ],
  ["phys-fall", "2.7", "Falling objects", "2-7-falling-objects"],
  [
    "phys-graphs",
    "2.8",
    "Graphical analysis of one-dimensional motion",
    "2-8-graphical-analysis-of-one-dimensional-motion",
  ],
  ["phys-inertia", "4.2", "Newton's first law: inertia", "4-2-newtons-first-law-of-motion-inertia"],
  [
    "phys-newton",
    "4.3",
    "Newton's second law: a system",
    "4-3-newtons-second-law-of-motion-concept-of-a-system",
  ],
  [
    "phys-pairs",
    "4.4",
    "Newton's third law: symmetry in forces",
    "4-4-newtons-third-law-of-motion-symmetry-in-forces",
  ],
  [
    "phys-support",
    "4.5",
    "Normal, tension and other forces",
    "4-5-normal-tension-and-other-examples-of-forces",
  ],
  ["phys-friction", "5.1", "Friction", "5-1-friction"],
  ["phys-work", "7.1", "Work: the scientific definition", "7-1-work-the-scientific-definition"],
  [
    "phys-kinetic",
    "7.2",
    "Kinetic energy and the work-energy theorem",
    "7-2-kinetic-energy-and-the-work-energy-theorem",
  ],
  ["phys-potential", "7.3", "Gravitational potential energy", "7-3-gravitational-potential-energy"],
  ["phys-energy", "7.5", "Nonconservative forces", "7-5-nonconservative-forces"],
  ["phys-power", "7.7", "Power", "7-7-power"],
  ["phys-momentum", "8.1", "Linear momentum and force", "8-1-linear-momentum-and-force"],
  ["phys-impulse", "8.2", "Impulse", "8-2-impulse"],
  ["phys-conservation", "8.3", "Conservation of momentum", "8-3-conservation-of-momentum"],
  [
    "phys-collision",
    "8.5",
    "Inelastic collisions in one dimension",
    "8-5-inelastic-collisions-in-one-dimension",
  ],
];
export const sources: CourseBundle["sources"] = sections.map(([id, section, title, slug]) => ({
  id: id!,
  title: title!,
  publisher: "OpenStax, Rice University",
  url: "https://openstax.org/books/college-physics-2e/pages/" + slug,
  section: section! + ", " + title,
  edition: "College Physics, second edition",
  accessedAt: "2026-10-02",
  reuse: "reference_only",
  licence: "CC BY-NC-SA 4.0 (current web edition); reference only",
  licenceUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  attribution:
    "Paul Peter Urone and Roger Hinrichs, OpenStax, College Physics 2e, " + section + ".",
  notes:
    "Standard physical relationships checked against this section. Discere prose, examples, problems, sound and SVGs are original. No publisher exercises, media or prose are redistributed. Model assumptions and units are stated in each problem.",
}));

export const freefall = (
  mass: number,
  height: number,
  gravity = 10,
  duration = 2,
): MechanicsModel => ({
  kind: "motion",
  mass,
  x0: height,
  v0: 0,
  acceleration: -gravity,
  duration,
  axis: "vertical",
  display: "track",
});
