import type {
  CourseBundle,
  LearningDiagram,
  Question,
} from "../../../packages/contracts/src/index.js";
export interface TeachingLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceId: string;
  beats: Array<{ title: string; text: string; diagram: LearningDiagram }>;
  questions: Array<Omit<Question, "id" | "conceptIds" | "sourceIds">>;
  cards: Array<{ front: string; back: string; answerAuthority: Question["answerAuthority"] }>;
}
export function number(
  prompt: string,
  value: number,
  workedAnswer: string,
  hint: string,
  unit: string,
) {
  return {
    prompt,
    responseType: "numeric" as const,
    difficulty: 1,
    hints: [hint],
    answerAuthority: {
      kind: "numeric" as const,
      value,
      unit,
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer,
    },
  };
}
export function choose(prompt: string, labels: string[], correct: number, hint: string) {
  const answer = labels[correct]!;
  return {
    prompt,
    responseType: "short_text" as const,
    difficulty: 1,
    hints: [hint],
    choices: labels.map((label, index) => ({ id: String.fromCharCode(97 + index), label })),
    answerAuthority: {
      kind: "text" as const,
      acceptedIdeas: [answer],
      rejectedIdeas: [],
      exampleAnswer: answer,
    },
  };
}
export function numericCard(front: string, value: number, back: string, unit: string) {
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
export function termCard(front: string, term: string, back: string) {
  return {
    front,
    back,
    answerAuthority: {
      kind: "text" as const,
      acceptedIdeas: [term],
      rejectedIdeas: [],
      exampleAnswer: back,
    },
  };
}
export function grid(
  event: "sum_equals" | "sum_at_least" | "both_at_most" | "second_at_most",
  value: number,
  givenFirstAtMost?: number,
): LearningDiagram {
  return {
    type: "outcome_grid",
    sides: 6,
    event,
    threshold: {
      min: event.startsWith("sum") ? 2 : 0,
      max: event.startsWith("sum") ? 12 : 6,
      value,
      step: 1,
    },
    ...(givenFirstAtMost === undefined ? {} : { givenFirstAtMost }),
  };
}
export function distribution(values: number[], max = 30, showSpread = false): LearningDiagram {
  return {
    type: "data_distribution",
    values,
    editableIndex: values.length - 1,
    control: { min: 0, max, value: values[values.length - 1]!, step: 1 },
    showSpread,
  };
}
export function population(low = 2, high = 8): LearningDiagram {
  return {
    type: "sampling_population",
    groups: [
      { label: "Morning group", value: low, count: 6 },
      { label: "Evening group", value: high, count: 6 },
    ],
    samples: [
      { id: "morning", label: "Morning only", indices: [0, 1, 2, 3, 4, 5] },
      { id: "mixed", label: "Both groups", indices: [0, 2, 4, 6, 8, 10] },
      { id: "evening", label: "Evening only", indices: [6, 7, 8, 9, 10, 11] },
    ],
    initialSampleId: "morning",
  };
}
export const sources: CourseBundle["sources"] = [
  {
    accessedAt: "2026-10-01",
    reuse: "reference_only",
    id: "psu-probability",
    title: "STAT 414 — Properties of Probability",
    publisher: "Penn State Department of Statistics",
    url: "https://online.stat.psu.edu/stat414/Lesson02",
    section: "Lesson 2, Events and Classical Approach",
    licence: "Copyright Penn State; all rights reserved",
    licenceUrl: "https://www.psu.edu/copyright-information",
    attribution: "Penn State Department of Statistics, STAT 414, Lesson 2.",
    edition: "Live course notes accessed October 2026",
    notes:
      "The publisher's indexed full text verifies finite equally likely sample spaces and complements. Discere wording, dice cases and diagrams are original; values are independently enumerated.",
  },
  {
    accessedAt: "2026-10-01",
    reuse: "reference_only",
    publisher: "MIT OpenCourseWare",
    url: "https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/mit18_05_s22_class03-prep.pdf",
    licence: "CC BY-NC-SA 4.0; reference only, no source material redistributed",
    licenceUrl: "https://ocw.mit.edu/pages/privacy-and-terms-of-use/",
    attribution: "Jeremy Orloff and Jonathan Bloom, MIT 18.05, Class 3 reading, Spring 2022.",
    edition: "Spring 2022",
    id: "mit-conditional",
    title: "Conditional Probability, Independence and Bayes' Theorem",
    section: "Section 2, Conditional Probability, pp. 1–3",
    notes:
      "Definition and restricted-space explanation checked directly in the original course PDF. No PDF prose, figures or exercises copied; the teaching examples are original.",
  },
  {
    accessedAt: "2026-10-01",
    reuse: "reference_only",
    publisher: "MIT OpenCourseWare",
    url: "https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/mit18_05_s22_class03-prep.pdf",
    licence: "CC BY-NC-SA 4.0; reference only, no source material redistributed",
    licenceUrl: "https://ocw.mit.edu/pages/privacy-and-terms-of-use/",
    attribution: "Jeremy Orloff and Jonathan Bloom, MIT 18.05, Class 3 reading, Spring 2022.",
    edition: "Spring 2022",
    id: "mit-independence",
    title: "Conditional Probability, Independence and Bayes' Theorem",
    section: "Section 6, Independence, pp. 6–8",
    notes:
      "Independence and its product criterion checked directly. Distinguish mutually exclusive positive-probability events from independent events; each numerical case is recomputed by finite enumeration.",
  },
  {
    accessedAt: "2026-10-01",
    reuse: "reference_only",
    publisher: "NIST/SEMATECH",
    licence: "US government work; third-party material excluded",
    licenceUrl:
      "https://www.nist.gov/open/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series-publications",
    edition: "Web handbook accessed October 2026",
    id: "nist-location",
    title: "Measures of Location",
    url: "https://www.itl.nist.gov/div898/handbook/eda/section3/eda351.htm",
    section: "1.3.5.1: mean, median and sensitivity to extreme observations",
    attribution: "NIST/SEMATECH e-Handbook of Statistical Methods, section 1.3.5.1.",
    notes: "Definitions checked directly. All teaching datasets and plots are original.",
  },
  {
    accessedAt: "2026-10-01",
    reuse: "reference_only",
    publisher: "NIST/SEMATECH",
    licence: "US government work; third-party material excluded",
    licenceUrl:
      "https://www.nist.gov/open/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series-publications",
    edition: "Web handbook accessed October 2026",
    id: "nist-spread",
    title: "Measures of Scale",
    url: "https://www.itl.nist.gov/div898/handbook/eda/section3/eda356.htm",
    section: "1.3.5.6: range, squared deviations and standard deviation",
    attribution: "NIST/SEMATECH e-Handbook of Statistical Methods, section 1.3.5.6.",
    notes:
      "The handbook's usual unbiased sample variance divides by n−1. This course explicitly describes each finite dataset as the whole population and computes its squared-deviation average using n. No source diagrams copied.",
  },
  {
    accessedAt: "2026-10-01",
    reuse: "reference_only",
    publisher: "Statistics Canada",
    licence: "Statistics Canada Open Licence",
    licenceUrl: "https://www.statcan.gc.ca/en/terms-conditions/open-licence",
    edition: "Statistics: Power from Data!, accessed October 2026",
    attribution: "Statistics Canada, Statistics: Power from Data!, section 3.2.",
    id: "statcan-selection",
    title: "Selection of a sample",
    url: "https://www150.statcan.gc.ca/n1/edu/power-pouvoir/ch13/sample-echantillon/5214900-eng.htm",
    section: "3.2.1 Selection of a sample",
    notes:
      "Definitions of population and sample and the sampling-frame concern checked directly. These original fixed examples are not random draws.",
  },
  {
    accessedAt: "2026-10-01",
    reuse: "reference_only",
    publisher: "Statistics Canada",
    licence: "Statistics Canada Open Licence",
    licenceUrl: "https://www.statcan.gc.ca/en/terms-conditions/open-licence",
    edition: "Statistics: Power from Data!, accessed October 2026",
    attribution: "Statistics Canada, Statistics: Power from Data!, section 3.2.",
    id: "statcan-sampling",
    title: "Probability sampling",
    url: "https://www150.statcan.gc.ca/n1/edu/power-pouvoir/ch13/prob/5214899-eng.htm",
    section: "3.2.2 Probability sampling",
    notes:
      "Known, nonzero selection probabilities do not have to be equal; that distinction is retained in the question and hint.",
  },
  {
    accessedAt: "2026-10-01",
    reuse: "reference_only",
    publisher: "Statistics Canada",
    licence: "Statistics Canada Open Licence",
    licenceUrl: "https://www.statcan.gc.ca/en/terms-conditions/open-licence",
    edition: "Statistics: Power from Data!, accessed October 2026",
    attribution: "Statistics Canada, Statistics: Power from Data!, section 3.2.",
    id: "statcan-nonprob",
    title: "Non-probability sampling",
    url: "https://www150.statcan.gc.ca/n1/edu/power-pouvoir/ch13/nonprob/5214898-eng.htm",
    section: "3.2.3 Non-probability sampling",
    notes:
      "Convenience selection and selection bias checked directly. Agreement with one constructed population mean is not offered as proof of an unbiased method.",
  },
];
