import type {
  CourseBundle,
  PhilosophyDiagram,
  PhilosophyModel,
  Question,
} from "../../../packages/contracts/src/index.js";

export type DraftQuestion = Omit<Question, "id" | "conceptIds" | "sourceIds">;
type Card = { front: string; back: string; answerAuthority: Question["answerAuthority"] };
export interface TeachingLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceIds: string[];
  beats: Array<{ title: string; text: string; diagram: PhilosophyDiagram }>;
  questions: DraftQuestion[];
  cards: Card[];
}

/* ------------------------------------------------------------ question kinds */

export function numeric(
  prompt: string,
  value: number,
  workedAnswer: string,
  hints: [string, string, string],
  unit = "",
  absoluteTolerance = 1e-6,
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
      absoluteTolerance,
      relativeTolerance: 0,
      workedAnswer,
    },
  };
}
/** A short exact answer: a name, a position, a verdict. Alternatives are other spellings or names. */
export function word(
  prompt: string,
  accepted: string,
  alternatives: string[],
  exampleAnswer: string,
  hints: string[],
  rejectedIdeas: string[] = [],
): DraftQuestion {
  return {
    prompt,
    responseType: "short_text",
    difficulty: 1,
    hints,
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [accepted],
      ...(alternatives.length ? { acceptedAlternatives: alternatives } : {}),
      rejectedIdeas,
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
export function cardNumber(front: string, value: number, back: string, unit = ""): Card {
  return {
    front,
    back,
    answerAuthority: {
      kind: "numeric",
      value,
      unit,
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer: back,
    },
  };
}
export function cardWord(
  front: string,
  accepted: string,
  alternatives: string[],
  back: string,
  rejectedIdeas: string[] = [],
): Card {
  return {
    front,
    back,
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [accepted],
      ...(alternatives.length ? { acceptedAlternatives: alternatives } : {}),
      rejectedIdeas,
      exampleAnswer: back,
    },
  };
}
export function beat(
  title: string,
  text: string,
  ...cases: Array<[string, PhilosophyModel]>
): TeachingLesson["beats"][number] {
  return {
    title,
    text,
    diagram: {
      type: "philosophy_explorer",
      cases: cases.map(([label, model], i) => ({
        id: ["first", "second", "third"][i]!,
        label,
        model,
      })),
      initialCaseId: "first",
    },
  };
}

/* ------------------------------------------------------------------ models */

type Of<K extends PhilosophyModel["kind"]> = Extract<PhilosophyModel, { kind: K }>;
type Claim = string | [string, string];
const claim = (c: Claim) => (typeof c === "string" ? { text: c } : { text: c[0], formula: c[1] });

/** An argument map. Pass [text, formula] pairs and atoms to make it testable by truth table. */
export function argument(
  premises: Claim[],
  conclusion: Claim,
  options: {
    passage?: string;
    atoms?: Array<["p" | "q" | "r" | "s", string]>;
    unstated?: number[];
  } = {},
): PhilosophyModel {
  return {
    kind: "argument_map",
    ...(options.passage ? { passage: options.passage } : {}),
    premises: premises.map((p, i) => ({
      ...claim(p),
      ...(options.unstated?.includes(i) ? { unstated: true } : {}),
    })),
    conclusion: claim(conclusion),
    ...(options.atoms
      ? { atoms: options.atoms.map(([symbol, meaning]) => ({ symbol, meaning })) }
      : {}),
  };
}
export const bayes = (
  population: number,
  prior: number,
  hitRate: number,
  falseAlarmRate: number,
  hypothesis = "have the condition",
  evidence = "test positive",
): PhilosophyModel => ({
  kind: "bayes_grid",
  population,
  hypothesis,
  evidence,
  prior,
  hitRate,
  falseAlarmRate,
});
export const knowledge = (
  subject: string,
  belief: string,
  evidence: string,
  fact: string,
  flags: {
    believes?: boolean;
    justified?: boolean;
    beliefTrue?: boolean;
    evidenceConnected: boolean;
  },
): PhilosophyModel => ({
  kind: "knowledge_case",
  subject,
  belief,
  evidence,
  fact,
  believes: flags.believes ?? true,
  justified: flags.justified ?? true,
  beliefTrue: flags.beliefTrue ?? true,
  evidenceConnected: flags.evidenceConnected,
});
/** Ned Block's drinks machine: a drink costs 20p and the machine takes 10p and 20p coins. */
export const drinksMachine = (realiser: Of<"machine_table">["realiser"]): PhilosophyModel => ({
  kind: "machine_table",
  title: "Drinks machine, 20p a can",
  realiser,
  states: [
    { id: "S0", label: "Nothing owed" },
    { id: "S1", label: "10p credited" },
  ],
  inputs: ["10p", "20p"],
  transitions: [
    { from: "S0", input: "10p", to: "S1", output: "" },
    { from: "S0", input: "20p", to: "S0", output: "can" },
    { from: "S1", input: "10p", to: "S0", output: "can" },
    { from: "S1", input: "20p", to: "S0", output: "can + 10p" },
  ],
  start: "S0",
});
/** Searle's room, using his own placeholder names for the symbols. */
export const chineseRoom = (realiser: Of<"machine_table">["realiser"]): PhilosophyModel => ({
  kind: "machine_table",
  title: "Searle's room",
  realiser,
  states: [
    { id: "W", label: "Waiting" },
    { id: "C", label: "Mid-conversation" },
  ],
  inputs: ["squiggle", "squoggle"],
  transitions: [
    { from: "W", input: "squiggle", to: "C", output: "squoggle squoggle" },
    { from: "W", input: "squoggle", to: "W", output: "squiggle" },
    { from: "C", input: "squiggle", to: "C", output: "squiggle squoggle" },
    { from: "C", input: "squoggle", to: "W", output: "squiggle" },
  ],
  start: "W",
});
export const persistence = (
  scenario: Of<"persistence">["scenario"],
  stages: Array<[string, string, number, number?]>,
  links: Array<[string, string, "memory" | "body"]>,
): PhilosophyModel => ({
  kind: "persistence",
  scenario,
  stages: stages.map(([id, label, column, row]) => ({ id, label, column, row: row ?? 0 })),
  links: links.map(([from, to, relation]) => ({ from, to, relation })),
});
export const trolley = (
  variant: Of<"trolley">["variant"],
  ahead: number,
  other = 1,
): PhilosophyModel => ({ kind: "trolley", variant, ahead, other });
export const prospects = (
  unit: string,
  ...options: Array<[string, Array<[string, number, number]>]>
): PhilosophyModel => ({
  kind: "expected_utility",
  unit,
  options: options.map(([label, outcomes]) => ({
    label,
    outcomes: outcomes.map(([outcome, probability, value]) => ({
      label: outcome,
      probability,
      value,
    })),
  })),
});
export const veil = (
  unit: string,
  positions: string[],
  societies: Array<[string, number[]]>,
  shares?: number[],
): PhilosophyModel => ({
  kind: "veil",
  unit,
  positions,
  ...(shares ? { shares } : {}),
  societies: societies.map(([label, values]) => ({ label, values })),
});
export const mean = (
  sphere: string,
  [deficiency, virtue, excess]: [string, string, string],
  scale: string,
  [low, high]: [number, number],
  agent: string,
  band: [number, number],
): PhilosophyModel => ({
  kind: "mean",
  sphere,
  deficiency,
  virtue,
  excess,
  scale,
  low,
  high,
  agent,
  band,
});

/* ----------------------------------------------------------------- sources */

const accessedAt = "2026-10-06";
const openstax = (id: string, section: string, title: string, slug: string, claimText: string) => ({
  id,
  title: "Introduction to Philosophy, " + section + " " + title,
  publisher: "OpenStax, Rice University",
  url: "https://openstax.org/books/introduction-philosophy/pages/" + slug,
  section: section + ", " + title,
  edition: "Introduction to Philosophy, first edition (web)",
  accessedAt,
  reuse: "reference_only" as const,
  licence: "CC BY-NC-SA 4.0; reference only",
  licenceUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  attribution:
    "Nathan Smith (senior contributing author) and contributors, OpenStax, Introduction to Philosophy, " +
    section +
    ".",
  notes:
    claimText +
    " The book's preface states CC BY-NC-SA 4.0, not CC BY, so it is used to check facts only. Discere prose, examples, problems and diagrams are original.",
});
const forallx = (chapter: number, section: string) => ({
  id: "forallx-ch" + chapter,
  title: "forall x: Calgary, chapter " + chapter,
  publisher: "Open Logic Project",
  url: "https://forallx.openlogicproject.org/html/Ch" + chapter + ".html",
  section,
  edition: "Fall 2025 web edition",
  accessedAt,
  reuse: "adaptable" as const,
  licence: "CC BY 4.0",
  licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
  attribution:
    "P. D. Magnus, Tim Button, Robert Trueman and Richard Zach, with Aaron Thomas-Bolduc, forall x: Calgary.",
  notes:
    "Definitions of argument, validity, soundness and truth-table testing checked against this chapter. Discere examples and diagrams are original.",
});
const sep = (slug: string, title: string, authors: string, claimText: string) => ({
  id: "sep-" + slug,
  title: "Stanford Encyclopedia of Philosophy: " + title,
  publisher: "Metaphysics Research Lab, Stanford University",
  url: "https://plato.stanford.edu/entries/" + slug + "/",
  section: "Entry '" + title + "'",
  edition: "Current online revision",
  accessedAt,
  reuse: "reference_only" as const,
  licence: "Copyright retained by the entry authors; reference only under the SEP's stated terms",
  licenceUrl: "https://plato.stanford.edu/info.html",
  attribution: authors + ", '" + title + "', Stanford Encyclopedia of Philosophy.",
  notes:
    claimText +
    " Consulted as a research reference only. No SEP wording, examples or structure are reproduced.",
});
const primary = (
  id: string,
  title: string,
  ebook: number,
  section: string,
  attribution: string,
  claimText: string,
) => ({
  id,
  title,
  publisher: "Project Gutenberg",
  url: "https://www.gutenberg.org/ebooks/" + ebook,
  section,
  edition: "Project Gutenberg eBook #" + ebook,
  accessedAt,
  reuse: "adaptable" as const,
  licence: "Public domain",
  licenceUrl: "https://www.gutenberg.org/policy/permission.html",
  attribution,
  notes:
    claimText +
    " Public domain in the United States according to the Project Gutenberg record. Short phrases are quoted with attribution; the rest is Discere paraphrase.",
});

export const sources: CourseBundle["sources"] = [
  forallx(1, "Chapter 1, Arguments: premises, conclusions and indicator words"),
  forallx(2, "Chapter 2, The scope of logic: validity, soundness and counterexamples"),
  forallx(11, "Chapter 11, Complete truth tables"),
  forallx(12, "Chapter 12, Semantic concepts: validity tested by truth tables"),
  openstax(
    "os-arguments",
    "5.3",
    "Arguments",
    "5-3-arguments",
    "Premises, conclusions and indicator words.",
  ),
  openstax(
    "os-inferences",
    "5.4",
    "Types of Inferences",
    "5-4-types-of-inferences",
    "Deductive validity and inductive support.",
  ),
  openstax(
    "os-fallacies",
    "5.5",
    "Informal Fallacies",
    "5-5-informal-fallacies",
    "Ad hominem, straw man, begging the question and false dichotomy.",
  ),
  openstax(
    "os-knowledge",
    "7.2",
    "Knowledge",
    "7-2-knowledge",
    "The justified-true-belief analysis and Gettier cases.",
  ),
  openstax(
    "os-skepticism",
    "7.4",
    "Skepticism",
    "7-4-skepticism",
    "Dream and evil-demon arguments, Moore's reply.",
  ),
  openstax(
    "os-self",
    "6.2",
    "Self and Identity",
    "6-2-self-and-identity",
    "Substance dualism, physicalism and Locke on personal identity.",
  ),
  openstax(
    "os-consequentialism",
    "9.2",
    "Consequentialism",
    "9-2-consequentialism",
    "Bentham, Mill and Foot's trolley problem.",
  ),
  openstax(
    "os-deontology",
    "9.3",
    "Deontology",
    "9-3-deontology",
    "Kant's universal-law and humanity formulations.",
  ),
  openstax(
    "os-virtue",
    "9.4",
    "Virtue Ethics",
    "9-4-virtue-ethics",
    "Aristotle's mean between vices of deficiency and excess.",
  ),
  openstax(
    "os-legitimacy",
    "11.3",
    "Political Legitimacy and Duty",
    "11-3-political-legitimacy-and-duty",
    "Hobbes's state of nature and Locke's consent.",
  ),
  sep(
    "knowledge-analysis",
    "The Analysis of Knowledge",
    "Jonathan Jenkins Ichikawa and Matthias Steup",
    "Gettier's 1963 cases, no-false-lemmas and fake barns.",
  ),
  sep(
    "closure-epistemic",
    "Epistemic Closure",
    "Steven Luper",
    "The closure principle and Dretske's and Nozick's denials of it.",
  ),
  sep(
    "epistemology-bayesian",
    "Bayesian Epistemology",
    "Hanti Lin",
    "Conditionalisation, Bayes' theorem and base rates.",
  ),
  sep(
    "dualism",
    "Dualism",
    "Howard Robinson and Ralph Weir",
    "Substance and property dualism; Elisabeth's interaction objection.",
  ),
  sep(
    "functionalism",
    "Functionalism",
    "Janet Levin",
    "Machine-table functionalism and multiple realisation.",
  ),
  sep(
    "chinese-room",
    "The Chinese Room Argument",
    "David Cole",
    "Searle's 1980 argument against strong AI and the systems reply.",
  ),
  sep(
    "identity-personal",
    "Personal Identity",
    "Eric T. Olson",
    "Memory criteria, Reid's brave officer, fission and Parfit.",
  ),
  sep(
    "consequentialism",
    "Consequentialism",
    "Walter Sinnott-Armstrong",
    "Aggregation and expected-value forms of consequentialism.",
  ),
  sep(
    "kant-moral",
    "Kant's Moral Philosophy",
    "Robert Johnson and Adam Cureton",
    "Hypothetical and categorical imperatives and their formulations.",
  ),
  sep(
    "double-effect",
    "Doctrine of Double Effect",
    "Alison McIntyre",
    "Intended means versus foreseen side effects; trolley variants.",
  ),
  sep(
    "aristotle-ethics",
    "Aristotle's Ethics",
    "Richard Kraut",
    "Eudaimonia, habituation, the mean and practical wisdom.",
  ),
  sep(
    "original-position",
    "Original Position",
    "Samuel Freeman",
    "Rawls's veil of ignorance and the maximin rule.",
  ),
  primary(
    "descartes-meditations",
    "René Descartes, Six Metaphysical Meditations (tr. William Molyneux, 1680)",
    70091,
    "Meditations I, II and VI",
    "René Descartes, Meditations on First Philosophy, translated by William Molyneux.",
    "The dream and demon doubts, the certainty of one's own existence, and the distinctness of mind and body.",
  ),
  primary(
    "locke-essay",
    "John Locke, An Essay Concerning Human Understanding, Volume 1",
    10615,
    "Book II, chapter XXVII, Of Identity and Diversity",
    "John Locke, An Essay Concerning Human Understanding, second edition.",
    "Personal identity reaches as far as consciousness extends backwards.",
  ),
  primary(
    "hobbes-leviathan",
    "Thomas Hobbes, Leviathan",
    3207,
    "Part I, chapter XIII",
    "Thomas Hobbes, Leviathan (1651).",
    "The state of nature as a war of every man against every man.",
  ),
  primary(
    "kant-groundwork",
    "Immanuel Kant, Fundamental Principles of the Metaphysic of Morals (tr. T. K. Abbott)",
    5682,
    "First and second sections",
    "Immanuel Kant, Groundwork of the Metaphysics of Morals, translated by Thomas Kingsmill Abbott.",
    "The false-promise example and the universal-law and humanity formulations.",
  ),
  primary(
    "mill-utilitarianism",
    "John Stuart Mill, Utilitarianism",
    11224,
    "Chapter II",
    "John Stuart Mill, Utilitarianism (1861).",
    "The greatest happiness principle and higher pleasures.",
  ),
  primary(
    "aristotle-ethics-text",
    "Aristotle, The Nicomachean Ethics",
    8438,
    "Book II, chapters 6 and 7",
    "Aristotle, Nicomachean Ethics, Everyman translation as released by Project Gutenberg.",
    "Virtue as a mean relative to us, with the example of Milo and six minae of food.",
  ),
];
