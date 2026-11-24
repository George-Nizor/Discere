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
 * Corporate Finance: How Businesses Decide asks a learner to judge a decision (fund this project,
 * borrow, pay out, bid), and never to type a computed figure. So this file checks that no question
 * takes a typed number and that no choice question offers bare figures to calculate. It then
 * recomputes every figure the lessons and questions rest on: the present values, the NPVs and IRRs,
 * the curves drawn in the figures, the leverage table, the tax shield, the payout ratios, the
 * credit on a franked dollar, the sensitivity table, the break-even synergy share. The real figures
 * come from the lines of the Woolworths Group and Lovisa annual reports copied into the fixture.
 * It also checks the shape of the questions (each lesson asked, end checks of more than one type,
 * option lengths, feedback on wrong options, hints), finds each quoted extract word for word in the
 * source pack, and finds the pack's own words behind the claims the lessons state.
 */
type FigureBlock =
  | "lovFiveYear"
  | "lovDividends"
  | "lovFranking"
  | "lovFacility"
  | "lovEps"
  | "wowRates"
  | "wowGrowth"
  | "wowHeadroom"
  | "wowCapital"
  | "wowDividends";
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const bundle = JSON.parse(read("../../../content/corporate-finance/bundle.json")) as CourseBundle;
const accounting = JSON.parse(read("../../../content/accounting/bundle.json")) as CourseBundle;
const personalFinance = JSON.parse(
  read("../../../content/personal-finance/bundle.json"),
) as CourseBundle;
const fixture = JSON.parse(read("./fixtures/corporate-finance-passages.json")) as {
  files: Record<string, string[]>;
  claims: string[];
  figures: Record<FigureBlock, string[]>;
};
const questions = new Map(bundle.questions.map((item) => [item.id, item]));
const question = (id: string): Question => {
  const found = questions.get(`corf-${id}`);
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

// The arithmetic of the course
const round = (value: number, places = 0) => {
  if (places >= 0) {
    const scale = 10 ** places;
    return Math.round(value * scale) / scale;
  }
  const scale = 10 ** -places;
  return Math.round(value / scale) * scale;
};
const within = (value: number, target: number, tolerance: number, note = "") =>
  expect(Math.abs(value - target), `${note} ${value} against ${target}`).toBeLessThanOrEqual(
    tolerance,
  );
/** Present value of equal payments for `years` years, one a year from now, at `rate` */
const annuity = (rate: number, years: number) => (1 - (1 + rate) ** -years) / rate;
/** Net present value of flows, the first at time 0 */
const npv = (rate: number, flows: number[]) =>
  flows.reduce((sum, cash, time) => sum + cash / (1 + rate) ** time, 0);
/** Every rate between -50% and 300% at which the NPV crosses zero */
const irrs = (flows: number[]): number[] => {
  const roots: number[] = [];
  let low = -0.5;
  let lowValue = npv(low, flows);
  for (let step = 1; step <= 7000; step += 1) {
    const high = -0.5 + step * 0.0005;
    const highValue = npv(high, flows);
    if (lowValue === 0) roots.push(low);
    else if (lowValue * highValue < 0) {
      let a = low;
      let b = high;
      for (let i = 0; i < 60; i += 1) {
        const mid = (a + b) / 2;
        if (npv(mid, flows) * npv(a, flows) <= 0) b = mid;
        else a = mid;
      }
      roots.push((a + b) / 2);
    }
    low = high;
    lowValue = highValue;
  }
  return roots;
};
/** The first year in which the running total of the flows is no longer below zero, to a fraction of a year */
const payback = (flows: number[]) => {
  let total = flows[0] as number;
  for (let year = 1; year < flows.length; year += 1) {
    const cash = flows[year] as number;
    if (total + cash >= 0) return year - 1 + -total / cash;
    total += cash;
  }
  return Number.POSITIVE_INFINITY;
};
const pct = (part: number, whole: number) => (100 * part) / whole;

// Figures read from the lines copied from the pack, so a figure in the fixture and a figure in the
// course cannot drift apart without a test failing.
const numbersIn = (line: string) =>
  [...line.matchAll(/(\()?-?\$?(\d[\d,]*(?:\.\d+)?)\)?/gu)].map((match) => {
    const value = Number((match[2] as string).replace(/,/gu, ""));
    return match[1] ? -value : value;
  });
const lastNumbers = (block: FigureBlock, label: string, count: number): number[] => {
  const line = fixture.figures[block].find((item) => item.startsWith(label));
  if (!line) throw new Error(`${block}: no line starting ${label}`);
  return numbersIn(line).slice(-count);
};
const lovFive = (label: string) => lastNumbers("lovFiveYear", label, 5);
const wowRate = (unit: string) => lastNumbers("wowRates", unit, 2);

describe("questions in Corporate Finance: How Businesses Decide", () => {
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
    const cover = read("../../../content/corporate-finance/assets/cover.svg");
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

  it("never asks for a typed number: the learner judges the decision", () => {
    expect(
      bundle.questions.filter((item) => kind(item) === "numeric").map((item) => item.id),
    ).toEqual([]);
    expect(
      bundle.flashcards.filter((card) => card.answerAuthority?.kind === "numeric"),
    ).toHaveLength(0);
    // Nor does a choice question set bare figures to calculate: an option that opens with a
    // figure goes on to say what the figure shows or why it is the right treatment.
    const bare =
      /^(about |roughly |by about )?[$-]?[\d.,]+( ?(%|million|billion|days|times|cents|c|x))?( (lower|higher|more|less|a year))?$/iu;
    for (const item of choiceQuestions)
      expect(
        (item.choices ?? []).filter((choice) => bare.test(choice.label.trim())),
        item.id,
      ).toHaveLength(0);
    // The two typed questions name an idea, and the marker accepts the idea and not the prompt
    const typed = bundle.questions.filter((item) => kind(item) === "typed");
    expect(typed.map((item) => item.id)).toEqual([
      "corf-distress-and-the-trade-off-overhang",
      "corf-what-a-share-price-tells-you-which-form",
    ]);
    for (const item of typed) {
      const authority = item.answerAuthority;
      if (authority.kind !== "text") throw new Error(item.id);
      expect(assessTextAnswer(item.prompt, authority).correct, item.id).toBe(false);
    }
    const overhang = question("distress-and-the-trade-off-overhang").answerAuthority;
    const form = question("what-a-share-price-tells-you-which-form").answerAuthority;
    if (overhang.kind !== "text" || form.kind !== "text") throw new Error("typed questions");
    for (const right of ["debt overhang", "the debt overhang", "Overhang"])
      expect(assessTextAnswer(right, overhang).correct, right).toBe(true);
    for (const wrong of [
      "asset substitution",
      "financial distress",
      "pecking order",
      "a tax shield",
    ])
      expect(assessTextAnswer(wrong, overhang).correct, wrong).toBe(false);
    for (const right of ["semi-strong", "the semi-strong form", "Semi strong form"])
      expect(assessTextAnswer(right, form).correct, right).toBe(true);
    for (const wrong of ["weak form", "the weak form", "strong", "random walk"])
      expect(assessTextAnswer(wrong, form).correct, wrong).toBe(false);
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
    expect(choiceQuestions.length).toBe(106);
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
    expect(checked).toBe(21);
  });

  it("words the source line of every extract of one source alike", () => {
    const wikipedia = [];
    const reports = [];
    for (const item of bundle.questions)
      for (const extract of item.extracts ?? []) {
        if (extract.who.startsWith("Wikipedia")) wikipedia.push(extract);
        if (/Annual Report 2026/u.test(extract.who)) reports.push(extract);
      }
    expect(wikipedia).toHaveLength(16);
    for (const extract of wikipedia) {
      expect(extract.who).toMatch(/^Wikipedia, article ".+" \(CC BY-SA 4\.0\)$/u);
      expect(extract.when).toBe("accessed 24 November 2026");
      expect(extract.kind).toMatch(/^An encyclopedia article written by volunteer editors/u);
    }
    expect(reports).toHaveLength(3);
    for (const extract of reports) {
      expect(extract.when).toBe("year to 28 June 2026");
      expect(extract.who).toMatch(
        /^(Woolworths Group|Lovisa Holdings) Limited, Annual Report 2026, /u,
      );
    }
    const bank = bundle.questions
      .flatMap((item) => item.extracts ?? [])
      .filter((extract) => extract.who.startsWith("Reserve Bank"));
    expect(bank).toHaveLength(1);
    expect(bank[0]?.who).toContain("(CC BY 4.0)");
    const tax = bundle.questions
      .flatMap((item) => item.extracts ?? [])
      .filter((extract) => extract.who.startsWith("Australian Taxation Office"));
    expect(tax).toHaveLength(1);
    expect(tax[0]?.when).toBe("page last updated 1 December 2016");
  });

  it("finds the pack's own words behind each claim the lessons make beyond their extracts", () => {
    const pool = Object.values(fixture.files).flat().map(squash);
    const supported = (fragment: string) =>
      pool.some((passage) => passage.toLowerCase().includes(squash(fragment).toLowerCase()));
    // [what a lesson says, the pack's words for it]
    const pairs: Array<[string, string]> = [
      [
        "In April 2011 Rio Tinto gained a majority stake in Riversdale Mining",
        "In April 2011, Rio Tinto gained a majority stake in Riversdale Mining",
      ],
      ["a $2.9 billion all-cash deal", "bought it for $2.9 billion in an all-cash deal"],
      [
        "wrote the value of the assets down by $3 billion",
        "wrote down the value of the assets by $3 billion",
      ],
      ["sold them for $50 million", "Rio later sold the assets for $50 million"],
      ["the ATO says is sometimes called top-up tax", "sometimes referred to as 'top up' tax"],
      [
        "investors must add equity",
        "additional equity would be required from the tunnel's investors",
      ],
      ["60,000 to 90,000", "traffic volumes of between 60,000 and 90,000 per day"],
      [
        "A$220 million of equity",
        "Equity of $220 million was provided by three international companies",
      ],
      ["A$580 million", "The remaining $580 million was financed through a syndicate"],
      ["A$680 million", "The A$680 million tunnel"],
      ["insolvent in December 2006", "In December 2006, the tollway became insolvent"],
      ["receivers appointed on 27 December", "On 27 December 2006, a syndicate of 16"],
      ["20 June 2007", "On 20 June 2007, ABN AMRO"],
      ["about 35,000 vehicles a day at first", "approximately 35,000 vehicles per day"],
      ["a projected 90,000", "a projected 90,000 vehicles per day"],
      ["about 30,000 trips a day", "the average trips per day was approximately 30,000"],
      ["only 20,000 vehicles", "only 20,000 vehicles a day were using the tunnel"],
      ["25,000", "the average number of daily trips since opening was approximately 25,000"],
      [
        "Diversification",
        "Diversification: While this may hedge a company against a downturn in an individual industry",
      ],
      ["overconfidence", "Manager's hubris: manager's overconfidence about expected synergies"],
      ["up to 70%", "with up to 70% of M&A activity failing"],
      ["duplicate departments", "removing duplicate departments or operations"],
      [
        "around 70% of predicted revenue synergies",
        "around 70% of predicted revenue synergies from mergers failed to materialize",
      ],
      [
        "the target's intrinsic value (what the cash it can produce is worth today), the synergies",
        "the sum of the target firm's intrinsic value",
      ],
      [
        "an offer above the future benefit of the acquisition is not a prudent investment decision",
        "would not be making a prudent investment decision if a tender offer made is higher than the future benefit of the acquisition",
      ],
      [
        "three petroleum engineers at Atlantic Richfield",
        "three Atlantic Richfield petroleum engineers",
      ],
      ["value the prize for private reasons", "for auctions with private value"],
      ["shades its bid", "bid shading"],
      ["pays $100", "the government must repay $100 dollars"],
      ["$109.50", "This occurs when the price of our bond is $109.50"],
      ["risk free yield curve", "'risk free yield curve'"],
      [
        "recoverable value was above the carrying value",
        "recoverable amount exceeded carrying value",
      ],
      ["BIG W, MyDeal and Healthylife", "BIG W, MyDeal and Healthylife CGUs were fully impaired"],
      ["optimised weighted average cost of capital", "optimised weighted average cost of capital"],
      [
        "BBB with Standard & Poor's and Baa2 with Moody's",
        "BBB and Baa2 according to Standard & Poor's and Moody's",
      ],
      [
        "balance the higher returns that more borrowing might bring",
        "a balance between the higher returns that might be possible with higher levels of borrowings",
      ],
      ["Australia introduced it in 1987", "Dividend imputation was introduced in 1987"],
      ["since 1 July 2000", "after 1 July 2000 is a refundable tax credit"],
      [
        "before that an unused credit was lost",
        "Prior to 1 July 2000 such excess franking credits were lost",
      ],
      ["all its dividends are fully franked", "All dividends are fully franked at a 30% tax rate"],
      [
        "treats a cut in a dividend more harshly than a cut in buybacks",
        "a reduction of which is viewed more negatively by the market than a reduction in share buybacks",
      ],
      [
        "executive pay is often affected by buybacks",
        "Executive compensation is often affected by share buybacks",
      ],
      [
        "breaks its promises to creditors",
        "promises to creditors of a company are broken or honored with difficulty",
      ],
      [
        "banks usually raise interest rates",
        "usually banks increase the interest rates if a state of financial distress occurs",
      ],
      [
        "distress draws management's attention away from running the business",
        "requires management attention and might lead to reduced attention on the operations",
      ],
      [
        "IRR is not a sound way to compare projects of different durations",
        "IRR should not be used to compare projects of different duration",
      ],
      [
        "lender who might offer 99 cents",
        "a lender may offer 99 cents for the promise of receiving $1.00 a month from now",
      ],
      ["not management", "dictated by the external market and not by management"],
      ["1990 Nobel Prize", "awarded the Nobel Prize in Economic Sciences in 1990"],
      [
        "Modigliani and Miller proposed their theorem in 1958",
        "proposed by Franco Modigliani and Merton Miller in 1958",
      ],
      ["1970", "his influential 1970 review"],
      ["Warren Buffett and George Soros", "Warren Buffett, George Soros, and researchers"],
      ["tax on the extra profit", "should be included in a project analysis"],
      [
        "the interest of $3 million multiplied by the 30% rate",
        "(interest bearing debt) x (tax rate)",
      ],
    ];
    for (const [said, packWords] of pairs) {
      expect(everything, said).toContain(said);
      expect(supported(packWords), packWords).toBe(true);
    }
    // The Cross City Tunnel's two funding figures are not claimed to add to its cost
    expect(220 + 580).not.toBe(680);
    stated("which doesn't match those two figures");
    stated("The article puts the tunnel's cost at A$680 million");
  });

  it("keeps the imputation reasoning labelled as the course's own and out of every graded key", () => {
    const text = lessonText("why-firms-borrow");
    expect(text).toContain("this is *our own* reasoning");
    expect(text).toContain("by our own reasoning");
    const graded = bundle.questions
      .filter((item) => ownIds(lessonOf("why-firms-borrow")).has(item.id))
      .map((item) =>
        JSON.stringify({
          choices: item.choices,
          answerAuthority: item.answerAuthority,
          misconceptions: item.misconceptions,
          sort: item.sort,
          onCorrect: item.onCorrect,
        }),
      )
      .join(" ");
    expect(graded).not.toMatch(
      /worth less to them|company-level|cuts the credit|shield still works/iu,
    );
    // and the other places the course says it is reasoning and not a source
    stated("we offer it as reasoning");
    stated("so this one is our own reasoning");
    stated("Our own reading is that a takeover contest can work this way");
  });

  it("points every hover note at the lesson that teaches the term, and every lesson reference at a real lesson", () => {
    const titles = new Map(
      [...bundle.lessons, ...accounting.lessons, ...personalFinance.lessons].map((lesson) => [
        lesson.title,
        lesson,
      ]),
    );
    const taught: Record<string, string> = {
      inflation: "Compounding, inflation and time",
      "discount rate": "Money now and money later",
      "required return": "Money now and money later",
      perpetuity: "Value that arrives late",
      "net present value": "Net present value",
      beta: "Risk and required return",
      "systematic risk": "Risk and required return",
      "return on equity": "Return on equity and return on capital",
      "interest cover": "Liquidity and gearing",
      "free cash flow": "What a business is worth",
      "carrying value": "Value that arrives late",
      "terminal value": "Value that arrives late",
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
        // A lesson of this course comes first, or is this lesson's own recap
        const target = bundle.lessons.find((item) => item.title === where);
        if (target)
          expect(bundle.lessons.indexOf(target), `${lesson.id}: ${term}`).toBeLessThanOrEqual(
            bundle.lessons.indexOf(lesson),
          );
        // A lesson of another course says which course
        else
          expect(note, `${lesson.id}: ${term}`).toMatch(
            / in (Accounting|Personal Finance and Investing)\.$/u,
          );
        // and that lesson does teach the term, in its own text
        const teaching = JSON.stringify(titles.get(where as string)).toLowerCase();
        expect(teaching.includes(term.toLowerCase()), `${where} teaches ${term}`).toBe(true);
      }
    }
    expect(hovers).toBe(17);
    // Lessons that mention another lesson by its title name a real one
    const quoted = new Set<string>();
    for (const match of everything.matchAll(/'([A-Z][A-Za-z ,]+)'(?!s)/gu))
      quoted.add(match[1] as string);
    const referred = [...quoted].filter((name) => titles.has(name));
    for (const name of [
      "Money now and money later",
      "Risk and required return",
      "What debt and equity cost",
      "Why firms borrow",
      "WACC and hurdle rates",
      "Value that arrives late",
    ])
      expect(referred, name).toContain(name);
    // no lesson refers to "the last lesson" or "the lesson on" a topic without naming it
    expect(everything).not.toMatch(
      /\b(the last lesson|the previous lesson|the lesson on|a later lesson)\b/u,
    );
  });

  it("gives the invented firms of different lessons different names, none of them an Accounting or Personal Finance firm, and calls each invented", () => {
    const names: Record<string, string[]> = {
      Sorrel: ["wacc-and-hurdle-rates"],
      Juniper: ["wacc-and-hurdle-rates"],
      Thistle: ["wacc-and-hurdle-rates"],
      Teasel: ["wacc-and-hurdle-rates"],
      Orchid: ["wacc-and-hurdle-rates"],
      Bracken: ["what-debt-and-equity-cost"],
      Fenwick: ["what-debt-and-equity-cost"],
      Wattle: ["risk-and-required-return"],
      "Harbour Grocers": ["risk-and-required-return"],
      Coastline: ["risk-and-required-return"],
      Coral: ["dividends-buybacks-and-franking"],
      Banksia: ["forecasts-and-sensitivity"],
      Rowan: ["acquisitions-and-the-price-paid"],
      Harbourline: ["acquisitions-and-the-price-paid"],
      Dray: ["acquisitions-and-the-price-paid"],
      Ashgrove: ["what-a-share-price-tells-you"],
    };
    const otherCourses = JSON.stringify([accounting, personalFinance]);
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
    for (const [name, lessons] of Object.entries(names)) {
      const where = bundle.lessons
        .filter((lesson) => new RegExp(`\\b${name}`, "u").test(inLesson(lesson.id)))
        .map((lesson) => lesson.id);
      expect(where, name).toEqual(lessons);
      expect(otherCourses, name).not.toMatch(new RegExp(`\\b${name}\\b`, "u"));
      // the lesson says the case is invented, close to where it names the firm
      const text = inLesson(lessons[0] as string);
      const near = [...text.matchAll(new RegExp(`\\b${name}`, "gu"))].some((match) =>
        text
          .slice(Math.max(0, match.index - 250), match.index + 250)
          .toLowerCase()
          .includes("invented"),
      );
      expect(near, `${name} is called invented`).toBe(true);
    }
    // The names this course took from Accounting in its first draft are gone
    for (const gone of ["Kestrel", "Alder", "Quill", "Dunmore", "Marlow", "Brindle"])
      expect(everything, gone).not.toMatch(new RegExp(`\\b${gone}`, "u"));
  });
});

// Each curve drawn in a figure is checked against the flows that give it
const svgCurves = (svg: string) => {
  const texts = [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/gu)].map((match) => ({
    x: Number(/x="([\d.]+)"/u.exec(match[1] as string)?.[1]),
    y: Number(/y="([\d.]+)"/u.exec(match[1] as string)?.[1]),
    anchor: /text-anchor="(\w+)"/u.exec(match[1] as string)?.[1],
    label: (match[2] as string).trim(),
  }));
  const value = (label: string) => Number(label.replace(/[$,]/gu, "").replace("−", "-"));
  const yTicks = texts
    .filter((item) => item.anchor === "end" && /^[-−$]?[\d,.]+$/u.test(item.label))
    .map((item) => [item.y - 5, value(item.label)] as const);
  const xTicks = texts
    .filter((item) => item.anchor === "middle" && /^\d+%$/u.test(item.label))
    .map((item) => [item.x, value(item.label.replace("%", ""))] as const);
  const line = (ticks: ReadonlyArray<readonly [number, number]>) => {
    const first = ticks[0] as readonly [number, number];
    const last = ticks[ticks.length - 1] as readonly [number, number];
    return (at: number) =>
      first[1] + ((at - first[0]) * (last[1] - first[1])) / (last[0] - first[0]);
  };
  const x = line(xTicks);
  const y = line(yTicks);
  return [...svg.matchAll(/<polyline[^>]*points="([^"]+)"/gu)].map((match) =>
    (match[1] as string)
      .trim()
      .split(/\s+/u)
      .map((pair) => pair.split(",").map(Number) as [number, number])
      .map(([px, py]) => ({ rate: x(px) / 100, value: y(py) })),
  );
};
const figureSvg = (lessonId: string, stepId: string, caseId: string) => {
  const step = lessonOf(lessonId).steps.find((item) => item.id === stepId);
  const diagram = step?.diagram as { cases?: Array<{ id: string; svg?: string }> } | undefined;
  const found = diagram?.cases?.find((item) => item.id === caseId);
  if (!found?.svg) throw new Error(`No figure ${stepId} ${caseId}`);
  return found.svg;
};

describe("Money now and money later", () => {
  it("brings the customer's offer back at 5%, 10% and the break-even rate", () => {
    expect(round(108000 / 1.05, -2)).toBe(102900);
    expect(round(108000 / 1.1, -2)).toBe(98200);
    expect(round(100000 * 1.05)).toBe(105000);
    expect(108000 / 100000 - 1).toBeCloseTo(0.08, 10);
    expect(108000 / 1.08).toBeCloseTo(100000, 6);
    for (const figure of ["$102,900", "$98,200", "$105,000", "$1,800", "$3,000"]) stated(figure);
    // $1,800 under the cash at 10%; $3,000 better when the cash is left in the account
    expect(round(100000 - 108000 / 1.1, -2)).toBe(1800);
    expect(108000 - 105000).toBe(3000);
    // the break-even option of the question is the one that is right
    expect(rightLabel("money-now-and-later-break-even")).toContain("About 8%");
    expect(rightLabel("money-now-and-later-ten-percent")).toContain("$100,000 now");
  });

  it("draws the present value of $108,000 at every rate from 0% to 14%", () => {
    const [curve] = svgCurves(figureSvg("money-now-and-later", "where-the-verdict-flips", "curve"));
    expect(curve?.length).toBeGreaterThan(20);
    for (const point of curve ?? [])
      within(point.value, 108000 / (1 + point.rate), 120, `at ${point.rate}`);
  });

  it("works the dollar due in 1, 5, 10 and 15 years, and the four payments of the order question", () => {
    expect(round(1 / 1.04 ** 10, 2)).toBe(0.68);
    expect(round(1 / 1.08 ** 10, 2)).toBe(0.46);
    expect(round(1 / 1.12 ** 10, 2)).toBe(0.32);
    expect(round(1 / 1.08, 2)).toBe(0.93);
    expect(round(1 / 1.08 ** 5, 2)).toBe(0.68);
    expect(round(1 / 1.08 ** 15, 2)).toBe(0.32);
    expect(round(1 / 1.06 ** 15, 2)).toBe(0.42);
    const values = [120 / 1.08, 100, 130 / 1.08 ** 5, 200 / 1.08 ** 15];
    expect(values.map((value) => round(value))).toEqual([111, 100, 88, 63]);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
    const order = question("money-now-and-later-rank-the-payments").order?.items;
    expect(order).toEqual([
      "$120 due in 1 year",
      "$100 paid now",
      "$130 due in 5 years",
      "$200 due in 15 years",
    ]);
    // the largest sum is the least valuable
    expect(Math.max(120, 100, 130, 200)).toBe(200);
    expect(Math.min(...values)).toBe(values[3]);
  });

  it("prices the Reserve Bank's bond at 2%, at 1% and at a required yield that rises", () => {
    const price = (coupon: number, yieldRate: number, years: number) =>
      coupon * annuity(yieldRate, years) + 100 / (1 + yieldRate) ** years;
    expect(price(2, 0.02, 10)).toBeCloseTo(100, 8);
    within(price(2, 0.01, 10), 109.5, 0.05, "the RBA's price at a 1% yield");
    expect(price(2, 0.01, 10)).toBeGreaterThan(100);
    expect(price(3, 0.03, 10)).toBeCloseTo(100, 8);
    expect(price(3, 0.04, 10)).toBeLessThan(100);
    expect(3 / 0.04).toBeLessThan(100);
    // the wrong option that doubles the price when the yield halves, and the one that scales it by a third
    expect(100 * 2).toBe(200);
    expect(round((100 * 4) / 3)).toBe(133);
    expect(rightLabel("money-now-and-later-bond-yield-falls")).toContain("rises above $100");
    expect(rightLabel("money-now-and-later-rate-rises")).toContain("falls below $100");
  });

  it("works the second customer's offer at 6% and 9%, and its break-even rate", () => {
    expect(round(150000 / 1.06 ** 5, -2)).toBe(112100);
    expect(round(150000 / 1.09 ** 5, -2)).toBe(97500);
    expect(round(100 * (1.5 ** (1 / 5) - 1), 1)).toBe(8.4);
    expect(rightLabel("money-now-and-later-five-years-out")).toContain("Waiting wins at 6%");
    expect(rightLabel("money-now-and-later-five-years-out")).toContain("cash wins at 9%");
  });

  it("shows that flat prices do not remove the price of waiting", () => {
    expect(200 * 1.05).toBe(210);
    expect(210).toBeGreaterThan(204);
    expect(round(200 * 0.05)).toBe(10);
    expect(round(210 - 204)).toBe(6);
    expect(round(100 * 1.05)).toBe(105);
    expect(rightLabel("money-now-and-later-no-inflation-needed")).toContain("The $200 now");
    expect(rightLabel("money-now-and-later-no-inflation-needed")).toContain("$210");
  });
});

describe("Value that arrives late", () => {
  const lease = (rate: number) => 50000 * annuity(rate, 30);
  it("values the 30-year lease at 6% and 10%, and its first and last payments", () => {
    expect(round(lease(0.06), -3)).toBe(688000);
    expect(round(lease(0.1), -3)).toBe(471000);
    expect(round(50000 / 1.06, -2)).toBe(47200);
    expect(round(50000 / 1.06 ** 30, -2)).toBe(8700);
    expect(30 * 50000).toBe(1500000);
    expect(lease(0.06) / 1.5e6).toBeLessThan(0.5);
    expect(lease(0.06) / 1.5e6).toBeGreaterThan(0.45);
    // the hook's options
    expect(rightLabel("value-that-arrives-late-hook")).toContain("$690,000");
    expect(labels("value-that-arrives-late-hook")).toContain(
      "About $1.1 million, roughly three quarters of the sum",
    );
    expect(1.1e6 / 1.5e6).toBeGreaterThan(0.7);
    expect(3e5 / 1.5e6).toBeCloseTo(0.2, 10);
  });

  it("splits the lease between its first ten years and the rest", () => {
    const first = (rate: number) => 50000 * annuity(rate, 10);
    expect(round(pct(first(0.06), lease(0.06)))).toBe(53);
    expect(round(pct(first(0.1), lease(0.1)))).toBe(65);
    expect(round(first(0.06), -4)).toBe(370000);
    expect(round(pct(first(0.06), lease(0.06)))).toBeGreaterThan(50);
    stated("about 53% of the value");
    // the last twenty payments carry nearly half at 6%
    expect(pct(lease(0.06) - first(0.06), lease(0.06))).toBeGreaterThan(45);
    expect(rightLabel("value-that-arrives-late-first-ten-years")).toContain("one half");
  });

  it("measures how far a rise from 6% to 10% cuts streams of different lengths", () => {
    const loss = (years: number, from = 0.06, to = 0.1) =>
      1 - annuity(to, years) / annuity(from, years);
    expect(round(100 * loss(30), 1)).toBe(31.5);
    expect(round(100 * loss(5), 1)).toBe(10);
    expect(round(100 * loss(10))).toBe(17);
    expect(round(100 * loss(20))).toBe(26);
    expect(loss(20)).toBeGreaterThan(loss(10));
    // the figure's two curves at 10%, as a share of the value at 6%
    expect(round(100 * (1 - loss(5)))).toBe(90);
    expect(round(100 * (1 - loss(30)))).toBe(68);
    expect(rightLabel("value-that-arrives-late-ten-years-or-twenty")).toContain("20-year lease");
    stated("about 17% of its value and the 20-year lease about 26%");
  });

  it("values perpetuities, what lies beyond year 30, and terminal values", () => {
    expect(50000 / 0.1).toBe(500000);
    expect(round(50000 / 0.06, -3)).toBe(833000);
    expect(round(500000 - lease(0.1), -3)).toBe(29000);
    expect(round(50000 / 0.06 - lease(0.06), -3)).toBe(145000);
    expect(50000 / (0.1 - 0.02)).toBe(625000);
    expect(round(50000 / (0.1 - 0.04), -3)).toBe(833000);
    expect(50000 / 0.06 / (50000 / 0.08)).toBeCloseTo(4 / 3, 10);
    // growth above the rate gives a negative bottom line
    expect(0.06 - 0.08).toBeLessThan(0);
  });

  it("works the one-point cut and the order of four assets by the loss from a rise to 9%", () => {
    const before = 60 / (0.1 - 0.03);
    const after = 60 / (0.09 - 0.03);
    expect(round(before)).toBe(857);
    expect(after).toBe(1000);
    within(after / before - 1, 1 / 6, 0.001, "about a sixth");
    expect(rightLabel("value-that-arrives-late-one-point-cut")).toContain("a sixth");
    const loss = (value: (rate: number) => number) => 1 - value(0.09) / value(0.06);
    const losses = [
      loss((rate) => 1 / rate),
      loss((rate) => annuity(rate, 25)),
      loss((rate) => annuity(rate, 5)),
      loss((rate) => 1 / (1 + rate)),
    ];
    expect(losses.map((value) => round(100 * value))).toEqual([33, 23, 8, 3]);
    expect([...losses].sort((a, b) => b - a)).toEqual(losses);
    expect(question("value-that-arrives-late-rank-by-rate-rise").order?.items).toHaveLength(4);
  });

  it("reads Woolworths's long-term growth rate and rates by unit from the report", () => {
    expect(fixture.figures.wowGrowth.join(" ")).toContain("growth rate of 2.5%");
    expect(wowRate("New Zealand Food")[0]).toBe(8.6);
    expect(wowRate("Quantium")[0]).toBe(11.2);
    stateIn("value-that-arrives-late", "long-term growth rate of 2.5% a year");
    stateIn("value-that-arrives-late", "8.6% for New Zealand Food to 11.2% for Quantium");
    expect(fixture.figures.wowHeadroom.join(" ")).toContain(
      "1.0% increase in the post-tax discount rate",
    );
  });
});

describe("Net present value", () => {
  const fitOut = (cash: number) => [-1_000_000, cash, cash, cash, cash, cash];
  it("values the three fit-outs at 8%", () => {
    expect(round(npv(0.08, fitOut(300000)), -2)).toBe(197800);
    expect(round(npv(0.08, fitOut(250000)), -2)).toBe(-1800);
    expect(round(npv(0.08, fitOut(200000)), -2)).toBe(-201500);
    expect(round(300000 * annuity(0.08, 5), -2)).toBe(1197800);
    expect(round(250000 * annuity(0.08, 5), -2)).toBe(998200);
    expect(round(200000 * annuity(0.08, 5), -2)).toBe(798500);
    for (const figure of ["+$197,800", "-$1,800", "-$201,500", "$277,800", "$204,200"])
      stated(figure);
    // the five yearly values of A
    expect([1, 2, 3, 4, 5].map((year) => round(300000 / 1.08 ** year, -2))).toEqual([
      277800, 257200, 238100, 220500, 204200,
    ]);
    // each returns its cost or more in cash, and only A returns more than its cost in today's money
    expect(5 * 200000).toBe(1_000_000);
    expect(irrs(fitOut(200000))[0]).toBeCloseTo(0, 6);
    expect(round(100 * (irrs(fitOut(300000))[0] as number), 1)).toBe(15.2);
    expect(round(100 * (irrs(fitOut(250000))[0] as number), 1)).toBe(7.9);
  });

  it("draws A's NPV at every rate from 0% to 20%", () => {
    const [curve] = svgCurves(
      figureSvg("net-present-value", "the-rate-behind-the-number", "profile"),
    );
    expect(curve?.length).toBeGreaterThan(50);
    for (const point of curve ?? [])
      within(point.value, npv(point.rate, fitOut(300000)) / 1000, 1.5, `at ${point.rate}`);
    expect(round(npv(0, fitOut(300000)), -3)).toBe(500000);
    expect(round(npv(0.2, fitOut(300000)), -3)).toBe(-103000);
  });

  it("works the hook, the project that is a dollar from zero and the three projects with a short budget", () => {
    // a dollar paid evenly over five years is worth about 80 cents at 8%
    expect(round(npv(0.08, [0, 1, 1, 1, 1, 1]) / 5, 2)).toBe(0.8);
    expect(round(1500000 * 0.8, -5)).toBe(1200000);
    expect(round(1250000 * 0.8, -5)).toBe(1000000);
    expect(round(1000000 * 0.8, -5)).toBe(800000);
    expect(rightLabel("net-present-value-hook")).toContain("Only A creates value");
    expect(401000 - 400000).toBe(1000);
    // independent projects add
    expect(198000 + 40000).toBe(238000);
    // with $2.0 million, the best choice of X (1.5, +150), Y (1.0, +100) and Z (1.0, +90)
    const projects = [
      { name: "X", cost: 1.5, value: 150 },
      { name: "Y", cost: 1.0, value: 100 },
      { name: "Z", cost: 1.0, value: 90 },
    ];
    let best = { names: "", value: 0 };
    for (let mask = 1; mask < 8; mask += 1) {
      const chosen = projects.filter((_, index) => mask & (1 << index));
      if (chosen.reduce((sum, item) => sum + item.cost, 0) <= 2.0) {
        const value = chosen.reduce((sum, item) => sum + item.value, 0);
        if (value > best.value) best = { names: chosen.map((item) => item.name).join(""), value };
      }
    }
    expect(best).toEqual({ names: "YZ", value: 190 });
    expect(projects.reduce((sum, item) => sum + item.cost, 0)).toBe(3.5);
    expect(rightLabel("net-present-value-when-capital-is-short")).toContain("Fund Y and Z");
  });

  it("works the project that returns more cash than it costs and still loses, and the package", () => {
    const h = [-600000, 160000, 160000, 160000, 160000];
    expect(round(160000 * annuity(0.09, 4), -3)).toBe(518000);
    expect(round(npv(0.09, h), -4)).toBe(-80000);
    expect(4 * 160000).toBe(640000);
    expect(640000 - 600000).toBe(40000);
    expect(rightLabel("net-present-value-cash-gain-but-negative")).toContain(
      "destroys about $80,000",
    );
    expect(150000 - 30000).toBe(120000);
    expect(rightLabel("net-present-value-bundled-package")).toContain("Approve K and reject L");
    // a project whose NPV is $120,000 below zero at 10% and $60,000 above at 6% is not worth the average
    expect((-120000 + 60000) / 2).toBe(-30000);
  });
});

describe("Which cash flows count", () => {
  it("works the owned warehouse, the lost sales and the stock", () => {
    expect(2_000_000 - 1_200_000).toBe(800000);
    expect(rightLabel("cash-flows-that-count-owned-warehouse")).toContain("$2 million");
    expect(300_000_000 / 3).toBe(100_000_000);
    expect(2_000_000_000 + 500_000_000).toBe(2_500_000_000);
    stateIn("cash-flows-that-count", "UQ's finance text counts tax on the extra profit");
    expect(rightLabel("cash-flows-that-count-stock-timing")).toContain("outflow at the start");
  });

  it("keeps loan interest out of the depot's flows and the survey fee sunk", () => {
    expect(rightLabel("cash-flows-that-count-hook")).toContain("spent whether or not");
    expect(rightLabel("cash-flows-that-count-interest-twice")).toContain("charged twice");
    expect(rightLabel("cash-flows-that-count-finish-the-plant")).toContain("Ignore the $2 billion");
  });
});

describe("IRR and payback: where they mislead", () => {
  const small = [-100, 60, 60, 60];
  const large = [-1000, 400, 400, 400, 400];
  it("works S and L at 8%, with their IRRs", () => {
    expect(round(npv(0.08, small), 1)).toBe(54.6);
    expect(round(npv(0.08, large), 1)).toBe(324.9);
    expect(round(100 * (irrs(small)[0] as number), 1)).toBe(36.3);
    expect(round(100 * (irrs(large)[0] as number), 1)).toBe(21.9);
    expect(Math.round(npv(0.08, large) / npv(0.08, small))).toBe(6);
    expect(1_000_000 / 100_000).toBe(10);
    expect(rightLabel("irr-payback-and-where-they-mislead-hook")).toContain(
      "L, because it adds more value",
    );
    for (const figure of ["$54,600", "$325,000", "36%", "22%", "six times"]) stated(figure);
  });

  it("draws X and Y, which cross near 15%, with IRRs of 30% and 18%", () => {
    const x = [-100, 55, 55, 55];
    const y = [-400, 150, 150, 150, 150];
    const curves = svgCurves(
      figureSvg("irr-payback-and-where-they-mislead", "when-the-rules-disagree", "profiles"),
    );
    expect(curves).toHaveLength(2);
    const [lineX, lineY] = [...curves].sort((a, b) => (a[0]?.value ?? 0) - (b[0]?.value ?? 0));
    for (const point of lineX ?? [])
      within(point.value, npv(point.rate, x), 1.2, `X at ${point.rate}`);
    for (const point of lineY ?? [])
      within(point.value, npv(point.rate, y), 1.2, `Y at ${point.rate}`);
    expect(round(100 * (irrs(x)[0] as number))).toBe(30);
    expect(round(100 * (irrs(y)[0] as number))).toBe(18);
    // Y is higher below the crossing rate and X above it
    const crossing = (() => {
      let rate = 0;
      while (npv(rate, y) > npv(rate, x)) rate += 0.0001;
      return rate;
    })();
    expect(round(100 * crossing)).toBe(15);
    expect(npv(0.1, y)).toBeGreaterThan(npv(0.1, x));
    expect(npv(0.2, x)).toBeGreaterThan(npv(0.2, y));
  });

  it("works P and Q: payback in 2 and 3.75 years, NPV and IRR", () => {
    const p = [-1000, 500, 500];
    const q = [-1000, 200, 200, 300, 400, 600, 600];
    // P is repaid when its second payment arrives, at the end of year 2
    expect(payback(p)).toBe(2);
    expect(payback(q)).toBe(3.75);
    expect(npv(0, p)).toBe(0);
    expect(round(npv(0.08, p), 0)).toBe(-108);
    expect(round(npv(0.08, q), 0)).toBe(675);
    expect(round(100 * (irrs(q)[0] as number), 1)).toBe(23.6);
    // cumulative cash after year 3 is 700, so year 4 adds 300 of its 400: 3.75 years
    expect(200 + 200 + 300).toBe(700);
    expect(3 + (1000 - 700) / 400).toBe(3.75);
    expect(rightLabel("irr-payback-and-where-they-mislead-fast-or-valuable")).toContain(
      "Payback prefers P",
    );
  });

  it("works the wind farm and the quarry, which each have two IRRs", () => {
    const wind = [-900, 2800, -2000];
    const roots = irrs(wind).map((root) => round(100 * root, 1));
    expect(roots).toEqual([11.1, 100]);
    expect(npv(0.05, wind)).toBeLessThan(0);
    expect(npv(0.5, wind)).toBeGreaterThan(0);
    expect(npv(1.2, wind)).toBeLessThan(0);
    const [curve] = svgCurves(
      figureSvg("irr-payback-and-where-they-mislead", "more-than-one-answer", "curve"),
    );
    for (const point of curve ?? [])
      within(point.value, npv(point.rate, wind), 1.2, `at ${point.rate}`);
    // the peak is near +80 at about 43%
    const peak = Math.max(...(curve ?? []).map((point) => point.value));
    within(peak, 80, 3, "the peak");
    const quarry = [-1000, 3000, -2200];
    expect(irrs(quarry).map((root) => round(100 * root))).toEqual([28, 72]);
    expect(round(npv(0.1, quarry))).toBe(-91);
    expect(irrs(quarry).every((root) => root > 0.1)).toBe(true);
    expect(rightLabel("irr-payback-and-where-they-mislead-both-above-the-hurdle")).toContain(
      "Reject it",
    );
  });

  it("works the two contracts and the single project judged on its own", () => {
    const short = [-100000, 75000, 75000];
    const long = [-100000, ...Array<number>(10).fill(30000)];
    expect(round(100 * (irrs(short)[0] as number))).toBe(32);
    expect(round(100 * (irrs(long)[0] as number))).toBe(27);
    expect(round(npv(0.08, short), -3)).toBe(34000);
    expect(round(npv(0.08, long), -3)).toBe(101000);
    expect(irrs(short)[0] as number).toBeGreaterThan(irrs(long)[0] as number);
    expect(npv(0.08, long)).toBeGreaterThan(npv(0.08, short));
    const single = [-500000, 180000, 180000, 180000, 180000];
    expect(round(100 * (irrs(single)[0] as number))).toBe(16);
    expect(round(npv(0.1, single), -3)).toBe(71000);
    expect(rightLabel("irr-payback-and-where-they-mislead-two-contracts")).toContain(
      "ten-year contract",
    );
    expect(rightLabel("irr-payback-and-where-they-mislead-one-project-on-its-own")).toContain(
      "positive",
    );
  });
});

describe("Risk and required return", () => {
  it("reads Woolworths's rates by unit from the report, and the betas of the figure", () => {
    expect(wowRate("Australian Food")).toEqual([8.7, 8.2]);
    expect(wowRate("New Zealand Food")).toEqual([8.6, 8.6]);
    expect(wowRate("PFD")).toEqual([9.5, 8.9]);
    expect(wowRate("Petstock")).toEqual([9.8, 9.3]);
    expect(wowRate("Quantium")).toEqual([11.2, 10.7]);
    expect(
      Math.max(...fixture.figures.wowRates.map((line) => numbersIn(line).slice(-2)[0] as number)),
    ).toBe(11.2);
    expect(wowRate("Quantium")[0]).toBeGreaterThan(wowRate("Australian Food")[0] as number);
    expect(wowRate("Petstock")[0]).toBeGreaterThan(wowRate("Australian Food")[0] as number);
    // the invented betas: a 10% move in the market moves shares by beta times 10%
    expect([0.5, 1, 1.5].map((beta) => beta * 10)).toEqual([5, 10, 15]);
    stateIn("risk-and-required-return", "from 8.6% for New Zealand Food to 11.2% for Quantium");
    expect(rightLabel("risk-and-required-return-wrong-rate")).toContain("raised it");
    expect(rightLabel("risk-and-required-return-wattle")).toContain(
      "Little above the risk-free rate",
    );
  });
});

describe("What debt and equity cost", () => {
  it("shows that the swap saves less than the gap between the two costs", () => {
    const blend = (equity: number, debt: number, weight = 0.5) =>
      weight * equity + (1 - weight) * debt;
    expect(blend(11, 5)).toBe(8);
    expect(11 - blend(11, 5)).toBe(3);
    expect(blend(14, 5)).toBe(9.5);
    expect(11 - blend(14, 5)).toBe(1.5);
    expect(11 - blend(14, 5)).toBeLessThan(3);
    expect(rightLabel("what-debt-and-equity-cost-swap-half")).toContain("Smaller");
    stateIn("what-debt-and-equity-cost", "9.5%");
  });

  it("reads Cross City Tunnel's funding and CLEM7's debt as the lessons state them", () => {
    expect(220 / (220 + 580)).toBeLessThan(0.3);
    expect(round(580 / (220 + 580), 1)).toBe(0.7);
    expect(220 + 580).not.toBe(680);
    stateIn("what-debt-and-equity-cost", "$1.3 billion of debt");
    stateIn("what-debt-and-equity-cost", "about seven dollars in every ten were borrowed");
  });

  it("reads Lovisa's facility from the report and the bond example", () => {
    const [rate, year, limit, drawn, rateBefore, yearBefore, limitBefore, drawnBefore] = numbersIn(
      (fixture.figures.lovFacility[0] as string).replace(/^Cash advance facility AUD/u, ""),
    );
    expect([rate, year, limit, drawn]).toEqual([5.5, 2029, 120000, 87000]);
    expect([rateBefore, yearBefore, limitBefore, drawnBefore]).toEqual([5.8, 2026, 100000, 77000]);
    stated("nominal interest rate of 5.5%");
    expect(rightLabel("what-debt-and-equity-cost-lovisa-rate")).toContain(
      "risk-free government yield",
    );
    // the old coupon is not the cost of debt: a firm like Bracken pays 9% on its bond and 6% on new debt
    expect(rightLabel("what-debt-and-equity-cost-old-coupon")).toContain("About 6%");
  });
});

describe("WACC and hurdle rates", () => {
  it("blends Sorrel Group's costs and Juniper's two businesses", () => {
    expect(round(0.7 * 10 + 0.3 * 5, 1)).toBe(8.5);
    expect(8.5 - 5).toBeGreaterThan(10 - 8.5);
    expect(round(0.8 * 7, 1)).toBe(5.6);
    expect(round(0.2 * 11, 1)).toBe(2.2);
    expect(round(0.8 * 7 + 0.2 * 11, 1)).toBe(7.8);
    expect(7 < 7.8 && 7.8 < 11).toBe(true);
    expect(rightLabel("wacc-and-hurdle-rates-hook")).toContain("Nearer 10% than 5%");
    stateIn("wacc-and-hurdle-rates", "5.6% and 0.2 × 11% = 2.2%");
    stateIn("wacc-and-hurdle-rates", "7.8%");
  });

  it("judges the steady and the cyclical expansion against the rate for their own risk", () => {
    // a steady 7.5% beats 7% and falls short of the blended 7.8%; a cyclical 9% beats 7.8% and falls short of 11%
    expect(7.5 > 7 && 7.5 < 7.8).toBe(true);
    expect(9 > 7.8 && 9 < 11).toBe(true);
    expect(rightLabel("wacc-and-hurdle-rates-steady-hurdle")).toContain("7%,");
    expect(rightLabel("wacc-and-hurdle-rates-cyclical-hurdle")).toContain("Reject it");
    // Thistle's cinema chain is priced at the rival's 11%, not its own 8%
    expect(rightLabel("wacc-and-hurdle-rates-thistle")).toContain("About 11%");
    // the two analysts' gap is 1.2 points
    expect(round(9.1 - 7.9, 1)).toBe(1.2);
  });

  it("finds the change in each of Woolworths's rates from 2025 to 2026", () => {
    const changes = ["Australian Food", "New Zealand Food", "PFD", "Petstock", "Quantium"].map(
      (unit) => {
        const [now, before] = wowRate(unit) as [number, number];
        return round(now - before, 1);
      },
    );
    expect(changes).toEqual([0.5, 0, 0.6, 0.5, 0.5]);
    expect(changes.filter((change) => change > 0)).toHaveLength(4);
    stateIn(
      "wacc-and-hurdle-rates",
      "Four of the five rose between 2025 and 2026, by 0.5 to 0.6 percentage points",
    );
    expect(rightLabel("wacc-and-hurdle-rates-headroom")).toContain("It shrinks");
  });
});

describe("Why firms borrow", () => {
  it("works the leverage table: owners' returns in a good, normal and bad year", () => {
    const assets = 100;
    const debt = 50;
    const interest = debt * 0.06;
    expect(interest).toBe(3);
    const owners = (profit: number, equity: number, loan: number) =>
      (profit - 0.06 * loan) / equity;
    const profits = [16, 10, 2];
    expect(profits.map((profit) => round(100 * owners(profit, assets, 0)))).toEqual([16, 10, 2]);
    expect(profits.map((profit) => round(100 * owners(profit, assets - debt, debt)))).toEqual([
      26, 14, -2,
    ]);
    // the loan helps exactly when the assets earn more than 6%
    expect(profits.map((profit) => profit / assets > 0.06)).toEqual([true, true, false]);
    expect(rightLabel("why-firms-borrow-which-years")).toContain("good and normal");
    expect(rightLabel("why-firms-borrow-four-against-six")).toContain("It falls");
    // a firm whose assets earn 4% and borrows at 6% loses 2 cents on each borrowed dollar
    expect(round(0.04 - 0.06, 2)).toBe(-0.02);
    stateIn(
      "why-firms-borrow",
      "26% in the good year, 14% in the normal year and a loss of 2% in the bad year",
    );
  });

  it("works the tax shield at 30% and at 25%", () => {
    const tax = 0.3;
    const uTax = 10 * tax;
    const lTax = (10 - 3) * tax;
    expect([round(uTax, 1), round(lTax, 1), round(uTax - lTax, 1)]).toEqual([3, 2.1, 0.9]);
    expect(round(3 * tax, 1)).toBe(0.9);
    expect(round(10 - uTax, 1)).toBe(7);
    expect(round(10 - 3 - lTax, 1)).toBe(4.9);
    expect(round(10 - 3 - lTax + 3, 1)).toBe(7.9);
    expect(10 * 0.25).toBe(2.5);
    expect(rightLabel("why-firms-borrow-tax-saved")).toContain("$2.5m");
    expect(labels("why-firms-borrow-tax-saved")).toContain(
      "About $10m, because the whole interest bill comes off the tax",
    );
    stateIn("why-firms-borrow", "25% for base rate entities and 30% otherwise");
  });

  it("reads Woolworths's leverage and Lovisa's borrowing from the reports", () => {
    expect(lastNumbers("wowCapital", "Net debt to EBITDA before significant items", 2)).toEqual([
      2.5, 2.8,
    ]);
    const [borrowings] = lastNumbers("wowCapital", "Borrowings", 2);
    const [leases] = lastNumbers("wowCapital", "Lease liabilities", 2);
    const [cash] = lastNumbers("wowCapital", "Less: cash", 2);
    const [netDebt] = lastNumbers("wowCapital", "Net debt on the Consolidated", 2);
    expect([borrowings, leases, cash, netDebt]).toEqual([5161, 11316, -1497, 14980]);
    expect((borrowings as number) + (leases as number) + (cash as number)).toBe(netDebt);
    const [forRatio] = lastNumbers("wowCapital", "Net debt used in leverage ratio", 2);
    const [ebitda] = lastNumbers("wowCapital", "EBITDA before significant items", 2);
    expect(round((forRatio as number) / (ebitda as number), 1)).toBe(2.5);
    stateIn(
      "why-firms-borrow",
      "net debt of 2.5 times EBITDA before significant items for 2026, down from 2.8 times",
    );
    stated("$14,980 million, including $11,316 million of lease liabilities");
  });
});

describe("Distress and the trade-off", () => {
  it("works interest cover for the steady and the cyclical firm", () => {
    const interest = 40;
    const steady = [90, 100, 110];
    const cyclical = [20, 100, 180];
    expect(steady.map((profit) => profit / interest)).toEqual([2.25, 2.5, 2.75]);
    expect(cyclical.map((profit) => profit / interest)).toEqual([0.5, 2.5, 4.5]);
    expect(steady.reduce((a, b) => a + b, 0) / 3).toBe(100);
    expect(cyclical.reduce((a, b) => a + b, 0) / 3).toBe(100);
    expect(Math.min(...steady) / interest).toBeGreaterThan(2);
    expect(Math.min(...cyclical) / interest).toBe(0.5);
    expect(rightLabel("distress-and-the-trade-off-hook")).toContain("The steady firm");
    stateIn("distress-and-the-trade-off", "2.25, 2.5 and 2.75 times");
    stateIn("distress-and-the-trade-off", "0.5, 2.5 and 4.5");
  });

  it("orders Cross City Tunnel's events by their dates", () => {
    const dates = [
      new Date("2005-08-28"),
      new Date("2006-02-15"),
      new Date("2006-11-15"),
      new Date("2006-12-27"),
      new Date("2007-06-20"),
    ];
    expect([...dates].sort((a, b) => a.getTime() - b.getTime())).toEqual(dates);
    const items = question("distress-and-the-trade-off-tunnel-order").order?.items ?? [];
    expect(items).toHaveLength(5);
    expect(items[0]).toBe("The tunnel opens to traffic");
    expect(items[4]).toContain("$700 million");
    // opened in August 2005 and sold within two years
    const span = (dates[4] as Date).getTime() - (dates[0] as Date).getTime();
    expect(span).toBeLessThan(2 * 366 * 86400000);
  });
});

describe("Dividends, buybacks and franking credits", () => {
  it("works the payout ratios of Lovisa and Woolworths from the reports", () => {
    const profit = lovFive("Net profit after tax");
    const dividends = lovFive("Dividends paid");
    // The table runs 2026 first
    const ratios = dividends.map((paid, index) => pct(paid, profit[index] as number));
    expect(ratios.map((ratio) => round(ratio, 1))).toEqual([92.7, 111.6, 107.8, 118.6, 101.2]);
    expect(ratios.filter((ratio) => ratio > 100)).toHaveLength(4);
    expect(round(Math.min(...ratios.slice(1)) - 100)).toBe(1);
    expect(round(Math.max(...ratios) - 100)).toBe(19);
    expect(profit.map((value) => round(value / 1000, 1))).toEqual([95.6, 86.3, 82.4, 68.2, 58.4]);
    expect(dividends.map((value) => round(value / 1000, 1))).toEqual([
      88.6, 96.3, 88.9, 80.9, 59.1,
    ]);
    stateIn("dividends-buybacks-and-franking", "in 2026 it paid out about 93% of its profit");
    // Woolworths paid $1,100 million in cash against a profit of $1,138 million
    const [wowProfit] = lastNumbers("wowDividends", "NPAT attributable", 3);
    const [wowPaid] = lastNumbers("wowDividends", "Dividends paid in cash", 2);
    expect([wowProfit, wowPaid]).toEqual([1138, 1100]);
    expect(round(pct(wowPaid as number, wowProfit as number), 1)).toBe(96.7);
    expect(lastNumbers("wowDividends", "Total dividend per share", 3)[0]).toBe(97);
    expect(lastNumbers("wowDividends", "Franking credits", 2)[0]).toBe(1746);
    stateIn(
      "dividends-buybacks-and-franking",
      "Woolworths paid $1,100 million in cash dividends in the year to June 2026, against a profit of $1,138 million",
    );
    stateIn("dividends-buybacks-and-franking", "$1,746 million of credits");
    // Lovisa's year-end facility rose from $77 million to $87 million
    expect(numbersIn(fixture.figures.lovFacility[0] as string).slice(-1)[0]).toBe(77000);
    expect(rightLabel("dividends-buybacks-and-franking-lovisa-next-question")).toContain(
      "cash flow and borrowing",
    );
  });

  it("reads Lovisa's dividends and franking from the report", () => {
    const text = fixture.figures.lovDividends.join(" ");
    expect(text).toContain("27.0 cents per fully paid share unfranked paid on 16 October 2025");
    expect(text).toContain("53.0 cents per fully paid share 50% franked paid on 26 March 2026");
    expect(text).toContain("33.0 cents per qualifying ordinary share, 50% franked");
    expect(numbersIn(fixture.figures.lovFranking.join(" ")).slice(-2)).toEqual([2088, 878]);
    expect(round(2088 / 1000, 1)).toBe(2.1);
    stateIn("dividends-buybacks-and-franking", "Lovisa with $2.1 million");
  });

  it("works the pay-out-or-keep rule", () => {
    // $50 million, a 5% project against 9% elsewhere: pay out
    expect(5 < 9).toBe(true);
    expect(rightLabel("dividends-buybacks-and-franking-keep-or-pay")).toContain("Pay it out");
    // Coral Freight: the depot (13%) beats 9%, the second project (6%) does not
    const projects = [
      { cost: 10, rate: 13 },
      { cost: 20, rate: 6 },
    ];
    const kept = projects
      .filter((project) => project.rate > 9)
      .reduce((sum, project) => sum + project.cost, 0);
    expect(kept).toBe(10);
    expect(30 - kept).toBe(20);
    expect(rightLabel("dividends-buybacks-and-franking-check-coral")).toContain(
      "pay the remaining $20 million",
    );
  });

  it("works the dividend, the buyback and earnings per share", () => {
    // 100 million shares at $10, a $1 dividend a share: each share is worth about $9
    expect(100e6 * 1).toBe(100e6);
    expect(10 - 1).toBe(9);
    expect(rightLabel("dividends-buybacks-and-franking-hook")).toContain("About $9");
    // the invented company of the figure: $10 million of profit over 10 and 9 million shares
    expect(10 / 10).toBe(1);
    expect(round(10 / 9, 2)).toBe(1.11);
    expect(1000 * 9 + 1000 * 1).toBe(10000);
    expect(1000 * 10).toBe(10000);
    expect(100 - 10).toBe(90);
    expect(90 / 10).toBe(9);
    expect(90 / 9).toBe(10);
    expect(rightLabel("dividends-buybacks-and-franking-eps-rise")).toContain("Not by itself");
  });

  it("works the franked dollar and the three shareholders", () => {
    const company = 0.3;
    // a company earns $100, pays $30 of tax and pays a $70 dividend carrying $30 of credit
    const dividend = 100 * (1 - company);
    const credit = (dividend * company) / (1 - company);
    expect([dividend, round(credit)]).toEqual([70, 30]);
    const perDollar = company / (1 - company);
    expect(round(100 * perDollar, 1)).toBe(42.9);
    expect(round(100 * perDollar * 0.5, 1)).toBe(21.4);
    expect(round(1 + perDollar, 2)).toBe(1.43);
    expect(round(1 + perDollar * 0.5, 2)).toBe(1.21);
    for (const figure of ["$1.43", "$1.21", "42.9 cents", "21.4 cents"]) stated(figure);
    // holders at 0%, 30% and 45%: tax on the $100, less the credit, is a refund, nothing or top-up
    const holder = (rate: number) => ({
      tax: round(100 * rate),
      toPay: round(100 * rate - credit) + 0,
      kept: round(dividend + credit - 100 * rate),
    });
    expect(holder(0)).toEqual({ tax: 0, toPay: -30, kept: 100 });
    expect(holder(0.3)).toEqual({ tax: 30, toPay: 0, kept: 70 });
    expect(holder(0.45)).toEqual({ tax: 45, toPay: 15, kept: 55 });
    // the same $100 ends up taxed at the holder's own rate
    expect([0, 0.3, 0.45].map((rate) => 100 - holder(rate).kept)).toEqual([0, 30, 45]);
    // the ATO's Rodney: a $700 dividend with $300 of credit, grossed up to $1,000, $200 of tax
    expect(700 + 300).toBe(1000);
    expect(300 - 200).toBe(100);
    expect(rightLabel("dividends-buybacks-and-franking-rodney")).toContain(
      "refunds the part of the credit",
    );
    // Sandra includes the cash and the credit
    expect(70 + credit).toBe(100);
    expect(rightLabel("dividends-buybacks-and-franking-check-sandra")).toContain(
      "plus the franking credit",
    );
  });
});

describe("Forecasts and sensitivity", () => {
  const project = (
    changes: Partial<{
      price: number;
      units: number;
      variable: number;
      fixed: number;
      rate: number;
      life: number;
      outlay: number;
    }> = {},
  ) => {
    const base = {
      price: 100,
      units: 12000,
      variable: 55,
      fixed: 120000,
      rate: 0.09,
      life: 8,
      outlay: 2_000_000,
    };
    const p = { ...base, ...changes };
    const cash = p.units * (p.price - p.variable) - p.fixed;
    return p.life === 0 ? -p.outlay : cash * annuity(p.rate, p.life) - p.outlay;
  };
  it("works the base case and every row of the sensitivity table", () => {
    expect(12000 * (100 - 55) - 120000).toBe(420000);
    expect(round(420000 * annuity(0.09, 8), -4)).toBe(2320000);
    expect(round(project(), -3) / 1000).toBe(325);
    const rows = [
      project({ price: 90 }),
      project({ units: 9600 }),
      project({ variable: 60.5 }),
      project({ fixed: 144000 }),
      project({ rate: 0.11 }),
      project({ life: 6 }),
      project({ outlay: 2_400_000 }),
    ].map((value) => round(value / 1000));
    expect(rows).toEqual([-340, -273, -41, 192, 161, -116, -75]);
    // the changes in the table are 10%, 20%, 10%, 20%, two points, two years and 20%
    expect(
      [90 / 100, 9600 / 12000, 60.5 / 55, 144000 / 120000, 2.4 / 2.0].map((v) => round(v, 6)),
    ).toEqual([0.9, 0.8, 1.1, 1.2, 1.2]);
    // the two worst bad cases are price and units
    const worst = [...rows].sort((a, b) => a - b).slice(0, 2);
    expect(worst).toEqual([-340, -273]);
    expect(rightLabel("forecasts-and-sensitivity-which-two")).toContain(
      "Selling price and units sold",
    );
    for (const figure of [
      "+$325,000",
      "−$340,000",
      "−$273,000",
      "−$41,000",
      "−$75,000",
      "−$116,000",
    ])
      stated(figure);
  });

  it("finds the break-even price and the break-even volume", () => {
    const solve = (f: (x: number) => number, low: number, high: number) => {
      let a = low;
      let b = high;
      for (let i = 0; i < 80; i += 1) {
        const mid = (a + b) / 2;
        if (f(mid) * f(a) <= 0) b = mid;
        else a = mid;
      }
      return (a + b) / 2;
    };
    const breakEvenPrice = solve((price) => project({ price }), 60, 100);
    expect(round(breakEvenPrice, 2)).toBe(95.11);
    expect(round(100 - breakEvenPrice, 1)).toBe(4.9);
    const breakEvenUnits = solve((units) => project({ units }), 5000, 12000);
    expect(round(breakEvenUnits, -2)).toBe(10700);
    expect(round(100 * (1 - breakEvenUnits / 12000))).toBe(11);
    // the price question: a 10% fall costs about $664,000, so each 1% costs about $66,000
    expect(round(project() - project({ price: 90 }), -3)).toBe(664000);
    expect(round((project() - project({ price: 90 })) / 10, -3)).toBe(66000);
    // zero lies about half of the way along a 10% fall
    within(project() / (project() - project({ price: 90 })), 0.49, 0.02, "about half");
    expect(rightLabel("forecasts-and-sensitivity-price-break-even")).toContain("About 5%");
    // the volume line passes through three points of the figure
    expect([9600, 12000, 14400].map((units) => round(project({ units }) / 1000))).toEqual([
      -273, 325, 922,
    ]);
    const [curve] = [figureSvg("forecasts-and-sensitivity", "break-even", "volume")];
    stated("about 10,700 units");
    expect(curve).toContain("Break-even");
    // a project whose price break-even is 3% is thin beside a plausible miss of 10%
    expect(3 < 10).toBe(true);
    expect(rightLabel("forecasts-and-sensitivity-check-thin")).toContain("thin");
  });

  it("works the linked case, in which price and volume miss together", () => {
    expect(round(project({ price: 90, units: 9600 }) / 1000)).toBe(-804);
    expect(project({ price: 90, units: 9600 })).toBeLessThan(
      Math.min(project({ price: 90 }), project({ units: 9600 })),
    );
    stated("−$804,000");
    expect(rightLabel("forecasts-and-sensitivity-clem7-volume-and-toll")).toContain("linked");
  });

  it("weighs a test move against how far each input could plausibly miss", () => {
    // a 10% rise in wages costs $300,000 but wages are known to within 2%, so about $60,000 at most
    expect(300000 * (2 / 10)).toBe(60000);
    // customer numbers could miss by 30%, so about $600,000
    expect(200000 * (30 / 10)).toBe(600000);
    expect(200000 * (30 / 10)).toBeGreaterThan(300000 * (2 / 10));
    expect(rightLabel("forecasts-and-sensitivity-check-banksia")).toContain("Customer numbers");
  });

  it("reads the traffic of the two tunnels and Woolworths's headroom as the pack gives them", () => {
    stateIn(
      "forecasts-and-sensitivity",
      "about 35,000 vehicles a day at first, rising over the first year to a projected 90,000",
    );
    stateIn("forecasts-and-sensitivity", "20,000 vehicles");
    stateIn("forecasts-and-sensitivity", "about 25,000");
    const clem = figureSvg("forecasts-and-sensitivity", "a-toll-and-its-traffic", "clem7");
    expect(clem).toContain("about 60,000");
    expect(clem).toContain("an average of 59,000");
    expect(clem).toContain("around 20,000");
    const headroom = fixture.figures.wowHeadroom.join(" ");
    expect(headroom).toContain(
      "a 1.0% increase in the post-tax discount rate, and a 10.0% reduction in EBIT",
    );
    expect(headroom).toContain(
      "a 0.2% increase in the post-tax discount rate, and a 4.0% reduction in EBIT",
    );
    expect(rightLabel("forecasts-and-sensitivity-headroom")).toContain("Petstock");
    // the Opera House extract: $7 million expected, $102 million spent
    const opera = question("forecasts-and-sensitivity-opera-house").extracts?.[0]?.text ?? "";
    expect(opera).toContain("$7 million");
    expect(opera).toContain("$102 million");
  });
});

describe("Acquisitions and the price paid", () => {
  it("works the premium against the synergies of the first bid", () => {
    expect(1000 * 0.35).toBe(350);
    expect(1000 + 350).toBe(1350);
    expect(1000 + 120).toBe(1120);
    expect(120 - 350).toBe(-230);
    // with only half of the synergies, the buyer is $290 million behind
    expect(60 - 350).toBe(-290);
    expect(rightLabel("acquisitions-and-the-price-paid-who-gains")).toContain(
      "seller's shareholders",
    );
    for (const figure of ["$350 million", "$1,350 million", "$1,120 million"]) stated(figure);
  });

  it("works Rowan Paper: a 15% premium on $600 million against $100 million of synergy", () => {
    expect(600 * 0.15).toBe(90);
    expect(90 / 100).toBe(0.9);
    const gain = (share: number) => round(100 * share - 90);
    expect([gain(1), gain(2 / 3), gain(0.5)]).toEqual([10, -23, -40]);
    expect(round(100 * (2 / 3))).toBe(67);
    stateIn("acquisitions-and-the-price-paid", "which is 90% here");
  });

  it("works the break-even share for a 10% premium and for Harbourline", () => {
    expect(1000 * 0.1).toBe(100);
    expect(round(100 / 120, 3)).toBe(0.833);
    expect(100 / 120).toBeGreaterThan(0.8);
    expect(rightLabel("acquisitions-and-the-price-paid-break-even-share")).toContain(
      "More than four fifths",
    );
    // Harbourline offers 12% on $400 million for $75 million of savings
    expect(400 * 0.12).toBe(48);
    expect(75 - 48).toBe(27);
    expect(round(48 / 75, 2)).toBe(0.64);
    expect(48).toBeLessThan(75);
    expect(rightLabel("acquisitions-and-the-price-paid-check-harbourline")).toContain(
      "can pay off",
    );
    // the figures of the two bids differ, so neither repeats the other
    expect([600 * 0.15, 100]).not.toEqual([400 * 0.12, 75]);
  });

  it("works the five bidders, whose estimates average the true value", () => {
    const estimates = [70, 85, 100, 115, 130];
    expect(estimates.reduce((sum, value) => sum + value, 0) / estimates.length).toBe(100);
    expect(Math.max(...estimates) - 100).toBe(30);
    expect(rightLabel("acquisitions-and-the-price-paid-seven-bidders")).toContain(
      "most optimistic",
    );
    expect(rightLabel("acquisitions-and-the-price-paid-bid-shading")).toContain("Bid below");
    expect(rightLabel("acquisitions-and-the-price-paid-check-bidders")).toContain("second sale");
  });

  it("states Rio Tinto's figures as Wikipedia gives them", () => {
    const svg = figureSvg("acquisitions-and-the-price-paid", "premium-against-delivery", "all");
    expect(svg).toContain("Rowan Paper");
    stateIn("acquisitions-and-the-price-paid", "Paid in cash for Riversdale");
    expect(rightLabel("acquisitions-and-the-price-paid-hook")).toContain("far less than Rio paid");
    const alcan = question("acquisitions-and-the-price-paid-alcan");
    expect(alcan.extracts?.[0]?.text).toContain("US$38 billion");
    expect(alcan.extracts?.[0]?.text).toContain("$27.5bn");
    // the option for Alcoa's bid uses the extract's own figure and not a dollar the extract does not state
    expect(labels("acquisitions-and-the-price-paid-alcan").join(" ")).toContain("$27.5 billion");
    expect(labels("acquisitions-and-the-price-paid-alcan").join(" ")).not.toContain("US$27.5");
    expect(rightLabel("acquisitions-and-the-price-paid-alcan")).toContain(
      "hostile rival bid existed",
    );
  });
});

describe("What a share price tells you", () => {
  it("reads Lovisa's earnings per share and share price from the report", () => {
    const eps = lovFive("Earnings per share");
    const price = lovFive("Share Price");
    expect(eps).toEqual([86.3, 78.1, 75.4, 63.3, 54.3]);
    expect(price).toEqual([23.25, 30.91, 32.87, 19.3, 14.26]);
    expect(
      eps.every((value, index) => index === eps.length - 1 || value > (eps[index + 1] as number)),
    ).toBe(true);
    expect(round(pct(86.3 - 78.1, 78.1), 1)).toBe(10.5);
    expect(lastNumbers("lovEps", "Basic Earnings per share", 3)[2]).toBe(10.5);
    expect(round(pct(30.91 - 23.25, 30.91), 1)).toBe(24.8);
    // the price rose to 2024 and then fell
    expect(price[2]).toBeGreaterThan(price[3] as number);
    expect(price[2]).toBeGreaterThan(price[1] as number);
    expect(price[1]).toBeGreaterThan(price[0] as number);
    // the figure divides each series by its 2022 value
    const index = (series: number[]) =>
      series.map((value) => round((100 * value) / (series[4] as number))).reverse();
    expect(index(price)).toEqual([100, 135, 231, 217, 163]);
    expect(index(eps)).toEqual([100, 117, 139, 144, 159]);
    const svg = figureSvg("what-a-share-price-tells-you", "surprise", "matches");
    expect(svg).toContain("Matches the forecast");
  });

  it("measures news against the forecast", () => {
    // forecast +4%: reported +4% is no surprise, +7% beats it and +1% misses it
    expect([4, 7, 1].map((reported) => Math.sign(reported - 4))).toEqual([0, 1, -1]);
    // forecast +10%: 14% beats, 7% misses, 10% matches; a fall of 4% against an expected 9% beats it
    expect([14, 10, 7].map((reported) => Math.sign(reported - 10))).toEqual([1, 0, -1]);
    expect(Math.sign(-4 - -9)).toBe(1);
    expect(rightLabel("what-a-share-price-tells-you-check-smaller-fall")).toContain("Rise");
  });

  it("reads Ashgrove's bid and the CLEM7 shares", () => {
    // a 25% premium and a rival that rises about 22%: the rival's holders collect nearly all of it
    expect(22 / 25).toBeGreaterThan(0.85);
    expect(rightLabel("what-a-share-price-tells-you-check-ashgrove")).toContain(
      "expect Ashgrove to overpay",
    );
    const clem = question("what-a-share-price-tells-you-clem7-shares").extracts?.[0]?.text ?? "";
    expect(clem).toContain("dropped by one fifth");
    expect(rightLabel("what-a-share-price-tells-you-clem7-shares")).toContain(
      "worse than expected",
    );
    stateIn("what-a-share-price-tells-you", "an index so the two can share one scale");
  });
});
