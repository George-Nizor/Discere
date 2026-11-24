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
 * Personal Finance and Investing asks a learner to judge which money choice costs more, and
 * roughly how much, and never to work out an exact dollar figure. So this file checks that no
 * question takes a typed number, and then recomputes every figure the judgement questions rest on
 * (the options' amounts, the sort bins, the order of the costs) from the ATO lines copied into the
 * fixture and from the figures in each question's own text. It also checks the shape of the
 * questions (each lesson asked, end checks of more than one type, option lengths, feedback on
 * wrong options, hints) and finds each quoted extract word for word in the source pack.
 */
/** The lines the fixture copies from the pack for the figures this test reads. */
type FigureName =
  | "taxRow2"
  | "taxRow3"
  | "taxRow4"
  | "levyNote"
  | "mlsTiers"
  | "mlsRates"
  | "helpRow1"
  | "helpRow2"
  | "helpRow3"
  | "indexation2026"
  | "elevenMonths"
  | "indexationRule"
  | "concessionalCap"
  | "guarantee2026"
  | "contributionsTax"
  | "mixes";
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/personal-finance/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/personal-finance-passages.json", import.meta.url), "utf8"),
) as { files: Record<string, string[]>; figures: { text: Record<FigureName, string> } };
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
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
  text.replace(/[‘’]/gu, "'").replace(/[“”]/gu, '"').replace(/\s+/gu, " ").trim();

// Figures read from the pack's own lines, so a figure in the fixture and a figure in a question
// cannot drift apart without a test failing.
const figure = fixture.figures.text;
const money = (text: string) => Number(text.replace(/[$,]/gu, ""));
/** A row of the ATO's tables: an optional base, a rate in cents on each dollar, and a threshold. */
const parseRow = (line: string) => {
  const found = /^(?:\$([\d,]+) plus )?(\d+)c for each \$1 over \$([\d,]+)$/u.exec(
    line.replace(/^\$[\d,]+ – \$[\d,]+ /u, ""),
  );
  if (!found) throw new Error(line);
  return {
    base: found[1] ? money(found[1]) : 0,
    rate: Number(found[2]) / 100,
    over: money(found[3] as string),
  };
};
const taxRows = [figure.taxRow2, figure.taxRow3, figure.taxRow4].map(parseRow);
/** Tax on a taxable income for 2026-27, before the Medicare levy, for incomes up to $190,000. */
const tax = (income: number) => {
  const row = [...taxRows].reverse().find((item) => income > item.over);
  return row ? row.base + row.rate * (income - row.over) : 0;
};
const levy = 0.02;
const helpRows = [figure.helpRow1, figure.helpRow2].map(parseRow);
const helpTopThreshold = money(/\$([\d,]+) and over/u.exec(figure.helpRow3)?.[1] ?? "");
/** The compulsory HELP repayment for 2026-27 on a repayment income. */
const help = (income: number) => {
  if (income >= helpTopThreshold) return 0.1 * income;
  const row = [...helpRows].reverse().find((item) => income > item.over);
  return row ? row.base + row.rate * (income - row.over) : 0;
};
// The tiers read "$105,000 or less", "$105,001 – $123,000" and so on: the thresholds are every
// other number, and the rest are the dollar above each one.
const mlsThresholds = [...figure.mlsTiers.matchAll(/\$([\d,]+)/gu)]
  .map((match) => money(match[1] as string))
  .filter((_, index) => index % 2 === 0);
const mlsRates = [...figure.mlsRates.matchAll(/([\d.]+)%/gu)].map(
  (match) => Number(match[1]) / 100,
);
/** The surcharge for a single person with no hospital cover, charged on the whole income. */
const surcharge = (income: number) => {
  const tier = mlsThresholds.filter((limit) => income > limit).length;
  return (mlsRates[tier] as number) * income;
};
const indexation = Number(/([\d.]+)%/u.exec(figure.indexation2026)?.[1]) / 100;
const cap = money(/\$([\d,]+)/u.exec(figure.concessionalCap)?.[1] ?? "");
const guarantee = Number(/12\.00/u.exec(figure.guarantee2026)?.[0]) / 100;
const mixShare = (name: string) =>
  Number(new RegExp(`${name} – around (\\d+)%`, "u").exec(figure.mixes)?.[1]) / 100;

/**
 * The figure an option puts forward: the number after "about", or else the first dollar amount.
 * An option that names no figure gives null.
 */
const shownFigure = (label: string) => {
  const text =
    /about\s+\$?(\d[\d,]*(?:\.\d+)?)/iu.exec(label)?.[1] ??
    /\$(\d[\d,]*(?:\.\d+)?)/u.exec(label)?.[1];
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
 * the pack, in the order the options are shown. A null is an option that names no figure.
 */
const options: Record<string, { right: number; values: (number | null)[] }> = {
  // Kofi's debt is $30,000, of which $6,000 was added in March and $24,000 is older
  "perf-hecs-help-which-part": {
    right: 2,
    values: [indexation * 6000, indexation * 30000, indexation * 24000],
  },
  // Sam's repayment income rises from $78,000 to $84,000, within the 15c row
  "perf-hecs-help-price-a-raise": {
    right: 0,
    values: [help(84000) - help(78000), help(84000), 0.15 * 84000],
  },
  // Dev's raise from $125,000 to $135,000 crosses $129,717
  "perf-hecs-help-crossing-total": {
    right: 1,
    values: [0.15 * 10000, help(135000) - help(125000), 0.17 * 10000, help(135000)],
  },
  "perf-gross-to-take-home-dev-raise": {
    right: 2,
    values: [10000 * (1 - tax(100000) / 100000), 10000 * (0.3 + levy), 10000 * (1 - 0.3 - levy)],
  },
  "perf-home-loans-and-offset-offset-saving": {
    right: 1,
    values: [0.065 * 500000, 0.065 * 20000, 20000],
  },
  "perf-home-loans-and-offset-stress": {
    right: 0,
    values: [0.02 * 500000, 0.08 * 500000, 0.002 * 500000],
  },
  // Priya's employer pays 12% of $90,000 into the concessional cap
  "perf-how-super-works-room-left": {
    right: 2,
    values: [cap, guarantee * 90000, cap - guarantee * 90000],
  },
  "perf-super-fees-and-choosing-a-fund-fee-in-dollars": {
    right: 0,
    values: [150000 * (0.014 - 0.009), 150000 * 0.014, 150000 * 0.009],
  },
  // Cass's income of $125,000 is in tier 2, and the surcharge is charged on all of it
  "perf-insurance-cass": {
    right: 1,
    values: [0.01 * 125000, surcharge(125000), (mlsRates[2] as number) * (125000 - 123000)],
  },
  "perf-ifd-hook": { right: 0, values: [3000 - 24 * 60, null, 3000] },
  // A year's shortfall is the monthly costs less the rent, over twelve months, against the price
  "perf-property-against-shares-price-rise": {
    right: 2,
    values: [
      ((2725 + 225 + 216 + 500 - 2250) / 550000) * 100,
      (17000 / 550) * 1,
      ((2725 + 225 + 216 + 500 - 2250) * 12 * 100) / 550000,
    ],
  },
  "perf-compounding-doubling-at-four": { right: 2, values: [72, 100 / 4, 72 / 4] },
};

describe("questions in Personal Finance and Investing", () => {
  it("asks every question and every card from a lesson, and every id exists", () => {
    const asked = new Set(
      bundle.lessons.flatMap((lesson) => [
        lesson.intro?.hook.questionId ?? "",
        ...lesson.questionIds,
        ...stepQuestionIds(lesson),
      ]),
    );
    asked.delete("");
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

  it("covers all 14 lessons, each with at least eight questions and three cards", () => {
    expect(bundle.lessons).toHaveLength(14);
    for (const lesson of bundle.lessons) {
      const own = new Set(
        [
          lesson.intro?.hook.questionId ?? "",
          ...lesson.questionIds,
          ...stepQuestionIds(lesson),
        ].filter(Boolean),
      );
      expect(own.size, lesson.id).toBeGreaterThanOrEqual(8);
      expect(lesson.flashcardIds, lesson.id).toHaveLength(3);
    }
  });

  it("ends each lesson with three checks of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(question(id)));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("never asks for a typed number: the learner judges which costs more and roughly how much", () => {
    expect(
      bundle.questions.filter((item) => kind(item) === "numeric").map((item) => item.id),
    ).toEqual([]);
    // The numeric review cards left are facts to recall, each one stated in the pack.
    const facts = bundle.flashcards.filter((card) => card.answerAuthority?.kind === "numeric");
    expect(facts.map((card) => card.id).sort()).toEqual([
      "perf-hecs-help-card-1",
      "perf-how-super-works-card-1",
      "perf-how-super-works-card-2",
      "perf-how-super-works-card-3",
      "perf-risk-return-and-time-card-2",
    ]);
    const value = (id: string) => {
      const authority = bundle.flashcards.find((card) => card.id === id)?.answerAuthority;
      return authority?.kind === "numeric" ? authority.value : Number.NaN;
    };
    expect(value("perf-hecs-help-card-1")).toBe(
      Number(/more than (\d+) months/u.exec(figure.elevenMonths)?.[1]),
    );
    expect(value("perf-how-super-works-card-1")).toBe(guarantee * 100);
    expect(value("perf-how-super-works-card-2")).toBe(cap);
    expect(value("perf-how-super-works-card-3")).toBe(
      Number(/rate of (\d+)%/u.exec(figure.contributionsTax)?.[1]),
    );
    expect(value("perf-risk-return-and-time-card-2")).toBe(mixShare("Balanced") * 100);
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
      const own = new Set(
        [
          lesson.intro?.hook.questionId ?? "",
          ...lesson.questionIds,
          ...stepQuestionIds(lesson),
        ].filter(Boolean),
      );
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
    expect(ordered).toBeGreaterThanOrEqual(2);
    expect(sorted).toBeGreaterThanOrEqual(13);
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
    expect(checked).toBe(11);
  });

  it("names the ATO as the source of the tax table the first lesson sets out", () => {
    const lesson = bundle.lessons.find((item) => item.id === "gross-to-take-home");
    const first = lesson?.steps[0];
    expect(JSON.stringify(first?.lead)).toMatch(/ATO's table of tax rates/u);
    expect((first?.diagram as { caption?: string } | undefined)?.caption ?? "").toMatch(/ATO/u);
    expect(figure.levyNote).toMatch(/do not include the Medicare levy of 2%/u);
  });
});

describe("the figures behind the judgement questions", () => {
  it("reads the ATO's 2026-27 tables from the lines copied from the pack", () => {
    expect(taxRows.map((row) => row.over)).toEqual([18200, 45000, 135000]);
    expect(tax(44000)).toBeCloseTo(0.15 * (44000 - 18200), 6);
    expect(tax(100000)).toBe(20520);
    expect(tax(60000)).toBe(8520);
    expect(tax(135000)).toBe(31020);
    expect(helpRows.map((row) => row.over)).toEqual([69528, 129717]);
    expect(helpTopThreshold).toBe(186051);
    expect(help(86380)).toBeCloseTo(2527.8, 6);
    // The base of $9,028 is the 15c row's repayment at its top, to the nearest dollar
    expect(Math.abs(help(129717) - 9028)).toBeLessThan(1);
    expect(Math.abs(help(129718) - help(129717))).toBeLessThan(1);
    expect(mlsThresholds).toEqual([105000, 123000, 164000]);
    expect(mlsRates).toEqual([0, 0.01, 0.0125, 0.015]);
    expect(surcharge(117000)).toBeCloseTo(1170, 6);
    expect(indexation).toBeCloseTo(0.028, 6);
    expect(cap).toBe(32500);
    expect([mixShare("Growth"), mixShare("Balanced"), mixShare("Conservative")]).toEqual([
      0.85, 0.7, 0.3,
    ]);
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

  it("splits Dev's raise at the threshold, and finds his rise between 15c and 17c a dollar", () => {
    expect(129717 - 125000).toBe(4717);
    expect(135000 - 129717).toBe(5283);
    const rise = 0.15 * 4717 + 0.17 * 5283;
    // The ATO's $9,028 base is the 15c row's repayment at its top to the nearest dollar.
    expect(rise).toBeCloseTo(help(135000) - help(125000), 0);
    expect(rise).toBeGreaterThan(1500);
    expect(rise).toBeLessThan(1700);
    expect(Math.round(rise / 100) * 100).toBe(1600);
  });

  it("gives Kyle's loan to value ratio after each fall, and the fall that brings a margin call", () => {
    const loan = 15000;
    const shares = 25000;
    expect(loan / shares).toBeCloseTo(0.6, 6);
    // A 10% fall leaves about two thirds, under the 70% limit
    expect(loan / (shares * 0.9)).toBeCloseTo(2 / 3, 2);
    expect(loan / (shares * 0.9)).toBeLessThan(0.7);
    // The fall of 20% in the lesson is past it
    expect(loan / (shares * 0.8)).toBeCloseTo(0.75, 6);
    // The call comes when the shares reach loan / 0.7, a fall of about 14%
    expect(1 - loan / 0.7 / shares).toBeCloseTo(0.143, 3);
    // His own $10,000 loses half when the shares lose $5,000
    expect((shares * 0.2) / (shares - loan)).toBe(0.5);
    const margin = question("perf-property-against-shares-margin-call");
    expect(labels(margin.id)[rightIndex(margin)]).toMatch(/about two thirds/u);
    expect(margin.onCorrect).toMatch(/about 14%/u);
  });

  it("shows the whole option falling by its growth share of the drop in growth assets", () => {
    const growth = mixShare("Growth");
    const conservative = mixShare("Conservative");
    expect(growth * 10).toBeCloseTo(8.5, 6);
    expect(growth * 10).toBeLessThan(10);
    const fall = (share: number) => share * 20;
    expect(fall(conservative)).toBeCloseTo(6, 6);
    expect(fall(growth)).toBeCloseTo(17, 6);
    expect(fall(growth) / fall(conservative)).toBeCloseTo(2.83, 2);
    expect(Math.round(fall(growth) / fall(conservative))).toBe(3);
    expect(fall(growth) - fall(conservative)).toBeCloseTo(11, 6);
    expect((growth - conservative) * 100).toBeCloseTo(55, 6);
    expect(question("perf-risk-return-and-time-mix-gap").onCorrect).toMatch(/about 11 points/u);
  });

  it("recomputes Lena's, Mia's and Priya's takes from the table", () => {
    // Lena's raise from $40,000 to $50,000 crosses $45,000
    const first = 5000 * (0.15 + levy);
    const second = 5000 * (0.3 + levy);
    expect(first).toBeCloseTo(850, 6);
    expect(second).toBeCloseTo(1600, 6);
    expect(10000 - first - second).toBeCloseTo(7550, 6);
    expect(tax(50000) - tax(40000) + 10000 * levy).toBeCloseTo(first + second, 6);
    // Mia is at $135,000, so the next dollar pays 37c and the levy
    expect(Math.round(100 * (1 - 0.37 - levy))).toBe(61);
    expect(tax(135000) / 135000).toBeCloseTo(0.23, 2);
    // Priya's raise from $44,000 to $46,000 adds $150 and then $300 of tax, $450 in all
    expect(tax(46000) - tax(44000)).toBeCloseTo(450, 6);
    // The levy note: 2% of $60,000
    expect(tax(60000)).toBe(8520);
    expect(60000 * levy).toBe(1200);
  });

  it("recomputes the cash flow of Simon and Tiana's unit", () => {
    const costs = 2725 + 225 + 216 + 500;
    expect(costs).toBe(3666);
    expect(costs - 2250).toBe(1416);
    expect((costs - 2250) * 12).toBe(16992);
    expect((2250 / costs) * 100).toBeCloseTo(61.4, 1);
    expect(((costs - 2250) * 12) / 550000).toBeCloseTo(0.0309, 4);
    expect(((costs - 2250) / 550000) * 100).toBeCloseTo(0.257, 3);
  });

  it("recomputes the sums behind the cost comparisons in the cards and the opening questions", () => {
    // Offset: $20,000 at 6%, a 3 point rise on $600,000, a 0.2 point gap on $600,000
    expect(0.06 * 20000).toBe(1200);
    expect(0.03 * 600000).toBe(18000);
    expect(0.002 * 600000).toBeCloseTo(1200, 6);
    // Savannah's balances at 65, as a share of the smaller one
    expect((336000 - 255000) / 255000).toBeCloseTo(0.32, 2);
    // Aisha's 12% on top of $80,000
    expect(guarantee * 80000).toBeCloseTo(9600, 6);
    // Ana's $14,400 plus $20,000 is $1,900 over the cap
    expect(guarantee * 120000 + 20000 - cap).toBeCloseTo(1900, 6);
    // Omar and Zoe: the marginal rate with the levy, less the 15% the fund charges
    expect(1000 * (0.3 + levy - 0.15)).toBeCloseTo(170, 6);
    expect(1000 * (0.37 + levy - 0.15)).toBeCloseTo(240, 6);
    // Interest on a balance, a card at 19% against HELP at 2.8%
    expect(0.19 * 2000).toBe(380);
    expect(indexation * 2000).toBeCloseTo(56, 6);
    // Two years of the rate against a year of 19%, on $5,000
    expect(0.19 * 5000).toBe(950);
    expect(indexation * 5000).toBeCloseTo(140, 6);
    // Scams: 4,329 of 84,861 reports, and $837.7 million of $2.18 billion
    expect((4329 / 84861) * 100).toBeCloseTo(5.1, 1);
    expect((837.7 / 2180) * 100).toBeCloseTo(38.4, 1);
    // Interest-free: the sofa and the couch
    expect(4800 - 36 * 85).toBe(1740);
    expect(4800 / 36).toBeCloseTo(133.3, 1);
    expect(3000 - 24 * 60).toBe(1560);
    expect(12 * 60).toBe(720);
  });
});

describe("the sorted and ordered judgements, recomputed from the items", () => {
  const sortOf = (id: string) => {
    const sort = question(id).sort;
    if (!sort) throw new Error(id);
    return sort;
  };

  it("sets aside a twelfth of each yearly cost, and sorts the costs by the month's amount", () => {
    const sort = sortOf("perf-budgets-monthly-share");
    for (const item of sort.items) {
      const yearly = money(/about (\$[\d,]+) a year/u.exec(item.label)?.[1] ?? "");
      const monthly = yearly / 12;
      const bin = monthly < 100 ? "under" : monthly <= 200 ? "middle" : "over";
      expect(item.bin, item.label).toBe(bin);
      // No cost sits close to a boundary, so a rough twelfth sorts it.
      expect(
        Math.min(Math.abs(monthly - 100), Math.abs(monthly - 200)),
        item.label,
      ).toBeGreaterThan(15);
      expect(item.explanation, item.label).toContain(
        `$${(Math.round(monthly / 5) * 5).toLocaleString("en-AU")}`,
      );
    }
  });

  it("sorts each rate by the years the Rule of 72 gives, and by the exact doubling time too", () => {
    const sort = sortOf("perf-compounding-rate-from-doubling");
    for (const item of sort.items) {
      const rate = Number(/(\d+)%/u.exec(item.label)?.[1]);
      const rule = 72 / rate;
      const exact = Math.log(2) / Math.log(1 + rate / 100);
      const bin = (years: number) => (years < 10 ? "under" : years <= 20 ? "middle" : "over");
      expect(item.bin, item.label).toBe(bin(rule));
      expect(bin(exact), item.label).toBe(bin(rule));
    }
  });

  it("sorts each interest-free deal by whether the minimum times the months reaches the price", () => {
    const sort = sortOf("perf-ifd-clearing-payment");
    for (const item of sort.items) {
      const found = /\$([\d,]+) deal over (\d+) months, minimum \$([\d,]+) a month/u.exec(
        item.label,
      );
      const price = money(found?.[1] ?? "");
      const months = Number(found?.[2]);
      const minimum = money(found?.[3] ?? "");
      expect(item.bin, item.label).toBe(minimum * months >= price ? "clears" : "left");
      // None is a near miss: the minimums come to at most 0.8 or at least 1.2 times the price.
      expect(Math.abs((minimum * months) / price - 1), item.label).toBeGreaterThanOrEqual(
        0.2 - 1e-9,
      );
    }
    expect(sort.items.filter((item) => item.bin === "clears")).toHaveLength(3);
  });

  it("puts the four card balances in order of the interest a year costs", () => {
    const order = question("perf-cards-interest-on-four-thousand").order;
    if (!order) throw new Error("no order");
    const interest = order.items.map((item) => {
      const found = /\$([\d,]+) balance at (\d+)%/u.exec(item);
      return money(found?.[1] ?? "") * (Number(found?.[2]) / 100);
    });
    expect(interest).toEqual([100, 300, 600, 1600]);
    expect([...interest].sort((a, b) => a - b)).toEqual(interest);
    expect(question("perf-cards-interest-on-four-thousand").onCorrect).toContain("$1,600");
  });
});
