import type {
  CourseBundle,
  BiologyModel,
  BiologyDiagram,
  Question,
} from "../../../packages/contracts/src/index.js";
export type DraftQuestion = Omit<
  Question,
  "id" | "conceptIds" | "sourceIds" | "responseType" | "transfer"
> & { responseType: "numeric" | "short_text" };
export interface TeachingLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceIds: string[];
  beats: Array<{ title: string; text: string; diagram: BiologyDiagram }>;
  questions: DraftQuestion[];
  cards: Array<{ front: string; back: string; answerAuthority: Question["answerAuthority"] }>;
}
export function n(
  prompt: string,
  value: number,
  workedAnswer: string,
  hints: string[],
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
export function c(
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
export function term(front: string, acceptedIdeas: string[], back: string) {
  return {
    front,
    back,
    answerAuthority: {
      kind: "text" as const,
      acceptedIdeas: [acceptedIdeas[0]!],
      ...(acceptedIdeas.length > 1 ? { acceptedAlternatives: acceptedIdeas.slice(1) } : {}),
      rejectedIdeas: [],
      exampleAnswer: back,
    },
  };
}
export function beat(
  title: string,
  text: string,
  a: [string, BiologyModel],
  b: [string, BiologyModel],
) {
  return {
    title,
    text,
    diagram: {
      type: "biology_explorer" as const,
      cases: [
        { id: "first", label: a[0], model: a[1] },
        { id: "second", label: b[0], model: b[1] },
      ],
      initialCaseId: "first",
    },
  };
}
export const cell = (cell: "animal" | "plant" | "bacterium"): BiologyModel => ({
  kind: "cell",
  cell,
});
export const membrane = (
  left: number,
  right: number,
  permits: "solute" | "water" | "neither",
): BiologyModel => ({ kind: "membrane", left, right, permits });
export const series = (
  xLabel: string,
  yLabel: string,
  points: [number, number][],
): BiologyModel => ({ kind: "series", xLabel, yLabel, points });
export const energy = (process: "photosynthesis" | "respiration", glucose = 1): BiologyModel => ({
  kind: "energy",
  process,
  glucose,
});
export const dna = (sequence: string): BiologyModel => ({ kind: "dna", sequence });
export const division = (
  process: "mitosis" | "meiosis",
  pairs: number,
  phase = 0,
): BiologyModel => ({ kind: "division", process, pairs, phase });
export const cross = (first: "AA" | "Aa" | "aa", second: "AA" | "Aa" | "aa"): BiologyModel => ({
  kind: "cross",
  first,
  second,
});
export const population = (before: [number, number], after: [number, number]): BiologyModel => ({
  kind: "population",
  before,
  after,
});
export const web = (habitat: "meadow" | "pond"): BiologyModel => ({ kind: "food_web", habitat });
export const pyramid = (base: number, percent: number, levels = 3): BiologyModel => ({
  kind: "pyramid",
  base,
  percent,
  levels,
});
const sections = [
  ["bio-prokaryotes", "4.2", "Prokaryotic cells", "4-2-prokaryotic-cells"],
  ["bio-eukaryotes", "4.3", "Eukaryotic cells", "4-3-eukaryotic-cells"],
  ["bio-transport", "5.2", "Passive transport", "5-2-passive-transport"],
  ["bio-enzymes", "6.5", "Enzymes", "6-5-enzymes"],
  ["bio-photosynthesis", "8.1", "Overview of photosynthesis", "8-1-overview-of-photosynthesis"],
  ["bio-respiration", "7.1", "Energy in living systems", "7-1-energy-in-living-systems"],
  ["bio-dna", "14.3", "Basics of DNA replication", "14-3-basics-of-dna-replication"],
  ["bio-cycle", "10.2", "The cell cycle", "10-2-the-cell-cycle"],
  ["bio-meiosis", "11.1", "The process of meiosis", "11-1-the-process-of-meiosis"],
  ["bio-inheritance", "12.2", "Characteristics and traits", "12-2-characteristics-and-traits"],
  ["bio-mutation", "14.6", "DNA repair", "14-6-dna-repair"],
  ["bio-evolution", "19.1", "Population evolution", "19-1-population-evolution"],
  ["bio-evolution-evidence", "18.1", "Understanding evolution", "18-1-understanding-evolution"],
  ["bio-population-genetics", "19.2", "Population genetics", "19-2-population-genetics"],
  ["bio-ecosystems", "46.1", "Ecology of ecosystems", "46-1-ecology-of-ecosystems"],
  ["bio-trophic", "46.2", "Energy flow through ecosystems", "46-2-energy-flow-through-ecosystems"],
  [
    "bio-growth",
    "45.3",
    "Environmental limits to population growth",
    "45-3-environmental-limits-to-population-growth",
  ],
  ["bio-evidence", "1.1", "The science of biology", "1-1-the-science-of-biology"],
];
export const sources: CourseBundle["sources"] = sections.map(([id, section, title, slug]) => ({
  id: id!,
  title: title!,
  publisher: "OpenStax, Rice University",
  url: "https://openstax.org/books/biology-2e/pages/" + slug,
  section: section + ", " + title,
  edition: "Biology 2e",
  accessedAt: "2026-10-02",
  reuse: "reference_only",
  licence: "CC BY-NC-SA 4.0 (current web edition); reference only",
  licenceUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  attribution:
    "Mary Ann Clark, Matthew Douglas and Jung Choi, OpenStax, Biology 2e, " + section + ".",
  notes:
    "Standard biological concepts checked against this section. Discere explanations, illustrative observations, problems and SVG models are original. No publisher exercises or illustrations are redistributed.",
}));

export function q(
  prompt: string,
  acceptedIdeas: string[],
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
      acceptedIdeas: [acceptedIdeas[0]!],
      ...(acceptedIdeas.length > 1 ? { acceptedAlternatives: acceptedIdeas.slice(1) } : {}),
      rejectedIdeas: [],
      exampleAnswer,
    },
  };
}
