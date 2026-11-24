import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import {
  type CourseBundle,
  ORDER_ANSWER_IDEA,
  type Question,
  SORT_ANSWER_IDEA,
} from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Macroeconomics: How Economies Grow, Slow and Recover asks a learner to read evidence and judge a
 * decision (which row of a release answers this question, is this inflation demand or cost, has the
 * rate rise worked yet, is this deficit large), and never to type a computed figure. So this file
 * checks that no question takes a typed number and that no choice question offers bare figures to
 * calculate. It then recomputes every figure the lessons, figures and questions rest on: the growth
 * rows of the ABS release and what they imply for population and hours, the labour force rates and
 * their confidence intervals, the CPI weights and the trimmed mean drawn in a figure, the pay and
 * pension cases, the island banks' balance sheets, the corridor around the cash rate, the seven
 * decisions of 2026 and their votes, the quarterly GDP series, the Budget table, the multiplier
 * rounds, the balance of payments entries, the productivity indexes and compounding, and the forecast
 * revisions. The real figures come from the table rows and lines of the ABS, Budget and RBA sources
 * copied into the fixture. It also checks the shape of the questions (each lesson asked, end checks,
 * option lengths, feedback on wrong options, hints), finds each quoted extract word for word in the
 * source pack, and finds the pack's own words behind the claims the lessons state.
 */
type FigureBlock =
  | "absGdp"
  | "absLabour"
  | "absLabourCi"
  | "absCpi"
  | "budget"
  | "smp"
  | "rbaTarget"
  | "island"
  | "mfp"
  | "decisions";
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const bundle = JSON.parse(read("../../../content/macroeconomics/bundle.json")) as CourseBundle;
const accounting = JSON.parse(read("../../../content/accounting/bundle.json")) as CourseBundle;
const personalFinance = JSON.parse(
  read("../../../content/personal-finance/bundle.json"),
) as CourseBundle;
const corporateFinance = JSON.parse(
  read("../../../content/corporate-finance/bundle.json"),
) as CourseBundle;
const fixture = JSON.parse(read("./fixtures/macroeconomics-passages.json")) as {
  files: Record<string, string[]>;
  statementSections: Record<string, string[]>;
  figures: Record<FigureBlock, string[]>;
};
const questions = new Map(bundle.questions.map((item) => [item.id, item]));
const question = (id: string): Question => {
  const found = questions.get(`mac-${id}`);
  if (!found) throw new Error(`No question ${id}`);
  return found;
};
const kind = (item: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  item.responseType === "numeric" || item.answerAuthority.kind === "numeric"
    ? "numeric"
    : item.responseType === "order" || item.responseType === "sort"
      ? item.responseType
      : item.choices
        ? "choice"
        : "typed";
const stepQuestionIds = (lesson: CourseBundle["lessons"][number]) =>
  lesson.steps.flatMap((step) => [
    step.checkQuestionId,
    ...(step.workedSteps ?? []).flatMap((line) => [
      line.blank?.questionId ?? "",
      line.selfExplain?.questionId ?? "",
    ]),
  ]);
const ownIds = (lesson: CourseBundle["lessons"][number]) =>
  new Set(
    [lesson.intro?.hook.questionId ?? "", ...lesson.questionIds, ...stepQuestionIds(lesson)].filter(
      Boolean,
    ),
  );
const choiceQuestions = bundle.questions.filter(
  (item) =>
    item.choices &&
    item.choices.length >= 3 &&
    item.answerAuthority.kind === "text" &&
    !item.order &&
    !item.sort,
);
const rightIndex = (item: Question) => {
  const authority = item.answerAuthority;
  if (authority.kind !== "text") throw new Error(item.id);
  const found = (item.choices ?? []).flatMap((choice, index) =>
    assessTextAnswer(choice.label, authority).correct ? [index] : [],
  );
  expect(found, item.id).toHaveLength(1);
  return found[0] as number;
};
const labels = (id: string) => (question(id).choices ?? []).map((choice) => choice.label);
const rightLabel = (id: string) => labels(id)[rightIndex(question(id))] as string;
const squash = (text: string) =>
  text
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/‑/gu, "-")
    .replace(/\s+/gu, " ")
    .trim();
const everything = JSON.stringify({
  lessons: bundle.lessons,
  questions: bundle.questions,
  flashcards: bundle.flashcards,
});
/** The course says this, in a lesson, a question or a card. */
const stated = (fragment: string) => expect(everything, fragment).toContain(fragment);
const lessonOf = (id: string) => {
  const found = bundle.lessons.find((lesson) => lesson.id === id);
  if (!found) throw new Error(`No lesson ${id}`);
  return found;
};
const lessonText = (id: string) => JSON.stringify(lessonOf(id));
const stateIn = (lessonId: string, fragment: string) =>
  expect(lessonText(lessonId), `${lessonId}: ${fragment}`).toContain(fragment);
/** A lesson's own text, its questions and its cards */
const inLesson = (lessonId: string) => {
  const lesson = lessonOf(lessonId);
  const own = ownIds(lesson);
  const cards = new Set(lesson.flashcardIds);
  return JSON.stringify([
    lesson,
    bundle.questions.filter((item) => own.has(item.id)),
    bundle.flashcards.filter((card) => cards.has(card.id)),
  ]);
};
const figureCases = (lessonId: string, stepId: string) => {
  const step = lessonOf(lessonId).steps.find((item) => item.id === stepId);
  const diagram = step?.diagram as { cases?: Array<{ id: string; svg?: string }> } | undefined;
  if (!diagram?.cases) throw new Error(`No figure ${stepId}`);
  return diagram.cases.map((item) => ({ id: item.id, svg: item.svg ?? "" }));
};
const figureSvg = (lessonId: string, stepId: string, caseId: string) => {
  const found = figureCases(lessonId, stepId).find((item) => item.id === caseId);
  if (!found) throw new Error(`No figure ${stepId} ${caseId}`);
  return found.svg;
};
/** The words a figure prints, in order */
const figureWords = (lessonId: string, stepId: string, caseId: string) =>
  [...figureSvg(lessonId, stepId, caseId).matchAll(/<text[^>]*>([^<]*)<\/text>/gu)].map((match) =>
    (match[1] as string).trim(),
  );

// The arithmetic of the course
const round = (value: number, places = 0) => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};
const within = (value: number, target: number, tolerance: number, note = "") =>
  expect(Math.abs(value - target), `${note} ${value} against ${target}`).toBeLessThanOrEqual(
    tolerance,
  );
const pct = (part: number, whole: number) => (100 * part) / whole;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

// Figures read from the lines copied from the pack, so a figure in the fixture and a figure in the
// course cannot drift apart without a test failing.
const cells = (line: string) =>
  line
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
/** A figure in a table cell: a dash is nil, a bracketed figure is a previous forecast */
const cellNumber = (cell: string) => {
  if (cell === "-") return 0;
  const found = /^\(?(-?[\d,]+(?:\.\d+)?)\)?%?(?: pts)?$/u.exec(cell);
  return found ? Number((found[1] as string).replace(/,/gu, "")) : Number.NaN;
};
const numbersOf = (line: string) =>
  cells(line)
    .map(cellNumber)
    .filter((value) => !Number.isNaN(value));
/** The nth line of a block that starts with a label, as the numbers it holds */
const rowOf = (block: FigureBlock, label: string, nth = 0) => {
  const hits = fixture.figures[block].filter((line) => line.startsWith(label));
  const line = hits[nth];
  if (!line) throw new Error(`${block}: no line ${nth} starting ${label}`);
  return numbersOf(line);
};
/** A budget row: "Gross debt(c) 928.6 982.0 ..." */
const budgetRow = (label: string) => {
  const line = fixture.figures.budget.find((item) => item.startsWith(label));
  if (!line) throw new Error(`budget: no ${label}`);
  return [...line.slice(label.length).matchAll(/-?[\d,]+(?:\.\d+)?/gu)].map((match) =>
    Number(match[0].replace(/,/gu, "")),
  );
};
/** The rows of a table of months: "| Oct-26 | 4.8 | 4.9" */
const monthRows = (block: FigureBlock, from: number, to: number) =>
  fixture.figures[block]
    .filter((line) => /^\| [A-Z][a-z]{2}-\d\d \|/u.test(line))
    .slice(from, to)
    .map((line) => ({
      month: cells(line)[0] as string,
      values: numbersOf(cells(line).slice(1).join("|")),
    }));
const monthRow = (block: FigureBlock, month: string, nth = 0) => {
  const hits = fixture.figures[block].filter((line) => line.startsWith(`| ${month} |`));
  const line = hits[nth];
  if (!line) throw new Error(`${block}: no ${month}`);
  return cells(line).slice(1).map(cellNumber);
};
/** The seven decisions of 2026 as the statements give them */
const decisions = fixture.figures.decisions.map((line) => {
  const [date, decision, vote, closing] = line.split(" | ") as [string, string, string, string];
  const target = Number(
    /to ([\d.]+) per cent/u.exec(decision)?.[1] ?? /at ([\d.]+) per cent/u.exec(decision)?.[1],
  );
  const held = decision.includes("leave");
  const counts = [...vote.matchAll(/(\w+) members? voted/gu)].map((match) => match[1] as string);
  return {
    date,
    target,
    held,
    vote,
    unanimous: vote.includes("unanimous"),
    counts,
    furtherRise: closing === "further rise named",
  };
});
const WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

describe("questions in Macroeconomics: How Economies Grow, Slow and Recover", () => {
  it("asks every question and every card from a lesson, and every id exists", () => {
    const asked = new Set(bundle.lessons.flatMap((lesson) => [...ownIds(lesson)]));
    expect([...asked].filter((id) => !questions.has(id))).toEqual([]);
    expect(bundle.questions.filter((item) => !asked.has(item.id)).map((item) => item.id)).toEqual(
      [],
    );
    const cards = bundle.lessons.flatMap((lesson) => lesson.flashcardIds);
    expect(new Set(cards).size).toBe(cards.length);
    expect(
      bundle.flashcards.filter((card) => !cards.includes(card.id)).map((card) => card.id),
    ).toEqual([]);
    const ids = [...bundle.questions.map((item) => item.id), ...bundle.flashcards.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all 14 lessons, each with at least eight questions and three to five cards", () => {
    expect(bundle.lessons).toHaveLength(14);
    for (const lesson of bundle.lessons) {
      expect(ownIds(lesson).size, lesson.id).toBeGreaterThanOrEqual(8);
      expect(lesson.flashcardIds.length, lesson.id).toBeGreaterThanOrEqual(3);
      expect(lesson.flashcardIds.length, lesson.id).toBeLessThanOrEqual(5);
    }
  });

  it("gives the course its subjects, its cover and its five modules", () => {
    expect(bundle.course.subjects).toEqual(["Economics", "Social science"]);
    expect(bundle.course.coverAsset).toBe("cover.svg");
    expect(bundle.course.moduleIds).toHaveLength(5);
    const cover = read("../../../content/macroeconomics/assets/cover.svg");
    expect(cover).toContain("<title>");
    expect(cover).toContain('viewBox="0 0 220 190"');
  });

  it("ends each lesson with three checks of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("never asks for a typed number: the learner reads the evidence and judges", () => {
    expect(
      bundle.questions.filter((item) => kind(item) === "numeric").map((item) => item.id),
    ).toEqual([]);
    expect(
      bundle.flashcards.filter((card) => card.answerAuthority?.kind === "numeric"),
    ).toHaveLength(0);
    // Nor does a choice question set bare figures to calculate: an option that opens with a
    // figure goes on to say what the figure shows or why it is the right reading.
    const bare =
      /^(about |roughly |by about )?[$-]?[\d.,]+( ?(%|million|billion|days|times|cents|c|x))?( (lower|higher|more|less|a year))?$/iu;
    for (const item of choiceQuestions)
      expect(
        (item.choices ?? []).filter((choice) => bare.test(choice.label.trim())),
        item.id,
      ).toHaveLength(0);
    // The right option of a choice question does not carry the answer of a sum the prompt sets
    for (const id of [
      "reading-a-gdp-headline-pick-the-row",
      "reading-a-gdp-headline-small-country",
      "what-inflation-costs-two-workers",
      "what-inflation-costs-two-pensions",
      "budgets-deficits-and-debt-check-two-countries",
    ])
      expect(rightLabel(id), id).not.toMatch(/\d/u);
    // The five typed questions name an idea, and the marker accepts the idea and not the prompt
    const typed = bundle.questions.filter((item) => kind(item) === "typed");
    expect(typed.map((item) => item.id)).toEqual([
      "mac-which-unemployment-measure-which-rate",
      "mac-where-inflation-comes-from-anchored-name",
      "mac-stabilisers-multipliers-and-their-limits-crowding-out",
      "mac-the-dollar-and-the-current-account-coal-and-imports",
      "mac-why-some-economies-grow-faster-farm-workers",
    ]);
    const marks: Record<string, [string[], string[]]> = {
      "which-unemployment-measure-which-rate": [
        ["participation rate", "The participation rate", "labour force participation rate"],
        ["unemployment rate", "employment to population ratio", "underutilisation rate"],
      ],
      "where-inflation-comes-from-anchored-name": [
        ["anchored", "well anchored", "Anchored expectations"],
        ["unanchored", "embedded", "cost-push"],
      ],
      "stabilisers-multipliers-and-their-limits-crowding-out": [
        ["crowding out", "Crowding-out", "resource crowding out"],
        ["multiplier", "leakage", "automatic stabiliser", "crowding in"],
      ],
      "the-dollar-and-the-current-account-coal-and-imports": [
        ["terms of trade", "The terms of trade"],
        ["exchange rate", "trade balance", "current account", "trade-weighted index"],
      ],
      "why-some-economies-grow-faster-farm-workers": [
        ["diminishing returns", "the law of diminishing returns", "diminishing marginal returns"],
        ["compounding", "multifactor productivity", "extensive growth"],
      ],
    };
    for (const item of typed) {
      const authority = item.answerAuthority;
      if (authority.kind !== "text") throw new Error(item.id);
      expect(assessTextAnswer(item.prompt, authority).correct, item.id).toBe(false);
      const [rights, wrongs] = marks[item.id.replace("mac-", "")] as [string[], string[]];
      for (const right of rights)
        expect(assessTextAnswer(right, authority).correct, right).toBe(true);
      for (const wrong of wrongs)
        expect(assessTextAnswer(wrong, authority).correct, wrong).toBe(false);
    }
  });

  it("keeps the right option the longest in at most a quarter of choice questions, and never far longer", () => {
    let longest = 0;
    let shortest = 0;
    for (const item of choiceQuestions) {
      const right = rightIndex(item);
      const choices = item.choices ?? [];
      const others = choices
        .filter((_, index) => index !== right)
        .map((choice) => choice.label.length);
      const length = (choices[right] as { label: string }).label.length;
      if (length > Math.max(...others)) longest += 1;
      if (length < Math.min(...others)) shortest += 1;
      expect(length, item.id).toBeLessThanOrEqual(Math.max(...others) * 1.15);
    }
    expect(choiceQuestions.length).toBe(103);
    expect(longest / choiceQuestions.length).toBeLessThanOrEqual(0.25);
    expect(shortest / choiceQuestions.length).toBeLessThanOrEqual(0.34);
  });

  it("puts the right option in different places, across the course and within each lesson", () => {
    const positions = new Map<number, number>();
    for (const item of choiceQuestions) {
      const at = rightIndex(item);
      positions.set(at, (positions.get(at) ?? 0) + 1);
    }
    expect(positions.size).toBeGreaterThanOrEqual(3);
    for (const count of positions.values())
      expect(count / choiceQuestions.length).toBeLessThanOrEqual(0.45);
    for (const lesson of bundle.lessons) {
      const own = ownIds(lesson);
      const places = choiceQuestions.filter((item) => own.has(item.id)).map(rightIndex);
      expect(new Set(places).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("explains every wrong option, keeps feedback from naming the right one, and gives two hints", () => {
    for (const item of bundle.questions) {
      for (const hint of item.hints)
        expect(hint, item.id).not.toMatch(/begins with|starts with|first letter/iu);
      expect(item.hints.length, item.id).toBeGreaterThanOrEqual(2);
      if (item.onCorrect)
        expect(item.onCorrect.split(/\s+/u).length, item.id).toBeLessThanOrEqual(45);
      if (!item.choices || item.answerAuthority.kind !== "text") continue;
      const right = item.choices[rightIndex(item)] as { id: string; label: string };
      const explained = new Set(
        (item.misconceptions ?? []).flatMap((entry) => entry.match.choiceIds ?? []),
      );
      for (const choice of item.choices.filter((entry) => entry.id !== right.id))
        expect(explained.has(choice.id), `${item.id} ${choice.id}`).toBe(true);
      for (const entry of item.misconceptions ?? []) {
        expect(entry.feedback.trim().length, item.id).toBeGreaterThan(20);
        expect(squash(entry.feedback).toLowerCase(), item.id).not.toContain(
          squash(right.label).toLowerCase(),
        );
      }
    }
  });

  it("keeps dashes and verdict words out of the course text, apart from quoted extracts", () => {
    const withoutExtracts = JSON.stringify({
      course: bundle.course,
      lessons: bundle.lessons,
      flashcards: bundle.flashcards,
    });
    expect(withoutExtracts).not.toMatch(/[—–]/u);
    for (const item of bundle.questions) {
      const { extracts: _extracts, ...rest } = item;
      const text = JSON.stringify(rest);
      expect(text, item.id).not.toMatch(/[—–]/u);
      expect(text, item.id).not.toMatch(/\b(Correct|Not quite|Great job)\b/u);
    }
  });

  it("writes an order question as distinct items and a sort question with every bin used", () => {
    let ordered = 0;
    let sorted = 0;
    for (const item of bundle.questions) {
      const { order, sort } = item;
      if (item.answerAuthority.kind !== "text" || !(order || sort)) continue;
      if (order) {
        ordered += 1;
        expect(new Set(order.items).size, item.id).toBe(order.items.length);
        expect(order.items.length, item.id).toBeGreaterThanOrEqual(4);
        expect(item.answerAuthority.acceptedIdeas, item.id).toEqual([ORDER_ANSWER_IDEA]);
      }
      if (sort) {
        sorted += 1;
        expect(new Set(sort.items.map((entry) => entry.label)).size, item.id).toBe(
          sort.items.length,
        );
        for (const bin of sort.bins)
          expect(
            sort.items.some((entry) => entry.bin === bin.id),
            `${item.id} ${bin.id}`,
          ).toBe(true);
        for (const entry of sort.items) expect(entry.explanation, item.id).toBeTruthy();
        expect(item.answerAuthority.acceptedIdeas, item.id).toEqual([SORT_ANSWER_IDEA]);
      }
      expect(item.onCorrect, item.id).toBeTruthy();
    }
    expect(ordered).toBe(5);
    expect(sorted).toBe(17);
  });

  it("finds every quoted extract word for word in a passage copied from the source pack", () => {
    const pool = Object.values(fixture.files).flat().map(squash);
    let checked = 0;
    for (const item of bundle.questions) {
      for (const extract of item.extracts ?? []) {
        checked += 1;
        expect(
          pool.some((passage) => passage.includes(squash(extract.text))),
          item.id,
        ).toBe(true);
      }
    }
    expect(checked).toBe(37);
  });

  it("words the source line of every extract of one source alike, and dates each statement by its own page", () => {
    const all = bundle.questions.flatMap((item) => item.extracts ?? []);
    const by = (start: string) => all.filter((extract) => extract.who.startsWith(start));
    const wikipedia = by("Wikipedia");
    expect(wikipedia).toHaveLength(5);
    for (const extract of wikipedia) {
      expect(extract.who).toMatch(/^Wikipedia, article ".+" \(CC BY-SA 4\.0\)$/u);
      expect(extract.when).toBe("accessed 24 November 2026");
      expect(extract.kind).toBe("An encyclopedia article written by volunteer editors");
    }
    const explainers = by("Reserve Bank of Australia, Explainer");
    expect(explainers).toHaveLength(5);
    for (const extract of explainers) {
      expect(extract.who).toMatch(/^Reserve Bank of Australia, Explainer ".+" \(CC BY 4\.0\)$/u);
      expect(extract.when).toBe("accessed 24 November 2026");
      expect(extract.kind).toBe("An explainer published by the central bank for the public");
    }
    const statements = by("Reserve Bank of Australia, Statement by the Monetary Policy Board");
    expect(statements).toHaveLength(10);
    const dates = [
      "11 August 2026",
      "16 June 2026",
      "17 March 2026",
      "29 September 2026",
      "3 November 2026",
    ];
    for (const extract of statements) {
      expect(extract.who).toBe(
        "Reserve Bank of Australia, Statement by the Monetary Policy Board (CC BY 4.0)",
      );
      expect(dates, extract.when).toContain(extract.when);
    }
    const smp = by("Reserve Bank of Australia, Statement on Monetary Policy");
    expect(smp).toHaveLength(10);
    for (const extract of smp) {
      expect(extract.who).toBe(
        "Reserve Bank of Australia, Statement on Monetary Policy, November 2026: Overview (CC BY 4.0)",
      );
      expect(extract.when).toBe("November 2026");
    }
    const abs = by("Australian Bureau of Statistics");
    expect(abs).toHaveLength(4);
    for (const extract of abs) {
      expect(extract.who).toMatch(/ \(CC BY 4\.0\)$/u);
      expect(extract.when).toMatch(/, released \d+ \w+ 2026$/u);
    }
    expect(by("Commonwealth of Australia")).toHaveLength(2);
    for (const extract of by("Commonwealth of Australia"))
      expect(extract.who).toBe(
        "Commonwealth of Australia, Budget Paper No. 1, 2026-27, Statement 3 (CC BY 4.0)",
      );
    expect(by("Doherty")).toHaveLength(1);
    expect(all).toHaveLength(37);
  });

  it("finds each statement extract in the statement of its own date", () => {
    for (const item of bundle.questions)
      for (const extract of item.extracts ?? []) {
        if (
          !extract.who.startsWith(
            "Reserve Bank of Australia, Statement by the Monetary Policy Board",
          )
        )
          continue;
        expect(fixture.statementSections[squash(extract.text)], item.id).toContain(extract.when);
      }
    // The 3 November statement says "the extent and economic effects" where 29 September says "the economic effects"
    const potential = question("why-some-economies-grow-faster-constraint-on-potential")
      .extracts?.[0];
    expect(potential?.when).toBe("3 November 2026");
    expect(potential?.text).toContain("uncertainties about the extent and economic effects");
    expect(fixture.statementSections[squash(potential?.text ?? "")]).toEqual(["3 November 2026"]);
  });

  it("finds the pack's own words behind each claim the lessons make beyond their extracts", () => {
    const pool = Object.values(fixture.files).flat().map(squash);
    const supported = (fragment: string) =>
      pool.some((passage) => passage.toLowerCase().includes(squash(fragment).toLowerCase()));
    // [what a lesson says, the pack's words for it]
    const pairs: Array<[string, string]> = [
      ["three routes to the same figure", "three different ways to estimate the same thing"],
      [
        "the ABS and Australian economists mostly look at the average of the three",
        "the ABS and economists generally focus on the average of the three measures",
      ],
      [
        "the GDP price deflator, its measure of price change across everything GDP covers, rose 0.4%",
        "The GDP implicit price deflator (IPD) rose 0.4%",
      ],
      [
        "add up to something close to, but not exactly equal to, nominal growth",
        "is close to, but not exactly equal to, the growth rate of nominal GDP",
      ],
      [
        "when parents look after their own children the work is left out of GDP",
        "caring for children is not included in GDP if carried out by their parents",
      ],
      [
        "the value of unpaid work in Australia at over half of GDP",
        "the value of unpaid labor in Australia has been calculated to be over 50% of the country's GDP",
      ],
      [
        "GDP says nothing about how national income is shared across the population",
        "GDP doesn't tell us anything about how evenly national income is split across the population",
      ],
      [
        "the first spending to rebuild buildings and infrastructure following a natural disaster",
        "the initial spending to replace buildings and infrastructure after a natural disaster",
      ],
      [
        "the income of poorer residents can fall even as the average rises",
        "their income might decline, even as the mean GDP per capita rises",
      ],
      [
        "GDP leaves out wider aspects of economic welfare",
        "GDP doesn't capture broader aspects of economic welfare",
      ],
      ["which the ABS lists under productivity", "Productivity | | | GDP per hour worked"],
      [
        "Wikipedia quotes Diane Coyle on free digital work",
        "In 2017 Diane Coyle explained that GDP excludes much unpaid work",
      ],
      [
        "asks around 50,000 people",
        "it asks around 50,000 people about their participation in the labour market",
      ],
      [
        "for wages, profit, commission or payment in kind",
        "for pay, profit, commission or payment in kind",
      ],
      ["had actively looked for work at some time in the past four weeks", "four weeks"],
      ["discouraged workers", "discouraged workers"],
      [
        "a high rate can mean that the demand for labour is weak compared with its supply",
        "underemployment",
      ],
      [
        "participation tends to follow the business cycle",
        "participation typically moves with the business cycle",
      ],
      [
        "the participation rate can explain how the unemployment rate goes up in a period when employment goes up as well",
        "The labor force participation rate explains how an increase in the unemployment rate can occur simultaneously with an increase in employment",
      ],
      [
        "the unemployment rate climbed further than expected, averaging 4.6%",
        "The unemployment rate rose by more than expected to average 4.6 per cent in the September quarter",
      ],
      ["nineteen chances in twenty", "nineteen chances in twenty"],
      [
        "treat short-term changes with some caution",
        "exercising a degree of caution in interpreting short-term changes",
      ],
      [
        "the trend is the best guide to what the labour market is doing underneath",
        "The trend data provides the best measure of the underlying behaviour of the labour market",
      ],
      ["fruit picking and holiday work", "ski instructors, fruit pickers and holiday-related jobs"],
      ["changes from unrounded figures", "calculated using un-rounded level estimates"],
      [
        "groups them into 87 categories and 11 groups",
        "grouped into 87 categories (or expenditure classes) and 11 groups",
      ],
      [
        "The ABS publishes it monthly",
        "calculated by the Australian Bureau of Statistics (ABS) and published once a month",
      ],
      [
        "unusual weather that disrupts supply and infrequent changes in tax rules",
        "Supply disruptions because of unusual weather",
      ],
      ["the 50th percentile by weight", "the 50th percentile by weight"],
      [
        "which always removes the same items, fruit and vegetables and automotive fuel",
        "Volatile items are Fruit and vegetables and Automotive fuel",
      ],
      [
        "which are home to roughly two thirds of Australian households",
        "where around two-thirds of Australian households live",
      ],
      [
        "an item with a weight of almost 3% in the basket",
        "cars have a weight of almost 3 per cent in the CPI basket",
      ],
      ["is not an ideal indicator of it", "it is not an ideal indicator of this"],
      [
        "the CPI is biased upwards a little",
        "The CPI is upwardly biased because it is calculated with a fixed basket",
      ],
      [
        "Commonwealth electricity rebates ending during the year",
        "largely due to the ending of Commonwealth electricity rebates over the year",
      ],
      [
        "fuel has risen sharply but that inflation has also been broad-based",
        "the price of fuel has increased significantly, inflation has been broad-based",
      ],
      [
        "a 32.8% rise in automotive fuel prices in March lifted headline inflation to 4.6% over the 12 months to March",
        "Headline inflation rose to 4.6 per cent in the 12 months to March 2026, driven by a 32.8 per cent rise in automotive fuel prices in the month",
      ],
      [
        "there is a rate of unemployment consistent with stable inflation",
        "there is also a level of the unemployment rate that is consistent with stable inflation",
      ],
      [
        "some of the increase in inflation reflected greater capacity pressures",
        "some of the increase in inflation reflects greater capacity pressures",
      ],
      [
        "labour market conditions looked a little tight",
        "labour market conditions remain a little tight",
      ],
      [
        "short-term measures of inflation expectations had already risen",
        "Short-term measures of inflation expectations have already risen",
      ],
      ["higher fuel prices were adding to inflation", "Higher fuel prices are adding to inflation"],
      [
        "the 1973 embargo after which oil prices quadrupled",
        "The embargo resulted in a quadrupling of oil prices",
      ],
      ["major cyclones and floods can damage large volumes of crops", "cyclones"],
      [
        "A strong record of low and stable inflation helps",
        "A strong track record of low and stable inflation puts monetary policy in the best possible position",
      ],
      [
        "is produced independently by the ABS, is publicly available, and has a history that does not get revised",
        "independently",
      ],
      [
        "the lowest average inflation other countries had seen over many years was a little over 2 per cent",
        "the lowest average inflation rate experienced by other countries had, over many years, been a little over 2 per cent",
      ],
      [
        "the target has to be high enough to allow for the CPI's upward bias",
        "the inflation target must be high enough to account for measurement bias in the CPI",
      ],
      [
        "lists Australia among the countries with no reserve requirement",
        "Countries with no reserve requirement include the United States, Great Britain, Australia, Canada, and New Zealand",
      ],
      [
        "central bank money once had close links to the growth of bank balance sheets and credit through reserve requirements of the fractional kind",
        "Historically, growth in the money base has had close links to the expansion of bank balance sheets and credit creation through fractional reserve (or similar) requirements",
      ],
      [
        "repaying a loan typically extinguishes deposits",
        "repayment of loans will typically extinguish deposits",
      ],
      ["a business that takes the cash it earned during the day to the bank", "cash"],
      ["buys government bonds from households and businesses", "bonds"],
      [
        "decides by majority vote, with the chair holding an additional casting vote if one is required",
        "The monetary policy decision is made by a majority vote (with the Chair having an additional casting vote if required)",
      ],
      ["it has nine members", "The Monetary Policy Board has nine members"],
      ["It meets eight times a year", "The Board meets eight times a year"],
      [
        "at 2.30 pm on the meeting's second day",
        "announced to the public at 2.30 pm on the second day of the meeting",
      ],
      [
        "minutes follow two weeks later",
        "Minutes of the Board meeting are published two weeks later",
      ],
      [
        "Deposits make up around two-thirds of Australian banks' funding and bonds around a third",
        "Deposits from Australian households and businesses account for around two-thirds of Australian banks' total funding",
      ],
      [
        "0.1 percentage points below the target",
        "0.1 percentage points below the cash rate target",
      ],
      ["0.25 points above the target", "0.25 percentage points above the cash rate target"],
      ["tightening raises interest rates in the economy", "tightening"],
      ["the RBA's example is the bank bill swap rate", "bank bill swap rate"],
      [
        "the RBA puts the risk of that failing in Australia as extremely low",
        "in Australia it is extremely low",
      ],
      [
        "deposits make up the greatest share of the money in a modern economy",
        "comprise the greatest share of money in a modern economy",
      ],
      [
        "That creates a deposit but not money, the RBA says",
        "This type of transaction creates a deposit, but does not create money",
      ],
      [
        "and the RBA treats them as the equivalent of cash for banks",
        "ES balances are considered to be the equivalent of cash",
      ],
      [
        "has largely been abandoned as an explanation",
        "The money multiplier has thus largely been abandoned as an explanatory tool for the money creation process",
      ],
      [
        "who then deposit the proceeds in the banking system and so add to total deposits",
        "households and businesses ultimately deposit the proceeds of the sale into the banking system, adding to total deposits",
      ],
      [
        "depends on the borrower deciding to approach the bank and on the bank deciding to lend",
        "depends on a number of decisions – of the borrower to approach the bank and the bank to extend the loan",
      ],
      [
        "the bank's equity would be wiped out",
        "the bank's equity (capital) would have been wiped out",
      ],
      [
        "a bond sale or taxation has to pay for it and each takes a deposit away somewhere else",
        "must be funded by issuing bonds or taxation, both of which reduce deposits",
      ],
      [
        "a principle the RBA calls generally accepted internationally and says helps stop monetary policy being manipulated for political purposes",
        "This principle of central bank independence is generally accepted internationally and helps prevent manipulation of monetary policy for political purposes",
      ],
      [
        "the cash rate has a strong influence over the rates that households and businesses get on deposits and pay on loans",
        "it has a strong influence over other interest rates, such as deposit and lending rates for households and businesses",
      ],
      [
        "The RBA says the cash rate is a strong influence on other rates and is not the only one",
        "it is not the only determinant",
      ],
      [
        "Deposit rates are less directly influenced and take some time to respond, because banks have discretion in setting them",
        "Deposit rates are less directly influenced by the cash rate and changes to the cash rate also tend to take some time to be transmitted to deposit rates. This is because banks have discretion in setting deposit rates",
      ],
      ["the RBA's example is the bank bill swap rate", "the bank bill swap rate (BBSW)"],
      [
        "higher rates have the opposite effect",
        "Higher interest rates have the opposite effect on demand and inflation",
      ],
      [
        "The effect is more direct for firms that borrow than for those that use the owners' own funds",
        "This will have a more direct effect on businesses that borrow to fund their projects with debt rather than those that use the business owners' funds",
      ],
      [
        "The RBA says this channel matters most for export-oriented sectors and for firms that compete with imports",
        "typically more important for sectors that are export oriented or exposed to competition from imported goods and services",
      ],
      [
        "the RBA says the borrowers' effect is the larger",
        "with the first effect larger than the second",
      ],
      [
        "because the shape of the economy shifts over time and conditions vary",
        "because the structure of the economy changes over time, and economic conditions vary",
      ],
      [
        "grew mainly out of attempts to rein in excess demand at home, cool speculation in commercial property and bring down inflation",
        "The early 1990s recession mainly resulted from Australia's efforts to address excess domestic demand, curb speculative behaviour in commercial property markets and reduce inflation",
      ],
      [
        "with rates pushed very high because tighter policy was slower to work than expected",
        "Interest rates were increased to a very high level because the transmission of tighter monetary policy took longer than expected",
      ],
      [
        "the expansion usually lasts longer than the contraction",
        "the expansion phase usually lasts longer than the contraction phase",
      ],
      [
        "Australia had gone 29 years without a recession",
        "Australia had not recorded a recession for 29 years since the recession of the early 1990s",
      ],
      [
        "unemployment topped out near 7.5 per cent in mid-2020",
        "The unemployment rate rose rapidly to a peak of 7.5 per cent in June 2020",
      ],
      [
        "GDP falling 1.7 per cent, employment 3.4 per cent and the unemployment rate rising to 10.8 per cent",
        "GDP fell by 1.7 percent, employment by 3.4 percent and the unemployment rate rose to 10.8 percent",
      ],
      [
        "unemployment kept rising until late 1992",
        "though unemployment continued to rise until late 1992",
      ],
      [
        "the RBA's own figure for the peak is just over 11 per cent",
        "The unemployment rate peaked at just over 11 per cent",
      ],
      ["Commonwealth of Australia", "Fiscal Strategy and Outlook"],
      [
        "unemployment climbed to nearly 6 per cent and underemployment jumped",
        "the unemployment rate increased to close to 6 per cent and the underemployment rate rose sharply",
      ],
      [
        "Australia's deepest financial crisis",
        "Australia experienced its deepest financial crisis",
      ],
      ["wool prices collapsed", "a collapse in wool prices"],
      [
        "changes in debt over time reflect mainly borrowing due to past deficits",
        "Changes in government debt over time reflect primarily borrowing due to past government deficits",
      ],
      [
        "why debt is set against it as an indicator of the burden and why countries of different sizes can be compared",
        "is an indicator of its debt burden since GDP measures the value of goods and services produced by an economy during a period (usually a year). As well, debt measured as a percentage of GDP facilitates comparisons across countries of different size",
      ],
      [
        "one major reason for borrowing is to cushion shocks",
        'An important reason governments borrow is to act as an economic "shock absorber"',
      ],
      [
        "can arise when groups disagree about spending",
        'a "deficits bias" can arise when there is disagreement among groups in society over government spending',
      ],
      [
        "politicians are tempted to win popularity by deficit spending",
        "individual politicians are incentivised to increase their popularity with deficit spending",
      ],
      [
        "the paper's note that Australia is one of just nine countries holding AAA ratings from all three major agencies",
        "Australia remains one of only nine countries with a AAA sovereign credit rating from all three major ratings agencies",
      ],
      [
        "price swings linked to the conflict in the Middle East add to the uncertainty",
        "Commodity price volatility stemming from the conflict in the Middle East has increased the uncertainty around the estimate",
      ],
      [
        "this help fades as prices drift back to the long-run levels the Budget assumes",
        "This recedes as commodity prices return to their assumed long‑run levels",
      ],
      [
        "the structural balance is estimated and not observed",
        "The structural balance is estimated rather than observed",
      ],
      [
        "its budget is stronger and more sustainable",
        "The Government has delivered a stronger and more sustainable budget",
      ],
      [
        "the Government expects the budget to come back into balance in 2034-35",
        "The budget is projected to return to balance in 2034–35",
      ],
      [
        "which is what the Government repays to its investors at maturity",
        "This is the amount that the Government pays back to investors at maturity",
      ],
      [
        "features of government budgets, mainly income taxes and welfare payments, that reduce swings in GDP without the Government taking any new action",
        "automatic stabilizers are features of the structure of modern government budgets, particularly income taxes and welfare spending, that act to reduce fluctuations in real GDP",
      ],
      [
        "the tax collected tends to fall faster than incomes do",
        "income tax revenue tends to fall faster than the fall in household income",
      ],
      [
        "More people are also entitled to unemployment and other benefits",
        "the number of unemployed people and those on low incomes who are entitled to other benefits increases in a recession",
      ],
      [
        "stabilisers added 32.9% to the size of the deficit",
        "stabilizers increased the deficit by 32.9% in fiscal 2009",
      ],
      [
        "60% of the 1999 surplus was attributed to them",
        "60% of the 1999 $126 billion surplus was attributed to stabilizers",
      ],
      [
        "if they spend 8 of every 10 extra dollars they earn and save the other 2",
        "If their MPC is 0.8, those people will spend $8 million on goods and services and save $2 million",
      ],
      [
        "Wikipedia says the size of the multiplier depends on the marginal propensity to consume and on the marginal propensity to import",
        "The extent of the multiplier effect in increasing domestic business activity is dependent upon the marginal propensity to consume and marginal propensity to import",
      ],
      [
        "the net cost to the Government of spending $1 is likely to be a little less than $1",
        "making the net expenditure less than $1",
      ],
      [
        "extra demand from government spending can be met by extra production, without pushing up prices, when many workers and machines are idle",
        "so that the additional demand represented by government purchases may be realized by additional production and higher utilization of resources, without bidding up prices",
      ],
      [
        "the extent of resource crowding out depends on the economic situation",
        "The extent to which resource crowding out occurs depends on the economic situation",
      ],
      [
        "multipliers below one have been measured in some cases",
        "In certain cases multiplier values less than one have been empirically measured",
      ],
      [
        "economists are deeply divided about how well such stimulus works",
        "economists are in fact deeply divided about how well, or indeed whether, such stimulus works",
      ],
      [
        "how potent a stimulus is may depend on how accommodating the central bank is",
        "How potent a fiscal stimulus is in stimulating expansion of economic activity may depend on how accommodating the monetary authority",
      ],
      [
        "the IMF said the multipliers its staff used in forecasting were about 0.5, while its results suggested a range of 0.9 to 1.7 since the Great Recession",
        "fiscal multipliers used in the forecasting process are about 0.5. Our results indicate that multipliers have actually been in the 0.9 to 1.7 range since the Great Recession",
      ],
      [
        "The Government delivered a $2.9 billion package that more than halved the fuel excise",
        "The Government has delivered a $2.9 billion package to more than halve the fuel excise",
      ],
      [
        "reducing the excise on petrol and diesel by 32 cents",
        "the rate of excise on petrol and diesel has been reduced by 32 cents",
      ],
      [
        "takes nearly $23 off a full 65-litre tank",
        "cutting the cost of a 65‑litre tank of fuel by nearly $23",
      ],
      [
        "$11.8 billion of increased social security payments",
        "This Budget includes $11.8 billion in increased social security payments",
      ],
      [
        "fiscal policy offers many instruments, each of which can be tailored to a particular problem",
        "Fiscal policy has a range of instruments that can be calibrated for a specific policy response",
      ],
      [
        "fits it to a supply shock such as the global oil shock more than monetary policy",
        "This makes fiscal policy better suited than monetary policy to respond to supply shocks, such as the global oil shock",
      ],
      ["a rate of unemployment", "NAIRU"],
      [
        "because the US dollar is the most traded currency in the world",
        "it is the most traded currency globally",
      ],
      [
        "at an AUD/USD rate of 0.75, an Australian dollar changes into 75 US cents",
        "if the AUD/USD exchange rate is 0.75, this means that USD 0.75 (or 75 US cents) can be exchanged for a payment of AUD 1",
      ],
      ["since 1983", "Australia has had a floating exchange rate regime since 1983"],
      [
        "the RBA steps in only on rare occasions, such as when trading becomes disorderly",
        "the monetary authority intervenes to affect the level of the exchange rate only on rare occasions if market conditions are disorderly",
      ],
      [
        "as the Danish krone is tied to the euro",
        "An example of a pegged exchange rate is the Danish krone, which is pegged to the euro",
      ],
      [
        "weighted by Australia's trade with each partner",
        "The weights of each currency in the basket are generally based on the share of trade conducted with each of a country's trading partners",
      ],
      [
        "It generally moves less than any single rate, because changes against different currencies partly offset each other",
        "A TWI generally fluctuates less than bilateral exchange rates because movements in the bilateral exchange rates used to construct a TWI will often partly offset each other",
      ],
      [
        "in 2011 AUD/USD reached a record 1.10",
        "reaching a record high of A$1.10 against the US dollar in 2011",
      ],
      [
        "most estimates put the largest effect on activity and inflation between one and three years after the move",
        "Most estimates suggest that it takes between one and three years for exchange rate movements to have their maximum effect on economic activity and inflation",
      ],
      [
        "The RBA says this pattern is sometimes called the",
        "This pattern is sometimes referred to as the ‘J-curve’",
      ],
      [
        "The country has tended to borrow from overseas to invest in its economy",
        "Australia has tended to borrow from overseas, reflecting investment in the Australian economy",
      ],
      [
        "the ratio of Australia's export prices to its import prices",
        "The terms of trade measures the ratio of export prices to import prices",
      ],
      [
        "commodity prices have a large influence, because commodities are a large share of exports",
        "Commodity prices have a large influence on the terms of trade (commodities are goods such as iron ore, natural gas and agricultural products). This is because commodities account for a large share of Australia's exports",
      ],
      [
        "The RBA says the two have moved closely together over a long period",
        "There has been a close relationship between the terms of trade and the value of the Australian dollar over a long period of time",
      ],
      [
        "it typically appreciates when global share prices rise and depreciates when they fall",
        "movements in the Australian dollar exchange rate have broadly followed those observed in global equity markets",
      ],
      [
        "The RBA defines productivity as the output you get from a given quantity of inputs",
        "productivity refers to how much output can be produced with a given set of inputs",
      ],
      [
        "Wikipedia names the two kinds of growth: growth from more inputs alone, such as a larger population, is",
        "economic growth caused only by increases in the amount of inputs available for use (increased population, for example, or new territory) counts as extensive growth",
      ],
      [
        "Labour input is usually hours worked, which captures overtime and leave better than a head count does",
        "Hours worked measures are typically preferred because they capture changes in standard working hours, leave, overtime and flexible work arrangements",
      ],
      [
        "In a downturn output falls by more than inputs",
        "productivity tends to decline in a downturn because output declines by more than inputs",
      ],
      [
        "economists therefore often study productivity over long periods that include several cycles",
        "economists often analyse productivity over long periods of time that include a number of economic cycles",
      ],
      [
        "microeconomic reform, such as policies on competition, trade, tax and regulation, has supported efficiency in Australia over the past few decades",
        "Australia's microeconomic policies – such as those related to competition, trade, tax and market regulation – have played an important role in supporting productivity growth over the past few decades",
      ],
      [
        "unit labour costs, the labour cost of making one unit of output, fall as labour productivity rises",
        "Unit labour costs (ULCs), which measure the labour costs associated with producing one unit of output, decrease as labour productivity increases",
      ],
      [
        "holding the other inputs constant, each extra worker or machine adds less to output than the one before",
        "holding other inputs constant, the addition of one more unit of labour or capital will lead to a smaller and smaller addition to output",
      ],
      [
        "Capital accumulates through investment and wears out through depreciation",
        "Capital accumulates through investment, but its level or stock continually decreases due to depreciation",
      ],
      [
        "Endogenous growth theory, developed in the 1980s by economists including Robert Lucas and Paul Romer",
        "The resulting endogenous growth theory, most notably advanced by Robert Lucas, Jr. and his student Paul Romer",
      ],
      [
        "technological progress explained about 80 per cent of the long-run increase in US income per person",
        "technological progress has accounted for 80 percent of the long-term rise in U.S. per capita income",
      ],
      [
        "in 1870 GDP per person in the United Kingdom, at $4,808, was about 20% above that of the United States at $4,007",
        "GDP per person in the United Kingdom in the year 1870 was $4,808. At the same time in the United States, GDP per person was $4,007, lower than the UK by about 20%",
      ],
      [
        "with $36,130 in the UK and $46,970 in the US",
        "GDP per person was $36,130 in the United Kingdom and $46,970 in the United States",
      ],
      [
        "The average growth rates behind that were 1.47% a year in the UK and 1.80% in the US",
        "GDP per person grew, on average, by 1.80% per year in the US and by 1.47% in the UK",
      ],
      [
        "before economies began to grow, one person could gain only if another lost out",
        "the only way for anyone to become richer was for someone else to become poorer",
      ],
      [
        "a comprehensive productivity package, which helps reduce regulatory costs, supports higher living standards",
        "The Budget is delivering a comprehensive productivity package that helps reduce regulatory costs and supports higher living standards for all Australians",
      ],
      [
        "it calls improving productivity central to its plan to grow the economy",
        "Improving productivity is central to the Government’s economic plan to grow Australia’s economy",
      ],
      [
        "Take the RBA's toy factory worker, who makes 120 dolls in a 40-hour week",
        "the worker produces 120 dolls",
      ],
      [
        "a change in MFP is a change in output that changes in inputs can't explain",
        "Changes in MFP reflect changes in output that cannot be explained by changes in inputs",
      ],
      ["forecasts finalised on 28 October", "Forecasts finalised on 28 October"],
      [
        "It judges the risks to inflation to be skewed to the upside",
        "The risks to the inflation outlook are judged to remain skewed to the upside",
      ],
      ["capacity pressures ease sooner", "For example, capacity pressures could ease sooner"],
      ["helped by data centre investment", "supported by rapid growth in data centre investment"],
      [
        "tighter monetary policy and a weaker housing market are expected to hold growth under trend",
        "Tighter monetary policy alongside a weaker outlook for the housing market is expected to keep GDP growth below trend",
      ],
      [
        "markets expected about one and a half more rate rises by the middle of next year",
        "market pricing was implying expectations of around one and a half further cash rate increases by mid-next year",
      ],
      [
        "By September, housing prices had fallen almost 5 per cent from their March peak",
        "Housing prices in September were almost 5 per cent below their March peak",
      ],
      [
        "The forecasts assume the exchange rate stays at its 28 October level",
        "the daily exchange rate (TWI) is assumed to be unchanged from its level at 28 October 2026 going forward",
      ],
      [
        "puts that down to higher interest rates and to tax changes announced in the federal budget",
        "reflecting higher interest rates and tax changes announced in the federal budget",
      ],
      [
        "The Board's first decision of 2026",
        "the Board decided to increase the cash rate target by 25 basis points to 3.85 per cent",
      ],
      [
        "It dates from the early 1990s, by which time inflation had already settled at around 2 to 3 per cent",
        "This target range was set in the early 1990s when inflation of around 2 to 3 per cent had already been achieved",
      ],
      [
        "is produced independently by the ABS",
        "is independently produced by the Australian Bureau of Statistics",
      ],
      [
        "The slower growth in spending and investment needed to hold inflation lower would reduce output growth and raise unemployment",
        "The reduction in growth in spending and investment required to keep inflation at a lower target would lower output growth and increase unemployment",
      ],
      [
        "Inflation close to zero also limits the room for monetary policy to push real interest rates below zero",
        "Having a very low inflation target (so that actual inflation is close to zero) makes it more difficult to reduce real interest rates to such levels",
      ],
      ["it is difficult to be precise about when the target started", "difficult to be precise"],
      [
        "there remains pressure on domestic capacity",
        "there remains pressure on domestic capacity",
      ],
      ["a little tighter than earlier thought", "a little tighter than earlier thought"],
      [
        "pressure on global and domestic energy prices",
        "pressure on global and domestic energy prices",
      ],
      ["experiencing cost pressures", "experiencing cost pressures"],
      ["remain elevated", "Short-term measures of inflation expectations remain elevated"],
      ["upside risks to inflation expectations", "upside risks to inflation expectations"],
      ["decided to increase the cash rate target", "decided to increase the cash rate target"],
      ["broadly based", "broadly based"],
      ["unresolved", "The Middle East conflict remains unresolved"],
      ["will be attentive to the data", "will be attentive to the data"],
      ["remains elevated", "Inflation remains elevated"],
      ["is slowing", "The economy is slowing"],
      ["has risen", "the unemployment rate has risen"],
      ["significantly", "housing prices have fallen significantly"],
      ["embedded", "will become embedded"],
      [
        "Debtors with a fixed nominal rate of interest see the real interest rate fall as inflation rises",
        'Debtors who have debts with a fixed nominal rate of interest will see a reduction in the "real" interest rate as the inflation rate rises',
      ],
      [
        "purchasing power moves away from people whose income is fixed in dollars, such as some pensioners whose pensions aren't indexed to the price level",
        "purchasing power is redistributed from those on fixed nominal incomes, such as some pensioners whose pensions are not indexed to the price level",
      ],
      ["nominal wages are slow to adjust downward", "Nominal wages are slow to adjust downward"],
      [
        "moderate inflation lets real wages fall even when nominal wages are kept constant",
        "Since inflation allows real wages to fall even if nominal wages are kept constant",
      ],
      [
        "a focus on the price level alone makes inflation targeting neglect shocks to output",
        "criticize the propensity of inflation targeting to neglect output shocks by focusing solely on the price level",
      ],
    ];
    for (const [said, packWords] of pairs) {
      expect(everything, said).toContain(said);
      expect(supported(packWords), packWords).toBe(true);
    }
    expect(pairs.length).toBe(196);
    // Claims the lessons do not make, because the pack does not state them
    expect(everything).not.toMatch(/median income/u);
    expect(everything).not.toMatch(/the rate before February 2026|basis point is/u);
    // The RBA's 3.9% for the year to the September quarter is not set against the ABS 4.3%
    expect(everything).not.toMatch(/3\.9% (over|for) the year/u);
    expect(everything).not.toMatch(/headline inflation was 3\.9/u);
  });

  it("quotes the Board in short fragments in the two sorts that list its sentences, each found in the pack", () => {
    const pool = Object.values(fixture.files).flat().map(squash);
    let fragments = 0;
    for (const id of [
      "where-inflation-comes-from-board-sentences",
      "reading-a-central-bank-statement-sort-the-sentences",
    ]) {
      const item = question(id);
      for (const entry of item.sort?.items ?? []) {
        const quoted = [...entry.label.matchAll(/"([^"]+)"/gu)].map((match) => match[1] as string);
        expect(quoted.length, entry.label).toBeGreaterThan(0);
        for (const fragment of quoted) {
          fragments += 1;
          // under the eight-word run that the copy check looks for
          expect(fragment.split(/\s+/u).length, fragment).toBeLessThanOrEqual(7);
          expect(
            pool.some((passage) => passage.toLowerCase().includes(squash(fragment).toLowerCase())),
            fragment,
          ).toBe(true);
        }
      }
    }
    expect(fragments).toBe(15);
  });

  it("labels the closing-wording reading in lesson 14 as the course's own, and keeps the claims behind it to the table", () => {
    stateIn(
      "reading-a-central-bank-statement",
      "This is the course's own reading of the table, and the RBA doesn't make it.",
    );
    stateIn("reading-a-central-bank-statement", "in the course's own reading of the 2026 table");
    stated("In the 2026 table, which is the course's own reading");
    stated("as the course reads it");
    // the table the reading is made from: the statements that name a further rise
    expect(decisions.map((item) => item.furtherRise)).toEqual([
      false,
      false,
      false,
      true,
      true,
      true,
      false,
    ]);
    // the decision after each of those statements
    const next = (index: number) => {
      const here = decisions[index] as (typeof decisions)[number];
      const after = decisions[index + 1] as (typeof decisions)[number];
      return after.target > here.target ? "raised" : "held";
    };
    const named = [3, 4, 5].map(next);
    expect(named.filter((item) => item === "held")).toHaveLength(1);
    expect(named.filter((item) => item === "raised")).toHaveLength(2);
    const unnamed = [0, 1, 2].map(next);
    expect(unnamed.filter((item) => item === "raised")).toHaveLength(2);
    expect(unnamed.filter((item) => item === "held")).toHaveLength(1);
    // the last statement has no meeting after it
    expect(decisions).toHaveLength(7);
  });

  it("gives lesson 13 a case of its own, as a recap of lesson 1 and not a repeat of it", () => {
    const hook = question("why-some-economies-grow-faster-hook");
    expect(hook.prompt).toContain("invented economies");
    expect(hook.prompt).not.toMatch(/2\.1%|0\.7%|-0\.2%|June 2026/u);
    for (const card of bundle.flashcards.filter((item) => item.id.includes("why-some-economies")))
      expect(`${card.front} ${card.back}`, card.id).not.toMatch(/2\.1%|-0\.2%/u);
    stateIn(
      "why-some-economies-grow-faster",
      "In 'Reading a GDP headline' you read the ABS rows for the year to June 2026",
    );
    // lesson 1 teaches the three rows and asks where the growth came from
    stateIn("reading-a-gdp-headline", "2.1%, 0.7% and -0.2%");
    expect(lessonText("reading-a-gdp-headline")).toContain("where-the-growth-came-from");
    // the hook's two economies grow alike in total and differently in what lies behind it
    expect(1.03 * 1.0).toBeCloseTo(1.0 * 1.03, 10);
    expect(rightLabel("why-some-economies-grow-faster-hook")).toContain("Economy Q");
  });

  it("gives each 2026 reading of the Board's statements one question, and the same figures every time", () => {
    // the cash rate path
    expect(decisions.map((item) => item.target)).toEqual([3.85, 4.1, 4.35, 4.35, 4.35, 4.6, 4.85]);
    for (const text of ["3.85", "4.10", "4.35", "4.60", "4.85"]) stated(text);
    // five rises of 25 basis points and two holds
    expect(decisions.filter((item) => !item.held)).toHaveLength(5);
    expect(decisions.filter((item) => item.held)).toHaveLength(2);
    // the first decision lifted the target by 25 basis points to 3.85, and every rise was 25
    for (const [index, item] of decisions.entries()) {
      if (index > 0 && !item.held)
        within(
          item.target - (decisions[index - 1] as { target: number }).target,
          0.25,
          1e-9,
          item.date,
        );
      if (item.held) expect(item.target).toBe((decisions[index - 1] as { target: number }).target);
    }
    // votes: four unanimous, three by majority
    expect(decisions.filter((item) => item.unanimous)).toHaveLength(4);
    const majorities = decisions.filter((item) => !item.unanimous);
    expect(majorities.map((item) => item.date.split(" ").slice(0, 2).join(" "))).toEqual([
      "17 March",
      "5 May",
      "3 November",
    ]);
    const splits = majorities.map((item) => item.counts.map((word) => WORDS[word] as number));
    expect(splits).toEqual([
      [5, 4],
      [8, 1],
      [6, 3],
    ]);
    // the same decision is stated alike wherever it is
    for (const fragment of [
      "the fifth rise of the year",
      "raised the cash rate target five times",
      "six members voted to increase the cash rate target by 25 basis points to 4.85 per cent",
      "in March four of the nine preferred to leave the rate unchanged, and in November three did",
    ])
      stated(fragment);
    // each extract of a statement or release appears in at most two questions: the vote line of 3 November is read for its margin and for what it predicts
    const seen = new Map<string, string[]>();
    for (const item of bundle.questions)
      for (const extract of item.extracts ?? [])
        seen.set(extract.text, [...(seen.get(extract.text) ?? []), item.id]);
    const repeated = [...seen.entries()].filter(([, ids]) => ids.length > 1);
    expect(repeated.map(([, ids]) => ids)).toEqual([]);
  });

  it("points every hover note at the lesson that teaches the term, and every lesson reference at a real lesson", () => {
    const titles = new Map(bundle.lessons.map((lesson) => [lesson.title, lesson]));
    const taught: Record<string, string> = {
      "reading-a-gdp-headline:real gdp": "Real and nominal",
      "reading-a-gdp-headline:nominal": "Real and nominal",
      "what-inflation-costs:nominal": "Reading a GDP headline",
      "the-cash-rate-and-the-rates-you-pay:exchange settlement balance": "How banks create money",
      "how-a-rate-change-travels:market reference rates": "The cash rate and the rates you pay",
      "how-a-rate-change-travels:capacity pressures": "Where inflation comes from",
      "booms-slowdowns-and-recessions:stagflation": "Where inflation comes from",
      "budgets-deficits-and-debt:gdp": "Reading a GDP headline",
      "stabilisers-multipliers-and-their-limits:deficit": "Budgets, deficits and debt",
    };
    let hovers = 0;
    for (const lesson of bundle.lessons) {
      const text = JSON.stringify(lesson);
      for (const match of text.matchAll(/\[\[([^|\]]+)\|([^\]]*)\]\]/gu)) {
        hovers += 1;
        const term = match[1] as string;
        const note = match[2] as string;
        const where = /Met in '([^']+)'/u.exec(note)?.[1] as string;
        expect(where, `${lesson.id}: ${term}`).toBeTruthy();
        const target = titles.get(where);
        if (target) {
          // a lesson of this course, which comes before this one, and teaches the term in its own text
          expect(where, `${lesson.id}: ${term}`).toBe(taught[`${lesson.id}:${term.toLowerCase()}`]);
          expect(bundle.lessons.indexOf(target), `${lesson.id}: ${term}`).toBeLessThan(
            bundle.lessons.indexOf(lesson),
          );
          expect(JSON.stringify(target).toLowerCase(), `${where} teaches ${term}`).toContain(
            term.toLowerCase(),
          );
        } else {
          // an earlier screen of this lesson
          const earlier = lesson.steps.find((step) => step.headline === where);
          expect(earlier, `${lesson.id}: ${term} points at ${where}`).toBeTruthy();
          expect(where, `${lesson.id}: ${term}`).toBe(taught[`${lesson.id}:${term.toLowerCase()}`]);
          expect(JSON.stringify(earlier).toLowerCase()).toContain(
            term.toLowerCase().split(" ").pop() as string,
          );
          expect(lesson.steps.indexOf(earlier as (typeof lesson.steps)[number])).toBeLessThan(
            lesson.steps.findIndex((step) => JSON.stringify(step).includes(`[[${term}|`)),
          );
        }
      }
    }
    expect(hovers).toBe(9);
    // Lessons that mention another lesson by its title name a real one
    const quoted = new Set<string>();
    for (const match of everything.matchAll(/'([A-Z][A-Za-z ,]+)'(?!s)/gu))
      quoted.add(match[1] as string);
    const referred = [...quoted].filter((name) => titles.has(name));
    for (const name of [
      "Reading a GDP headline",
      "How banks create money",
      "The cash rate and the rates you pay",
      "Where inflation comes from",
      "Budgets, deficits and debt",
    ])
      expect(referred, name).toContain(name);
    // no lesson refers to "the last lesson" or "the lesson on" a topic without naming it
    expect(everything).not.toMatch(
      /\b(the last lesson|the previous lesson|the lesson on|a later lesson|an earlier lesson)\b/u,
    );
    // the lessons that say what the next lesson holds say it of the lesson that follows
    stateIn("how-banks-create-money", "The next lesson, 'The cash rate and the rates you pay'");
    stateIn("booms-slowdowns-and-recessions", "The next lesson, 'Budgets, deficits and debt'");
    expect(bundle.lessons[6]?.title).toBe("The cash rate and the rates you pay");
    expect(bundle.lessons[9]?.title).toBe("Budgets, deficits and debt");
    for (const lesson of bundle.lessons.slice(0, 13))
      expect(lesson.recap?.nextHook, lesson.id).toMatch(/^(Next|The next lesson)/u);
    expect(bundle.lessons[13]?.recap?.nextHook).toBeUndefined();
  });

  it("gives the invented cases of different lessons different names, none of them used by Accounting, Personal Finance or Corporate Finance, and calls each invented", () => {
    const names: Record<string, string[]> = {
      Tamsin: ["how-banks-create-money"],
      "Bank C": ["how-banks-create-money"],
      "Bank D": ["how-banks-create-money"],
      "Bank E": ["how-banks-create-money"],
      "Bank F": ["how-banks-create-money"],
      "Bank G": ["how-banks-create-money"],
      "Bank H": ["how-banks-create-money"],
      "Bank J": ["how-banks-create-money"],
      "Bank P": ["the-cash-rate-and-the-rates-you-pay"],
      "Bank Q": ["the-cash-rate-and-the-rates-you-pay"],
      "Worker A": ["what-inflation-costs"],
      "Country X": ["budgets-deficits-and-debt"],
      "Economy A": ["stabilisers-multipliers-and-their-limits"],
      "Economy P": ["why-some-economies-grow-faster"],
      "Economy Q": ["why-some-economies-grow-faster"],
    };
    const otherCourses = JSON.stringify([accounting, personalFinance, corporateFinance]);
    for (const [name, lessons] of Object.entries(names)) {
      const where = bundle.lessons
        .filter((lesson) => new RegExp(`\\b${name}\\b`, "u").test(inLesson(lesson.id)))
        .map((lesson) => lesson.id);
      expect(where, name).toEqual(lessons);
      expect(otherCourses, name).not.toMatch(new RegExp(`\\b${name}\\b`, "u"));
      // the lesson says the case is invented, close to where it names the case
      const text = inLesson(lessons[0] as string);
      const near = [...text.matchAll(new RegExp(`\\b${name}\\b`, "gu"))].some((match) =>
        text
          .slice(Math.max(0, match.index - 1000), match.index + 1000)
          .toLowerCase()
          .includes("invented"),
      );
      expect(near, `${name} is called invented`).toBe(true);
    }
    // Bank A and Bank B are the RBA's own island banks, in one lesson
    expect(
      bundle.lessons
        .filter((lesson) => /\bBank A\b/u.test(inLesson(lesson.id)))
        .map((lesson) => lesson.id),
    ).toEqual(["how-banks-create-money"]);
    // the cases the writers called invented on the way in are all marked
    for (const id of [
      "what-the-cpi-measures-index-numbers",
      "where-inflation-comes-from-wages-and-productivity",
      "stabilisers-multipliers-and-their-limits-crowding-out",
      "how-banks-create-money-grant",
    ])
      expect(question(id.replace("mac-", "")).prompt, id).toMatch(/invented/u);
    // Priya, used in Personal Finance, is gone
    expect(everything).not.toMatch(/Priya/u);
  });
});

const at = <T>(list: T[], index: number): T => list[index] as T;
const gdp = {
  real: rowOf("absGdp", "| | GDP |", 0),
  nominal: rowOf("absGdp", "| | GDP |", 1),
  perPerson: rowOf("absGdp", "| | GDP per capita"),
  perHour: rowOf("absGdp", "| | GDP per hour worked"),
  termsOfTrade: rowOf("absGdp", "| | Terms of trade"),
};
const labour = (label: string, trend = false) => rowOf("absLabour", `| ${label} |`, trend ? 1 : 0);

describe("Reading a GDP headline", () => {
  it("prints the ABS rows as the release gives them, in the table and in the figure", () => {
    expect(gdp.real).toEqual([0.8, 0.5, 0.9, 0.3, 0.4, 2.1]);
    expect(gdp.nominal).toEqual([0.9, 1.9, 1.9, 0.6, 0.8, 5.3]);
    expect(gdp.perPerson).toEqual([0.4, 0.1, 0.6, -0.1, 0, 0.7]);
    expect(gdp.perHour).toEqual([0.5, 0.3, 0, -0.6, 0, -0.2]);
    const words = figureWords("reading-a-gdp-headline", "total-person-hour", "real");
    for (const [label, row] of [
      ["Real GDP (chain volume)", gdp.real],
      ["Nominal GDP (current prices)", gdp.nominal],
      ["GDP per person", gdp.perPerson],
      ["GDP per hour worked", gdp.perHour],
    ] as const) {
      const start = words.indexOf(label);
      expect(start, label).toBeGreaterThan(-1);
      expect(
        words.slice(start + 1, start + 7).map((word) => (word === "-" ? 0 : Number(word))),
        label,
      ).toEqual([...row]);
    }
    const deflator = fixture.figures.absGdp.find((line) =>
      line.includes("implicit price deflator"),
    );
    expect(deflator).toContain("rose 0.4%");
  });

  it("splits the June quarter into volume and prices, and sets the year against it", () => {
    // 0.8% nominal is 0.4% of volume and 0.4% of prices
    within(
      round((1 + at(gdp.real, 4) / 100) * (1 + 0.004) * 100 - 100, 1),
      at(gdp.nominal, 4),
      0.05,
    );
    const quarter = figureWords("reading-a-gdp-headline", "real-and-nominal", "quarter");
    for (const word of ["0.8%", "0.4%"]) expect(quarter, word).toContain(word);
    const year = figureWords("reading-a-gdp-headline", "real-and-nominal", "year");
    expect(year).toContain("5.3%");
    expect(year).toContain("2.1%");
    // the two quarters the end check sets side by side
    expect([at(gdp.nominal, 0), at(gdp.real, 0), at(gdp.nominal, 1), at(gdp.real, 1)]).toEqual([
      0.9, 0.8, 1.9, 0.5,
    ]);
    stated("Output growth slowed from 0.8% to 0.5%, and dollar growth rose from 0.9% to 1.9%");
  });

  it("works the RBA's apple economy", () => {
    const first = 100 * 2;
    const second = 104 * 2.05;
    within(second, 213.2, 1e-9);
    within(round(pct(second - first, first), 1), 6.6, 1e-9);
    within(round(pct(104 - 100, 100), 1), 4, 1e-9);
    within(round(pct(2.05 - 2, 2), 1), 2.5, 1e-9);
    within(round(1.04 * 1.025, 3), 1.066, 1e-9);
    // adding the rates comes close to nominal without matching it
    expect(4 + 2.5).toBe(6.5);
    stated("$213.20");
    stated("6.6%");
  });

  it("works what the three rows imply for population and for hours", () => {
    const year = at(gdp.real, 5);
    const person = at(gdp.perPerson, 5);
    const hour = at(gdp.perHour, 5);
    within(round(pct(1 + year / 100, 1 + person / 100) - 100, 1), 1.4, 0.05);
    within(round(pct(1 + year / 100, 1 + hour / 100) - 100, 1), 2.3, 0.05);
    stateIn("reading-a-gdp-headline", "roughly 1.4% over the year");
    stateIn("reading-a-gdp-headline", "roughly 2.3%");
    // a small country with invented figures: prices take most of 6%, population grows faster than what is left
    const real = 1.06 / 1.05;
    within(round((real - 1) * 100, 1), 1, 0.1);
    expect(real / 1.03).toBeLessThan(1);
    within(round((real / 1.03 - 1) * 100, 0), -2, 0);
    // the RBA's own case of a falling average: GDP up 2% in a year when the population is up 4%
    expect(1.02 / 1.04).toBeLessThan(1);
  });
});

describe("Which unemployment measure", () => {
  it("prints the October rows as the ABS gives them, in the table and in the figure", () => {
    expect(labour("Unemployment rate")).toEqual([4.7, 4.9, 0.1, 0.6]);
    expect(labour("Underemployment rate")).toEqual([6.3, 6.2, -0.1, 0.5]);
    expect(labour("Participation rate")).toEqual([66.8, 66.6, -0.2, -0.3]);
    expect(labour("Employment to population ratio")).toEqual([63.6, 63.3, -0.3, -0.7]);
    expect(labour("Employed people")).toEqual([14782200, 14738600, -43500, -0.3, 83500, 0.6]);
    expect(labour("Unemployed people")).toEqual([735800, 753700, 17800, 2.4, 95400, 14.5]);
    const words = figureWords("which-unemployment-measure", "other-measures", "finding");
    for (const word of [
      "4.7%",
      "4.9%",
      "6.3%",
      "6.2%",
      "11.1%",
      "66.8%",
      "66.6%",
      "63.6%",
      "63.3%",
    ])
      expect(words, word).toContain(word);
  });

  it("works the rates from the counts, and why the change is not the gap between rounded figures", () => {
    const rate = (unemployed: number, employed: number) => pct(unemployed, unemployed + employed);
    const sept = rate(735800, 14782200);
    const oct = rate(753700, 14738600);
    expect(round(sept, 1)).toBe(4.7);
    expect(round(oct, 1)).toBe(4.9);
    within(round(oct - sept, 1), 0.1, 0.01);
    // the gap between the rounded rates is 0.2, which the ABS's unrounded 0.1 explains
    within(round(4.9 - 4.7, 1), 0.2, 1e-9);
    within(14738600 - 14782200, -43500, 100);
    within(753700 - 735800, 17800, 100);
    // underutilisation adds the unemployed and the underemployed: unchanged at 11.1
    expect(round(4.9 + 6.2, 1)).toBe(11.1);
    expect(monthRow("absLabour", "Oct-26", 1)).toEqual([6.3, 6.2, 11.0, 11.1]);
    expect(monthRow("absLabour", "Sep-26", 1)).toEqual([6.3, 6.3, 11.0, 11.1]);
    stated("the underutilisation rate stayed at 11.1%");
  });

  it("works the RBA's labour force example and the new job seekers", () => {
    const labourForce = 12.6 + 0.7;
    within(round(labourForce, 1), 13.3, 1e-9);
    within(round(pct(0.7, labourForce), 1), 5.3, 1e-9);
    within(round(pct(labourForce, 20.0), 1), 66.5, 1e-9);
    within(round(20.0 - labourForce, 1), 6.7, 1e-9);
    // 0.1 million outside the labour force start looking and none find work
    const grown = labourForce + 0.1;
    within(round(pct(0.7 + 0.1, grown), 1), 6.0, 1e-9);
    within(round(pct(grown, 20.0), 1), 67.0, 1e-9);
    expect(round(pct(0.8, grown), 1)).toBeGreaterThan(round(pct(0.7, labourForce), 1));
    stated("0.8 ÷ 13.4 = 0.060, or 6.0%, and 13.4 ÷ 20.0 = 0.670, or 67.0%");
  });

  it("reads each confidence interval as the ABS prints it, and draws it", () => {
    const interval = (label: string) => {
      const line = fixture.figures.absLabourCi.find((item) =>
        item.startsWith(`| ${label} |`),
      ) as string;
      return [...line.slice(label.length + 3).matchAll(/-?[\d,]+(?:\.\d+)?/gu)].map((match) =>
        Number(match[0].replace(/,/gu, "")),
      );
    };
    const rows = {
      "Total Employment": [-43500, -109500, 22500],
      "Total Unemployment": [17800, -19600, 55200],
      "Unemployment rate": [0.1, -0.1, 0.3],
      "Participation rate": [-0.2, -0.4, 0],
    };
    for (const [label, expected] of Object.entries(rows))
      expect(interval(label), label).toEqual(expected);
    // an interval that includes zero leaves open that nothing changed
    for (const [, [change, low, high]] of Object.entries(rows) as Array<[string, number[]]>) {
      expect(low as number).toBeLessThanOrEqual(change as number);
      expect(high as number).toBeGreaterThanOrEqual(change as number);
      expect((low as number) * (high as number)).toBeLessThanOrEqual(0);
    }
    const words = figureWords("which-unemployment-measure", "one-month-is-a-sample", "intervals");
    for (const word of ["-109,500", "22,500", "-19,600", "55,200", "-0.4", "0.3"])
      expect(words, word).toContain(word);
  });

  it("reads the unemployment series, its low, its trend and the early months of 2024", () => {
    const months = monthRows("absLabour", 0, 34);
    expect(months).toHaveLength(34);
    expect(at(months, 0).month).toBe("Jan-24");
    expect(at(months, 33).month).toBe("Oct-26");
    const seasonal = months.map((row) => ({ month: row.month, rate: at(row.values, 1) }));
    const low = Math.min(...seasonal.map((row) => row.rate));
    expect(low).toBe(3.7);
    expect(seasonal.filter((row) => row.rate === low).map((row) => row.month)).toEqual(["Feb-24"]);
    expect(at(at(months, 33).values, 1)).toBe(4.9);
    // the four early months: seasonally adjusted 4.1, 3.7, 3.9, 4.1 against a trend of 3.9 to 4.0
    expect(months.slice(0, 4).map((row) => at(row.values, 1))).toEqual([4.1, 3.7, 3.9, 4.1]);
    expect(months.slice(0, 4).map((row) => at(row.values, 0))).toEqual([3.9, 4.0, 4.0, 4.0]);
    // the trend climbs from 4.3 in March to 4.8 in October, 0.5 points in seven months
    const march = at(months.find((row) => row.month === "Mar-26")?.values ?? [], 0);
    const october = at(at(months, 33).values, 0);
    expect([march, october]).toEqual([4.3, 4.8]);
    within(round(october - march, 1), 0.5, 1e-9);
    expect(
      months.findIndex((row) => row.month === "Oct-26") -
        months.findIndex((row) => row.month === "Mar-26"),
    ).toBe(7);
    expect(monthRow("absLabour", "Oct-25", 0)).toEqual([4.3, 4.3]);
  });
});

describe("What the CPI measures", () => {
  it("works the RBA's books and childcare basket", () => {
    within(round(pct(20.5 - 20, 20), 1), 2.5, 1e-9);
    within(round(pct(31.41 - 30, 30), 1), 4.7, 1e-9);
    within(round((2.5 + 4.7) / 2, 1), 3.6, 1e-9);
    within(round(0.73 * 4.7 + 0.27 * 2.5, 3), 4.106, 1e-9);
    expect(round(0.73 * 4.7 + 0.27 * 2.5, 1)).toBe(4.1);
    expect(0.73 + 0.27).toBe(1);
    stated("3.431 + 0.675 = 4.106");
  });

  it("reads the September release as the ABS gives it", () => {
    const text = fixture.figures.absCpi.join(" ");
    expect(text).toContain("rose 4.3%");
    expect(text).toContain("3.6%");
    expect(text).toContain("0.8% in original and 0.6% in seasonally adjusted");
    expect(rowOf("absCpi", "| Trimmed mean")).toEqual([0.3, 3.6]);
    expect(rowOf("absCpi", "| Weighted median")).toEqual([0.2, 3.4]);
    expect(rowOf("absCpi", "| CPI excluding volatile items*", 0)).toEqual([0.5, 3.7]);
    expect(rowOf("absCpi", "| All groups CPI |", 0)).toEqual([0.8, 4.3, 0.6, 4.4]);
    expect(rowOf("absCpi", "| | Transport")).toEqual([3.0, 8.7, 3.1, 8.7]);
    expect(rowOf("absCpi", "| | Housing")).toEqual([0.3, 5.2, 0.3, 5.2]);
    expect(rowOf("absCpi", "| | Clothing and footwear")).toEqual([-2.7, 0.4, -1.4, 0.9]);
    expect(rowOf("absCpi", "| | Recreation and culture")).toEqual([3.8, 4.5, 1.3, 4.5]);
    // each bar of the figure is the table's own figure, for the twelve months and for the month
    const groups: Array<[string, string]> = [
      ["Food", "Food and non-alcoholic beverages"],
      ["Alcohol and tobacco", "Alcohol and tobacco"],
      ["Clothing and footwear", "Clothing and footwear"],
      ["Housing", "Housing"],
      ["Furnishings", "Furnishings, household equipment and services"],
      ["Health", "Health"],
      ["Transport", "Transport"],
      ["Communication", "Communication"],
      ["Recreation and culture", "Recreation and culture"],
      ["Education", "Education"],
      ["Insurance and finance", "Insurance and financial services"],
    ];
    for (const [id, position] of [
      ["annual", 1],
      ["monthly", 0],
    ] as const) {
      const words = figureWords("what-the-cpi-measures", "reading-the-groups", id);
      for (const [name, label] of groups) {
        const shown = Number(words[words.indexOf(name) + 1]);
        expect(shown, `${id} ${name}`).toBe(at(rowOf("absCpi", `| | ${label}`), position));
      }
      const total = at(rowOf("absCpi", "| All groups CPI |", 0), position);
      expect(Number(words[words.indexOf("All groups") + 1]), id).toBe(total);
    }
    // headline and the trimmed mean at four dates, and the gap that runs either way
    expect(monthRow("absCpi", "Dec-22")).toEqual([7.9, 6.8]);
    expect(monthRow("absCpi", "Mar-26")).toEqual([4.6, 3.3]);
    expect(monthRow("absCpi", "Jun-25")).toEqual([1.9, 2.8]);
    expect(monthRow("absCpi", "Sep-26")).toEqual([4.3, 3.6]);
    within(round(4.6 - 3.3, 1), 1.3, 1e-9);
    within(round(2.8 - 1.9, 1), 0.9, 1e-9);
    stated(
      "In March 2026 headline was 1.3 points above the trimmed mean and in June 2025 it was 0.9 points below.",
    );
  });

  it("draws the trimmed mean from the 20 invented items: their average and the average of the middle 14", () => {
    const svg = figureSvg("what-the-cpi-measures", "how-the-trimmed-mean-is-made", "rank");
    const values = [...svg.matchAll(/<rect[^>]*y="([\d.]+)" width="24" height="([\d.]+)"/gu)]
      .map((match) => {
        const top = Number(match[1]);
        const height = Number(match[2]);
        return round((top >= 222 ? -height : height) / 14, 1);
      })
      .sort((a, b) => a - b);
    expect(values).toHaveLength(20);
    expect(at(values, 0)).toBe(-4.8);
    expect(at(values, 19)).toBe(9.4);
    within(round(sum(values) / 20, 1), 0.8, 1e-9);
    const middle = values.slice(3, 17);
    expect(middle).toHaveLength(14);
    within(round(sum(middle) / 14, 1), 0.4, 1e-9);
    expect(14 / 20).toBe(0.7);
    const average = figureWords("what-the-cpi-measures", "how-the-trimmed-mean-is-made", "average");
    expect(average).toContain("Average of all 20 items: 0.8%");
    expect(average).toContain("Trimmed mean (average of the middle 14): 0.4%");
    expect(average).toContain("middle 14 of 20 = 70 per cent");
  });
});

describe("Where inflation comes from", () => {
  it("works the wage and productivity case: equal rises leave the cost of a unit where it was", () => {
    expect(round(1.04 / 1.04, 6)).toBe(1);
    expect(1.04 / 1.02).toBeGreaterThan(1);
    expect(1.02 / 1.04).toBeLessThan(1);
  });

  it("states the Treasury and ABS fuel figures as the sources give them", () => {
    const text = fixture.figures.absCpi.join(" ");
    expect(text).toContain("Automotive fuel (+23.6%) was the main contributor");
    expect(text).toContain("Automotive fuel rose 9.4%");
    stateIn(
      "where-inflation-comes-from",
      "a 32.8% rise in automotive fuel prices in March lifted headline inflation to 4.6% over the 12 months to March",
    );
    stateIn(
      "where-inflation-comes-from",
      "automotive fuel up 23.6% over the 12 months to September, with a 9.4% rise in the month of September",
    );
  });
});

describe("What inflation costs and why the target is 2 to 3", () => {
  it("works the pay cases: the opening rise, the RBA's example, two workers and two pensions", () => {
    // 3.5% against 4.3%: a small fall
    const hook = 1.035 / 1.043 - 1;
    expect(hook).toBeLessThan(0);
    expect(hook).toBeGreaterThan(-0.01);
    // the RBA's worker: 5% less 2% is about 3%, and 105 buys 2.9% more
    within(round(pct(105 - 100, 100), 0) - 2, 3, 1e-9);
    within(round(105 / 1.02, 2), 102.94, 1e-9);
    within(round((105 / 1.02 / 100 - 1) * 100, 1), 2.9, 1e-9);
    // Worker A: 5% against 6%; Worker B frozen against 2%
    const a = (1.05 / 1.06 - 1) * 100;
    const b = (1 / 1.02 - 1) * 100;
    within(round(a, 0), -1, 0);
    within(round(b, 0), -2, 0);
    expect(b).toBeLessThan(a);
    // the unindexed pension buys about 4% less after 4.3% inflation
    within(round((1 / 1.043 - 1) * 100, 0), -4, 0);
    stated("roughly -1% for A and -2% for B");
  });

  it("reads the RBA's table of average inflation and draws it", () => {
    expect(rowOf("rbaTarget", "| CPI")).toEqual([9.3, 6.3, 2.6]);
    expect(rowOf("rbaTarget", "| Underlying")).toEqual([8.6, 6.3, 2.7]);
    const words = figureWords("what-inflation-costs", "the-record-since-targeting", "averages");
    for (const word of ["9.3", "6.3", "2.6", "8.6", "2.7", "Target range, 2 to 3"])
      expect(words, word).toContain(word);
    // the target range is 2 to 3 and its midpoint 2.5, and 2.6 is inside it
    expect((2 + 3) / 2).toBe(2.5);
    expect(2.6).toBeGreaterThan(2);
    expect(2.6).toBeLessThan(3);
  });
});

type Sheet = { cash: number; loan: number; deposit: number; equity: number };
/** The two lines of numbers of one of the Bulletin's figures B1 to B6 */
const islandFigure = (number: number) => {
  const lines = fixture.figures.island;
  const start = lines.findIndex((line) => line.startsWith(`Figure B${number}:`));
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("Figure B"));
  return (end < 0 ? rest : rest.slice(0, end)).map(numbersOf);
};

describe("How banks create money", () => {
  it("steps the RBA's island through its six balance sheets, and each one balances", () => {
    const a: Sheet = { cash: 100, loan: 0, deposit: 0, equity: 100 };
    const b: Sheet = { cash: 50, loan: 0, deposit: 0, equity: 50 };
    const balanced = (sheet: Sheet) => sheet.cash + sheet.loan === sheet.deposit + sheet.equity;
    const lineOne = () => [a.cash, a.deposit || a.equity, b.cash, b.deposit || b.equity];
    expect(islandFigure(1)).toEqual([[100, 100, 50, 50]]);
    // Bank A lends 80: a loan and a deposit, and the cash has not moved
    a.loan += 80;
    a.deposit += 80;
    expect(islandFigure(2)).toEqual([
      [a.cash, a.deposit, b.cash, b.equity],
      [a.loan, a.equity],
    ]);
    // the borrower withdraws 75
    a.cash -= 75;
    a.deposit -= 75;
    expect(islandFigure(3)).toEqual([
      [a.cash, a.deposit, b.cash, b.equity],
      [a.loan, a.equity],
    ]);
    // the business pays the 75 into Bank B
    b.cash += 75;
    b.deposit += 75;
    expect(islandFigure(4)).toEqual([
      [a.cash, a.deposit, b.cash, b.deposit],
      [a.loan, a.equity, b.equity],
    ]);
    // Bank B lends 40, which is withdrawn in full
    b.loan += 40;
    b.deposit += 40;
    b.cash -= 40;
    b.deposit -= 40;
    expect(islandFigure(5)).toEqual([
      [a.cash, a.deposit, b.cash, b.deposit],
      [a.loan, a.equity, b.loan, b.equity],
    ]);
    // the merchant pays the 40 into Bank A
    a.cash += 40;
    a.deposit += 40;
    expect(islandFigure(6)).toEqual([
      [a.cash, a.deposit, b.cash, b.deposit],
      [a.loan, a.equity, b.loan, b.equity],
    ]);
    expect(balanced(a) && balanced(b)).toBe(true);
    expect(lineOne()).toEqual([65, 45, 85, 75]);
    // loans of 80 and 40 make 120, and deposits of 45 and 75 make 120
    expect(a.loan + b.loan).toBe(120);
    expect(a.deposit + b.deposit).toBe(120);
  });

  it("prints the lesson's figures with the totals of those sheets", () => {
    const loan = figureWords("how-banks-create-money", "the-first-loan", "loan");
    expect(loan.filter((word) => word === "180")).toHaveLength(2);
    const withdrawal = figureWords("how-banks-create-money", "the-first-loan", "withdrawal");
    expect(withdrawal.filter((word) => word === "105")).toHaveLength(2);
    const payment = figureWords("how-banks-create-money", "the-first-loan", "payment");
    expect(payment.filter((word) => word === "125")).toHaveLength(3);
    expect(payment).toContain("Loans across the two banks: 80. Deposits: 5 + 75 = 80.");
    // total assets of Bank A after the first loan: 100 + 80, against 80 + 100
    expect(100 + 80).toBe(80 + 100);
    // had the business banked at Bank A, all 80 of the deposits would sit there
    expect(5 + 75).toBe(80);
    const both = figureWords("how-banks-create-money", "what-limits-a-bank", "both");
    for (const word of ["65", "45", "85", "75"]) expect(both, word).toContain(word);
    expect(both).toContain("Loans: 80 + 40 = 120. Deposits: 45 + 75 = 120.");
  });

  it("shows why a loan of 120 breaks both limits, and works the repayment and the grant", () => {
    const cash = 100;
    const equity = 100;
    expect(120).toBeGreaterThan(cash);
    expect(120).toBeGreaterThan(equity);
    const big = figureWords("how-banks-create-money", "what-limits-a-bank", "big");
    expect(big.filter((word) => word === "120").length).toBeGreaterThanOrEqual(2);
    // repaying 10,000 removes a deposit of 10,000 together with the loan: the total of money falls by 10,000
    const money = (deposits: number, notes: number) => deposits + notes;
    expect(money(50_000, 5_000) - money(40_000, 5_000)).toBe(10_000);
    // a grant of 2,000 funded by the sale of bonds to a fund moves 2,000 between deposits: the total is unchanged
    expect(money(20_000 + 2_000, 0) + money(30_000 - 2_000, 0)).toBe(
      money(20_000, 0) + money(30_000, 0),
    );
    // paying notes into an account swaps one form of money for the other
    expect(money(1_000 + 400, 600 - 400)).toBe(money(1_000, 600));
  });
});

describe("The cash rate and the rates you pay", () => {
  const corridor = (target: number) => ({
    floor: round(target - 0.1, 2),
    ceiling: round(target + 0.25, 2),
  });

  it("works the corridor around the target before and after 3 November", () => {
    expect(corridor(4.6)).toEqual({ floor: 4.5, ceiling: 4.85 });
    expect(corridor(4.85)).toEqual({ floor: 4.75, ceiling: 5.1 });
    const before = figureWords("the-cash-rate-and-the-rates-you-pay", "the-cash-rate", "before");
    for (const word of ["Ceiling 4.85", "Target 4.60", "Floor 4.50"])
      expect(before, word).toContain(word);
    const after = figureWords("the-cash-rate-and-the-rates-you-pay", "the-cash-rate", "after");
    for (const word of ["Ceiling 5.10", "Target 4.85", "Floor 4.75"])
      expect(after, word).toContain(word);
    // the band moves by the 0.25 the target moved
    within(round(corridor(4.85).floor - corridor(4.6).floor, 2), 0.25, 1e-9);
    // Bank P could earn 4.75 from the Reserve Bank, and Bank Q offers 4.50
    expect(corridor(4.85).floor).toBeGreaterThan(4.5);
  });

  it("reads the seven decisions as the statements give them, and draws them", () => {
    expect(decisions.map((item) => item.date)).toEqual([
      "3 February 2026",
      "17 March 2026",
      "5 May 2026",
      "16 June 2026",
      "11 August 2026",
      "29 September 2026",
      "3 November 2026",
    ]);
    const words = figureWords("the-cash-rate-and-the-rates-you-pay", "the-2026-decisions", "votes");
    for (const item of decisions) expect(words, item.date).toContain(item.target.toFixed(2));
    const split = (item: (typeof decisions)[number]) =>
      item.counts.map((word) => WORDS[word] as number);
    for (const item of decisions.filter((entry) => !entry.unanimous)) {
      const [yes, no] = split(item) as [number, number];
      expect(yes + no).toBe(9);
      expect(words, item.date).toContain(`${yes} to ${no}`);
    }
    expect(words.filter((word) => word === "unanimous")).toHaveLength(4);
    // the margins the two-votes question compares: one vote in March and three in November
    const [march, , november] = decisions.filter((item) => !item.unanimous).map(split) as Array<
      [number, number]
    >;
    expect((march as [number, number])[0] - (march as [number, number])[1]).toBe(1);
    expect((november as [number, number])[0] - (november as [number, number])[1]).toBe(3);
    for (const date of [
      "3 February",
      "17 March",
      "5 May",
      "16 June",
      "11 August",
      "29 September",
      "3 November",
    ])
      stateIn("the-cash-rate-and-the-rates-you-pay", date);
    // three rises came before the hold in June, and the hold was followed by a rise
    expect(decisions.slice(0, 3).every((item) => !item.held)).toBe(true);
    expect((decisions[3] as { held: boolean }).held).toBe(true);
    expect((decisions[5] as { held: boolean }).held).toBe(false);
  });
});

describe("How a rate change travels", () => {
  it("counts the rises before the June statement and the months between a rise and a vote", () => {
    // three rises since February by 16 June
    expect(decisions.slice(0, 3).filter((item) => !item.held)).toHaveLength(3);
    expect((decisions[3] as { date: string }).date).toBe("16 June 2026");
    // 3 February to 3 November is nine months
    const months = (from: [number, number], to: [number, number]) =>
      (to[0] - from[0]) * 12 + (to[1] - from[1]);
    expect(months([2026, 2], [2026, 11])).toBe(9);
    stated("The first rise was on 3 February, nine months before this vote");
    // the invented central bank raised in March and April and reports in October: seven and six months
    expect(months([2026, 3], [2026, 10])).toBe(7);
    expect(months([2026, 4], [2026, 10])).toBe(6);
    stated("after six or seven months");
    // the lag the RBA gives is one to two years: twelve to twenty-four months
    expect(months([2026, 2], [2026, 11])).toBeLessThan(12);
  });

  it("prints what each of four statements said, on the dates of those statements", () => {
    const cases = figureCases("how-a-rate-change-travels", "the-2026-evidence");
    expect(cases.map((item) => item.id)).toEqual(["jun", "aug", "sep", "nov"]);
    const dates = ["16 June", "11 August", "29 September", "3 November"];
    for (const [index, item] of cases.entries()) {
      const words = figureWords("how-a-rate-change-travels", "the-2026-evidence", item.id).join(
        " ",
      );
      expect(words, item.id).toContain(dates[index] as string);
    }
  });
});

describe("Booms, slowdowns and recessions", () => {
  const quarter = (month: string) => at(monthRow("absGdp", month), 0);
  const year = (month: string) => at(monthRow("absGdp", month), 1);

  it("reads the quarterly GDP series as the ABS gives it", () => {
    expect([quarter("Jun-21"), quarter("Sep-21"), quarter("Dec-21")]).toEqual([0.7, -1.8, 3.7]);
    expect([quarter("Mar-20"), quarter("Jun-20"), quarter("Sep-20"), quarter("Dec-20")]).toEqual([
      -0.2, -6.8, 3.4, 3.4,
    ]);
    expect([year("Jun-20"), year("Jun-21"), year("Sep-21"), year("Jun-26")]).toEqual([
      -5.8, 10.2, 4.7, 2.1,
    ]);
    expect([quarter("Dec-25"), quarter("Mar-26"), quarter("Jun-26")]).toEqual([0.9, 0.3, 0.4]);
    const months = fixture.figures.absGdp.filter((line) => /^\| [A-Z][a-z]{2}-\d\d \|/u.test(line));
    expect(months).toHaveLength(33);
    // the fall in the year to June 2026 is the product of its last four quarters
    const product = ["Sep-25", "Dec-25", "Mar-26", "Jun-26"].reduce(
      (total, month) => total * (1 + quarter(month) / 100),
      1,
    );
    within(round((product - 1) * 100, 1), year("Jun-26"), 0.15);
    const fall = ["Dec-20", "Mar-21", "Jun-21", "Sep-21"].reduce(
      (total, month) => total * (1 + quarter(month) / 100),
      1,
    );
    within(round((fall - 1) * 100, 1), year("Sep-21"), 0.3);
    const words = figureWords("booms-slowdowns-and-recessions", "reading-the-series", "year");
    expect(words.length).toBeGreaterThan(0);
  });

  it("applies the technical test to 1990 to 2026 as the lesson does", () => {
    const names = fixture.figures.absGdp
      .filter((line) => /^\| [A-Z][a-z]{2}-\d\d \|/u.test(line))
      .map((line) => ({
        month: cells(line)[0] as string,
        growth: cellNumber(cells(line)[1] as string),
      }));
    const negative = names.filter((item) => item.growth < 0).map((item) => item.month);
    expect(negative).toEqual(["Mar-20", "Jun-20", "Sep-21"]);
    // two negative quarters in a row: March and June 2020, and no other pair
    const index = (month: string) => names.findIndex((item) => item.month === month);
    expect(index("Jun-20") - index("Mar-20")).toBe(1);
    expect(index("Sep-21") - index("Jun-20")).toBeGreaterThan(1);
    // the lowest level: the index after Dec-19 is lowest in June 2020 and still below 100 in December 2020
    let level = 100;
    const path = ["Mar-20", "Jun-20", "Sep-20", "Dec-20"].map(
      (month) => (level *= 1 + quarter(month) / 100),
    );
    expect(path.indexOf(Math.min(...path))).toBe(1);
    expect(at(path, 3)).toBeLessThan(100);
    expect(at(path, 2)).toBeGreaterThan(at(path, 1));
  });

  it("tests 2026 against each rule: both quarters grew, and unemployment rose by 0.6 of a point", () => {
    expect([quarter("Mar-26"), quarter("Jun-26")]).toEqual([0.3, 0.4]);
    expect(gdp.perPerson.slice(3, 5)).toEqual([-0.1, 0]);
    const october = at(monthRow("absLabour", "Oct-26", 0), 1);
    const yearBefore = at(monthRow("absLabour", "Oct-25", 0), 1);
    within(round(october - yearBefore, 1), 0.6, 1e-9);
    expect(labour("Unemployment rate")[3]).toBe(0.6);
    // an invented rule of more than 0.5 of a point is met, and one of more than 1 point is not
    expect(0.6).toBeGreaterThan(0.5);
    expect(0.6).toBeLessThan(1);
    // the technical test is not met by either measure of output
    expect([0.3, 0.4].some((value) => value < 0)).toBe(false);
  });
});

describe("Budgets, deficits and debt", () => {
  const deficit = budgetRow("Underlying cash balance");
  const receipts = budgetRow("Receipts");
  const payments = budgetRow("Payments");
  const gross = budgetRow("Gross debt");
  const net = budgetRow("Net debt");
  const interest = budgetRow("Net interest payments");
  const deficitShare = budgetRow("Underlying cash balance per cent of GDP");
  const grossShare = budgetRow("Gross debt per cent of GDP");
  const netShare = budgetRow("Net debt per cent of GDP");
  const interestShare = budgetRow("Net interest payments per cent of GDP");

  it("reads Table 3.1 as the Budget prints it", () => {
    expect(deficit.slice(0, 6)).toEqual([-10, -28.3, -31.5, -31, -34.4, -25.3]);
    expect(deficitShare).toEqual([-0.4, -1, -1, -1, -1, -0.7, 0.8]);
    expect(receipts.slice(0, 6)).toEqual([717, 759.8, 798.1, 822.9, 848.4, 894.8]);
    expect(payments.slice(0, 6)).toEqual([726.9, 788.1, 829.6, 853.9, 882.8, 920.1]);
    expect(gross.slice(0, 6)).toEqual([928.6, 982, 1051, 1120, 1193, 1249]);
    expect(grossShare).toEqual([33.4, 33.1, 34, 35.2, 35.8, 35.6, 27.2]);
    expect(netShare).toEqual([19.2, 18.8, 19.9, 21, 21.8, 21.9, 15.1]);
    expect(net.slice(0, 6)).toEqual([532.3, 556, 616.6, 668.8, 725.5, 767.8]);
    expect(interest.slice(0, 6)).toEqual([13.7, 17.7, 19.9, 26.7, 28, 31.7]);
    expect(interestShare).toEqual([0.5, 0.6, 0.6, 0.8, 0.8, 0.9, 1]);
    // the figures print the rows the table gives
    const dollars = figureWords("budgets-deficits-and-debt", "reading-the-table", "dollars");
    for (const value of [...receipts.slice(0, 6), ...payments.slice(0, 6), ...deficit.slice(0, 6)])
      expect(dollars, String(value)).toContain(value.toFixed(1));
    for (const [id, row] of [
      ["gross", grossShare],
      ["net", netShare],
      ["interest", interestShare],
    ] as const) {
      const words = figureWords("budgets-deficits-and-debt", "deficit-debt-and-interest", id);
      for (const value of row) expect(words, `${id} ${value}`).toContain(value.toFixed(1));
    }
  });

  it("works the deficit as receipts less payments, as a share of GDP, and the gap between the two debts", () => {
    for (const [index, balance] of deficit.slice(0, 6).entries())
      within(round(at(receipts, index) - at(payments, index), 1), balance, 0.15, `year ${index}`);
    // the 2026-27 deficit of 31.5 is 1.0% of the economy that receipts of 798.1 at 25.8% of GDP imply
    const gdp2627 = at(receipts, 2) / (at(budgetRow("Receipts per cent of GDP"), 2) / 100);
    within(round(pct(31.5, gdp2627), 1), 1, 0.05);
    expect(round(at(grossShare, 2) - at(netShare, 2), 1)).toBe(14.1);
    // between 2025-26 and 2028-29 the dollar deficit moves from 28.3 to 34.4 while the share stays at 1.0
    const middle = deficit.slice(1, 5).map((value) => -value);
    expect([Math.min(...middle), Math.max(...middle)]).toEqual([28.3, 34.4]);
    expect(deficitShare.slice(1, 5).every((value) => value === -1)).toBe(true);
    // gross debt peaks at 35.8 in 2028-29, and falls to 27.2 by 2036-37
    const top = Math.max(...grossShare.slice(0, 6));
    expect(top).toBe(35.8);
    expect(grossShare.indexOf(top)).toBe(4);
  });

  it("works the dollars against the shares and the interest bill", () => {
    // gross debt rises by a third in dollars and by 2.2 points as a share
    const dollars = at(gross, 5) / at(gross, 0);
    expect(dollars).toBeGreaterThan(1.3);
    expect(dollars).toBeLessThan(1.4);
    expect(round(at(grossShare, 5) - at(grossShare, 0), 1)).toBe(2.2);
    // from 2026-27 to 2029-30 the debt ratio rises by under 5% and the interest bill by half
    const ratio = at(grossShare, 5) / at(grossShare, 2) - 1;
    expect(ratio).toBeGreaterThan(0.04);
    expect(ratio).toBeLessThan(0.05);
    within(at(interestShare, 5) / at(interestShare, 2) - 1, 0.5, 1e-9);
    expect([at(interest, 2), at(interest, 5)]).toEqual([19.9, 31.7]);
    // the structural deficit of 1.6 in 2025-26 is larger than the cash deficit of 1.0
    expect(1.6).toBeGreaterThan(-at(deficitShare, 1));
  });

  it("compares the two invented countries by their deficit as a share of GDP", () => {
    const x = pct(50, 2000);
    const y = pct(5, 40);
    expect(x).toBe(2.5);
    expect(y).toBe(12.5);
    expect(y / x).toBe(5);
    expect(2000 / 40).toBe(50);
    expect(50 / 5).toBe(10);
    stated(
      "Y's deficit is about 12.5 per cent of its GDP and X's is 2.5 per cent, so Y's is five times as large relative to its economy.",
    );
  });
});

describe("Stabilisers, multipliers and their limits", () => {
  /** The rounds of spending after a first round of 10, with a share of each dollar passed on */
  const rounds = (passed: number, first = 10) => {
    const list = [first];
    for (let i = 1; i < 4; i += 1) list.push(round((list[i - 1] as number) * passed, 4));
    const total = first / (1 - passed);
    return { list, total, later: round(total - sum(list), 2) };
  };

  it("works the RBA's wind farm: rounds of 10, 8, 6.4 and 5.12, and a multiplier of 5", () => {
    const eight = rounds(0.8);
    expect(eight.list).toEqual([10, 8, 6.4, 5.12]);
    expect(eight.later).toBe(20.48);
    expect(round(eight.total, 6)).toBe(50);
    expect(round(1 / (1 - 0.8), 6)).toBe(5);
    const five = rounds(0.5);
    expect(five.list).toEqual([10, 5, 2.5, 1.25]);
    expect(five.later).toBe(1.25);
    expect(five.total).toBe(20);
    expect(round(1 / (1 - 0.5), 6)).toBe(2);
    const words = (id: string) =>
      figureWords("stabilisers-multipliers-and-their-limits", "spending-becomes-income", id);
    for (const word of ["$10m", "$8m", "$6.4m", "$5.12m", "$20.48m", "$50m"])
      expect(words("spend-eight"), word).toContain(word);
    for (const word of ["$10m", "$5m", "$2.5m", "$1.25m", "$20m"])
      expect(words("spend-five"), word).toContain(word);
  });

  it("works the cases that change the size: saving most, an import leak, and what the excise cut saves", () => {
    // 2 of every 10 passed on: 10, 2, 0.4 and about 12.5 in all, a little above the first 10
    const little = rounds(0.2);
    expect(little.list.slice(0, 3)).toEqual([10, 2, 0.4]);
    expect(round(little.total, 1)).toBe(12.5);
    // imports take 2 of the 8 the engineers spend, so 6 of every 10 are passed on and the total is half of 50
    const imports = rounds(0.6);
    expect(round(imports.total, 6)).toBe(25);
    expect(round(imports.total, 6)).toBe(50 / 2);
    // 32 cents a litre, a 65-litre tank and GST on the difference come to nearly $23
    within(round(65 * 0.32 * 1.1, 2), 22.88, 1e-9);
    expect(65 * 0.32 * 1.1).toBeLessThan(23);
    expect(65 * 0.32 * 1.1).toBeGreaterThan(22.5);
  });
});

describe("The dollar and the current account", () => {
  it("reads AUD/USD as US cents per Australian dollar", () => {
    for (const [id, cents] of [
      ["rate-070", 70],
      ["rate-075", 75],
      ["rate-080", 80],
    ] as const) {
      const words = figureWords("the-dollar-and-the-current-account", "reading-audusd", id);
      expect(
        words.some((word) => word.includes(String(cents))),
        id,
      ).toBe(true);
    }
    // 0.75 to 0.70 and 0.80 to 0.78 are falls: a depreciation of the Australian dollar, so the US dollar gains
    for (const [from, to] of [
      [0.75, 0.7],
      [0.8, 0.78],
    ] as const)
      expect(to).toBeLessThan(from);
    expect(round(100 * 0.7, 0)).toBe(70);
    stated("it now buys 70 US cents where it bought 75");
  });

  it("enters the RBA's three examples twice, so the two accounts sum to zero", () => {
    const entries: Array<{ account: "current" | "financial"; amount: number }> = [
      { account: "current", amount: 100 },
      { account: "financial", amount: -100 },
      { account: "current", amount: -5 },
      { account: "financial", amount: 5 },
      { account: "financial", amount: -20 },
      { account: "financial", amount: 20 },
    ];
    const total = (account: "current" | "financial") =>
      sum(entries.filter((entry) => entry.account === account).map((entry) => entry.amount));
    expect(total("current")).toBe(95);
    expect(total("financial")).toBe(-95);
    expect(total("current") + total("financial")).toBe(0);
    const words = figureWords(
      "the-dollar-and-the-current-account",
      "two-sides",
      "rba-examples",
    ).join(" ");
    expect(words).toContain("95");
    // the 2 million of imported cars is entered the same way: an import and its payment cancel
    const cars = [-2, 2];
    expect(sum(cars)).toBe(0);
  });

  it("reads the terms of trade and the five rises as the sources give them", () => {
    expect(gdp.termsOfTrade).toEqual([-0.8, -0.1, 0.1, 1.0, -1.6, -0.6]);
    expect(decisions.filter((item) => !item.held)).toHaveLength(5);
    stated("raised the cash rate target at five meetings");
  });
});

describe("Why some economies grow faster", () => {
  it("works the RBA's toy factory: 3 dolls an hour, and an MFP index of 101.9", () => {
    expect(120 / 40).toBe(3);
    expect(150 / 50).toBe(3);
    expect(150 / 120).toBe(1.25);
    expect(rowOf("mfp", "| Year 2")).toEqual([107, 105, 101.9]);
    within(round((107 / 105) * 100, 1), 101.9, 1e-9);
    within(round((107 / 105) * 100 - 100, 1), 1.9, 1e-9);
    // an invented bakery makes 4% more with 6% more inputs: MFP falls
    within(round((104 / 106) * 100, 1), 98.1, 1e-9);
    expect((104 / 106) * 100).toBeLessThan(100);
    // in the hook's two invented economies the same 3% of growth has different sources: hours or output per hour
    expect(round(1.03 * 1.0, 2)).toBe(round(1.0 * 1.03, 2));
    expect(1.03 * 1.0).toBe(1.03);
  });

  it("compounds the UK and US incomes and the two illustrative paths", () => {
    // 1870 to 2008 is 138 years
    expect(2008 - 1870).toBe(138);
    within(4808 * 1.0147 ** 138, 36130, 36130 * 0.02);
    within(4007 * 1.018 ** 138, 46970, 46970 * 0.01);
    within(round(pct(4808 - 4007, 4007), 0), 20, 0);
    within(round(pct(46970 - 36130, 36130), 0), 30, 0);
    within(round(1.8 - 1.47, 2), 0.33, 1e-9);
    // 1% a year and 2% a year from the same start
    within(round(1.01 ** 70, 1), 2.0, 0);
    within(round(1.02 ** 70, 1), 4.0, 0);
    within(round(1.01 ** 35, 1), 1.4, 0);
    within(round(1.02 ** 35, 1), 2.0, 0);
    const paths = figureWords("why-some-economies-grow-faster", "compounding", "two-paths");
    expect(paths).toContain("2% a year: 4.0");
    expect(paths).toContain("1% a year: 2.0");
    const countries = figureWords("why-some-economies-grow-faster", "compounding", "uk-and-us");
    for (const word of ["$4,808", "$36,130", "$4,007", "$46,970"])
      expect(countries, word).toContain(word);
  });
});

describe("Reading a central bank statement", () => {
  const smpRows = (label: string, nth = 0) => rowOf("smp", label, nth);
  const previous = (nth: number) => rowOf("smp", "| (previous)", nth);

  it("reads the November forecast table as the RBA prints it, current and previous", () => {
    expect(smpRows("| GDP growth", 0)).toEqual([2.1, 1.6, 1.6, 1.3, 1.3, 1.5]);
    expect(previous(0)).toEqual([1.9, 1.4, 1.5, 1.6, 1.6, 1.8]);
    expect(smpRows("| Unemployment rate")).toEqual([4.4, 4.7, 4.8, 4.9, 5.0, 5.1]);
    expect(previous(1)).toEqual([4.4, 4.5, 4.6, 4.7, 4.8, 4.8]);
    expect(smpRows("| Cash rate")).toEqual([4.3, 4.7, 4.9, 4.8, 4.8, 4.8]);
    expect(fixture.figures.smp).toContain("| | 2025/26 | 2026 | 2026/27 | 2027 | 2027/28 | 2028");
    // the third column of the year-average block is 2026/27, and the target on 28 October was 4.60
    expect(at(smpRows("| Cash rate"), 2)).toBe(4.9);
    expect((decisions[5] as { target: number }).target).toBe(4.6);
    expect((decisions[6] as { target: number }).target).toBeLessThan(at(smpRows("| Cash rate"), 2));
  });

  it("works the revisions: growth up for three dates and down for three, unemployment up at five", () => {
    const growth = smpRows("| GDP growth", 0).map((value, index) =>
      round(value - at(previous(0), index), 1),
    );
    expect(growth).toEqual([0.2, 0.2, 0.1, -0.3, -0.3, -0.3]);
    const unemployment = smpRows("| Unemployment rate").map((value, index) =>
      round(value - at(previous(1), index), 1),
    );
    expect(unemployment).toEqual([0, 0.2, 0.2, 0.2, 0.2, 0.3]);
    stated(
      "The forecasts for the first three dates are 0.2, 0.2 and 0.1 higher, and the last three are 0.3 lower.",
    );
    const words = figureWords(
      "reading-a-central-bank-statement",
      "forecasts-and-risks",
      "unemployment",
    );
    for (const value of smpRows("| Unemployment rate"))
      expect(words, String(value)).toContain(value.toFixed(1));
    for (const value of unemployment)
      expect(words, String(value)).toContain(value === 0 ? "0.0" : `+${value.toFixed(1)}`);
  });

  it("reads the ABS participation row and the votes the statement table prints", () => {
    expect(labour("Participation rate")).toEqual([66.8, 66.6, -0.2, -0.3]);
    expect(labour("Unemployment rate").slice(0, 2)).toEqual([4.7, 4.9]);
    // four of the nine preferred no change in March, three in November
    const against = decisions
      .filter((item) => !item.unanimous)
      .map((item) => WORDS[item.counts[1] as string] as number);
    expect(against).toEqual([4, 1, 3]);
    const words = figureWords(
      "reading-a-central-bank-statement",
      "what-the-board-says-it-will-do",
      "decisions-2026",
    );
    for (const value of [
      "Raised to 3.85",
      "Raised to 4.10",
      "Held at 4.35",
      "Raised to 4.60",
      "Raised to 4.85",
      "5 to 4",
      "8 to 1",
      "6 to 3",
    ])
      expect(words, value).toContain(value);
    expect(words.filter((word) => word === "Unanimous")).toHaveLength(4);
    // the last column agrees with the statements
    expect(words.filter((word) => word === "Yes")).toHaveLength(
      decisions.filter((item) => item.furtherRise).length,
    );
    // the cash rate before the August hold and the September rise
    expect([
      (decisions[4] as { target: number }).target,
      (decisions[5] as { target: number }).target,
    ]).toEqual([4.35, 4.6]);
  });
});
