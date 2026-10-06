import type { CourseBundle, Question } from "../../../packages/contracts/src/index.js";
export type Probe = { code: string; expected: number | string | boolean };
export type Example = { label: string; chunks: string[]; watch: string[] };
export type QuestionDraft = Omit<Question, "id" | "conceptIds" | "sourceIds"> & { probe?: Probe };
export interface PythonLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceId: string;
  section: string;
  beats: Array<{ title: string; text: string; examples: Example[] }>;
  questions: QuestionDraft[];
  cards: Array<{
    front: string;
    back: string;
    answerAuthority: Question["answerAuthority"];
    probe?: Probe;
  }>;
}
export const ex = (label: string, chunks: string[], watch: string[]): Example => ({
  label,
  chunks,
  watch,
});
export const pair = (a: Example, b: Example) => [a, b];
export function numeric(
  prompt: string,
  value: number,
  why: string,
  hint: string,
  code: string,
): QuestionDraft {
  return {
    prompt,
    responseType: "numeric",
    difficulty: 1,
    hints: [hint, "Work through the changed input before calculating the requested value."],
    answerAuthority: {
      kind: "numeric",
      value,
      unit: "",
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer: why,
    },
    probe: { code, expected: value },
  };
}
export function choose(
  prompt: string,
  labels: string[],
  correct: number,
  why: string,
  hint: string,
): QuestionDraft {
  return {
    prompt,
    responseType: "short_text",
    difficulty: 1,
    hints: [hint],
    choices: labels.map((label, index) => ({ id: String.fromCharCode(97 + index), label })),
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [labels[correct]!],
      rejectedIdeas: [],
      exampleAnswer: why,
    },
  };
}
export function numberCard(front: string, value: number, back: string, code: string) {
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
    probe: { code, expected: value },
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
const python = (id: string, title: string, file: string, section: string) => ({
  id,
  title,
  section,
  publisher: "Python Software Foundation",
  url: "https://docs.python.org/3.12/" + file,
  edition: "Python 3.12 documentation",
  licence: "Python Software Foundation License Version 2",
  licenceUrl: "https://docs.python.org/3.12/license.html",
  attribution: "Python Software Foundation, Python 3.12 documentation.",
  accessedAt: "2026-10-02",
  reuse: "reference_only" as const,
  notes: "Original Discere examples and exercises; facts checked against this reference.",
});
const numpy = (id: string, title: string, file: string, section: string) => ({
  id,
  title,
  section,
  publisher: "NumPy Developers",
  url: "https://numpy.org/doc/2.3/" + file,
  edition: "NumPy 2.3 documentation",
  licence: "BSD 3-Clause",
  licenceUrl: "https://numpy.org/doc/2.3/license.html",
  attribution: "NumPy Developers, NumPy 2.3 documentation.",
  accessedAt: "2026-10-02",
  reuse: "reference_only" as const,
  notes: "Original Discere arrays and exercises, evaluated with NumPy 2.3.5.",
});
const pandas = (id: string, title: string, file: string, section: string) => ({
  id,
  title,
  section,
  publisher: "pandas development team",
  url: "https://pandas.pydata.org/pandas-docs/version/3.0/" + file,
  edition: "pandas 3.0 documentation",
  licence: "BSD 3-Clause",
  licenceUrl:
    "https://pandas.pydata.org/pandas-docs/version/3.0/getting_started/overview.html#license",
  attribution: "pandas development team, pandas 3.0 documentation.",
  accessedAt: "2026-10-02",
  reuse: "reference_only" as const,
  notes:
    "Original Discere datasets and exercises, evaluated with pandas 3.0.1. Explicit reassignment avoids chained inplace operations.",
});
export const sources: CourseBundle["sources"] = [
  numpy(
    "np-index",
    "NumPy: indexing arrays",
    "user/basics.indexing.html",
    "Basic slicing and views; multidimensional indexing",
  ),
  numpy(
    "np-linspace",
    "NumPy: evenly spaced samples",
    "reference/generated/numpy.linspace.html",
    "num and endpoint parameters",
  ),
  pandas(
    "pd-cow",
    "pandas: Copy-on-Write",
    "user_guide/copy_on_write.html",
    "pandas 3.0 migration; chained assignment and inplace operations on selected columns",
  ),
  pandas(
    "pd-apply",
    "pandas: DataFrame.apply",
    "reference/api/pandas.DataFrame.apply.html",
    "axis=0 columns and axis=1 rows",
  ),
  pandas(
    "pd-basic",
    "pandas: descriptive operations",
    "user_guide/basics.html",
    "Descriptive statistics; describe; unique values; sorting",
  ),
  pandas(
    "pd-merge-api",
    "pandas: merge",
    "reference/api/pandas.merge.html",
    "Warning on matching null keys; how, validate and indicator parameters",
  ),
  python(
    "py-intro",
    "Python: numbers, text and lists",
    "tutorial/introduction.html",
    "3.1: Numbers, text and lists",
  ),
  python(
    "py-types",
    "Python: built-in types",
    "library/stdtypes.html",
    "Numeric types; sequence types; set types; mapping types",
  ),
  python(
    "py-structures",
    "Python: data structures",
    "tutorial/datastructures.html",
    "5.1 lists; 5.3 tuples; 5.4 sets; 5.5 dictionaries",
  ),
  python(
    "py-flow",
    "Python: control flow and functions",
    "tutorial/controlflow.html",
    "4.1 if; 4.2 for; 4.3 range; 4.8 functions; 4.9 function arguments",
  ),
  python(
    "py-errors",
    "Python: errors and exceptions",
    "tutorial/errors.html",
    "8.3 handling exceptions; 8.8 predefined clean-up actions",
  ),
  python(
    "py-modules",
    "Python: modules",
    "tutorial/modules.html",
    "6 modules and import statements; 6.4 packages",
  ),
  numpy(
    "np-quickstart",
    "NumPy quickstart",
    "user/quickstart.html",
    "Array creation; basic operations; shape manipulation",
  ),
  numpy(
    "np-random",
    "NumPy integer sampling",
    "reference/random/generated/numpy.random.Generator.integers.html",
    "low, high, size and endpoint parameters",
  ),
  pandas(
    "pd-intro",
    "pandas: data structures",
    "user_guide/dsintro.html",
    "Series; DataFrame; column selection, addition and deletion",
  ),
  pandas(
    "pd-io",
    "pandas: reading tabular data",
    "user_guide/io.html",
    "CSV and text files; dtype and missing-value parsing; Excel files",
  ),
  pandas(
    "pd-index",
    "pandas: indexing and selecting data",
    "user_guide/indexing.html",
    "Label selection; integer position selection; boolean indexing; setting values",
  ),
  pandas(
    "pd-missing",
    "pandas: missing data",
    "user_guide/missing_data.html",
    "isna; calculations with missing data; filling and dropping missing values",
  ),
  pandas(
    "pd-text",
    "pandas: text data",
    "user_guide/text.html",
    "String methods; splitting and replacing strings",
  ),
  pandas(
    "pd-dates",
    "pandas: dates and times",
    "user_guide/timeseries.html",
    "Converting to timestamps; invalid data; epoch timestamps",
  ),
  pandas(
    "pd-group",
    "pandas: grouping and aggregation",
    "user_guide/groupby.html",
    "Built-in aggregation methods; named aggregation; NA group handling",
  ),
  pandas(
    "pd-merge",
    "pandas: merging and concatenation",
    "user_guide/merging.html",
    "concat; database-style joins; merge validation; indicator",
  ),
  pandas(
    "pd-reshape",
    "pandas: reshaping",
    "user_guide/reshaping.html",
    "pivot and pivot_table; melt",
  ),
  {
    id: "jupyter-cells",
    title: "Jupyter Notebook: running code",
    publisher: "Project Jupyter",
    url: "https://jupyter-notebook.readthedocs.io/en/stable/examples/Notebook/Running%20Code.html",
    licence: "BSD 3-Clause",
    licenceUrl: "https://github.com/jupyter/notebook/blob/main/LICENSE",
    attribution: "Project Jupyter, Notebook documentation.",
    accessedAt: "2026-10-02",
    edition: "Notebook documentation, accessed October 2026",
    section: "Code cells; restarting kernels",
    reuse: "reference_only",
    notes: "Notebook execution-order facts only; all example cells are original.",
  },
];
export const sales =
  "import pandas as pd\ndf = pd.DataFrame({\n    'shop': ['Bay', 'Hill', 'Bay', 'Hill'],\n    'units': [2, 1, 3, 4],\n    'price': [5, 8, 5, 8]\n})";
