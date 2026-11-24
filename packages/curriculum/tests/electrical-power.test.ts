import { readFileSync } from "node:fs";
import { assessNumericAnswer, assessTextAnswer } from "@discere/assessment-engine";
import {
  type CourseBundle,
  ORDER_ANSWER_IDEA,
  type Question,
  SORT_ANSWER_IDEA,
} from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Electrical Power Systems: From Generator to Socket asks for a typed number where computing is
 * the skill an engineer uses: RMS and peak values, phase angles, real, reactive and apparent
 * power, power factor and its correction, three-phase loads, transformer ratings and losses, the
 * loss scaling of a line, poles, speed and slip, and the droop and dispatch price of the market.
 * That is lessons 1 to 7 and 9. In the other lessons a number is evidence to read: a frequency
 * record, the load on a street transformer, the rating of a battery. This file checks which
 * questions take a number, then recomputes every answer and every figure in an option, a
 * feedback line or a worked example from first principles, not from the bundle. It checks the
 * shape of the questions, that every hover note points at a lesson that teaches its term, that
 * each quoted extract and each figure taken from the source pack is found in a passage copied
 * from it, and the rules that keep the safety lessons to what a household can understand and
 * not do: no one is told to fit, replace, test or repair wiring, the regulator's test intervals
 * are not stated as a rule, and the 2016 blackout and the 2019 proceedings are told as Wikipedia
 * tells them.
 */
type Fixture = {
  files: Record<string, string[]>;
  facts: { file: string; pack: string; course: string | null; what: string }[];
};
const read = (name: string): CourseBundle =>
  JSON.parse(
    readFileSync(new URL(`../../../content/${name}/bundle.json`, import.meta.url), "utf8"),
  ) as CourseBundle;
const bundle = read("electrical-power");
const physics = read("physics-waves-electricity-heat");
const electronics = read("electronics-foundations");
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/electrical-power-passages.json", import.meta.url), "utf8"),
) as Fixture;
const questions = new Map(bundle.questions.map((item) => [item.id, item]));
const question = (id: string): Question => {
  const found = questions.get(`elep-${id}`) ?? questions.get(id);
  if (!found) throw new Error(`No question ${id}`);
  return found;
};
const lesson = (id: string) => {
  const found = bundle.lessons.find((item) => item.id === id);
  if (!found) throw new Error(`No lesson ${id}`);
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
const stepQuestionIds = (item: CourseBundle["lessons"][number]) =>
  item.steps.flatMap((step) => [
    step.checkQuestionId,
    ...(step.workedSteps ?? []).flatMap((line) => [
      line.blank?.questionId ?? "",
      line.selfExplain?.questionId ?? "",
    ]),
  ]);
const ownIds = (item: CourseBundle["lessons"][number]) =>
  new Set(
    [item.intro?.hook.questionId ?? "", ...item.questionIds, ...stepQuestionIds(item)].filter(
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
const squash = (text: string) =>
  text
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/‑/gu, "-")
    .replace(/\s+/gu, " ")
    .trim();
const withoutExtracts = (item: Question) => {
  const { extracts: _extracts, ...rest } = item;
  return rest;
};
/** Everything the course says, in a lesson, a question or a card. */
const everything = JSON.stringify({
  lessons: bundle.lessons,
  questions: bundle.questions.map(withoutExtracts),
  flashcards: bundle.flashcards,
});
/** A lesson's own words and figures, and the questions it asks. */
const ownText = (id: string) => {
  const item = lesson(id);
  return JSON.stringify([item, [...ownIds(item)].map((qid) => withoutExtracts(question(qid)))]);
};
/** Assertions on long text print only the label, not the text. */
const has = (text: string, fragment: string, label?: string) =>
  expect(text.includes(fragment), label ?? fragment).toBe(true);
const matches = (text: string, pattern: RegExp, label?: string) =>
  expect(pattern.test(text), label ?? String(pattern)).toBe(true);
const lacks = (text: string, pattern: RegExp | string, label?: string) =>
  expect(
    typeof pattern === "string" ? text.includes(pattern) : pattern.test(text),
    label ?? String(pattern),
  ).toBe(false);
const stated = (fragment: string) => has(everything, fragment);
const rightValue = (item: {
  id: string;
  answerAuthority?: Question["answerAuthority"] | undefined;
}) => {
  const authority = item.answerAuthority;
  if (authority?.kind !== "numeric") throw new Error(item.id);
  return authority;
};
const wrongValues = (item: Question) =>
  (item.misconceptions ?? []).flatMap((entry) => entry.match.numeric ?? []);

// The handbook rounds the RMS factor and its inverse; the answer boxes accept both roundings
// biome-ignore lint/suspicious/noApproximativeNumericConstant: the handbook's own rounded factor
const handbookRms = 0.707;
// biome-ignore lint/suspicious/noApproximativeNumericConstant: the handbook's own rounded factor
const handbookPeak = 1.414;
const s2 = Math.SQRT2;
const s3 = Math.sqrt(3);
const tanAcos = (powerFactor: number) => Math.tan(Math.acos(powerFactor));
const lossFactor = (from: number, to: number) => (from / to) ** 2;
/** The merit order of one dispatch interval: the offers taken, cheapest first, and the price set. */
const meritOrder = (offers: [string, number, number][], demand: number) => {
  let left = demand;
  const taken: [string, number][] = [];
  let price = 0;
  for (const [name, megawatts, offered] of [...offers].sort((a, b) => a[2] - b[2])) {
    if (left <= 0) break;
    const used = Math.min(left, megawatts);
    taken.push([name, used]);
    price = offered;
    left -= used;
  }
  return { taken, price };
};

describe("questions in Electrical Power Systems: From Generator to Socket", () => {
  it("asks every question and every card from a lesson, and every id exists", () => {
    const asked = new Set(bundle.lessons.flatMap((item) => [...ownIds(item)]));
    expect([...asked].filter((id) => !questions.has(id))).toEqual([]);
    expect(bundle.questions.filter((item) => !asked.has(item.id)).map((item) => item.id)).toEqual(
      [],
    );
    const cards = bundle.lessons.flatMap((item) => item.flashcardIds);
    expect(new Set(cards).size).toBe(cards.length);
    expect(
      bundle.flashcards.filter((card) => !cards.includes(card.id)).map((card) => card.id),
    ).toEqual([]);
    const ids = [...bundle.questions.map((item) => item.id), ...bundle.flashcards.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
    const sources = new Set(bundle.course.sourceIds);
    for (const item of [...bundle.questions, ...bundle.flashcards])
      for (const id of item.sourceIds) expect(sources.has(id), `${item.id}: ${id}`).toBe(true);
  });

  it("covers all 14 lessons, each with at least eight questions and three or four cards", () => {
    expect(bundle.lessons).toHaveLength(14);
    expect(bundle.questions).toHaveLength(149);
    expect(bundle.flashcards).toHaveLength(42);
    for (const item of bundle.lessons) {
      expect(ownIds(item).size, item.id).toBeGreaterThanOrEqual(8);
      expect(item.flashcardIds.length, item.id).toBeGreaterThanOrEqual(3);
      expect(item.flashcardIds.length, item.id).toBeLessThanOrEqual(4);
    }
  });

  it("ends each lesson with three checks of at least two types", () => {
    for (const item of bundle.lessons) {
      const types = item.questionIds.map((id) => kind(question(id)));
      expect(types, item.id).toHaveLength(3);
      expect(new Set(types).size, item.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("takes a typed number for calculation in lessons 1 to 7 and 9, and only for evidence elsewhere", () => {
    const numeric = bundle.questions.filter((item) => kind(item) === "numeric");
    const byLesson = (id: string) =>
      numeric.filter((item) => ownIds(lesson(id)).has(item.id)).map((item) => item.id);
    const calculating = [
      "reading-an-ac-supply",
      "real-reactive-apparent",
      "power-factor",
      "three-phase-supply",
      "real-transformers",
      "transmission-voltage",
      "speed-poles-frequency",
      "frequency-control",
    ];
    for (const id of calculating) expect(byLesson(id).length, id).toBeGreaterThanOrEqual(3);
    // The evidence read in the other lessons: a frequency record, a street and a battery
    expect(byLesson("grid-frequency-and-inertia")).toEqual([
      "elep-grid-frequency-and-inertia-loy-yang",
      "elep-grid-frequency-and-inertia-end-ratio",
    ]);
    expect(byLesson("inverters-and-rooftop-solar")).toEqual([
      "elep-inverters-and-rooftop-solar-faded-ratio",
      "elep-inverters-and-rooftop-solar-end-houses",
    ]);
    expect(byLesson("storage-and-curtailment")).toEqual([
      "elep-storage-and-curtailment-grid-services-energy",
      "elep-storage-and-curtailment-end-home-batteries",
    ]);
    // The protection and blackout lessons ask for no computed number at all
    for (const id of ["overcurrent-protection", "earthing-and-safety-switches", "how-a-grid-trips"])
      expect(byLesson(id), id).toEqual([]);
    for (const card of bundle.flashcards.filter((item) => item.answerAuthority?.kind === "numeric"))
      expect(
        [
          ...calculating,
          "grid-frequency-and-inertia",
          "inverters-and-rooftop-solar",
          "storage-and-curtailment",
        ].some((id) => lesson(id).flashcardIds.includes(card.id)),
        card.id,
      ).toBe(true);
    expect(numeric).toHaveLength(55);
    expect(
      bundle.flashcards.filter((card) => card.answerAuthority?.kind === "numeric"),
    ).toHaveLength(12);
  });

  it("keeps the right option the longest in at most a third of choice questions, and never far longer", () => {
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
    expect(choiceQuestions.length).toBeGreaterThan(70);
    expect(longest / choiceQuestions.length).toBeLessThanOrEqual(0.3);
    expect(shortest / choiceQuestions.length).toBeLessThanOrEqual(0.4);
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
    for (const item of bundle.lessons) {
      const own = ownIds(item);
      const places = choiceQuestions.filter((entry) => own.has(entry.id)).map(rightIndex);
      expect(new Set(places).size, item.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("explains every wrong option, keeps feedback from naming the right one, and gives two hints", () => {
    for (const item of bundle.questions) {
      for (const hint of item.hints) lacks(hint, /begins with|starts with|first letter/iu, item.id);
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
        lacks(squash(entry.feedback).toLowerCase(), squash(right.label).toLowerCase(), item.id);
      }
    }
  });

  it("keeps dashes, verdict words and American spellings out of the course text, apart from quoted extracts", () => {
    const text = JSON.stringify({
      course: bundle.course,
      modules: bundle.modules,
      concepts: bundle.concepts,
      lessons: bundle.lessons.map((item) => ({
        ...item,
        steps: item.steps.map(({ diagram: _diagram, ...rest }) => rest),
      })),
      flashcards: bundle.flashcards,
    });
    const american =
      /\b(color\w*|behavior\w*|center\w*|gray|utiliz\w+|molded|recogniz\w+|analyz\w+|stabiliz\w+|synchroniz\w+|unsynchroniz\w+|minimiz\w+|organiz\w+|normaliz\w+|energiz\w+|ionize\w*|vaporiz\w+|per cent)\b/iu;
    lacks(text, /[—–]/u);
    lacks(text, american);
    lacks(everything, /\bground fault\b/iu);
    for (const item of bundle.questions) {
      const own = JSON.stringify(withoutExtracts(item));
      lacks(own, /[—–]/u, item.id);
      lacks(own, /\b(Correct|Not quite|Great job)\b/u, item.id);
      lacks(own, american, item.id);
    }
    // No pointer to "the last lesson": a lesson is named by its title
    lacks(everything, /the last (two )?lessons?|the previous lesson|the earlier lesson/iu);
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
    expect(ordered).toBe(3);
    expect(sorted).toBe(12);
  });

  it("declares every figure in a graded step as hidden until the response, and makes none live", () => {
    for (const item of bundle.lessons)
      for (const step of item.steps) {
        if (!step.diagram) continue;
        const graded =
          Boolean(step.checkQuestionId) || (step.workedSteps ?? []).some((line) => line.blank);
        if (graded)
          expect(step.answerVisibility, `${item.id}/${step.id}`).toBe("hidden-until-response");
        expect(step.answerVisibility, `${item.id}/${step.id}`).not.toBe("live");
      }
  });

  it("pairs every dollar sign of a prompt, option or feedback line into an equation the app renders", () => {
    // Prices are written $45 and equations $x$: a $ is paired when it opens a maths span, and a
    // closing $ may not be followed by a digit, so two prices in a line never pair up. A price is
    // a $ followed by a digit, so a stray is a $ left over that is not one.
    const pattern = /`[^`\n]+`|\$(?=[^\s$])([^$\n]*?[^\s$])\$(?!\d)/gu;
    const strays: string[] = [];
    const visit = (value: unknown, path: string) => {
      if (typeof value === "string") {
        if (value.includes("$") && /\$(?!\d)/u.test(value.replace(pattern, "")))
          strays.push(`${path}: ${value.slice(0, 80)}`);
      } else if (Array.isArray(value)) {
        for (const [at, entry] of value.entries()) visit(entry, `${path}.${at}`);
      } else if (value && typeof value === "object")
        for (const [key, entry] of Object.entries(value))
          if (key !== "svg" && key !== "unit") visit(entry, `${path}.${key}`);
    };
    visit(
      { lessons: bundle.lessons, questions: bundle.questions, flashcards: bundle.flashcards },
      "",
    );
    expect(strays).toEqual([]);
  });

  it("finds every quoted extract word for word in a passage copied from the source pack", () => {
    const pool = Object.values(fixture.files).flat().map(squash);
    let checked = 0;
    for (const item of bundle.questions)
      for (const extract of item.extracts ?? []) {
        checked += 1;
        expect(
          pool.some((passage) => passage.includes(squash(extract.text))),
          item.id,
        ).toBe(true);
      }
    expect(checked).toBe(6);
  });

  it("words the source line of every extract of one source alike", () => {
    const groups = { wikipedia: 0, doe: 0, esv: 0, aer: 0 };
    for (const item of bundle.questions)
      for (const extract of item.extracts ?? []) {
        expect(extract.when, item.id).toBe("accessed 24 November 2026");
        if (extract.who.startsWith("Wikipedia")) {
          groups.wikipedia += 1;
          matches(extract.who, /^Wikipedia, article ".+" \(CC BY-SA 4\.0\)$/u);
          expect(extract.kind).toBe("An encyclopedia article written by volunteer editors");
        } else if (extract.who.startsWith("U.S. Department of Energy")) {
          groups.doe += 1;
          expect(extract.who).toBe(
            "U.S. Department of Energy, DOE Fundamentals Handbook, Electrical Science, Vol. 4 (1992, public domain)",
          );
          expect(extract.kind).toBe(
            "A US government handbook of electrical science, written with nuclear facilities in mind",
          );
        } else if (extract.who.startsWith("Energy Safe Victoria")) {
          groups.esv += 1;
          expect(extract.who).toBe("Energy Safe Victoria, Household wiring (CC BY 4.0)");
          expect(extract.kind).toBe("A state safety regulator's guidance for householders");
        } else {
          groups.aer += 1;
          expect(extract.who).toBe(
            "Australian Energy Regulator, State of the energy market 2025 (CC BY 4.0)",
          );
          expect(extract.kind).toBe(
            "A regulator's annual report on the electricity and gas markets",
          );
        }
      }
    expect(groups).toEqual({ wikipedia: 3, doe: 1, esv: 1, aer: 1 });
  });

  it("points every hover note at a lesson that teaches the term, or at an earlier screen of its own lesson", () => {
    const outside: Record<string, CourseBundle> = {
      "Electronics Foundations": electronics,
      "Physics II: Waves, Electricity and Magnetism, and Heat": physics,
    };
    expect(electronics.course.title).toBe("Electronics Foundations");
    expect(physics.course.title).toBe("Physics II: Waves, Electricity and Magnetism, and Heat");
    const titles = new Map(bundle.lessons.map((item) => [item.title, item]));
    // Each term, and the lesson that teaches it
    const taught: Record<string, string> = {
      power: "How much energy a circuit moves in Electronics Foundations",
      period: "Things that repeat in Physics II: Waves, Electricity and Magnetism, and Heat",
      "phase difference": "this lesson",
      rms: "Reading an AC supply",
      "turns ratio":
        "Changing fields make voltage in Physics II: Waves, Electricity and Magnetism, and Heat",
      "power factor": "Power factor and its correction",
      "reactive power": "Real, reactive and apparent power",
      "safety switch": "this lesson",
    };
    let hovers = 0;
    for (const item of bundle.lessons) {
      const text = JSON.stringify({ steps: item.steps, recap: item.recap });
      for (const match of text.matchAll(/\[\[([^|\]]+)\|([^\]]*)\]\]/gu)) {
        hovers += 1;
        const term = match[1] as string;
        const note = match[2] as string;
        expect(taught[term.toLowerCase()], `${item.id}: ${term}`).toBeTruthy();
        if (note.endsWith("Met earlier in this lesson.")) {
          expect(taught[term.toLowerCase()], term).toBe("this lesson");
          // an earlier screen of the lesson teaches the term
          const at = item.steps.findIndex((step) => JSON.stringify(step).includes(match[0]));
          const earlier = JSON.stringify(
            item.steps.slice(0, at).map((step) => [step.headline, step.lead, step.afterFigure]),
          );
          has(
            earlier.toLowerCase(),
            term.toLowerCase(),
            `${item.id} teaches ${term} before it is noted`,
          );
          continue;
        }
        const elsewhere = /Met in '([^']+)' in (.+)\.$/u.exec(note);
        if (elsewhere) {
          const other = outside[elsewhere[2] as string];
          expect(other, `${item.id}: ${term} names ${elsewhere[2]}`).toBeTruthy();
          const target = (other as CourseBundle).lessons.find(
            (entry) => entry.title === elsewhere[1],
          );
          expect(target, `${item.id}: ${term} points at ${elsewhere[1]}`).toBeTruthy();
          expect(taught[term.toLowerCase()], term).toBe(`${elsewhere[1]} in ${elsewhere[2]}`);
          has(
            JSON.stringify(target).toLowerCase(),
            term.toLowerCase().replace(/^turns ratio$/u, "ratio of the turns"),
            `${elsewhere[1]} teaches ${term}`,
          );
          continue;
        }
        const where = /Met in '([^']+)'\.$/u.exec(note)?.[1];
        expect(where, `${item.id}: ${term}`).toBeTruthy();
        const target = titles.get(where as string);
        expect(target, `${item.id}: ${term} points at ${where}`).toBeTruthy();
        expect(where, term).toBe(taught[term.toLowerCase()]);
        expect(
          bundle.lessons.indexOf(target as (typeof bundle.lessons)[number]),
          `${item.id}: ${term}`,
        ).toBeLessThan(bundle.lessons.indexOf(item));
        has(JSON.stringify(target).toLowerCase(), term.toLowerCase(), `${where} teaches ${term}`);
      }
    }
    expect(hovers).toBe(9);
    // Lessons the text names outside a hover note are real ones
    for (const title of [
      "Real, reactive and apparent power",
      "Three-phase supply",
      "Speed, poles and frequency",
      "Protecting against overcurrent",
      "Earthing and safety switches",
    ])
      expect(titles.has(title), title).toBe(true);
    for (const title of [
      "Real, reactive and apparent power",
      "Three-phase supply",
      "Speed, poles and frequency",
      "Protecting against overcurrent",
      "Earthing and safety switches",
    ])
      stated(`'${title}'`);
  });

  it("gives the invented cases of different lessons different names, and keeps a zone substation out", () => {
    const only = (name: string, lessonId: string) => {
      const found = bundle.lessons
        .filter((item) => ownText(item.id).includes(name))
        .map((item) => item.id);
      expect(found, name).toEqual([lessonId]);
    };
    only("Marlow Island", "how-a-grid-trips");
    only("invented 500 kVA", "real-transformers");
    only("invented street", "inverters-and-rooftop-solar");
    only("Street Q", "inverters-and-rooftop-solar");
    only("invented workshop", "overcurrent-protection");
    only("invented buyer", "earthing-and-safety-switches");
    only("bakery", "real-reactive-apparent");
    only("invented suburb", "storage-and-curtailment");
    // "Zone substation" is not in the pack: a substation is described plainly
    lacks(everything, /zone substation/iu);
    stated("A substation that steps the voltage down");
  });
});

describe("numeric answers in Electrical Power Systems", () => {
  /**
   * The exact answer first, then the answers that the handbook's rounded factors give (1.73,
   * 1.414, 0.707, the DOE's 346 A), which the answer box accepts as well.
   */
  const numbers: Record<string, number[]> = {
    "reading-an-ac-supply-rms-from-trace": [340 / s2, 340 * handbookRms],
    "reading-an-ac-supply-fade-degrees": [0.2 * 360],
    "reading-an-ac-supply-five-ms": [(5 / 20) * 360],
    "reading-an-ac-supply-angle-to-time": [(27 / 360) * 20],
    "reading-an-ac-supply-end-peak-at-limit": [253 * s2, 253 * handbookPeak],
    "real-reactive-apparent-pump-real-power": [230 * 12 * 0.75],
    "real-reactive-apparent-q-from-s-and-p": [Math.sqrt(1500 ** 2 - 1200 ** 2)],
    "real-reactive-apparent-fade-p": [230 * 10 * 0.8],
    "real-reactive-apparent-fade-q": [230 * 10 * Math.sin(Math.acos(0.8))],
    "real-reactive-apparent-end-s-from-p-q": [Math.hypot(48, 36)],
    "real-reactive-apparent-end-cable-current": [4600 / 230],
    "power-factor-hook": [3 / 0.5],
    "power-factor-pf-from-plate": [4.2 / 5.6],
    "power-factor-percent-more-current": [(1 / 0.8 - 1) * 100],
    "power-factor-loss-factor": [(1 / 0.5) ** 2 / 1 ** 2],
    "power-factor-fade-q-before": [100 * tanAcos(0.7)],
    "power-factor-fade-capacitor": [100 * (tanAcos(0.7) - tanAcos(0.95)), 102 - 32.9],
    "power-factor-end-size": [160 * (tanAcos(0.85) - tanAcos(0.95))],
    "power-factor-end-feeder-loss": [9 * (0.9 / 0.6) ** 2],
    "three-phase-supply-hook": [20 / 3],
    "three-phase-supply-third-current": [-(6 + 2)],
    "three-phase-supply-line-from-230": [230 * s3, 230 * 1.73],
    "three-phase-supply-fade-line-current": [200 * s3, 200 * 1.73, 346],
    "three-phase-supply-fade-power": [
      (s3 * 440 * 200 * s3 * 0.6) / 1000,
      (1.73 * 440 * 346 * 0.6) / 1000,
    ],
    "three-phase-supply-motor-line-current": [
      15000 / (s3 * 400 * 0.85),
      15000 / (1.73 * 400 * 0.85),
    ],
    "three-phase-supply-end-power": [(s3 * 400 * 20 * 0.8) / 1000, (1.73 * 400 * 20 * 0.8) / 1000],
    "real-transformers-hook": [200 * (1 - 0.985)],
    "real-transformers-one-third-load": [(1 / 3) ** 2],
    "real-transformers-fade-copper-half": [6 * 0.5 ** 2],
    "real-transformers-fade-efficiency": [(200 / (200 + 1.5 + 1.2)) * 100],
    "real-transformers-tenth-load": [(40 / (40 + 1.2 + 6 * 0.1 ** 2)) * 100],
    "real-transformers-rated-current-200": [200000 / (s3 * 400), 200000 / (1.73 * 400)],
    "real-transformers-equal-losses": [Math.sqrt(0.9 / 1.6)],
    "real-transformers-end-hv-current": [300000 / (s3 * 33000), 300000 / (1.73 * 33000)],
    "real-transformers-end-heat": [2400 / 0.97 - 2400],
    "transmission-voltage-factor": [lossFactor(345, 765), 0.2],
    "transmission-voltage-at-765": [4.2 * lossFactor(345, 765), 4.2 * 0.203],
    "transmission-voltage-end-lower": [1.2 * lossFactor(275, 110)],
    "speed-poles-frequency-hook": [60 * 50],
    "speed-poles-frequency-six-pole": [(120 * 50) / 6],
    "speed-poles-frequency-poles-of-3000": [(120 * 50) / 3000],
    "speed-poles-frequency-sync-at-60": [(120 * 60) / 4],
    "speed-poles-frequency-slip-at-60": [((1800 - 1746) / 1800) * 100],
    "speed-poles-frequency-end-slip": [((750 - 735) / 750) * 100],
    "grid-frequency-and-inertia-loy-yang": [(50 - 49.8) / 20],
    "grid-frequency-and-inertia-end-ratio": [0.3 / 15 / (0.1 / 20)],
    "frequency-control-fall-pct": [(0.15 / 50) * 100],
    "frequency-control-mw-300": [300 * ((0.15 / 50) * 25)],
    "frequency-control-price-850": [
      meritOrder(
        [
          ["A", 400, 0],
          ["B", 300, 45],
          ["C", 200, 90],
          ["D", 100, 350],
        ],
        850,
      ).price,
    ],
    "frequency-control-end-droop": [(600 + 200) * ((0.3 / 50) * 25)],
    "frequency-control-end-price": [
      meritOrder(
        [
          ["P", 300, 0],
          ["Q", 200, 35],
          ["R", 200, 70],
          ["S", 100, 200],
        ],
        480,
      ).price,
    ],
    "inverters-and-rooftop-solar-faded-ratio": [(20 * 6) / 150],
    "inverters-and-rooftop-solar-end-houses": [Math.floor(63 / 5)],
    "storage-and-curtailment-grid-services-energy": [(70 * 10) / 60],
    "storage-and-curtailment-end-home-batteries": [356600 / 19592],
  };
  const cardNumbers: Record<string, number[]> = {
    "reading-an-ac-supply-card-1": [100 / s2, 100 * handbookRms],
    "real-reactive-apparent-card-1": [Math.hypot(8, 6)],
    "power-factor-card-1": [6 / 7.5],
    "three-phase-supply-card-1": [120 * s3, 120 * 1.73],
    "real-transformers-card-1": [100000 / 230],
    "transmission-voltage-card-1": [4 * lossFactor(100, 200)],
    "speed-poles-frequency-card-1": [(120 * 50) / 4],
    "speed-poles-frequency-card-2": [((1500 - 1470) / 1500) * 100],
    "grid-frequency-and-inertia-card-2": [(50 - 49.88) / 6],
    "frequency-control-card-1": [500 * ((0.1 / 50) * 25)],
    "inverters-and-rooftop-solar-card-2": [(10 * 3) / 50],
    "storage-and-curtailment-card-1": [180 / 60],
  };
  const numeric = bundle.questions.filter((item) => kind(item) === "numeric");
  const numericCards = bundle.flashcards.filter((card) => card.answerAuthority?.kind === "numeric");

  it("has a recomputed answer for every numeric question and card, and no others", () => {
    expect(
      Object.keys(numbers)
        .map((id) => `elep-${id}`)
        .sort(),
    ).toEqual(numeric.map((item) => item.id).sort());
    expect(
      Object.keys(cardNumbers)
        .map((id) => `elep-${id}`)
        .sort(),
    ).toEqual(numericCards.map((card) => card.id).sort());
  });

  it("recomputes each answer, and accepts the exact value and the handbook's rounded one", () => {
    const check = (
      item: { id: string; answerAuthority?: Question["answerAuthority"] | undefined },
      values: number[],
    ) => {
      const authority = rightValue(item);
      const band = Math.max(
        authority.absoluteTolerance ?? 0,
        Math.abs(authority.value) * (authority.relativeTolerance ?? 0),
      );
      const [exact, ...rounded] = values as [number, ...number[]];
      // The stored value is the exact answer, rounded the way the question asks for it
      expect(
        Math.abs(authority.value - exact),
        `${item.id}: ${authority.value} against ${exact}`,
      ).toBeLessThanOrEqual(band + 1e-9);
      for (const value of [exact, ...rounded]) {
        expect(assessNumericAnswer(String(value), authority).correct, `${item.id}: ${value}`).toBe(
          true,
        );
        expect(
          assessNumericAnswer(String(Number(value.toPrecision(3))), authority).correct,
          `${item.id}: ${value}`,
        ).toBe(true);
      }
      expect(assessNumericAnswer(String(authority.value), authority).correct, item.id).toBe(true);
      // The band is tight enough that a wrong method does not pass: at most 8% of the answer, or
      // half a unit of its last printed digit where rounding needs more than that.
      const decimals = String(authority.value).split(".")[1]?.length ?? 0;
      expect(band, item.id).toBeLessThanOrEqual(
        Math.max(0.08 * Math.abs(authority.value), 0.5 * 10 ** -decimals) * (1 + 1e-9),
      );
    };
    for (const item of numeric) check(item, numbers[item.id.replace(/^elep-/u, "")] as number[]);
    for (const card of numericCards)
      check(card, cardNumbers[card.id.replace(/^elep-/u, "")] as number[]);
  });

  it("does not accept the wrong answers the questions name as misconceptions", () => {
    for (const item of numeric) {
      const authority = rightValue(item);
      for (const wrong of wrongValues(item))
        expect(assessNumericAnswer(String(wrong), authority).correct, `${item.id}: ${wrong}`).toBe(
          false,
        );
    }
  });

  it("gives every numeric question a worked answer and at least two hints, and explains each wrong number", () => {
    for (const item of numeric) {
      const authority = rightValue(item);
      expect(authority.workedAnswer?.length ?? 0, item.id).toBeGreaterThanOrEqual(15);
      expect(item.hints.length, item.id).toBeGreaterThanOrEqual(2);
      expect((item.misconceptions ?? []).length, item.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("works the dispatch lesson's merit order, and the figure that draws it", () => {
    const offers: [string, number, number][] = [
      ["A", 400, 0],
      ["B", 300, 45],
      ["C", 200, 90],
      ["D", 100, 350],
    ];
    const figure = lesson("frequency-control").steps.find(
      (step) => step.id === "dispatch-and-price",
    )?.diagram as { cases: { label: string; svg: string }[] };
    expect(figure.cases).toHaveLength(3);
    for (const demand of [300, 650, 950]) {
      const { taken, price } = meritOrder(offers, demand);
      const found = figure.cases.find((entry) => entry.label === `Demand ${demand} MW`);
      expect(found, String(demand)).toBeTruthy();
      has(found?.svg ?? "", `Price paid to every dispatched unit: $${price}`, String(demand));
      has(
        found?.svg ?? "",
        `Highest offer needed: ${taken.at(-1)?.[0]}, at $${price}`,
        String(demand),
      );
    }
    expect(meritOrder(offers, 300).taken).toEqual([["A", 300]]);
    expect(meritOrder(offers, 650).taken).toEqual([
      ["A", 400],
      ["B", 250],
    ]);
    expect(meritOrder(offers, 950).taken).toEqual([
      ["A", 400],
      ["B", 300],
      ["C", 200],
      ["D", 50],
    ]);
    // Generator B offered $45 and the price was $90, so it is paid $90 and not $45 or the average
    expect(meritOrder(offers, 850).price).toBe(90);
    expect((45 + 90) / 2).toBe(67.5);
    stated("$67.50 per MWh");
    // The end check pays P the price set by Q's offer, though P offered nothing
    const check = meritOrder(
      [
        ["P", 300, 0],
        ["Q", 200, 35],
        ["R", 200, 70],
        ["S", 100, 200],
      ],
      480,
    );
    expect(check.taken).toEqual([
      ["P", 300],
      ["Q", 180],
    ]);
    expect(300 + 200).toBeGreaterThan(480);
  });
});

describe("the figures behind each lesson", () => {
  /** A figure in a lesson or one of its questions, with the value it is computed from. */
  const fragments: [string, number, string, number][] = [
    // Reading an AC supply
    ["reading-an-ac-supply", 230 ** 2 / 23, "2300", 0.5],
    ["reading-an-ac-supply", 230 * s2, "325", 0.5],
    ["reading-an-ac-supply", 2 * 325, "650", 0],
    ["reading-an-ac-supply", 2 * 230 * s2, "650", 1],
    ["reading-an-ac-supply", 12 * s2, "17.0", 0.05],
    ["reading-an-ac-supply", 24 * s2, "33.9", 0.05],
    ["reading-an-ac-supply", 230 * 0.1, "23", 0.5],
    ["reading-an-ac-supply", 230 * 1.1, "253", 0.5],
    ["reading-an-ac-supply", 230 * 0.94, "216.2", 0.05],
    ["reading-an-ac-supply", 230 * 0.9, "207", 0.5],
    ["reading-an-ac-supply", 360 / 20, "18", 0],
    ["reading-an-ac-supply", 60 / 18, "3.3", 0.05],
    ["reading-an-ac-supply", 120 / 18, "6.7", 0.05],
    ["reading-an-ac-supply", (3 / 20) * 360, "54", 0],
    ["reading-an-ac-supply", 253 * s2, "358", 0.5],
    ["reading-an-ac-supply", 170 * handbookRms, "120", 0.5],
    ["reading-an-ac-supply", (2 / 20) * 360, "36", 0],
    ["reading-an-ac-supply", 212 / s2, "150", 0.5],
    // Real, reactive and apparent power
    ["real-reactive-apparent", 1.8 / 0.9, "2.00", 0.005],
    ["real-reactive-apparent", 1.8 / 0.6, "3.00", 0.005],
    ["real-reactive-apparent", 1.8 * tanAcos(0.9), "0.87", 0.005],
    ["real-reactive-apparent", 1.8 * tanAcos(0.6), "2.40", 0.005],
    ["real-reactive-apparent", 2 ** 2 * 200, "800", 0.5],
    ["real-reactive-apparent", 2 ** 2 * 50, "200", 0.5],
    ["real-reactive-apparent", Math.hypot(800, 200), "824.6", 0.05],
    ["real-reactive-apparent", 800 / Math.hypot(800, 200), "0.970", 0.0005],
    ["real-reactive-apparent", 7000 / 230, "30.4", 0.05],
    ["real-reactive-apparent", 90 / 0.7, "128.6", 0.05],
    ["real-reactive-apparent", 90 * tanAcos(0.7), "92", 0.5],
    ["real-reactive-apparent", 90 + 90 * tanAcos(0.7), "182", 0.5],
    // Power factor
    ["power-factor", (Math.acos(0.7) * 180) / Math.PI, "45.6", 0.05],
    ["power-factor", 700 / 0.7, "1000", 0.5],
    ["power-factor", 1 / 0.7, "1.43", 0.005],
    ["power-factor", 1 / 0.7 ** 2, "2.04", 0.005],
    ["power-factor", 6000 / 230, "26.1", 0.05],
    ["power-factor", 6000 / (230 * 0.6), "43.5", 0.05],
    ["power-factor", 1 / 0.6, "1.67", 0.005],
    ["power-factor", 1 / 0.6 ** 2, "2.78", 0.005],
    ["power-factor", 60 * tanAcos(0.75), "52.9", 0.05],
    ["power-factor", 60 / 0.75, "80.0", 0.05],
    ["power-factor", 60 * (tanAcos(0.75) - tanAcos(0.95)), "33.2", 0.05],
    ["power-factor", 60 * tanAcos(0.95), "19.7", 0.05],
    ["power-factor", 60 / 0.95, "63.2", 0.05],
    ["power-factor", (1 - 60 / 0.95 / (60 / 0.75)) * 100, "21", 0.5],
    ["power-factor", Math.hypot(60, 80 - 52.9), "65.8", 0.05],
    ["power-factor", 250 * tanAcos(0.8), "187.5", 0.05],
    ["power-factor", 250 * tanAcos(0.95), "82.2", 0.05],
    ["power-factor", 250 * (tanAcos(0.8) - tanAcos(0.95)), "105.3", 0.05],
    ["power-factor", 250 / 0.8, "312.5", 0.05],
    ["power-factor", 250 / 0.95, "263.2", 0.05],
    // Three-phase supply
    ["three-phase-supply", 120 * s3, "208", 0.5],
    ["three-phase-supply", 230 * s3, "398", 0.5],
    ["three-phase-supply", s3 * 240, "415.7", 0.05],
    ["three-phase-supply", (3 * 240 * 100 * 0.9) / 1000, "64.8", 0.05],
    ["three-phase-supply", (3 * 240 * 100) / 1000, "72.0", 0.05],
    ["three-phase-supply", 200 * s3, "346.4", 0.05],
    ["three-phase-supply", (3 * 440 * 200 * 0.6) / 1000, "158.4", 0.05],
    ["three-phase-supply", 15 / 0.85, "17.6", 0.05],
    ["three-phase-supply", 400 / s3, "231", 0.5],
    ["three-phase-supply", 400 / 30, "13.3", 0.05],
    ["three-phase-supply", (400 / 30) * s3, "23.1", 0.05],
    ["three-phase-supply", 400 / 30 / 3, "4.4", 0.05],
    ["three-phase-supply", 400 / s3 / 30, "7.7", 0.05],
    ["three-phase-supply", 400 / s3 / 20, "11.5", 0.05],
    ["three-phase-supply", 20 * s3, "34.6", 0.05],
    ["three-phase-supply", 3 * 20, "60", 0],
    ["three-phase-supply", Math.sin(Math.PI / 3), "0.87", 0.005],
    // Real transformers
    ["real-transformers", 500000 / (s3 * 400), "722", 0.5],
    ["real-transformers", 500000 / (s3 * 11000), "26.2", 0.05],
    ["real-transformers", 440 / s3, "254", 0.5],
    ["real-transformers", 10000 * 0.9, "9{,}000", 0],
    ["real-transformers", 9000 + 100 + 70, "9{,}170", 0],
    ["real-transformers", (9000 / 9170) * 100, "98.1", 0.05],
    ["real-transformers", 500 * 0.5 * 0.8, "200", 0],
    ["real-transformers", 6 * 0.5 ** 2, "1.5", 0],
    ["real-transformers", (200 / (200 + 1.5 + 1.2)) * 100, "98.7", 0.05],
    ["real-transformers", 2400 / 0.97 - 2400, "74.2", 0.05],
    ["real-transformers", 300000 / (s3 * 400), "433", 0.5],
    ["real-transformers", 300000 / 33000, "9.09", 0.005],
    // Why transmission uses high voltage
    ["transmission-voltage", 6 * lossFactor(66, 132), "1.5", 0],
    ["transmission-voltage", lossFactor(345, 765), "0.203", 0.0005],
    ["transmission-voltage", 4.2 * lossFactor(345, 765), "0.85", 0.005],
    ["transmission-voltage", 1.2 * lossFactor(275, 110), "7.5", 0],
    ["transmission-voltage", 100 * lossFactor(1, 4), "6.25", 0],
    // Speed, poles and frequency
    ["speed-poles-frequency", (120 * 50) / 2, "3000", 0],
    ["speed-poles-frequency", (120 * 50) / 4, "1500", 0],
    ["speed-poles-frequency", (120 * 50) / 6, "1000", 0],
    ["speed-poles-frequency", (46 / 3600) * 100, "1.3", 0.05],
    ["speed-poles-frequency", 1500 * (1 - 0.01), "1485", 0],
    ["speed-poles-frequency", 1500 * (1 - 0.03), "1455", 0],
    ["speed-poles-frequency", (60 / 1500) * 100, "4", 0],
    ["speed-poles-frequency", ((1000 - 985) / 1000) * 100, "1.5", 0],
    // Grid frequency and inertia
    ["grid-frequency-and-inertia", (500 / 10000) * 100, "5", 0],
    ["grid-frequency-and-inertia", (750 / 30000) * 100, "2.5", 0],
    // Frequency control and reserves
    ["frequency-control", ((3000 - 2880) / 3000) * 100, "4", 0],
    ["frequency-control", (0.2 / 50) * 100, "0.4", 0],
    ["frequency-control", (600 * ((0.2 / 50) * 100 * 25)) / 100, "60", 0],
    ["frequency-control", (0.15 / 50) * 100 * 25, "7.5", 0],
    ["frequency-control", 300 * ((0.15 / 50) * 25), "22.5", 0],
    ["frequency-control", 0.01 * 30 * 24, "7.2", 0.05],
    ["frequency-control", (45 + 90) / 2, "67.50", 0.005],
    ["frequency-control", (700 + 500 + 400) / 3, "533", 0.5],
    // Protecting against overcurrent
    ["overcurrent-protection", 230 / 0.05, "4600", 0.5],
    ["overcurrent-protection", 4600 / 20, "230", 0],
    // Earthing and safety switches
    ["earthing-and-safety-switches", (0.03 / 10) * 100, "0.3", 0],
    ["earthing-and-safety-switches", 10 + 0.03, "10.03", 0],
    ["earthing-and-safety-switches", 10 + 0.3, "10.3", 0],
    ["earthing-and-safety-switches", 10 + 3, "13", 0],
    ["earthing-and-safety-switches", (8 - 7.94) * 1000, "60", 1e-9],
    ["earthing-and-safety-switches", 5 - 0.05, "4.950", 0],
    // Inverters and rooftop solar
    ["inverters-and-rooftop-solar", 30 * 5, "150", 0],
    ["inverters-and-rooftop-solar", (30 * 5) / 100, "1.5", 0],
    ["inverters-and-rooftop-solar", 20 * 6, "120", 0],
    ["inverters-and-rooftop-solar", (20 * 6) / 150, "0.8", 0],
    ["inverters-and-rooftop-solar", 16 * 5, "80", 0],
    ["inverters-and-rooftop-solar", ((16 * 5) / 200) * 100, "40", 0],
    ["inverters-and-rooftop-solar", Math.floor(63 / 5), "12", 0],
    // Storage, variability and curtailment
    ["storage-and-curtailment", 194 / 150, "1.3", 0.05],
    ["storage-and-curtailment", 450 / 300, "1.5", 0],
    ["storage-and-curtailment", (450 / 300) * 60, "90", 0],
    ["storage-and-curtailment", 30 * 3, "90", 0],
    ["storage-and-curtailment", (70 * 10) / 60, "11.7", 0.05],
    ["storage-and-curtailment", 610 / 267, "2.3", 0.05],
    ["storage-and-curtailment", 9000 / 200, "45", 0],
    ["storage-and-curtailment", 267 / 610, "0.4", 0.05],
    ["storage-and-curtailment", 200 / 9000, "0.02", 0.005],
    ["storage-and-curtailment", 20 * 3, "60", 0],
    ["storage-and-curtailment", 800 * 0.75, "600", 0],
    ["storage-and-curtailment", 800 * 0.85, "680", 0],
    ["storage-and-curtailment", 800 / 0.85, "940", 1.5],
    ["storage-and-curtailment", 800 / 0.75, "1,070", 4],
  ];
  const plain = (text: string) => Number(text.replace(/[,{}\\a-zA-Z\s]/gu, "")) || 0;

  it("recomputes the number each lesson prints, in the lesson or in a question it asks", () => {
    for (const [id, value, fragment, tolerance] of fragments) {
      const text = ownText(id);
      has(text, fragment, `${id}: ${fragment}`);
      if (/^[\d.,{}]+$/u.test(fragment))
        expect(
          Math.abs(value - plain(fragment)),
          `${id}: ${fragment} is ${value}`,
        ).toBeLessThanOrEqual(tolerance + 1e-9);
    }
  });

  it("states the figures of the options and feedback of the choice questions as the arithmetic gives them", () => {
    // [question, value, the figure as printed, tolerance]
    const quoted: [string, number, string, number][] = [
      ["reading-an-ac-supply-tolerance", 230 * 0.94, "216.2", 0.05],
      ["reading-an-ac-supply-tolerance", 230 * 0.9, "207", 0.5],
      ["reading-an-ac-supply-tolerance", 230 * s2, "325", 0.5],
      ["reading-an-ac-supply-end-full-height", 2 * 170, "340", 0],
      ["reading-an-ac-supply-end-full-height", 170 * handbookRms, "120", 0.5],
      ["reading-an-ac-supply-fade-which-leads", (4 / 20) * 360, "72", 0],
      ["reading-an-ac-supply-end-lag-meaning", (2 / 20) * 360, "36", 0],
      ["real-reactive-apparent-hook", 100 * 2, "200", 0],
      ["real-reactive-apparent-transformer-fit", 90 / 0.7, "128.6", 0.05],
      ["real-reactive-apparent-transformer-fit", 90 * tanAcos(0.7), "92", 0.5],
      ["real-reactive-apparent-transformer-fit", 90 + 90 * tanAcos(0.7), "182", 0.5],
      ["three-phase-supply-delta-resistors", 20 * s3, "34.6", 0.05],
      ["three-phase-supply-delta-resistors", 3 * 20, "60", 0],
      ["three-phase-supply-delta-resistors", 400 / s3 / 20, "11.5", 0.05],
      ["three-phase-supply-end-star-resistors", 400 / 30, "13.3", 0.05],
      ["three-phase-supply-end-star-resistors", 400 / s3 / 30, "7.7", 0.05],
      ["three-phase-supply-end-star-resistors", (400 / 30) * s3, "23.1", 0.05],
      ["three-phase-supply-end-star-resistors", 400 / 30 / 3, "4.4", 0.05],
      ["speed-poles-frequency-end-readings", ((1000 - 985) / 1000) * 100, "1.5", 0],
      ["speed-poles-frequency-end-readings", ((1000 - 960) / 1000) * 100, "4", 0],
      ["grid-frequency-and-inertia-end-size", (500 / 10000) * 100, "5", 0],
      ["grid-frequency-and-inertia-end-size", (750 / 30000) * 100, "2.5", 0],
      ["frequency-control-b-paid", (45 + 90) / 2, "67.50", 0.005],
      ["frequency-control-end-reserve", (700 + 500 + 400) / 3, "533", 0.5],
      ["overcurrent-protection-hook", 230 / 0.05, "4600", 0.5],
      ["overcurrent-protection-hook", 230 / 0.05 / 20, "230", 0],
      ["earthing-and-safety-switches-hook", 10 + 0.03, "10.03", 0],
      ["earthing-and-safety-switches-hook", 10 + 0.3, "10.3", 0],
      ["earthing-and-safety-switches-hook", 10 + 3, "13", 0],
      ["earthing-and-safety-switches-imbalance", (8.0 - 7.94) * 1000, "60", 1e-9],
      ["inverters-and-rooftop-solar-two-streets", ((16 * 5) / 200) * 100, "40", 0],
      ["inverters-and-rooftop-solar-faded-first-limit", 120 / 150, "0.8", 0],
      ["storage-and-curtailment-hook", 194 / 150, "1.3", 0.05],
      ["storage-and-curtailment-global-compare", 610 / 267, "2.3", 0.05],
      ["storage-and-curtailment-global-compare", 9000 / 200, "45", 0],
      ["storage-and-curtailment-global-compare", 267 / 610, "0.4", 0.05],
      ["storage-and-curtailment-global-compare", 200 / 9000, "0.02", 0.005],
      ["storage-and-curtailment-sizing", 20 * 3, "60", 0],
      ["storage-and-curtailment-end-pumped-return", 800 * 0.75, "600", 0],
      ["storage-and-curtailment-end-pumped-return", 800 * 0.85, "680", 0],
      ["storage-and-curtailment-end-pumped-return", 800 / 0.85, "940", 1.5],
      ["storage-and-curtailment-end-pumped-return", 800 / 0.75, "1,070", 4],
    ];
    for (const [id, value, fragment, tolerance] of quoted) {
      has(JSON.stringify(withoutExtracts(question(id))), fragment, `${id}: ${fragment}`);
      expect(
        Math.abs(value - Number(fragment.replace(/,/gu, ""))),
        `${id}: ${fragment} is ${value}`,
      ).toBeLessThanOrEqual(tolerance + 1e-9);
    }
  });

  it("checks which loads, devices and links the sorting questions put in each group", () => {
    // Breakers against the prospective current at their position: rating enough when it is the larger
    const ratings = question("overcurrent-protection-end-ratings").sort?.items ?? [];
    expect(ratings).toHaveLength(6);
    for (const entry of ratings) {
      const [rating, prospective] = [...entry.label.matchAll(/(\d+) kA/gu)].map((m) =>
        Number(m[1]),
      );
      expect(entry.bin, entry.label).toBe(
        (rating as number) >= (prospective as number) ? "enough" : "low",
      );
    }
    // Star and delta: the factor falls on the voltage in a star and on the current in a delta
    const sorted = (id: string) =>
      Object.fromEntries((question(id).sort?.items ?? []).map((entry) => [entry.label, entry.bin]));
    const starDelta = sorted("three-phase-supply-end-star-or-delta");
    expect(starDelta["The line voltage is 1.73 times the voltage across one load"]).toBe("star");
    expect(starDelta["The line current is 1.73 times the current in one load"]).toBe("delta");
    expect(starDelta["The line current is the same as the current in one load"]).toBe("star");
    expect(starDelta["The voltage across each load is the same as the voltage between lines"]).toBe(
      "delta",
    );
    // Three equal currents 120 degrees apart sum to zero at every angle
    for (let angle = 0; angle < 360; angle += 15) {
      const sum = [0, 120, 240]
        .map((shift) => Math.sin(((angle - shift) * Math.PI) / 180))
        .reduce((a, b) => a + b, 0);
      expect(Math.abs(sum)).toBeLessThan(1e-12);
    }
    // At 60 degrees the three values of the figure
    const rounded = (value: number) => (Number(value.toFixed(2)) + 0).toFixed(2);
    expect([0, 120, 240].map((shift) => rounded(Math.sin(((60 - shift) * Math.PI) / 180)))).toEqual(
      ["0.87", "-0.87", "0.00"],
    );
  });

  it("works the power factor, loss and capacitor arithmetic that the lessons rest on", () => {
    // A load of 60 kW at 0.75 with a 33.2 kvar capacitor reaches 0.95 and cuts the current by 21%
    const q1 = 60 * tanAcos(0.75);
    const q2 = q1 - 33.2;
    expect(60 / Math.hypot(60, q2)).toBeCloseTo(0.95, 2);
    expect(1 - Math.hypot(60, q2) / Math.hypot(60, q1)).toBeCloseTo(0.21, 2);
    // An 80 kvar capacitor overshoots: the reactive power turns round and S rises again
    expect(q1 - 80).toBeCloseTo(-27.1, 1);
    expect(60 / Math.hypot(60, q1 - 80)).toBeCloseTo(0.91, 2);
    // The same real power at power factor 0.5 means four times the loss of power factor 1
    expect(1 / 0.5 ** 2).toBe(4);
    // 1 kW at power factor 0.2 is 5 kVA, and at 0.7 the current is 1.4 times and the loss doubled
    expect(1 / 0.2).toBe(5);
    expect(1 / 0.7).toBeCloseTo(1.4, 1);
    expect(1 / 0.7 ** 2).toBeCloseTo(2, 1);
    // The transformer of the workshop: 90 kW at 0.70 needs 129 kVA from a 100 kVA unit
    expect(90 / 0.7).toBeGreaterThan(100);
    // Efficiency of the DOE's 10 kVA transformer rounds to 98.1, where the handbook prints 98.2
    expect(((9000 / 9170) * 100).toFixed(1)).toBe("98.1");
    stated("0.981 = 98.1");
    // A 100 kVA transformer's two losses are equal at 0.75 of full load when the core loss is 0.9 kW
    expect(1.6 * 0.75 ** 2).toBeCloseTo(0.9, 10);
  });

  it("keeps the conductor, loss and voltage scaling consistent", () => {
    // Ten times the voltage and a tenth of the cross-section: a tenth of the loss
    expect((1 / 10) ** 2 * 10).toBeCloseTo(0.1, 10);
    // 230 V to 23,000 V is a hundredfold rise and a ten-thousandth of the loss
    expect(lossFactor(230, 23000)).toBeCloseTo(1e-4, 12);
    stated("23,000 V");
    // The two figures of a real line against the square law
    expect(4.2 * lossFactor(345, 765)).toBeGreaterThan(0.5);
    expect(4.2 * lossFactor(345, 765)).toBeLessThan(1.1);
    // 500 kVA carries 722 A at 400 V and 26.2 A at 11 kV: the same apparent power
    expect(Math.abs(s3 * 400 * 722 - s3 * 11000 * 26.2) / (s3 * 400 * 722)).toBeLessThan(0.003);
    // The voltage between two lines is 2 sin 60 degrees of a phase voltage, which is root three
    expect(2 * Math.sin(Math.PI / 3)).toBeCloseTo(s3, 12);
    // At 50 Hz a quarter of a cycle is 5 ms and half to one cycle is 10 to 20 ms
    expect([20 / 4, 20 / 2, 20]).toEqual([5, 10, 20]);
    stated("about 5 ms and the breaker in about 10 to 20 ms");
    // A kettle of 2.3 kW on 230 V draws 10 A
    expect(2300 / 230).toBe(10);
    stated("2.3 kW");
    // A 100 MW battery that holds 10 MWh is empty in six minutes
    expect((10 / 100) * 60).toBe(6);
    stated("empty in six minutes");
  });
});

describe("the figures taken from the source pack", () => {
  it("finds each figure and claim of the pack in a passage copied from it, and states it in the course", () => {
    expect(fixture.facts.length).toBe(248);
    for (const fact of fixture.facts) {
      const pattern = new RegExp(fact.pack, "u");
      expect(
        (fixture.files[fact.file] ?? []).some((passage) => pattern.test(passage)),
        `${fact.file}: ${fact.what}`,
      ).toBe(true);
      if (fact.course) has(everything, fact.course, fact.what);
    }
    expect(fixture.facts.filter((fact) => fact.course).length).toBeGreaterThan(100);
  });

  it("states the real figures the same way wherever they appear", () => {
    // Australia's supply
    expect(everything.match(/230 V RMS/gu)?.length ?? 0).toBeGreaterThanOrEqual(1);
    lacks(everything, /\b24[01] V (nominal|RMS|supply)\b/u);
    // Heywood and Murraylink, in both lessons that give them
    for (const id of ["transmission-voltage", "how-a-grid-trips"]) {
      const text = ownText(id);
      if (id === "how-a-grid-trips") has(text, "to carry 650 MW at 275 kV");
      has(text, "220 MW");
      has(text, "150 kV");
    }
    has(ownText("transmission-voltage"), "to carry 650 MW at 275 kV");
    expect(everything.match(/650 MW at 275 kV/gu)?.length).toBe(2);
    expect(everything.match(/220 MW at 150 kV|220 MW link at 150 kV/gu)?.length).toBe(2);
    // Hornsdale's inertia, in the two lessons that give it
    expect(
      everything.match(
        /2,000 megawatt-seconds of grid inertia, about 15 percent of the state's total requirement/gu,
      )?.length,
    ).toBe(2);
    lacks(everything, /2,000 MW s\b/u);
    // Its two contracts and its sizes, in the lessons that give them
    expect(everything.match(/70 MW for 10 minutes/gu)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(everything.match(/30 MW for 3 hours/gu)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(everything.match(/150 MW \(194 MWh\)/gu)?.length ?? 0).toBeGreaterThanOrEqual(1);
    // The frequency band of the market
    expect(everything.match(/49\.85 and 50\.15/gu)?.length ?? 0).toBeGreaterThanOrEqual(2);
    lacks(everything, /49\.9 to 50\.1|49\.8 to 50\.2/u);
    // The 2017 event, as the one record of the frequency lessons
    has(ownText("grid-frequency-and-inertia"), "1:58:59");
    has(ownText("grid-frequency-and-inertia"), "14 December 2017");
    has(ownText("grid-frequency-and-inertia"), "49.8 Hz");
  });
});

describe("what the safety lessons tell a household", () => {
  const safety = [
    "power-factor",
    "three-phase-supply",
    "overcurrent-protection",
    "earthing-and-safety-switches",
    "inverters-and-rooftop-solar",
  ];
  /** The words a lesson addresses to the learner, and not its figures, options or quoted extracts. */
  const words = (blocks: { kind: string; text?: string }[] = []) =>
    blocks.map((block) => block.text ?? "");
  const prose = (id: string) => {
    const item = lesson(id);
    const parts = item.steps.flatMap((step) => [
      step.headline,
      ...words(step.lead),
      ...words(step.afterFigure),
      ...words(step.reveal),
      ...(step.workedSteps ?? []).map((line) => line.text),
    ]);
    return [
      ...parts,
      ...words(item.intro?.hook.blocks),
      item.intro?.promise,
      item.intro?.whyItMatters,
      ...words(item.recap?.blocks),
      item.recap?.keyIdea,
    ].join(" ");
  };
  const interval =
    /\b(every|each) (\w+ )?(months?|years?|weeks?)\b|\b(monthly|quarterly|annually|yearly|three months)\b/iu;
  /** The sentences of a text that speak of testing. */
  const aboutTesting = (text: string) =>
    text.split(/(?<=[.!?])\s+/u).filter((line) => /\btest/iu.test(line));

  it("never tells a learner to fit, replace, test, open or repair wiring or equipment", () => {
    // "you should open", a sentence that begins with an order, or "do it yourself"
    const instruction =
      /\b(you (should|can|must|need to|could|may) (open|replace|fit|install|test|repair|tighten|rewire|wire|remove|inspect|reset|press|switch off|turn off|isolate)|try (opening|replacing|testing|repairing|fitting|installing)|do it yourself)\b|(^|[.!?]\s+)(open|remove|replace|tighten|rewire|repair|inspect|test|fit|install|reset|press|switch off|turn off|isolate)\b/iu;
    for (const id of safety) lacks(prose(id), instruction, id);
    // The questions' own prompts and their right options never ask for it either
    for (const id of safety)
      for (const qid of ownIds(lesson(id))) {
        const item = question(qid);
        lacks(item.prompt, instruction, qid);
        if (item.answerAuthority.kind === "text" && item.choices)
          lacks(
            item.choices[rightIndex(item)]?.label ?? "",
            /\b(open|replace|tighten|rewire|repair|install|fit) (the|a|an|that|it|them|its)\b/iu,
            qid,
          );
      }
    // Equipment that is added to an installation is work for a licensed electrician
    matches(prose("power-factor"), /fitting them is work for a licensed electrician/u);
    matches(prose("three-phase-supply"), /licensed electrician carries out/u);
    matches(prose("overcurrent-protection"), /work for an A grade electrician/u);
    matches(prose("earthing-and-safety-switches"), /licensed work/u);
    matches(prose("inverters-and-rooftop-solar"), /belongs to the licensed electrician/u);
  });

  it("sends every wrong option that describes unsafe work to a licensed electrician in its feedback", () => {
    const unsafe =
      /(switchboard should be opened|inspect the wiring personally|Replace the power point|Open the switchboard and tighten|friend who knows wiring|higher rating will cure)/u;
    let found = 0;
    for (const qid of [
      ...ownIds(lesson("earthing-and-safety-switches")),
      ...ownIds(lesson("inverters-and-rooftop-solar")),
    ]) {
      const item = question(qid);
      for (const choice of item.choices ?? []) {
        if (!unsafe.test(choice.label)) continue;
        found += 1;
        const entry = (item.misconceptions ?? []).find((m) =>
          m.match.choiceIds?.includes(choice.id),
        );
        matches(
          entry?.feedback ?? "",
          /licensed|A grade electrician|electrician/u,
          `${qid} ${choice.id}`,
        );
      }
    }
    expect(found).toBe(6);
  });

  it("states no interval for testing a safety switch, because the regulator's pages disagree", () => {
    const text = prose("earthing-and-safety-switches");
    for (const line of aboutTesting(text)) lacks(line, interval, line);
    has(text, "ESV's own pages give different intervals for testing, so this lesson gives none");
    for (const qid of ownIds(lesson("earthing-and-safety-switches")))
      for (const line of aboutTesting(JSON.stringify(withoutExtracts(question(qid)))))
        lacks(line, interval, qid);
    // The two pages really do differ, in the passages the pack copies
    const esv = fixture.files["esv-household-electrical-safety.txt"] ?? [];
    expect(esv.some((passage) => /every three months/u.test(passage))).toBe(true);
    expect(esv.some((passage) => /regularly, every year/u.test(passage))).toBe(true);
    // The only action on the test button is the one the regulator's own pages describe, with the next step
    matches(text, /ESV's household pages describe a householder pressing it/u);
    matches(text, /a licensed electrician should be called immediately to investigate/u);
  });

  it("tells the 2016 blackout as Wikipedia's summary, and the 2019 proceedings as alleged with no outcome", () => {
    const text = ownText("how-a-grid-trips");
    has(text, "Wikipedia's summary of the market operator's preliminary report");
    has(text, "AEMO's own reports are not among this course's sources");
    has(text, "so treat the details as that summary's");
    // The screens that state the sequence name the summary, and the lesson names it often
    for (const id of ["a-grid-and-a-storm", "the-90-seconds", "ride-through"])
      expect(
        lesson("how-a-grid-trips").steps.some((entry) => entry.id === id),
        id,
      ).toBe(true);
    expect(prose("how-a-grid-trips").match(/Wikipedia/gu)?.length ?? 0).toBeGreaterThanOrEqual(8);
    // The proceedings
    has(text, "In 2019 the Australian Energy Regulator started proceedings in the Federal Court");
    has(text, "alleging that they had not complied with the performance requirements");
    has(
      text,
      "Wikipedia records the filing and gives no outcome, so this lesson says nothing about how it ended",
    );
    lacks(
      everything,
      /\b(fined|penalt(y|ies)|convicted|guilty|found liable|ordered to pay|pleaded|admitted liability|dismissed the case)\b/iu,
    );
    // The causes are not ranked, and the lesson adds no detail the pack lacks
    has(text, "The account does not rank these");
    lacks(text, /\b(voltage dip|frequency of 4[0-9]\.\d)\b/iu);
    // The report on the 2025 plans is not tied to 2016
    has(
      text,
      "The report does not link those plans to the events of 2016, and this lesson does not either",
    );
  });
});
