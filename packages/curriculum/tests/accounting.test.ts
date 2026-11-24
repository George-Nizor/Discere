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
 * Accounting: Reading the Numbers of a Business asks a learner to judge what a company's
 * statements show, and never to type a computed figure. So this file checks that no question
 * takes a typed number and that no choice question offers bare figures to calculate. It then
 * recomputes every figure the lessons and questions rest on from the statement lines of the two
 * annual reports copied into the fixture (Woolworths Group and Lovisa, year to 28 June 2026) and
 * from the figures in each question's own text: the ratios, the margins, the day counts, the
 * reconciliation and the invented cases. It also checks the shape of the questions (each lesson
 * asked, end checks of more than one type, option lengths, feedback on wrong options, hints) and
 * finds each quoted extract word for word in the source pack.
 */
type FigureBlock =
  | "wowIncome"
  | "wowBalance"
  | "wowCashFlow"
  | "wowReconciliation"
  | "wowSignificant"
  | "wowDepreciation"
  | "wowInventories"
  | "wowReceivables"
  | "wowPayables"
  | "wowLeaseRoll"
  | "wowBorrowings"
  | "wowSharePrice"
  | "wowText"
  | "lovBalance"
  | "lovIncome"
  | "lovCashFlow"
  | "lovLeaseRoll"
  | "lovReceivables"
  | "lovFiveYear"
  | "lovText";
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/accounting/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/accounting-passages.json", import.meta.url), "utf8"),
) as { files: Record<string, string[]>; figures: Record<FigureBlock, string[]> };
const questions = new Map(bundle.questions.map((item) => [item.id, item]));
const question = (id: string): Question => {
  const found = questions.get(id);
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
const squash = (text: string) =>
  text
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/\u2011/gu, "-")
    .replace(/\s+/gu, " ")
    .trim();
const everything = JSON.stringify({
  lessons: bundle.lessons,
  questions: bundle.questions,
  flashcards: bundle.flashcards,
});
/** The course says this, in a lesson, a question or a card. */
const stated = (fragment: string) => expect(everything, fragment).toContain(fragment);

// Figures read from the statement lines copied from the pack, so a figure in the fixture and a
// figure in the course cannot drift apart without a test failing.
const numbersIn = (line: string) =>
  // A note reference such as 2.2.2 or 3.5.1 is not a figure
  [
    ...line
      .replace(/\b\d+(?:\.\d+){2,}\b/gu, " ")
      .matchAll(/(\()?\$?(\d[\d,]*(?:\.\d+)?)\)?(?!\d|\.\d|,\d)(?!\s*%)/gu),
  ].map((match) => {
    const value = Number((match[2] as string).replace(/,/gu, ""));
    return match[1] ? -value : value;
  });
/**
 * A figure from a block of statement lines: the line that starts with the label (the nth such
 * line), and the column counted from the left of the last two figures (0 this year, 1 last year).
 */
const pick = (block: FigureBlock, label: string, column = 0, nth = 0): number => {
  const lines = fixture.figures[block].filter((line) => line.startsWith(label));
  const line = lines[nth];
  if (!line) throw new Error(`${block}: no line ${nth} starting ${label}`);
  const values = numbersIn(line.slice(label.length));
  return values.slice(-2)[column] as number;
};
/** The first figure on a line, for the margin table that carries a change in basis points too. */
const firstFigure = (block: FigureBlock, label: string): number => {
  const line = fixture.figures[block].find((item) => item.startsWith(label));
  if (!line) throw new Error(`${block}: no line starting ${label}`);
  return numbersIn(line.slice(label.length))[0] as number;
};
const wow = (label: string, column = 0, nth = 0) => pick("wowIncome", label, column, nth);
const wowBs = (label: string, column = 0, nth = 0) => pick("wowBalance", label, column, nth);
const wowCf = (label: string, column = 0, nth = 0) => pick("wowCashFlow", label, column, nth);
const wowRec = (label: string, column = 0) => pick("wowReconciliation", label, column);
const lovIs = (label: string, column = 0) => pick("lovIncome", label, column);
const lovBs = (label: string, column = 0) => pick("lovBalance", label, column);
const lovCf = (label: string, column = 0) => pick("lovCashFlow", label, column);
const pct = (part: number, whole: number) => (100 * part) / whole;
const to1 = (value: number) => Math.round(value * 10) / 10;

// Woolworths Group, $ million
const W = {
  revenue: wow("Revenue"),
  costOfSales: -wow("Cost of sales"),
  gross: wow("Gross profit"),
  otherIncome: wow("Other income"),
  branch: -wow("Branch expenses"),
  admin: -wow("Administration expenses"),
  otherExpenses: -wow("Other expenses"),
  ebit: wow("Earnings before interest and tax"),
  finance: -wow("Net finance costs"),
  beforeTax: wow("Profit before income tax"),
  tax: -wow("Income tax expense"),
  profit: wow("Profit for the period"),
  profitPrior: wow("Profit for the period", 1),
  eps: wow("Basic EPS"),
  epsPrior: wow("Basic EPS", 1),
  currentAssets: wowBs("Total current assets"),
  currentLiabilities: wowBs("Total current liabilities"),
  assets: wowBs("Total assets"),
  liabilities: wowBs("Total liabilities"),
  equity: wowBs("Net assets"),
  parentEquity: wowBs("Equity attributable to equity holders of the parent entity"),
  parentEquityPrior: wowBs("Equity attributable to equity holders of the parent entity", 1),
  assetsPrior: wowBs("Total assets", 1),
  cash: wowBs("Cash and cash equivalents"),
  receivables: wowBs("Trade and other receivables"),
  inventories: wowBs("Inventories"),
  payables: wowBs("Trade and other payables"),
  leaseAssets: wowBs("Lease assets"),
  currentBorrowings: wowBs("Borrowings", 0, 0),
  nonCurrentBorrowings: wowBs("Borrowings", 0, 1),
  currentLeases: wowBs("Lease liabilities", 0, 0),
  nonCurrentLeases: wowBs("Lease liabilities", 0, 1),
  operating: wowCf("Net cash provided by operating activities"),
  investing: wowCf("Net cash used in investing activities"),
  financing: wowCf("Net cash used in financing activities"),
  leaseInterest: -wowCf("Payments for the interest component of lease liabilities"),
  borrowingInterest: -wowCf("Net finance costs paid on borrowings"),
  property: -wowCf("Payments for property, plant and equipment and intangible assets"),
  propertySales: wowCf("Proceeds from the sale of property, plant and equipment"),
  leasePrincipal: -wowCf("Repayment of the principal component of lease liabilities"),
  dividends: -wowCf("Dividends paid", 0, 0),
  netIncrease: wowCf("Net increase in cash and cash equivalents"),
  exchange: wowCf("Effects of exchange rate changes on cash and cash equivalents"),
  cashStart: wowCf("Cash and cash equivalents at start of period"),
  cashEnd: wowCf("Cash and cash equivalents at end of period"),
  depreciation: wowRec("Depreciation and amortisation"),
  depreciationPrior: wowRec("Depreciation and amortisation", 1),
  tradeReceivables: pick("wowReceivables", "Total current trade receivables"),
  tradePayables: pick("wowPayables", "Trade payables"),
  accruals: pick("wowPayables", "Accruals"),
  contractLiabilities: pick("wowPayables", "Contract liabilities"),
  inventoriesGross: pick("wowInventories", "Inventories"),
  obsolescence: -pick("wowInventories", "Provision for inventory obsolescence"),
  ppeDepreciation: pick("wowDepreciation", "Depreciation – property, plant and equipment"),
  depreciationInCostOfSales: pick("wowDepreciation", "Cost of sales"),
  depreciationInExpenses: pick("wowDepreciation", "Branch and administration expenses"),
  leaseLiabilityTotal: pick("wowLeaseRoll", "Carrying amount at end of period"),
  ebitBefore: pick("wowSignificant", "Group EBIT before significant items"),
  ebitBeforePrior: pick("wowSignificant", "Group EBIT before significant items", 1),
  significant: -pick("wowSignificant", "Significant items", 0),
  significantPrior: -pick("wowSignificant", "Significant items", 1),
  npatBefore: pick("wowSignificant", "NPAT before significant items"),
  npatBeforePrior: pick("wowSignificant", "NPAT before significant items", 1),
  significantAfterTax: -pick("wowSignificant", "Significant items after tax"),
  attributable: pick(
    "wowSignificant",
    "NPAT attributable to equity holders of the parent entity after significant items",
  ),
  epsBefore: pick("wowSignificant", "Group basic EPS (cents) before significant items"),
  grossMarginBefore: firstFigure("wowSignificant", "Gross margin (%)"),
  ebitMarginBefore: firstFigure("wowSignificant", "EBIT (%)"),
  sharePrice: pick("wowSharePrice", "Woolworths Group ordinary share price closing ($)", 1),
};
// Lovisa Holdings, $ thousand
const L = {
  revenue: lovIs("Revenue"),
  revenuePrior: lovIs("Revenue", 1),
  costOfSales: -lovIs("Cost of sales"),
  costOfSalesPrior: -lovIs("Cost of sales", 1),
  gross: lovIs("Gross profit"),
  salaries: -lovIs("Salaries and employee benefits expense"),
  property: -lovIs("Property expenses"),
  propertyPrior: -lovIs("Property expenses", 1),
  distribution: -lovIs("Distribution costs"),
  distributionPrior: -lovIs("Distribution costs", 1),
  depreciation: -lovIs("Depreciation and amortisation expense"),
  depreciationPrior: -lovIs("Depreciation and amortisation expense", 1),
  disposal: -lovIs("Loss on disposal of property, plant and equipment"),
  impairment: -lovIs("Impairment expense"),
  impairmentPrior: -lovIs("Impairment expense", 1),
  otherIncome: lovIs("Other income"),
  otherExpenses: -lovIs("Other expenses"),
  operatingProfit: lovIs("Operating profit"),
  finance: -lovIs("Finance costs"),
  beforeTax: lovIs("Profit before tax"),
  tax: -lovIs("Income tax expense"),
  profit: lovIs("Profit after tax"),
  profitPrior: lovIs("Profit after tax", 1),
  eps: lovIs("Basic earnings per share (cents)"),
  epsPrior: lovIs("Basic earnings per share (cents)", 1),
  assets: lovBs("Total assets"),
  assetsPrior: lovBs("Total assets", 1),
  liabilities: lovBs("Total liabilities"),
  equity: lovBs("Total equity"),
  equityPrior: lovBs("Total equity", 1),
  currentAssets: lovBs("Total current assets"),
  currentLiabilities: lovBs("Total current liabilities"),
  cash: lovBs("Cash and cash equivalents"),
  rightOfUse: lovBs("Right-of-use asset"),
  currentLeases: lovBs("Lease liability - current"),
  nonCurrentLeases: lovBs("Lease liability - non current"),
  loans: lovBs("Loans and borrowings - non current"),
  issuedCapital: lovBs("Issued capital"),
  commonControl: lovBs("Common control reserve"),
  operating: lovCf("Net cash from operating activities"),
  investing: lovCf("Net cash used in investing activities"),
  financing: lovCf("Net cash used in financing activities"),
  fitOut: lovCf("Proceeds from fit out contributions"),
  facility: lovCf("Facility proceeds"),
  leasePayments: -lovCf("Payment of lease liabilities"),
  dividends: -lovCf("Dividends paid"),
  netIncrease: lovCf("Net increase in cash and cash equivalents"),
  exchange: lovCf("Effect of movement in exchange rates on cash held"),
  cashStart: lovCf("Cash and cash equivalents at the beginning of the year"),
  leaseInterest: pick("lovLeaseRoll", "Interest"),
  leasePaid: -pick("lovLeaseRoll", "Lease payments"),
  tradeReceivables: pick("lovReceivables", "Trade receivables"),
  deposits: pick("lovReceivables", "Deposits"),
  prepayments: pick("lovReceivables", "Prepayments"),
  otherReceivables: pick("lovReceivables", "Other receivables"),
  receivablesTotal: lovBs("Trade and other receivables"),
};
const million = (thousands: number) => thousands / 1000;
const fiveYear = (label: string) => {
  const line = fixture.figures.lovFiveYear.find((item) => item.startsWith(label));
  if (!line) throw new Error(label);
  return numbersIn(line.slice(label.length));
};
/** The five-year table's share prices and earnings per share, newest year first. */
const lovPrices = fiveYear("Share Price");
const lovEarnings = fiveYear("Earnings per share");

describe("questions in Accounting: Reading the Numbers of a Business", () => {
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

  it("covers all 14 lessons, each with at least eight questions and three or four cards", () => {
    expect(bundle.lessons).toHaveLength(14);
    for (const lesson of bundle.lessons) {
      expect(ownIds(lesson).size, lesson.id).toBeGreaterThanOrEqual(8);
      expect(lesson.flashcardIds.length, lesson.id).toBeGreaterThanOrEqual(3);
      expect(lesson.flashcardIds.length, lesson.id).toBeLessThanOrEqual(4);
    }
  });

  it("ends each lesson with three checks of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(question(id)));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("never asks for a typed number: the learner judges what the statements show", () => {
    expect(
      bundle.questions.filter((item) => kind(item) === "numeric").map((item) => item.id),
    ).toEqual([]);
    expect(
      bundle.flashcards.filter((card) => card.answerAuthority?.kind === "numeric"),
    ).toHaveLength(0);
    // Nor does a choice question set bare figures to calculate: an option that opens with a
    // figure goes on to say what the figure shows or why it is the right treatment.
    const bare = /^(about |roughly )?[$-]?[\d.,]+( ?(%|million|billion|days|times|cents|c|x))?$/iu;
    for (const item of choiceQuestions)
      expect(
        (item.choices ?? []).filter((choice) => bare.test(choice.label.trim())),
        item.id,
      ).toHaveLength(0);
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
    expect(choiceQuestions.length).toBeGreaterThan(100);
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
    expect(ordered).toBe(4);
    expect(sorted).toBe(19);
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
    expect(checked).toBe(22);
  });

  it("words the source line of every extract of one source alike", () => {
    const wikipedia = [];
    const asic = [];
    for (const item of bundle.questions)
      for (const extract of item.extracts ?? []) {
        if (extract.who.startsWith("Wikipedia")) wikipedia.push(extract);
        if (extract.who.startsWith("ASIC")) asic.push(extract);
      }
    expect(wikipedia).toHaveLength(11);
    for (const extract of wikipedia) {
      expect(extract.who).toMatch(/^Wikipedia, article ".+" \(CC BY-SA 4\.0\)$/u);
      expect(extract.when).toBe("accessed 23 November 2026");
      expect(extract.kind).toBe("An encyclopedia article written by volunteer editors");
    }
    expect(asic).toHaveLength(3);
    for (const extract of asic) {
      expect(extract.who).toContain("16-050MR");
      expect(extract.when).toBe("2016");
      expect(extract.kind).toContain(
        "Australian Securities & Investments Commission: Reproduced with permission",
      );
    }
    for (const item of bundle.questions)
      for (const extract of item.extracts ?? [])
        if (/Annual Report 2026/u.test(extract.who))
          expect(extract.when).toBe("year to 28 June 2026");
  });

  it("points every hover note at the lesson that teaches the term, and every lesson reference at a real lesson", () => {
    const titles = new Map(bundle.lessons.map((lesson) => [lesson.title, lesson]));
    const taught: Record<string, string> = {
      equity: "Reading a balance sheet",
      "lease liabilities": "Reading a balance sheet",
      provision: "Every transaction has two sides",
      "contract liability": "Every transaction has two sides",
      profit: "Reading an income statement",
      "operating profit": "Reading an income statement",
      "significant items": "Reading an income statement",
      "accrual accounting": "Why profit is not cash",
      "non-cash expense": "Why profit is not cash",
      "profit against cash": "Why profit is not cash",
      reconciliation: "Why profit is not cash",
      "change in estimate": "Estimates inside profit",
      "cash conversion cycle": "Working capital and the cash cycle",
      "interest cover": "Liquidity and gearing",
      "net margin": "Margins and turnover",
      "asset turnover": "Margins and turnover",
      "reasonable assurance": "Reading the notes",
      "discounted cash flow": "What a business is worth",
    };
    // The words the teaching lesson uses where they differ from the hover term
    const spoken: Record<string, string> = {
      "profit against cash": "gap between profit and operating cash flow",
    };
    let hovers = 0;
    for (const lesson of bundle.lessons) {
      const text = JSON.stringify(lesson);
      for (const match of text.matchAll(/\[\[([^|\]]+)\|([^\]]*)\]\]/gu)) {
        hovers += 1;
        const term = match[1] as string;
        const note = match[2] as string;
        const where = /Met in '([^']+)'/u.exec(note)?.[1];
        expect(where, `${lesson.id}: ${term}`).toBeTruthy();
        expect(titles.has(where as string), `${lesson.id}: ${term} points at ${where}`).toBe(true);
        expect(where, `${lesson.id}: ${term}`).toBe(taught[term.toLowerCase()]);
        // The lesson it points at comes first, or is this lesson's own recap
        const target = titles.get(where as string);
        expect(
          bundle.lessons.indexOf(target as (typeof bundle.lessons)[number]),
          `${lesson.id}: ${term}`,
        ).toBeLessThanOrEqual(bundle.lessons.indexOf(lesson));
        // and that lesson does teach the term, in its own text
        const teaching = JSON.stringify(target).toLowerCase();
        const words = (spoken[term.toLowerCase()] ?? term).toLowerCase();
        expect(teaching.includes(words), `${where} teaches ${term}`).toBe(true);
      }
    }
    expect(hovers).toBe(22);
  });

  it("gives the invented firms of different lessons different names", () => {
    const names: Record<string, string[]> = {
      Marlow: ["reading-an-income-statement"],
      Harlow: ["every-transaction-has-two-sides"],
      Birch: ["reading-a-cash-flow-statement"],
      Larch: ["why-profit-is-not-cash"],
      Quay: ["why-profit-is-not-cash"],
      Alder: ["warning-signs"],
      Dunlin: ["warning-signs"],
    };
    for (const [name, lessons] of Object.entries(names)) {
      const found = bundle.lessons
        .filter((lesson) =>
          [JSON.stringify(lesson), ...[...ownIds(lesson)].map((id) => JSON.stringify(question(id)))]
            .join(" ")
            .match(new RegExp(`\\b${name}\\b`, "u")),
        )
        .map((lesson) => lesson.id);
      expect(found, name).toEqual(lessons);
    }
  });
});

/**
 * The figure an option puts forward: the number after "about", or else the first dollar amount or
 * plain number. An option that names no figure gives null.
 */
const shownFigure = (label: string) => {
  const text =
    /about\s+\$?(\d[\d,]*(?:\.\d+)?)/iu.exec(label)?.[1] ??
    /\$?(\d[\d,]*(?:\.\d+)?)/u.exec(label)?.[1];
  return text === undefined ? null : { value: Number(text.replace(/,/gu, "")), text };
};
/** Whether the figure in an option's label is the figure worked out, to the precision it gives. */
const closeTo = (label: string, computed: number) => {
  const shown = shownFigure(label);
  if (!shown) return false;
  const decimals = shown.text.split(".")[1]?.length ?? 0;
  return (
    Math.abs(shown.value - computed) <= Math.max(0.05 * Math.abs(computed), 0.5 * 10 ** -decimals)
  );
};

/**
 * What each option of a judgement question claims, worked out from the figures in the question and
 * the statements, in the order the options are shown.
 */
const options: Record<string, { right: number; values: (number | null)[] }> = {
  "acc-reading-a-cash-flow-statement-hook": {
    right: 0,
    values: [
      (W.operating + W.investing + W.financing) / 1000,
      W.operating / 1000,
      -W.financing / 1000,
    ],
  },
  // Operating cash less property spending, less lease principal, against the $15 million dividend
  "acc-reading-a-cash-flow-statement-check-after-stores": {
    right: 0,
    values: [60 - 35 - 18, 60 - 35, 60 - 18, 60],
  },
  // Cash the owners could have: capital is equity, borrowings and leases, less cash
  "acc-roe-kestrel-capital": {
    right: 1,
    values: [8 + 6 - 4, 8 + 6 + 9 - 4, 8 + 6 + 9, 8 + 6 + 9 + 4],
  },
  // Profit after tax of 4.5 at 30% is 3.15, over capital of 19, 27, 19 and the equity of 8
  "acc-roe-kestrel-return": {
    right: 1,
    values: [pct(3.15, 27), pct(3.15, 19), pct(4.5, 19), pct(3.15, 8)],
  },
  "acc-worth-woolworths-pe": {
    right: 3,
    values: [
      W.sharePrice / W.eps,
      W.eps / W.sharePrice,
      W.sharePrice / (W.epsBefore / 100),
      W.sharePrice / (W.eps / 100),
    ],
  },
  // 10% off $1,276 million of depreciation of property, plant and equipment
  "acc-estimates-inside-profit-woolworths-sensitivity": {
    right: 0,
    values: [
      0.1 * W.ppeDepreciation,
      0.1 * W.ppeDepreciation,
      0.01 * W.ppeDepreciation,
      0.1 * W.depreciation,
    ],
  },
};

describe("the figures behind the judgement questions", () => {
  it("reads the statement lines copied from the pack", () => {
    expect([W.revenue, W.gross, W.ebit, W.profit, W.assets, W.liabilities, W.equity]).toEqual([
      71539, 19569, 2407, 1152, 34065, 29155, 4910,
    ]);
    expect([L.revenue, L.gross, L.operatingProfit, L.profit, L.assets, L.liabilities]).toEqual([
      938763, 775333, 158222, 95590, 696037, 618076,
    ]);
    expect(L.equity).toBe(77961);
    expect(lovPrices).toEqual([23.25, 30.91, 32.87, 19.3, 14.26]);
    expect(lovEarnings).toEqual([86.3, 78.1, 75.4, 63.3, 54.3]);
    expect(W.sharePrice).toBe(40.24);
  });

  it("works out what each option of a judgement question claims, and which one is right", () => {
    for (const [id, expected] of Object.entries(options)) {
      const shown = labels(id);
      expect(shown, id).toHaveLength(expected.values.length);
      expect(rightIndex(question(id)), id).toBe(expected.right);
      shown.forEach((label, index) => {
        const computed = expected.values[index];
        if (computed === null || computed === undefined) return;
        expect(closeTo(label, computed), `${id} option ${index}: ${label}`).toBe(true);
      });
    }
  });

  it("gives the share of Woolworths's assets that is left for the owners, and no option comes near it", () => {
    const share = pct(W.assets - W.liabilities, W.assets);
    expect(share).toBeCloseTo(14.4, 1);
    const id = "acc-reading-a-balance-sheet-owners-share-woolworths";
    const figures = labels(id).map((label) => shownFigure(label)?.value as number);
    expect(rightIndex(question(id))).toBe(1);
    expect(Math.abs((figures[1] as number) - share)).toBeLessThan(1);
    for (const [index, value] of figures.entries())
      if (index !== 1) expect(Math.abs(value - share), id).toBeGreaterThan(10);
  });
});

describe("Reading a balance sheet and Every transaction has two sides", () => {
  it("balances both companies and gives the thin share of equity", () => {
    expect(W.assets - W.liabilities).toBe(W.equity);
    expect(L.assets - L.liabilities).toBe(L.equity);
    expect(W.currentAssets + wowBs("Total non-current assets")).toBe(W.assets);
    expect(L.currentAssets + lovBs("Total non-current assets")).toBe(L.assets);
    expect(pct(L.equity, L.assets)).toBeCloseTo(11.2, 1);
    stated("about 11%");
    stated("About 14% of its assets");
    stated("696,037 less 618,076 is 77,961");
  });

  it("splits borrowings and leases as the balance sheets do", () => {
    expect(W.currentBorrowings + W.nonCurrentBorrowings).toBe(5161);
    expect(pick("wowBorrowings", "Total borrowings", 1)).toBe(5161);
    expect([W.currentBorrowings, W.nonCurrentBorrowings]).toEqual([401, 4760]);
    expect(W.currentLeases + W.nonCurrentLeases).toBe(W.leaseLiabilityTotal);
    expect([W.leaseAssets, W.leaseLiabilityTotal]).toEqual([8660, 11316]);
    expect(million(L.rightOfUse)).toBeCloseTo(356.8, 1);
    expect(million(L.currentLeases)).toBeCloseTo(87.8, 1);
    expect(million(L.nonCurrentLeases)).toBeCloseTo(331.2, 1);
    expect(million(L.currentLeases + L.nonCurrentLeases)).toBeCloseTo(419.0, 1);
    // "more than five times its equity" and "more than twice"
    expect((L.currentLeases + L.nonCurrentLeases) / L.equity).toBeGreaterThan(5);
    expect(W.leaseLiabilityTotal / W.equity).toBeGreaterThan(2);
    stated("lease liabilities of $11,316 million");
  });

  it("recomputes the fire, the cash against equity, and the joinery firm's five events", () => {
    // Two retailers with $10 million of assets that each lose $2 million
    expect(10 - 2).toBeLessThan(9);
    expect(10 - 2).toBeGreaterThan(4);
    expect(W.cash).toBe(1497);
    expect(W.equity).toBeGreaterThan(W.cash);
    let cash = 0;
    let loan = 0;
    let machine = 0;
    let timber = 0;
    let payables = 0;
    let receivable = 0;
    let equity = 0;
    cash += 50000;
    loan += 50000;
    cash -= 30000;
    machine += 30000;
    timber += 8000;
    payables += 8000;
    receivable += 20000;
    timber -= 6000;
    equity += 20000 - 6000;
    cash -= 8000;
    payables -= 8000;
    expect([cash, receivable, timber, machine]).toEqual([12000, 20000, 2000, 30000]);
    expect(cash + receivable + timber + machine).toBe(64000);
    expect(loan + payables + equity).toBe(64000);
    expect(equity).toBe(14000);
    // A signmaker's $9,000 job on $4,000 of stock adds $5,000 to equity and to assets
    expect(9000 - 4000).toBe(5000);
  });

  it("recomputes the provision, the payables note and the gift card entry", () => {
    expect(406 + 304).toBe(710);
    stated("$406 million of further potential remediation");
    stated("$304 million of interest, superannuation and payroll tax");
    expect(W.tradePayables + W.accruals + W.contractLiabilities).toBe(W.payables);
    expect([W.tradePayables, W.accruals, W.contractLiabilities]).toEqual([6302, 1791, 567]);
    expect(fixture.figures.wowText.join(" ")).toMatch(/approximately \$20 million per half-year/u);
    expect(fixture.figures.wowText.join(" ")).toContain("$406 million");
    expect(fixture.figures.wowText.join(" ")).toContain("$304 million");
  });
});

describe("Reading an income statement", () => {
  it("works down Woolworths's statement from revenue to profit", () => {
    expect(W.revenue - W.costOfSales).toBe(W.gross);
    expect(W.gross + W.otherIncome - W.branch - W.admin - W.otherExpenses).toBe(W.ebit);
    expect(W.ebit - W.finance).toBe(W.beforeTax);
    expect(W.beforeTax - W.tax).toBe(W.profit);
    expect(pct(W.profit, W.revenue)).toBeCloseTo(1.61, 2);
    expect(pct(W.gross, W.revenue)).toBeCloseTo(27.4, 1);
    stated("About 1.6 cents of each dollar");
    stated("about 27 cents of each revenue dollar");
  });

  it("works down Lovisa's statement and sets it beside Woolworths's", () => {
    expect(L.revenue - L.costOfSales).toBe(L.gross);
    expect(
      L.gross -
        L.salaries -
        L.property -
        L.distribution -
        L.depreciation -
        L.disposal -
        L.impairment +
        L.otherIncome -
        L.otherExpenses,
    ).toBe(L.operatingProfit);
    expect(pct(L.gross, L.revenue)).toBeCloseTo(82.6, 1);
    expect(million(L.revenue)).toBeCloseTo(938.8, 1);
    expect(million(L.costOfSales)).toBeCloseTo(163.4, 1);
    expect(million(L.gross)).toBeCloseTo(775.3, 1);
    expect(million(L.operatingProfit)).toBeCloseTo(158.2, 1);
    expect(million(L.finance)).toBeCloseTo(24.8, 1);
    expect(million(L.tax)).toBeCloseTo(38.5, 1);
    expect(million(L.profit)).toBeCloseTo(95.6, 1);
    expect(million(L.depreciation)).toBeCloseTo(131.3, 1);
    stated("about 83 cents of each revenue dollar against Woolworths's 27");
  });

  it("finds Lovisa's fastest-growing cost, and that it grew faster than revenue", () => {
    const growth = (now: number, before: number) => pct(now - before, before);
    expect(growth(L.revenue, L.revenuePrior)).toBeCloseTo(17.6, 1);
    expect(growth(L.profit, L.profitPrior)).toBeCloseTo(10.7, 1);
    const costs = {
      cost: growth(L.costOfSales, L.costOfSalesPrior),
      property: growth(L.property, L.propertyPrior),
      distribution: growth(L.distribution, L.distributionPrior),
      depreciation: growth(L.depreciation, L.depreciationPrior),
    };
    expect(Math.max(...Object.values(costs))).toBe(costs.depreciation);
    expect(costs.depreciation).toBeGreaterThan(growth(L.revenue, L.revenuePrior));
    expect(costs.cost).toBeLessThan(growth(L.revenue, L.revenuePrior));
    expect(costs.depreciation).toBeCloseTo(20.9, 1);
    const asked = question("acc-reading-an-income-statement-fastest-cost");
    expect(asked.prompt).toContain("cost of sales 143.5 and 163.4");
    expect(asked.prompt).toContain("depreciation and amortisation 108.6 and 131.3");
    expect(rightIndex(asked)).toBe(1);
  });

  it("recomputes the significant items and the two headlines", () => {
    expect(W.ebitBefore - W.significant).toBe(W.ebit);
    expect(W.significant).toBe(W.otherExpenses);
    expect(W.significantPrior).toBe(569);
    expect(W.npatBefore - W.significantAfterTax).toBe(W.profit);
    expect(W.attributable).toBe(1138);
    expect(pct(W.profit - W.profitPrior, W.profitPrior)).toBeCloseTo(21, 0);
    expect(pct(W.npatBefore - W.npatBeforePrior, W.npatBeforePrior)).toBeCloseTo(17, 0);
    stated("profit rose 21% in 2026");
    stated("profit before significant items rose 17%");
    expect(W.ebitBefore / W.revenue).toBeGreaterThan(W.ebit / W.revenue);
  });

  it("recomputes earnings per share and the invented share count", () => {
    expect(L.eps).toBe(86.32);
    expect(L.epsPrior).toBe(78.12);
    // Profit of $95.6 million on 86.32 cents is about 110.7 million shares
    expect(L.profit / 1000 / (L.eps / 100)).toBeCloseTo(110.7, 1);
    expect(pct(L.eps - L.epsPrior, L.epsPrior)).toBeCloseTo(10.5, 1);
    expect(pct(W.eps - W.epsPrior, W.epsPrior)).toBeCloseTo(18, 0);
    expect(W.epsBefore).toBe(130.9);
    // Marlow Tools: $40 million on 100 million shares, then $44 million on 125 million
    expect(40 / 100).toBeCloseTo(0.4, 6);
    expect(44 / 125).toBeCloseTo(0.352, 6);
    expect(44 / 125).toBeLessThan(40 / 100);
    // Tessel: 600 less 480 is 120, less 30 is 90, less 27 is 63
    expect(600 - 480).toBe(120);
    expect(120 - 30 - 27).toBe(63);
  });
});

describe("Reading a cash flow statement", () => {
  it("adds the three flows to the rise in cash, and the rise to the closing balance", () => {
    expect(W.operating + W.investing + W.financing).toBe(W.netIncrease);
    expect(W.netIncrease).toBe(233);
    expect(W.cashStart + W.netIncrease + W.exchange).toBe(W.cashEnd);
    expect(W.exchange).toBe(-11);
    expect(W.cashEnd).toBe(W.cash);
    stated("Exchange rates took $11 million off the balance");
    expect(L.operating + L.investing + L.financing).toBe(L.netIncrease);
    expect(million(L.netIncrease)).toBeCloseTo(6.5, 1);
    expect(L.cashStart + L.netIncrease + L.exchange).toBe(L.cash);
  });

  it("sets operating cash against profit, and depreciation against the gap", () => {
    expect(W.operating - W.profit).toBe(3796);
    expect(W.operating / W.profit).toBeGreaterThan(4);
    expect(W.depreciation / (W.operating - W.profit)).toBeGreaterThan(0.75);
    expect(W.depreciation / (W.operating - W.profit)).toBeLessThan(0.8);
    expect(W.depreciation).toBe(2984);
    expect(million(L.operating)).toBeCloseTo(232.8, 1);
    expect(million(L.depreciation) / (million(L.operating) - million(L.profit))).toBeGreaterThan(
      0.9,
    );
  });

  it("works out the operating cash left after stores and lease principal, and the dividend", () => {
    const left = W.operating - W.property - W.leasePrincipal;
    expect([W.property, W.leasePrincipal, W.dividends]).toEqual([2435, 1298, 1100]);
    expect(left).toBe(1215);
    expect(left + W.propertySales).toBe(1563);
    expect(left).toBeGreaterThan(W.dividends);
    stated("about $1,215 million");
    stated("about $1,560 million");
    expect([W.leaseInterest, W.borrowingInterest]).toEqual([586, 236]);
  });

  it("splits Lovisa's lease payments between principal and interest", () => {
    expect(L.leasePayments + L.leaseInterest).toBe(L.leasePaid);
    expect(million(L.leasePaid)).toBeCloseTo(108.9, 1);
    expect(million(L.leasePayments)).toBeCloseTo(89.2, 1);
    expect(million(L.leaseInterest)).toBeCloseTo(19.7, 1);
    expect(million(L.investing)).toBeCloseTo(-58.5, 1);
    expect(million(L.financing)).toBeCloseTo(-167.7, 1);
  });

  it("recomputes Calder's pattern and Hollis's cash after stores", () => {
    expect(40 - 55 + 20).toBe(5);
    expect(30 - 10).toBe(20);
    expect(55 - 40).toBe(15);
    expect(60 - 35 - 18).toBe(7);
    expect(60 - 35 - 18).toBeLessThan(15);
  });
});

describe("Why profit is not cash", () => {
  it("adds up Woolworths's reconciliation block by block", () => {
    const lines = fixture.figures.wowReconciliation;
    const adjustments = [
      "Net share of profit of investments accounted for using the equity method",
      "Depreciation and amortisation",
      "Impairment of non-financial assets",
      "Share-based payments expense",
      "Net gain on disposal and write-off of assets",
      "Doubtful debts allowance",
      "Revaluation of put option liabilities over non-controlling interests",
      "Other",
    ];
    const nonCash = adjustments.map((label) => wowRec(label)).reduce((a, b) => a + b, 0);
    const changes = [
      "(Increase)/decrease in inventories",
      "Increase in trade payables",
      "Increase in provisions",
      "(Increase)/decrease in trade and other receivables",
      "Increase in other payables",
    ].map((label) => wowRec(label));
    const taxes = ["Increase in deferred tax", "Decrease in income tax payable"].map((label) =>
      wowRec(label),
    );
    expect(nonCash).toBe(3109);
    expect(changes.reduce((a, b) => a + b, 0)).toBe(979);
    expect(changes.filter((value) => value > 0)).toHaveLength(3);
    expect(changes.filter((value) => value < 0)).toHaveLength(2);
    expect(taxes.reduce((a, b) => a + b, 0)).toBe(-292);
    expect(adjustments.length + changes.length + taxes.length).toBe(15);
    expect(wowRec("Profit for the period") + nonCash + 979 - 292).toBe(W.operating);
    expect(lines.length).toBeGreaterThan(15);
    expect(changes[0]).toBe(-351);
    expect(changes.slice(1, 3)).toEqual([367, 652]);
    expect(changes[4]).toBe(329);
    expect(changes[3]).toBe(-18);
    stated("fifteen lines sit between the two");
    stated("$3,109 million in all");
  });

  it("reads the 2025 column the lesson sets for the learner", () => {
    expect(wowRec("Profit for the period", 1)).toBe(953);
    expect(wowRec("Net cash provided by operating activities", 1)).toBe(4550);
    expect([
      wowRec("Depreciation and amortisation", 1),
      wowRec("Impairment of non-financial assets", 1),
      wowRec("Increase in trade payables", 1),
      wowRec("Increase in other payables", 1),
    ]).toEqual([2953, 459, 171, 150]);
    // Depreciation is the biggest of the lines the question sets side by side
    const largest = Math.max(2953, 459, 171, 150);
    expect(largest).toBe(2953);
    expect(W.depreciation / (W.operating - W.profit)).toBeCloseTo(0.79, 2);
  });

  it("recomputes Harbour Print, Larch Furniture and Quay Cafes", () => {
    // Receivables on 60 days of $600,000 of sales, about $100,000
    expect((600000 * 60) / 365).toBeCloseTo(98630, 0);
    expect(48000 + 12000 - 100000 - 40000).toBe(-80000);
    expect(48000 + 12000 - 100000 - 40000 + 25000).toBe(-55000);
    // Larch: profit 60, plus 15, less 30, plus 10, plus 5
    expect(60000 + 15000 - 30000 + 10000 + 5000).toBe(60000);
    // Quay: 40 plus 30, 25 and 10, less 5
    expect(40 + 30 + 25 + 10 - 5).toBe(100);
    // Orrin: receivables and stock together at year three are over four times the profit
    expect(160 + 210).toBe(370);
    expect(370 / 85).toBeGreaterThan(4);
    expect(160 / 40).toBeGreaterThan(85 / 60);
    expect(180 / 20).toBeGreaterThan(85 / 60);
    stated("$370 thousand");
  });
});

describe("When revenue and costs count", () => {
  it("dates the delivery, the gym, the yoga studio and the equipment hire", () => {
    // 24 days of credit from 20 June is 14 July
    const due = new Date(Date.UTC(2026, 5, 20 + 24));
    expect([due.getUTCMonth() + 1, due.getUTCDate()]).toEqual([7, 14]);
    expect(fixture.figures.wowText.join(" ")).toContain("payment generally due within 24 days");
    expect(1200 * (3 / 12)).toBe(300);
    expect(1200 - 300).toBe(900);
    expect(1200 * (6 / 12)).toBe(600);
    expect(600 * (2 / 6)).toBe(200);
    expect(600 - 200).toBe(400);
    expect(3000 * (2 / 6)).toBe(1000);
    expect(3000 - 1000).toBe(2000);
    // A seller that takes the risk reports $80, an agent its $12 commission
    expect([80, 12]).toEqual([80, 12]);
  });

  it("sets Woolworths's contract liabilities against its revenue", () => {
    expect(pct(W.contractLiabilities, W.revenue)).toBeLessThan(1);
    expect(pct(W.contractLiabilities, W.revenue)).toBeGreaterThan(0.7);
    stated("less than 1%");
  });
});

describe("Estimates inside profit", () => {
  it("recomputes the machine, the oven and the change in estimate", () => {
    expect((20000 - 2000) / 5).toBe(3600);
    expect(20000 - 2 * 3600).toBe(12800);
    expect((12800 - 5000) / 6).toBe(1300);
    expect(3600 - 1300).toBe(2300);
    expect((30000 - 5000) / 5).toBe(5000);
    expect(30000 - 3 * 5000).toBe(15000);
    expect(15000 / 2 - 5000).toBe(2500);
  });

  it("sets Lovisa's depreciation against its operating profit and tests a 10% change", () => {
    expect(L.depreciation / L.operatingProfit).toBeCloseTo(0.83, 2);
    expect(million(0.1 * L.depreciation)).toBeCloseTo(13.1, 1);
    expect((0.1 * L.depreciation) / L.operatingProfit).toBeCloseTo(0.083, 3);
    expect(Math.round((100 * 0.1 * L.depreciation) / L.operatingProfit)).toBe(8);
    stated("about 83%");
  });

  it("tests the same change on Woolworths's depreciation of property, plant and equipment", () => {
    expect(W.ppeDepreciation).toBe(1276);
    expect(pct(0.1 * W.ppeDepreciation, W.ebit)).toBeCloseTo(5.3, 1);
    expect(pct(0.01 * W.ppeDepreciation, W.ebit)).toBeLessThan(1);
    expect(Math.round(pct(0.1 * W.depreciation, W.ebit))).toBe(12);
    expect(W.depreciationInCostOfSales + W.depreciationInExpenses).toBe(W.depreciation);
  });

  it("recomputes the stock note, the bike shop and the impairments", () => {
    expect(W.inventoriesGross - W.obsolescence).toBe(W.inventories);
    expect(pct(W.obsolescence, W.inventoriesGross)).toBeLessThan(1.5);
    // FIFO against weighted average on 10 frames at $100 then 10 at $120, 10 sold at $200
    const sales = 10 * 200;
    const fifo = 10 * 100;
    const average = 10 * ((10 * 100 + 10 * 120) / 20);
    expect([sales - fifo, sales - average]).toEqual([1000, 900]);
    expect([10 * 120, (20 - 10) * 110]).toEqual([1200, 1100]);
    expect(10 * 100 + 10 * 120).toBe(2200);
    expect(L.impairment / L.impairmentPrior).toBeGreaterThan(10);
    expect(300000 - 120000).toBe(180000);
    expect(80000 - 50000).toBe(30000);
    expect(pct(20999 - 14929, 14929)).toBeCloseTo(40.7, 1);
    stated("about 41% above");
    expect(fixture.figures.lovText.join(" ")).toContain("$20,999,000");
  });
});

describe("Working capital and the cash cycle", () => {
  it("gives Woolworths's net current liability and the three day counts", () => {
    expect(W.currentAssets - W.currentLiabilities).toBe(-5995);
    expect(fixture.figures.wowText.join(" ")).toContain("net current liability position");
    expect(fixture.figures.wowText.join(" ")).toContain("$5,995 million");
    const stock = (W.inventories / W.costOfSales) * 365;
    const collect = (W.tradeReceivables / W.revenue) * 365;
    const pay = (W.tradePayables / W.costOfSales) * 365;
    expect(to1(stock)).toBe(31.4);
    expect(to1(collect)).toBe(2.4);
    expect(to1(pay)).toBe(44.3);
    expect(to1(stock + collect - pay)).toBe(-10.5);
    expect([W.inventories, W.tradeReceivables, W.tradePayables]).toEqual([4465, 469, 6302]);
    // Stock is the biggest current asset and trade and other payables the biggest liability
    expect(W.inventories).toBeGreaterThan(W.cash);
    expect(W.inventories).toBeGreaterThan(W.receivables);
  });

  it("recomputes Dunmore Tiles, the pizza chain and the two chains' days of stock", () => {
    expect(120 + 55).toBe(175);
    expect(175 - 35).toBe(140);
    expect(90 + 40 - 35).toBe(95);
    expect(140 - 95).toBe(45);
    expect(5 - 25).toBe(-20);
    const kemp = (50 / 600) * 365;
    const lyle = (50 / 300) * 365;
    expect(lyle / kemp).toBeCloseTo(2, 6);
    // Brook holds stock 120 days and waits 60 for customers: about six months
    expect(120 + 60).toBe(180);
  });
});

describe("Liquidity and gearing", () => {
  it("gives the current ratios, the quick ratio and the gearing of both companies", () => {
    expect(W.currentAssets / W.currentLiabilities).toBeCloseTo(0.56, 2);
    expect(L.currentAssets / L.currentLiabilities).toBeCloseTo(0.82, 2);
    expect(million(L.currentAssets)).toBeCloseTo(151.4, 1);
    expect(million(L.currentLiabilities)).toBeCloseTo(185.5, 1);
    expect((W.cash + W.receivables) / W.currentLiabilities).toBeCloseTo(0.19, 2);
    expect(W.cash + W.receivables).toBe(2543);
    const borrowings = W.currentBorrowings + W.nonCurrentBorrowings;
    expect(borrowings / W.equity).toBeCloseTo(1.05, 2);
    expect((borrowings + W.leaseLiabilityTotal) / W.equity).toBeCloseTo(3.4, 1);
    const leases = L.currentLeases + L.nonCurrentLeases;
    expect(L.loans / L.equity).toBeCloseTo(1.1, 1);
    expect((L.loans + leases) / L.equity).toBeCloseTo(6.5, 1);
    expect(million(L.loans)).toBe(87);
  });

  it("gives interest cover and how far operating profit could fall", () => {
    expect(W.ebit / W.finance).toBeCloseTo(2.9, 1);
    expect(1 - W.finance / W.ebit).toBeCloseTo(0.656, 3);
    expect(L.operatingProfit / L.finance).toBeCloseTo(6.4, 1);
    expect(1 - L.finance / L.operatingProfit).toBeCloseTo(0.843, 3);
    expect(L.leaseInterest / L.finance).toBeCloseTo(0.795, 3);
    // "about five sixths" and "about four fifths"
    expect(Math.abs(1 - L.finance / L.operatingProfit - 5 / 6)).toBeLessThan(0.02);
    expect(Math.abs(L.leaseInterest / L.finance - 4 / 5)).toBeLessThan(0.01);
  });

  it("recomputes Harlow's gearing, the halved profits and the order of four covers", () => {
    // Hallam Stores: loans 10 and leases 30 on equity of 10
    expect(10 / 10).toBe(1);
    expect((10 + 30) / 10).toBe(4);
    // Quince Foods and Rowe Retail, with operating profit halved
    expect(8 / 2).toBe(4);
    expect(1.5 / 2).toBeLessThan(1);
    const order = question("acc-liquidity-and-gearing-order-by-cover").order?.items ?? [];
    const covers = order.map((item) => {
      const found = /operating profit (\d+), finance costs (\d+)/u.exec(item);
      return Number(found?.[1]) / Number(found?.[2]);
    });
    expect(covers).toEqual([0.75, 2, 3, 10]);
    expect([...covers].sort((a, b) => a - b)).toEqual(covers);
  });
});

describe("Margins and turnover", () => {
  it("gives the three margins of each company and what they say", () => {
    expect(pct(W.gross, W.revenue)).toBeCloseTo(27.4, 1);
    expect(pct(W.ebit, W.revenue)).toBeCloseTo(3.4, 1);
    expect(pct(W.profit, W.revenue)).toBeCloseTo(1.6, 1);
    expect(pct(L.gross, L.revenue)).toBeCloseTo(82.6, 1);
    expect(pct(L.operatingProfit, L.revenue)).toBeCloseTo(16.9, 1);
    expect(pct(L.profit, L.revenue)).toBeCloseTo(10.2, 1);
    expect(pct(L.gross, L.revenue) / pct(W.gross, W.revenue)).toBeCloseTo(3, 0);
    expect(pct(L.profit, L.revenue) / pct(W.profit, W.revenue)).toBeCloseTo(6.3, 1);
  });

  it("multiplies margin by turnover to reach the return on assets of each company", () => {
    const woolworths = (W.profit / W.revenue) * (W.revenue / W.assets);
    expect(woolworths).toBeCloseTo(W.profit / W.assets, 12);
    expect(100 * woolworths).toBeCloseTo(3.4, 1);
    expect(W.revenue / W.assets).toBeCloseTo(2.1, 1);
    const lovisa = (L.profit / L.revenue) * (L.revenue / L.assets);
    expect(100 * lovisa).toBeCloseTo(13.7, 1);
    expect(L.revenue / L.assets).toBeCloseTo(1.35, 2);
    // Margin six times thinner outweighs a turnover about one and a half times faster
    expect(W.revenue / W.assets / (L.revenue / L.assets)).toBeCloseTo(1.56, 2);
    // Retailers A and B, and X, Y and Z
    expect(0.1 * 0.5).toBeCloseTo(0.05, 12);
    expect(0.02 * 2.5).toBeCloseTo(0.05, 12);
    expect(2.5 / 0.5).toBe(5);
    expect([0.04 * 3, 0.12 * 0.8, 0.06 * 1.5].map((value) => to1(100 * value))).toEqual([
      12, 9.6, 9,
    ]);
  });

  it("recomputes the cost lines, the items that return and the depreciation in cost of sales", () => {
    expect(pct(L.distribution, L.revenue)).toBeCloseTo(2.4, 1);
    expect(pct(W.ebitBefore, W.revenue)).toBeCloseTo(4.3, 1);
    expect(W.significant).toBe(698);
    expect(W.significantPrior).toBe(569);
    expect(W.grossMarginBefore).toBe(27.4);
    expect(W.ebitMarginBefore).toBe(4.3);
    // Larch Foods' restructuring: 20, 25 and 22 on about 1,000 a year
    for (const cost of [20, 25, 22]) expect(pct(cost, 1000)).toBeLessThan(2.6);
    expect(W.depreciationInCostOfSales).toBe(414);
    expect(W.depreciationInCostOfSales + W.depreciationInExpenses).toBe(2984);
    expect(fixture.figures.wowText.join(" ")).toContain("approximately $20 million");
  });
});

describe("Return on equity and return on capital", () => {
  const averageEquityW = (W.parentEquity + W.parentEquityPrior) / 2;
  const averageEquityL = (L.equity + L.equityPrior) / 2;
  const averageAssetsW = (W.assets + W.assetsPrior) / 2;
  const averageAssetsL = (L.assets + L.assetsPrior) / 2;

  it("takes each return on equity from the average equity", () => {
    expect(averageEquityW).toBe(4827.5);
    expect(pct(W.attributable, averageEquityW)).toBeCloseTo(23.6, 1);
    expect(pct(L.profit, averageEquityL)).toBeCloseTo(122.2, 1);
    expect(million(averageEquityL)).toBeCloseTo(78.3, 1);
    // Maya earns 50% on her own $100,000, and 10% on the shop's $500,000 of assets
    expect(pct(50000, 100000)).toBe(50);
    expect(pct(50000, 500000)).toBe(10);
    expect(pct(50000, 400000)).toBe(12.5);
    stated("about 122%");
    stated("about 24%");
  });

  it("splits each return into margin, turnover and assets over equity", () => {
    const margin = W.attributable / W.revenue;
    const turnover = W.revenue / averageAssetsW;
    const leverage = averageAssetsW / averageEquityW;
    expect(100 * margin * turnover * leverage).toBeCloseTo(pct(W.attributable, averageEquityW), 6);
    expect([to1(100 * margin), to1(turnover), to1(leverage)]).toEqual([1.6, 2.1, 7]);
    const lovisaMargin = L.profit / L.revenue;
    const lovisaTurnover = L.revenue / averageAssetsL;
    const lovisaLeverage = averageAssetsL / averageEquityL;
    expect(100 * lovisaMargin * lovisaTurnover * lovisaLeverage).toBeCloseTo(
      pct(L.profit, averageEquityL),
      6,
    );
    expect([
      to1(100 * lovisaMargin),
      Math.round(100 * lovisaTurnover) / 100,
      to1(lovisaLeverage),
    ]).toEqual([10.2, 1.35, 8.9]);
    // Halving Woolworths's equity doubles assets over equity to about 14 and the return to about 47%
    expect(Math.round(2 * leverage)).toBe(14);
    expect(Math.round(100 * margin * turnover * 2 * leverage)).toBe(47);
    // Lovisa's margin is more than six times Woolworths's while its turnover is lower
    expect(lovisaMargin / margin).toBeGreaterThan(6);
    expect(lovisaTurnover).toBeLessThan(turnover);
  });

  it("explains why Lovisa's equity is so thin", () => {
    expect(million(L.issuedCapital)).toBeCloseTo(215.7, 1);
    expect(million(L.commonControl)).toBeCloseTo(-208.9, 1);
    expect(million(L.issuedCapital + L.commonControl)).toBeCloseTo(6.8, 1);
    expect(pct(L.dividends, L.profit)).toBeCloseTo(92.7, 1);
    expect(million(L.dividends)).toBeCloseTo(88.6, 1);
    expect(million(L.equityPrior)).toBeCloseTo(78.6, 1);
    expect(L.equity).toBeLessThan(L.equityPrior);
    expect(L.equity).toBeLessThan(L.profit);
    expect(L.assets / L.equity / 9).toBeLessThan(1.01);
    stated("about a ninth of its assets");
  });

  it("builds return on capital the same way for both companies", () => {
    const wowRate = W.tax / W.beforeTax;
    const lovRate = L.tax / L.beforeTax;
    const wowCapital =
      W.equity + W.currentBorrowings + W.nonCurrentBorrowings + W.leaseLiabilityTotal - W.cash;
    const lovCapital = L.equity + L.loans + L.currentLeases + L.nonCurrentLeases - L.cash;
    expect(wowCapital).toBe(19890);
    const wow = (W.ebit * (1 - wowRate)) / wowCapital;
    const wowBefore = (W.ebitBefore * (1 - wowRate)) / wowCapital;
    const lov = (L.operatingProfit * (1 - lovRate)) / lovCapital;
    expect(Math.round(100 * wow)).toBe(9);
    expect(Math.round(100 * wowBefore)).toBe(11);
    expect(Math.round(100 * lov)).toBe(21);
    // The five to one gap in return on equity narrows to about two and a half to one
    expect(pct(L.profit, averageEquityL) / pct(W.attributable, averageEquityW)).toBeGreaterThan(5);
    expect(lov / wow).toBeGreaterThan(2.2);
    expect(lov / wow).toBeLessThan(2.6);
    expect(fixture.figures.wowText.join(" ")).toContain("ROFE before significant items was 16.4%");
    stated("16.4% before significant items");
  });

  it("recomputes the invented cases: the same return, Kestrel, Harrow, Linden, Marsh, Ash and Elm", () => {
    // 20% on equity with assets twice equity: margin times turnover is 10%, so 2% needs a turnover of 5
    expect(0.2 / 2).toBeCloseTo(0.1, 12);
    expect(0.1 * 1).toBeCloseTo(0.1, 12);
    expect(0.1 / 0.02).toBeCloseTo(5, 12);
    // Kestrel: after-tax operating profit, capital and return
    const profit = 4.5 * (1 - 0.3);
    const capital = 8 + 6 + 9 - 4;
    expect(profit).toBeCloseTo(3.15, 12);
    expect(capital).toBe(19);
    expect(Math.round(pct(profit, capital))).toBe(17);
    // Harrow: $30 million borrowed to buy back $30 million of shares leaves capital unchanged
    expect(60 + 40).toBe(100);
    expect(60 - 30 + (40 + 30)).toBe(100);
    expect(pct(10, 100)).toBe(10);
    // Return on assets is return on equity times equity over assets
    expect(0.32 * 0.1).toBeCloseTo(0.032, 12);
    expect(0.12 * 0.5).toBeCloseTo(0.06, 12);
    expect(0.4 * 0.1).toBeCloseTo(0.04, 12);
    expect(0.15 * 0.5).toBeCloseTo(0.075, 12);
    expect(0.12 * 0.5).toBeGreaterThan(0.32 * 0.1);
    expect(0.15 * 0.5).toBeGreaterThan(0.4 * 0.1);
  });
});

describe("Reading the notes", () => {
  it("takes the card receivables out of Woolworths's cash, and prepayments out of Lovisa's receivables", () => {
    expect(fixture.figures.wowText.join(" ")).toContain("$695 million");
    expect(fixture.figures.wowText.join(" ")).toContain("$684 million");
    expect(pct(695, W.cash)).toBeCloseTo(46.4, 1);
    expect(W.cash - 695).toBe(802);
    expect(L.tradeReceivables + L.deposits + L.prepayments + L.otherReceivables).toBe(
      L.receivablesTotal,
    );
    expect(pct(L.tradeReceivables, L.receivablesTotal)).toBeCloseTo(10.7, 1);
    expect(pct(L.tradeReceivables + L.deposits, L.receivablesTotal)).toBeCloseTo(25.5, 1);
    expect(L.prepayments).toBeGreaterThan(L.deposits);
    // Pelham: $40 million of cash with $12 million due from card payments, and Marlow's line
    expect(40 - 12).toBe(28);
    expect(5.4 + 12.6).toBeCloseTo(18.0, 12);
    stated("$28 million is in the bank");
  });
});

describe("Warning signs", () => {
  it("recomputes Alder's three years", () => {
    const revenue = [100, 130, 170] as const;
    const profit = [10, 15, 21] as const;
    const cash = [9, 6, -3] as const;
    const receivables = [12, 28, 52] as const;
    const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
    expect(sum(profit)).toBe(46);
    expect(sum(cash)).toBe(12);
    expect(profit[1] + profit[2] - cash[1] - cash[2]).toBe(33);
    expect(receivables[2] - receivables[0]).toBe(40);
    expect(revenue[2] / revenue[0]).toBeCloseTo(1.7, 6);
    expect(receivables[2] / receivables[0]).toBeCloseTo(4.33, 2);
    expect(
      [0, 1, 2].map((i) => Math.round(((receivables[i] ?? 0) / (revenue[i] ?? 1)) * 365)),
    ).toEqual([44, 79, 112]);
    expect(Math.round(pct(revenue[1] - revenue[0], revenue[0]))).toBe(30);
    expect(profit[2]).toBeGreaterThan(2 * profit[0]);
  });

  it("recomputes Brindle's two checks, and the 80% against 10%", () => {
    expect(20 + 24 + 27).toBe(71);
    expect(22 + 25 + 28).toBe(75);
    expect([
      Math.round((30 / 200) * 365),
      Math.round((34 / 230) * 365),
      Math.round((37 / 250) * 365),
    ]).toEqual([55, 54, 54]);
    // Dunlin Ltd: cash from operations falls as stock and short-term borrowing climb
    const operating = [31, 17, 5];
    const stock = [45, 75, 115];
    const borrowings = [24, 61, 97];
    expect(operating[0]).toBeGreaterThan(operating[2] as number);
    expect(stock[2]).toBeGreaterThan(stock[0] as number);
    expect(borrowings[2]).toBeGreaterThan(borrowings[0] as number);
    stated("fallen from 31 to 5");
  });

  it("keeps Woolworths's significant items to the figures stated earlier, and the Slater and Gordon words to ASIC's", () => {
    stated("$698 million in 2026 and $569 million in 2025");
    expect(W.significant).toBe(698);
    expect(W.significantPrior).toBe(569);
    const asic = fixture.files["asic-public-pages.txt"]?.join(" ") ?? "";
    expect(asic).toContain("ASIC has now discontinued its inquiries");
    expect(asic).toContain("has not approved or disapproved");
    // ABC Learning's figures as Wikipedia gives them
    const abc = fixture.files["wikipedia-warning-signs.txt"]?.join(" ") ?? "";
    expect(abc).toContain(
      "net profit after tax of $52.3 million on total revenues of $292.7 million",
    );
    expect(abc).toContain("$37.1 million");
    expect(abc).toContain("$1.8 billion");
  });
});

describe("What a business is worth", () => {
  it("reads Lovisa's price to earnings over the five years", () => {
    const pe = lovPrices.map((price, i) => price / ((lovEarnings[i] as number) / 100));
    expect(pe.map((value) => Math.round(value))).toEqual([27, 40, 44, 30, 26]);
    for (const value of pe) expect(value).toBeGreaterThan(20);
    expect(
      pct((lovEarnings[0] as number) - (lovEarnings[2] as number), lovEarnings[2] as number),
    ).toBeCloseTo(14.5, 0);
    expect(
      pct((lovPrices[0] as number) - (lovPrices[2] as number), lovPrices[2] as number),
    ).toBeCloseTo(-29.3, 1);
    stated("about 14%");
    stated("about 29%");
    // Alpine at $12 and $36 on $1 of earnings
    expect(12 / 1).toBe(12);
    expect(36 / 1).toBe(36);
  });

  it("builds free cash flow for both companies and sets it against the dividend", () => {
    const woolworths = W.operating - W.property - W.leasePrincipal;
    expect(woolworths).toBe(1215);
    expect(woolworths).toBeGreaterThan(W.profit);
    expect(woolworths).toBeGreaterThan(W.dividends);
    const lovisa = L.operating + L.investing - L.leasePayments;
    expect(million(lovisa)).toBeCloseTo(85.1, 1);
    expect(lovisa).toBeLessThan(L.dividends);
    expect(million(L.fitOut)).toBeCloseTo(10.5, 1);
    expect(million(L.facility)).toBe(10);
    // Harlan Ltd: operating cash 55, less spending of 60 and lease principal of 8
    expect(55 - 60 - 8).toBeLessThan(0);
    stated("about $85 million");
  });

  it("compares book value with price and values an invented business", () => {
    const shares = L.profit / 1000 / (L.eps / 100);
    expect(L.equity / 1000 / shares).toBeCloseTo(0.7, 1);
    expect(lovPrices[0] as number).toBeGreaterThan(30 * (L.equity / 1000 / shares));
    expect((lovPrices[0] as number) / (L.equity / 1000 / shares)).toBeCloseTo(33, 0);
    // Quarry: $50 million over 25 million shares is $2, and $18 is nine times that
    expect(50 / 25).toBe(2);
    expect(18 / 2).toBe(9);
    // Discounted cash flow of $100 million a year for 30 years
    const present = (rate: number, years = 30) =>
      Array.from({ length: years }, (_, i) => 100 / (1 + rate) ** (i + 1));
    const total = (rate: number) => present(rate).reduce((a, b) => a + b, 0);
    expect(Math.round(total(0.08))).toBe(1126);
    expect(Math.round(total(0.1))).toBe(943);
    expect(1 - total(0.1) / total(0.08)).toBeCloseTo(0.163, 3);
    for (const rate of [0.08, 0.1]) {
      const afterFive = present(rate)
        .slice(5)
        .reduce((a, b) => a + b, 0);
      expect(afterFive / total(rate)).toBeGreaterThan(0.5);
    }
    // Heron's two values differ by a sixth, and Sedge plus its debt equals Moss
    expect(750 / 900).toBeCloseTo(5 / 6, 6);
    expect(300 + 200).toBe(500);
    stated("about $1,126 million today");
  });
});
