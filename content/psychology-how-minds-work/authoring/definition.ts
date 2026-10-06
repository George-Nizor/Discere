import type {
  CourseBundle,
  PsychologyDiagram,
  PsychologyModel,
  Question,
} from "../../../packages/contracts/src/index.js";
import { psychSeededRandom } from "../../../packages/activity-engine/src/psychology.js";

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
  beats: Array<{ title: string; text: string; diagram: PsychologyDiagram }>;
  questions: DraftQuestion[];
  cards: Array<{ front: string; back: string; answerAuthority: Question["answerAuthority"] }>;
}

/** A calculated answer with a three-step hint ladder. Tolerance only where rounding is asked for. */
export function numeric(
  prompt: string,
  value: number,
  workedAnswer: string,
  hints: [string, string, string],
  unit = "",
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

/** A selection marked by the label of its single correct option. */
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

/** A short exact term: the first accepted form is canonical, the rest are alternatives. */
export function word(
  prompt: string,
  accepted: string[],
  exampleAnswer: string,
  hint: string,
  rejected: string[] = [],
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

export function card(front: string, value: number, back: string, unit = "", tolerance = 1e-6) {
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

export function term(front: string, accepted: string[], back: string) {
  return {
    front,
    back,
    answerAuthority: {
      kind: "text" as const,
      acceptedIdeas: [accepted[0]!],
      ...(accepted.length > 1 ? { acceptedAlternatives: accepted.slice(1) } : {}),
      rejectedIdeas: [],
      exampleAnswer: back,
    },
  };
}

type Case = [string, PsychologyModel];
export function beat(title: string, text: string, ...cases: [Case, Case] | [Case, Case, Case]) {
  const ids = ["first", "second", "third"];
  return {
    title,
    text,
    diagram: {
      type: "psychology_explorer" as const,
      cases: cases.map(([label, model], i) => ({ id: ids[i]!, label, model })),
      initialCaseId: "first",
    },
  };
}

const round = (v: number, places = 3) => Math.round(v * 10 ** places) / 10 ** places;

/**
 * Builds points whose Pearson correlation is the target r (before rounding to three decimals):
 * the residual pattern is made orthogonal to x and rescaled, so r is set exactly.
 */
export function correlated(
  n: number,
  r: number,
  x: { mean: number; sd: number },
  y: { mean: number; sd: number },
  seed: number,
  z?: { mean: number; sd: number },
) {
  const random = psychSeededRandom(seed);
  const raw = Array.from({ length: n }, (_, i) => i / (n - 1) - 0.5 + (random() - 0.5) * 0.35);
  const standardise = (values: number[]) => {
    const m = values.reduce((a, b) => a + b, 0) / values.length;
    const s = Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length);
    return values.map((v) => (v - m) / s);
  };
  const zx = standardise(raw);
  const noise = Array.from({ length: n }, () => random() - 0.5);
  const projection = noise.reduce((a, e, i) => a + e * zx[i]!, 0) / n;
  const ze = standardise(noise.map((e, i) => e - projection * zx[i]!));
  const zy = zx.map((v, i) => r * v + Math.sqrt(1 - r * r) * ze[i]!);
  return zx.map((v, i) => ({
    x: round(x.mean + x.sd * v),
    y: round(y.mean + y.sd * zy[i]!),
    ...(z ? { z: round(z.mean + z.sd * ((v + zy[i]!) / 2)) } : {}),
  }));
}

export const scatter = (
  xLabel: string,
  yLabel: string,
  points: Array<{ x: number; y: number; z?: number }>,
  zLabel?: string,
): PsychologyModel => ({ kind: "scatter", xLabel, yLabel, points, ...(zLabel ? { zLabel } : {}) });
export const assignment = (
  traitLabel: string,
  traits: number[],
  method: "random" | "self_selected",
  seed = 7,
): PsychologyModel => ({ kind: "assignment", traitLabel, traits, method, seed });
export const effect = (
  labelA: string,
  meanA: number,
  sdA: number,
  labelB: string,
  meanB: number,
  sdB: number,
  unit = "",
): PsychologyModel => ({ kind: "effect", labelA, labelB, meanA, meanB, sdA, sdB, unit });
export const detection = (
  separation: number,
  criterion: number,
  signalLabel = "Signal",
): PsychologyModel => ({ kind: "detection", separation, criterion, signalLabel });
export const switching = (
  sequence: string,
  baseMs: number,
  switchCostMs: number,
  labelA = "Odd or even",
  labelB = "Vowel or consonant",
): PsychologyModel => ({ kind: "switching", sequence, labelA, labelB, baseMs, switchCostMs });
export const cues = (
  labelA: string,
  meanA: number,
  sdA: number,
  labelB: string,
  meanB: number,
  sdB: number,
  unit = "",
): PsychologyModel => ({ kind: "cues", labelA, labelB, meanA, meanB, sdA, sdB, unit });
export const span = (items: string, chunks: number[], capacity = 4): PsychologyModel => ({
  kind: "span",
  items: items.split(" "),
  chunks,
  capacity,
});
export const forgetting = (
  stability: number,
  horizon: number,
  reviews: number[] = [],
  growth = 1,
): PsychologyModel => ({ kind: "forgetting", stability, reviews, growth, horizon });
export const pairing = (
  rate: number,
  trials: string,
  asymptote = 1,
  cueLabel = "Bell",
  outcomeLabel = "Food",
): PsychologyModel => ({
  kind: "pairing",
  cueLabel,
  outcomeLabel,
  rate,
  asymptote,
  trials: [...trials].map((t) => (t === "P" ? "paired" : "alone")),
});
export const schedule = (
  rule: "fixed_ratio" | "variable_ratio" | "fixed_interval" | "variable_interval",
  requirements: number[],
  responseEvery: number,
  duration: number,
): PsychologyModel => ({ kind: "schedule", rule, requirements, responseEvery, duration });
export const baseRate = (
  population: number,
  rate: number,
  hitRate: number,
  falseAlarmRate: number,
  conditionLabel = "The condition",
  testLabel = "Screening test",
): PsychologyModel => ({
  kind: "base_rate",
  population,
  baseRate: rate,
  hitRate,
  falseAlarmRate,
  conditionLabel,
  testLabel,
});
export const anchor = (
  quantity: string,
  lowAnchor: number,
  lowEstimate: number,
  highAnchor: number,
  highEstimate: number,
  min: number,
  max: number,
): PsychologyModel => ({
  kind: "anchor",
  quantity,
  lowAnchor,
  highAnchor,
  lowEstimate,
  highEstimate,
  min,
  max,
});
export const tally = (
  setting: string,
  count: number,
  total: number,
  countLabel: string,
  restLabel: string,
): PsychologyModel => ({ kind: "tally", setting, count, total, countLabel, restLabel });
export const bystander = (bystanders: number, helpProbability: number): PsychologyModel => ({
  kind: "bystander",
  bystanders,
  helpProbability,
});

const openstax = [
  ["psych-research-why", "2.1", "Why is research important?", "2-1-why-is-research-important"],
  ["psych-research-findings", "2.3", "Analyzing findings", "2-3-analyzing-findings"],
  ["psych-sensation", "5.1", "Sensation versus perception", "5-1-sensation-versus-perception"],
  ["psych-classical", "6.2", "Classical conditioning", "6-2-classical-conditioning"],
  ["psych-operant", "6.3", "Operant conditioning", "6-3-operant-conditioning"],
  ["psych-problem-solving", "7.3", "Problem solving", "7-3-problem-solving"],
  ["psych-memory-functions", "8.1", "How memory functions", "8-1-how-memory-functions"],
  ["psych-memory-problems", "8.3", "Problems with memory", "8-3-problems-with-memory"],
  ["psych-memory-enhance", "8.4", "Ways to enhance memory", "8-4-ways-to-enhance-memory"],
  [
    "psych-conformity",
    "12.4",
    "Conformity, compliance, and obedience",
    "12-4-conformity-compliance-and-obedience",
  ],
  ["psych-aggression", "12.6", "Aggression", "12-6-aggression"],
] as const;

const openstaxSources: CourseBundle["sources"] = openstax.map(([id, section, title, slug]) => ({
  id,
  title,
  publisher: "OpenStax, Rice University",
  url: "https://openstax.org/books/psychology-2e/pages/" + slug,
  section: section + ", " + title,
  edition: "Psychology, second edition (2020)",
  accessedAt: "2026-10-06",
  reuse: "reference_only",
  licence: "CC BY-NC-SA 4.0 (current web edition); reference only",
  licenceUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  attribution:
    "Rose M. Spielman, William J. Jenkins and Marilyn D. Lovett, OpenStax, Psychology 2e, " +
    section +
    ".",
  notes:
    "Definitions and standard findings checked against this section. Discere prose, problems, numbers in worked examples and SVG models are original. No publisher prose, exercises or media are redistributed.",
}));

/** Primary literature used to check specific figures. None of its wording or media is reused. */
const papers: Array<[string, string, string, string, string, string]> = [
  [
    "psych-osc-2015",
    "Estimating the reproducibility of psychological science",
    "Science 349(6251), aac4716",
    "https://doi.org/10.1126/science.aac4716",
    "Open Science Collaboration (2015)",
    "97 of 100 original studies reported significant results; 35 of the 97 replications (36%) were significant, and mean effect sizes roughly halved.",
  ],
  [
    "psych-hagger-2016",
    "A multilab preregistered replication of the ego-depletion effect",
    "Perspectives on Psychological Science 11(4), 546–573",
    "https://doi.org/10.1177/1745691616652873",
    "Hagger, Chatzisarantis and 47 co-authors (2016)",
    "23 laboratories and 2,141 participants; pooled effect d = 0.04, 95% CI −0.07 to 0.15, against d = 0.62 in the 2010 meta-analysis of published studies that motivated it.",
  ],
  [
    "psych-ranehill-2015",
    "Assessing the robustness of power posing",
    "Psychological Science 26(5), 653–656",
    "https://doi.org/10.1177/0956797614553946",
    "Ranehill, Dreber, Johannesson, Leiberg, Sul and Weber (2015)",
    "With 200 participants, power poses did not change testosterone, cortisol or risk taking.",
  ],
  [
    "psych-doyen-2012",
    "Behavioral priming: it's all in the mind, but whose mind?",
    "PLoS ONE 7(1), e29081",
    "https://doi.org/10.1371/journal.pone.0029081",
    "Doyen, Klein, Pichon and Cleeremans (2012)",
    "Infrared-timed walking speed was not slowed by elderly-related words; slowing appeared only when experimenters expected it.",
  ],
  [
    "psych-lehr-1992",
    "Sixteen S-squared over D-squared: a relation for crude sample size estimates",
    "Statistics in Medicine 11(8), 1099–1102",
    "https://doi.org/10.1002/sim.4780110811",
    "Lehr (1992)",
    "About 16/d² participants per group give 80% power for a two-sided test at α = 0.05.",
  ],
  [
    "psych-simons-1999",
    "Gorillas in our midst: sustained inattentional blindness for dynamic events",
    "Perception 28(9), 1059–1074",
    "https://doi.org/10.1068/p281059",
    "Simons and Chabris (1999)",
    "Across conditions, 46% of observers counting passes failed to notice an unexpected person walking through the game.",
  ],
  [
    "psych-monsell-2003",
    "Task switching",
    "Trends in Cognitive Sciences 7(3), 134–140",
    "https://doi.org/10.1016/S1364-6613(03)00028-7",
    "Monsell (2003)",
    "Switching between tasks lengthens responses compared with repeating a task; preparation reduces but does not remove the cost.",
  ],
  [
    "psych-watson-2010",
    "Supertaskers: profile and analysis of extraordinary multitasking ability",
    "Psychonomic Bulletin and Review 17(4), 479–485",
    "https://doi.org/10.3758/PBR.17.4.479",
    "Watson and Strayer (2010)",
    "Of 200 participants driving a simulator while doing a demanding verbal task, 5 (2.5%) showed no dual-task cost.",
  ],
  [
    "psych-ernst-2002",
    "Humans integrate visual and haptic information in a statistically optimal fashion",
    "Nature 415, 429–433",
    "https://doi.org/10.1038/415429a",
    "Ernst and Banks (2002)",
    "Visual and touch estimates of height are combined with weights close to their relative reliabilities.",
  ],
  [
    "psych-cowan-2001",
    "The magical number 4 in short-term memory",
    "Behavioral and Brain Sciences 24(1), 87–114",
    "https://doi.org/10.1017/S0140525X01003922",
    "Cowan (2001)",
    "When rehearsal and chunking are controlled, adults hold about three to five chunks.",
  ],
  [
    "psych-chase-1973",
    "Perception in chess",
    "Cognitive Psychology 4(1), 55–81",
    "https://doi.org/10.1016/0010-0285(73)90004-2",
    "Chase and Simon (1973)",
    "A master recalled real game positions far better than weaker players, grouping pieces into meaningful chunks; the advantage vanished for randomly placed pieces.",
  ],
  [
    "psych-baddeley-1966",
    "Short-term memory for word sequences as a function of acoustic, semantic and formal similarity",
    "Quarterly Journal of Experimental Psychology 18(4), 362–365",
    "https://doi.org/10.1080/14640746608400055",
    "Baddeley (1966)",
    "Immediate serial recall is much poorer for lists of similar-sounding words than for dissimilar words, while similarity of meaning matters little.",
  ],
  [
    "psych-murre-2015",
    "Replication and analysis of Ebbinghaus' forgetting curve",
    "PLoS ONE 10(7), e0120644",
    "https://doi.org/10.1371/journal.pone.0120644",
    "Murre and Dros (2015)",
    "A single-participant replication of Ebbinghaus's savings method reproduced his steep early loss and slower later decline, with savings of 0.58 after 20 minutes and 0.44 after an hour, and a bump above the fitted curve at one day.",
  ],
  [
    "psych-roediger-2006",
    "Test-enhanced learning: taking memory tests improves long-term retention",
    "Psychological Science 17(3), 249–255",
    "https://doi.org/10.1111/j.1467-9280.2006.01693.x",
    "Roediger and Karpicke (2006)",
    "Experiment 1: after five minutes restudying led (81% versus 75%); after one week testing led (56% versus 42%).",
  ],
  [
    "psych-fsrs",
    "ts-fsrs 5.4.1, the FSRS scheduler used by Discere",
    "Package source, forgetting_curve and default parameters",
    "https://github.com/open-spaced-repetition/ts-fsrs",
    "Open Spaced Repetition contributors",
    "Stability is the interval at which predicted recall falls to 90%; the default requested retention is 0.9; version 5.4.1 defaults to the FSRS-6 decay of 0.1542.",
  ],
  [
    "psych-rescorla-1972",
    "A theory of Pavlovian conditioning",
    "In Black and Prokasy (eds), Classical Conditioning II, 64–99",
    "https://www.scholarpedia.org/article/Rescorla-Wagner_model",
    "Rescorla and Wagner (1972)",
    "Associative strength changes on each trial by a learning rate times the gap between the outcome's maximum and current strength.",
  ],
  [
    "psych-tversky-1974",
    "Judgment under uncertainty: heuristics and biases",
    "Science 185(4157), 1124–1131",
    "https://doi.org/10.1126/science.185.4157.1124",
    "Tversky and Kahneman (1974)",
    "After a wheel stopped on 10 or 65, median estimates of the share of African countries in the UN were 25 and 45; base rates are neglected when individuating information is given.",
  ],
  [
    "psych-jacowitz-1995",
    "Measures of anchoring in estimation tasks",
    "Personality and Social Psychology Bulletin 21(11), 1161–1166",
    "https://doi.org/10.1177/01461672952111004",
    "Jacowitz and Kahneman (1995)",
    "Defines the anchoring index as the difference between high- and low-anchor median estimates divided by the difference between the anchors.",
  ],
  [
    "psych-frederick-2005",
    "Cognitive reflection and decision making",
    "Journal of Economic Perspectives 19(4), 25–42",
    "https://doi.org/10.1257/089533005775196732",
    "Frederick (2005)",
    "The cognitive reflection test uses problems whose fast intuitive answer is wrong, such as the bat-and-ball problem.",
  ],
  [
    "psych-asch-1956",
    "Studies of independence and conformity: a minority of one against a unanimous majority",
    "Psychological Monographs 70(9), 1–70",
    "https://doi.org/10.1037/h0093718",
    "Asch (1956)",
    "Alone, judges erred on under 1% of line judgements; facing a unanimous wrong majority, about a third of critical answers conformed, about three quarters of people conformed at least once and about a quarter never did.",
  ],
  [
    "psych-milgram-1963",
    "Behavioral study of obedience",
    "Journal of Abnormal and Social Psychology 67(4), 371–378",
    "https://doi.org/10.1037/h0040525",
    "Milgram (1963)",
    "26 of 40 participants continued to the 450-volt switch.",
  ],
  [
    "psych-burger-2009",
    "Replicating Milgram: would people still obey today?",
    "American Psychologist 64(1), 1–11",
    "https://doi.org/10.1037/a0010932",
    "Burger (2009)",
    "Stopping at 150 volts for ethical reasons, 70% of participants were willing to continue, against 82.5% in Milgram's comparable condition.",
  ],
  [
    "psych-perry-2013",
    "Behind the shock machine: the untold story of the notorious Milgram psychology experiments",
    "The New Press, 2013",
    "https://thenewpress.com/books/behind-shock-machine",
    "Perry (2013)",
    "Archival recordings show departures from the script and many participants who doubted the shocks were real.",
  ],
  [
    "psych-darley-1968",
    "Bystander intervention in emergencies: diffusion of responsibility",
    "Journal of Personality and Social Psychology 8(4), 377–383",
    "https://doi.org/10.1037/h0025589",
    "Darley and Latané (1968)",
    "85% of participants who believed they alone heard a seizure helped before it ended, against 31% of those who believed four others heard it.",
  ],
  [
    "psych-manning-2007",
    "The Kitty Genovese murder and the social psychology of helping: the parable of the 38 witnesses",
    "American Psychologist 62(6), 555–562",
    "https://doi.org/10.1037/0003-066X.62.6.555",
    "Manning, Levine and Collins (2007)",
    "The story of 38 inactive witnesses is not supported by the trial evidence.",
  ],
  [
    "psych-philpot-2020",
    "Would I be helped? Cross-national CCTV footage shows that intervention is the norm in public conflicts",
    "American Psychologist 75(1), 66–75",
    "https://doi.org/10.1037/amp0000469",
    "Philpot, Liebst, Levine, Bernasco and Lindegaard (2020)",
    "In 219 recorded public conflicts in three cities, at least one bystander intervened in 91%, and more bystanders made intervention more likely.",
  ],
  [
    "psych-fischer-2011",
    "The bystander-effect: a meta-analytic review on bystander intervention in dangerous and non-dangerous emergencies",
    "Psychological Bulletin 137(4), 517–537",
    "https://doi.org/10.1037/a0023304",
    "Fischer and colleagues (2011)",
    "The bystander effect is reliable on average but weaker in clearly dangerous emergencies.",
  ],
];

const paperSources: CourseBundle["sources"] = papers.map(
  ([id, title, section, url, attribution, claim]) => ({
    id,
    title,
    publisher: attribution,
    url,
    section,
    edition: id === "psych-fsrs" ? "Version 5.4.1" : "Published version of record",
    accessedAt: "2026-10-06",
    reuse: "reference_only",
    licence:
      id === "psych-murre-2015" || id === "psych-doyen-2012"
        ? "Creative Commons Attribution License, as stated on the PLOS ONE article; used for fact checking only"
        : id === "psych-fsrs"
          ? "MIT licence (software); used for fact checking only"
          : "All rights reserved by the publisher; reference only",
    licenceUrl:
      id === "psych-murre-2015" || id === "psych-doyen-2012"
        ? "https://journals.plos.org/plosone/s/licenses-and-copyright"
        : id === "psych-fsrs"
          ? "https://github.com/open-spaced-repetition/ts-fsrs/blob/main/LICENSE"
          : url,
    attribution: attribution + ", " + title + ", " + section + ".",
    notes:
      "Checked figure: " +
      claim +
      " Discere states the figure in its own words; no text, tables or figures are reproduced.",
  }),
);

export const sources: CourseBundle["sources"] = [...openstaxSources, ...paperSources];
