import type {
  ChemicalReaction,
  ChemicalSpecies,
  ChemistryDiagram,
  ChemistryModel,
  CourseBundle,
  Question,
} from "../../../packages/contracts/src/index.js";
export type DraftQuestion = Omit<Question, "id" | "conceptIds" | "sourceIds">;
export interface TeachingLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceIds: string[];
  beats: Array<{ title: string; text: string; diagram: ChemistryDiagram }>;
  questions: DraftQuestion[];
  cards: Array<{ front: string; back: string; answerAuthority: Question["answerAuthority"] }>;
}
export function numeric(
  prompt: string,
  value: number,
  workedAnswer: string,
  hint: string,
  unit: string,
): DraftQuestion {
  return {
    prompt,
    responseType: "numeric",
    difficulty: 1,
    hints: [hint],
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
  a: [string, ChemistryModel],
  b: [string, ChemistryModel],
) {
  return {
    title,
    text,
    diagram: {
      type: "chemistry_explorer" as const,
      cases: [
        { id: "first", label: a[0], model: a[1] },
        { id: "second", label: b[0], model: b[1] },
      ],
      initialCaseId: "first",
    },
  };
}
export const atom = (protons: number, neutrons: number, electrons = protons): ChemistryModel => ({
  kind: "atom",
  protons,
  neutrons,
  electrons,
});
export const formula = (species: ChemicalSpecies, copies = 1): ChemistryModel => ({
  kind: "formula",
  species,
  copies,
});
export const ionic = (
  cation: "Na" | "Mg" | "Al" | "Ca",
  anion: "Cl" | "O",
  positive = 1,
  negative = 1,
): ChemistryModel => ({ kind: "ionic", cation, anion, positive, negative });
export const lewis = (species: "H2" | "O2" | "N2" | "H2O" | "NH3" | "CH4"): ChemistryModel => ({
  kind: "lewis",
  species,
});
export const amount = (species: ChemicalSpecies, moles: number): ChemistryModel => ({
  kind: "amount",
  species,
  moles,
});
export const reaction = (r: ChemicalReaction, coefficients: number[]): ChemistryModel => ({
  kind: "reaction",
  reaction: r,
  coefficients,
});
export const batch = (r: ChemicalReaction, a: number, b: number): ChemistryModel => ({
  kind: "batch",
  reaction: r,
  supplies: [a, b],
});
const sections = [
  ["chem-atom", "2.3", "Atomic structure and symbolism", "2-3-atomic-structure-and-symbolism"],
  ["chem-formula", "2.4", "Chemical formulas", "2-4-chemical-formulas"],
  ["chem-compounds", "2.6", "Ionic and molecular compounds", "2-6-ionic-and-molecular-compounds"],
  [
    "chem-shells",
    "6.4",
    "Electronic structure of atoms",
    "6-4-electronic-structure-of-atoms-electron-configurations",
  ],
  ["chem-ionic", "7.1", "Ionic bonding", "7-1-ionic-bonding"],
  ["chem-covalent", "7.2", "Covalent bonding", "7-2-covalent-bonding"],
  ["chem-lewis", "7.3", "Lewis symbols and structures", "7-3-lewis-symbols-and-structures"],
  [
    "chem-mole",
    "3.1",
    "Formula mass and the mole concept",
    "3-1-formula-mass-and-the-mole-concept",
  ],
  [
    "chem-balance",
    "4.1",
    "Writing and balancing chemical equations",
    "4-1-writing-and-balancing-chemical-equations",
  ],
  ["chem-ratios", "4.3", "Reaction stoichiometry", "4-3-reaction-stoichiometry"],
  ["chem-yields", "4.4", "Reaction yields", "4-4-reaction-yields"],
];
export const sources: CourseBundle["sources"] = sections.map(([id, section, title, slug]) => ({
  id: id!,
  title: title!,
  publisher: "OpenStax, Rice University",
  url: "https://openstax.org/books/chemistry-2e/pages/" + slug,
  section: section + ", " + title,
  edition: "Chemistry 2e",
  accessedAt: "2026-10-02",
  reuse: "reference_only",
  licence: "CC BY-NC-SA 4.0 (current web edition); reference only",
  licenceUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  attribution:
    "Paul Flowers, Klaus Theopold, Richard Langley and William R. Robinson, OpenStax, Chemistry 2e, " +
    section +
    ".",
  notes:
    "Standard chemical relationships verified here. All Discere prose, problems, particle models and SVG artwork are original; no publisher exercises or images are redistributed.",
}));
