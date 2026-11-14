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
 * Creative and Game Writing asks questions the way the finished courses do
 * (docs/question-writing-guide.md), adapted to a craft: most put a short draft, scene, line of
 * dialogue or ink script in front of the learner and ask which revision serves it, what is wrong
 * with a count, or which kind of beat it is. The drafts are labelled as invented, except two word
 * for word quotations from public-domain books, Forster's Aspects of the Novel (1927) and
 * Butcher's translation of Aristotle's Poetics. Numbers are kept where the budget forces a
 * decision: how many decisions a tree can hold, how many flags a tester can check, the longest
 * label that survives translation.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/creative-and-game-writing/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const get = (id: string): Question => {
  const question = questions.get(id);
  if (!question) throw new Error(`No question ${id}`);
  return question;
};
const kind = (question: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  question.responseType === "numeric"
    ? "numeric"
    : question.responseType === "order" || question.responseType === "sort"
      ? question.responseType
      : question.choices
        ? "choice"
        : "typed";
const extractsOf = (question: Question | undefined): string[] =>
  (question?.extracts ?? []).map((extract) => extract.text);
const numericValue = (id: string): number => {
  const authority = get(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const rightChoice = (question: Question) => {
  if (question.answerAuthority.kind !== "text") return undefined;
  const authority = question.answerAuthority;
  return question.choices?.find((choice) => assessTextAnswer(choice.label, authority).correct);
};
const choiceLabels = (id: string): string[] =>
  (get(id).choices ?? []).map((choice) => choice.label);
const words = (text: string): number => text.trim().split(/\s+/u).length;

/** The most doublings of 2 that stay within a limit. */
const mostDoublings = (limit: number): number => {
  let count = 0;
  while (2 ** (count + 1) <= limit) count += 1;
  return count;
};

/**
 * A reader for the small part of ink the questions use: `VAR` lines, knots, choices that change a
 * number with `~` and divert with `->`, and a one-line `{ test: this | that }`. It runs the script
 * printed in a question's prompt and returns the lines the player sees.
 */
function playInk(prompt: string, picks: number[]): string[] {
  const script = prompt.slice(prompt.indexOf("VAR "));
  const vars: Record<string, number> = {};
  const knots = new Map<string, string[]>();
  let current = "";
  for (const raw of script.split("\n")) {
    const line = raw.trim();
    const declared = /^VAR (\w+) = (-?\d+)$/u.exec(line);
    if (declared) {
      vars[declared[1] as string] = Number(declared[2]);
      continue;
    }
    const knot = /^=== (\w+) ===$/u.exec(line);
    if (knot) {
      current = knot[1] as string;
      knots.set(current, []);
      continue;
    }
    knots.get(current)?.push(raw);
  }
  const shown: string[] = [];
  const remaining = [...picks];
  let at = "start";
  for (let guard = 0; guard < 20 && at !== "END"; guard += 1) {
    const lines = knots.get(at) ?? [];
    const options: { effects: string[]; divert: string }[] = [];
    let last: { effects: string[]; divert: string } | undefined;
    let diverted = "";
    for (const raw of lines) {
      const line = raw.trim();
      if (line.startsWith("* [")) {
        last = { effects: [], divert: "" };
        options.push(last);
      } else if (line.startsWith("~")) {
        last?.effects.push(line.slice(1).trim());
      } else if (line.startsWith("->")) {
        const target = line.slice(2).trim();
        if (last) last.divert = target;
        else diverted = target;
      } else if (line) {
        const test = /^\{ (\w+) (>=|>|<=|<|==) (-?\d+): (.*) \| (.*) \}$/u.exec(line);
        if (test) {
          const value = vars[test[1] as string] as number;
          const limit = Number(test[3]);
          const passes =
            test[2] === ">="
              ? value >= limit
              : test[2] === ">"
                ? value > limit
                : test[2] === "<="
                  ? value <= limit
                  : test[2] === "<"
                    ? value < limit
                    : value === limit;
          shown.push((passes ? test[4] : test[5]) as string);
        } else shown.push(line);
      }
    }
    if (options.length) {
      const pick = options[remaining.shift() as number];
      if (!pick) throw new Error(`No choice to pick in ${at}`);
      for (const effect of pick.effects) {
        const change = /^(\w+) = (\w+) ([+-]) (\d+)$/u.exec(effect);
        if (!change) throw new Error(`Cannot read ${effect}`);
        const delta = Number(change[4]) * (change[3] === "+" ? 1 : -1);
        vars[change[1] as string] = (vars[change[2] as string] as number) + delta;
      }
      at = pick.divert;
    } else at = diverted;
  }
  return shown;
}

describe("questions in Creative and Game Writing", () => {
  it("asks every question from a lesson, and every lesson question exists", () => {
    const asked = new Set(
      bundle.lessons.flatMap((lesson) => [
        ...lesson.questionIds,
        ...lesson.steps.flatMap((step) => [
          step.checkQuestionId,
          ...(step.workedSteps ?? []).flatMap((line) => [
            line.blank?.questionId ?? "",
            line.selfExplain?.questionId ?? "",
          ]),
        ]),
      ]),
    );
    asked.delete("");
    expect([...asked].filter((id) => !questions.has(id))).toEqual([]);
    expect(bundle.questions.filter((question) => !asked.has(question.id)).map((q) => q.id)).toEqual(
      [],
    );
    const cards = new Set(bundle.lessons.flatMap((lesson) => lesson.flashcardIds));
    expect(bundle.flashcards.filter((card) => !cards.has(card.id)).map((card) => card.id)).toEqual(
      [],
    );
    expect([...cards].filter((id) => !bundle.flashcards.some((card) => card.id === id))).toEqual(
      [],
    );
  });

  it("ends each lesson with three questions of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(get(id)));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps seven numeric questions, each with three hints, where a budget forces the number", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id).sort()).toEqual([
      "cregw-branching-structures-bottleneck-13",
      "cregw-branching-structures-most-decisions",
      "cregw-choice-consequence-and-pacing-branch-length",
      "cregw-choice-consequence-and-pacing-final-branches",
      "cregw-state-and-conditions-final-flag-limit",
      "cregw-writing-game-text-final-longest-label",
      "cregw-writing-game-text-shortest-gap",
    ]);
    expect(numeric.length).toBeLessThanOrEqual(8);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("recomputes every number the numeric questions state", () => {
    // 20 endings, two options per decision, no rejoining
    expect(numericValue("cregw-branching-structures-most-decisions")).toBe(mostDoublings(20));
    expect(2 ** 4).toBe(16);
    expect(2 ** 5).toBe(32);
    // an opening, four decisions of three options and one rejoining passage each
    expect(numericValue("cregw-branching-structures-bottleneck-13")).toBe(1 + 4 * (3 + 1));
    // 40 combinations a day, every flag true or false
    expect(numericValue("cregw-state-and-conditions-final-flag-limit")).toBe(mostDoublings(40));
    expect(2 ** 6).toBe(64);
    // 25 lines, 600 seconds, no repeats
    expect(numericValue("cregw-writing-game-text-shortest-gap")).toBe((10 * 60) / 25);
    // a 40-character button and translations 35 percent longer
    const longest = numericValue("cregw-writing-game-text-final-longest-label");
    expect(longest).toBe(Math.floor(40 / 1.35));
    expect(longest * 1.35).toBeLessThanOrEqual(40);
    expect((longest + 1) * 1.35).toBeGreaterThan(40);
    expect(longest * 1.35).toBeCloseTo(39.15, 9);
    expect(30 * 1.35).toBeCloseTo(40.5, 9);
    expect(40 - 0.35 * 40).toBe(26);
    // a vignette of 800 words with a 200-word opening and three branches
    expect(numericValue("cregw-choice-consequence-and-pacing-branch-length")).toBe((800 - 200) / 3);
    expect(800 / 3).toBeCloseTo(266.67, 2);
    // a 900-word budget, a 300-word opening, a 100-word rejoin and 150-word branches
    const branches = numericValue("cregw-choice-consequence-and-pacing-final-branches");
    expect(branches).toBe(Math.floor((900 - 300 - 100) / 150));
    expect(300 + 100 + branches * 150).toBe(850);
    expect(300 + 100 + (branches + 1) * 150).toBe(1000);
    expect(900 / 150).toBe(6);
  });

  it("recomputes the figures that the multiple-choice questions and their feedback quote", () => {
    // the 96-page script: act two ends on page 72 by the convention, on page 60 in the draft
    expect(0.25 * 96).toBe(24);
    expect(0.75 * 96).toBe(72);
    expect(96 - 72).toBe(24);
    expect(96 - 60).toBe(36);
    expect(72 - 60).toBe(12);
    // the 120-page script of the kept question on the late turn
    expect(0.25 * 120).toBe(30);
    expect(0.75 * 120).toBe(90);
    // a tree of four binary decisions: levels of 1, 2, 4, 8 and 16 passages
    const levels = [1, 2, 4, 8, 16];
    expect(levels.reduce((sum, level) => sum + level, 0)).toBe(31);
    expect(4 * 2).toBe(8);
    // three decisions of four options each
    expect(3 * 4).toBe(12);
    expect(4 ** 3).toBe(64);
    // the budget question: 20 passages, three decisions of three options each
    expect(1 + 3 + 9 + 27).toBe(40);
    expect(1 + 3 * (3 + 1)).toBe(13);
    expect(1 + 3 + 9).toBe(13);
    expect(40 + 2).toBe(42);
    // four binary decisions that rejoin cost 13, in a tree 31
    expect(1 + 4 * (2 + 1)).toBe(13);
    expect(1 + 2 + 4 + 8).toBe(15);
    // a hub of four strands of five passages, then a fifth strand
    expect(4 * 5 + 1).toBe(21);
    expect(5 * 5 + 1 - (4 * 5 + 1)).toBe(5);
    expect(2 * 21).toBe(42);
    // flags: three give eight combinations, four give sixteen
    expect(2 ** 3).toBe(8);
    expect(8 + 1).toBe(9);
    expect(8 + 2).toBe(10);
    expect(8 * 2).toBe(16);
    // barks: a 6-minute fight at one bark every 12 seconds, 20 lines each allowed twice
    expect((6 * 60) / 12).toBe(30);
    expect(20 * 2).toBe(40);
    expect(20 * 2).toBeGreaterThanOrEqual(30);
    expect((10 * 60) / 15).toBe(40);
    // a vignette of 200 + 3 x 180 words and a 120-word rejoining passage
    expect(200 + 3 * (180 + 120)).toBe(1100);
    expect(200 + 3 * 180 + 120).toBe(860);
    expect(200 + 3 * 180).toBe(740);
    expect(1000 - 800).toBe(200);
    // six choices through 2,400 words, then nine
    expect(2400 / 6).toBe(400);
    expect(2400 / 9).toBeCloseTo(266.67, 2);
    expect(2400 / (9 - 6)).toBe(800);
  });

  it("measures the three labels against a 20-character button and a 50 percent expansion", () => {
    const labels = choiceLabels("cregw-writing-game-text-label-fits");
    const fits = labels.filter((label) => label.length * 1.5 <= 20);
    expect(fits).toEqual([rightChoice(get("cregw-writing-game-text-label-fits"))?.label]);
    for (const label of labels) expect(label.length, label).toBeLessThanOrEqual(20);
    expect(labels.map((label) => label.length * 1.5).sort((a, b) => a - b)).toEqual([
      19.5, 25.5, 27,
    ]);
  });

  it("runs the ink scripts in the questions and gets the same answers as the key", () => {
    // the two kept questions on the first script
    const first = get("cregw-state-and-conditions-share-water").prompt;
    expect(playInk(first, [0])).toEqual(["You meet Mira.", "Mira unlocks the gate."]);
    expect(playInk(first, [1])).toEqual(["You meet Mira.", "The gate stays locked."]);
    expect(rightChoice(get("cregw-state-and-conditions-share-water"))?.label).toBe(
      "Mira unlocks the gate.",
    );
    expect(rightChoice(get("cregw-state-and-conditions-keep-walking"))?.label).toBe(
      "The gate stays locked.",
    );

    // the end check: which sequence of choices opens the gate
    const gate = get("cregw-state-and-conditions-final-gate");
    const sequences: Record<string, number[]> = {
      "Keep walking, then buy the map": [1, 0],
      "Share your water, then buy the map": [0, 0],
      "Keep walking, then leave the map": [1, 1],
      "Share your water, then leave the map": [0, 1],
    };
    expect(Object.keys(sequences).sort()).toEqual(choiceLabels(gate.id).sort());
    const opens = Object.entries(sequences)
      .filter(([, picks]) => playInk(gate.prompt, picks).at(-1) === "Mira unlocks the gate.")
      .map(([label]) => label);
    expect(opens).toEqual([rightChoice(gate)?.label]);
    expect(playInk(gate.prompt, [0, 0])).toEqual([
      "You meet Mira.",
      "A stall at the roadside sells a map.",
      "The gate stays locked.",
    ]);
  });

  it("checks the claims about the paragraph that is to lose a fifth", () => {
    const question = get("cregw-detail-and-revision-cut-which-sentence");
    const paragraph = extractsOf(question)[0] ?? "";
    const sentences = paragraph.split(/(?<=\.) /u);
    // five sentences, so a fifth of them is one
    expect(sentences).toHaveLength(5);
    // the first sentence is the longest, as the wrong option says
    const lengths = sentences.map(words);
    expect(lengths[0]).toBe(Math.max(...lengths));
    // the sentence that tells follows the one that shows
    expect(sentences[3]).toBe("She was afraid of what the letter said.");
    expect(sentences[2]).toBe("She stood the letter against the kettle and did not open it.");
    const quoted = choiceLabels(question.id).map((label) => /^“([^”]+),”/u.exec(label)?.[1]);
    expect(quoted.map((sentence) => `${sentence}.`)).toEqual(
      [sentences[1], sentences[3], sentences[0]].map((sentence) => sentence?.replace(/\.$/u, ".")),
    );
  });

  it("puts a draft or a passage in front of the learner in at least ten questions across six lessons", () => {
    const withExtract = bundle.questions.filter((question) => extractsOf(question).length > 0);
    expect(withExtract.length).toBeGreaterThanOrEqual(10);
    const lessons = bundle.lessons.filter((lesson) =>
      [
        ...lesson.questionIds,
        ...lesson.steps.flatMap((step) => [
          step.checkQuestionId,
          ...(step.workedSteps ?? []).map((line) => line.blank?.questionId ?? ""),
        ]),
      ].some((id) => extractsOf(questions.get(id)).length > 0),
    );
    expect(lessons.length).toBeGreaterThanOrEqual(6);
  });

  it("labels every invented draft as invented and cites a verified public-domain source for every real one", () => {
    const sources = new Map(bundle.sources.map((source) => [source.id, source]));
    for (const question of bundle.questions) {
      for (const extract of question.extracts ?? []) {
        const label = `${extract.who} ${extract.when}`;
        if (/invented/iu.test(label)) {
          expect(extract.when, question.id).toMatch(/written for this lesson/u);
          expect(extract.who, question.id).toMatch(/invented for this exercise/u);
          continue;
        }
        const cited = question.sourceIds
          .map((id) => sources.get(id))
          .filter((source) => source?.licence.startsWith("Public domain"));
        expect(cited.length, question.id).toBeGreaterThanOrEqual(1);
        for (const source of cited) {
          expect(source?.checked?.status, question.id).toBe("verified");
          expect((source?.checked?.at ?? "") >= "2026-11-14", question.id).toBe(true);
        }
        expect(words(extract.text), question.id).toBeGreaterThanOrEqual(25);
        expect(words(extract.text), question.id).toBeLessThanOrEqual(90);
      }
      if (question.extracts?.length) {
        expect(question.prompt.trim(), question.id).toMatch(/\?$/u);
        expect(question.prompt, question.id).not.toContain("\n> ");
      }
    }
  });

  it("holds the two real quotations to the words of their sources", () => {
    const real = bundle.questions.flatMap((question) =>
      (question.extracts ?? [])
        .filter((extract) => !/invented/iu.test(extract.who))
        .map((extract) => ({ id: question.id, text: extract.text })),
    );
    expect(real).toEqual([
      {
        id: "cregw-story-structure-final-beginning",
        text: "A beginning is that which does not itself follow anything by causal necessity, but after which something naturally is or comes to be. An end, on the contrary, is that which itself naturally follows some other thing, either by necessity, or as a rule, but has nothing following it.",
      },
      {
        id: "cregw-character-final-round-test",
        text: "The test of a round character is whether it is capable of surprising in a convincing way. If it never surprises, it is flat. If it does not convince, it is a flat pretending to be round.",
      },
    ]);
    const sources = new Map(bundle.sources.map((source) => [source.id, source]));
    expect(sources.get("aristotle-poetics-plot")?.url).toBe(
      "https://www.gutenberg.org/ebooks/1974",
    );
    expect(sources.get("forster-aspects-people")?.url).toBe(
      "https://www.gutenberg.org/ebooks/70492",
    );
    for (const id of ["aristotle-poetics-plot", "forster-aspects-people"]) {
      expect(bundle.course.sourceIds, id).toContain(id);
      expect(sources.get(id)?.licence.startsWith("Public domain"), id).toBe(true);
    }
  });

  it("gives every extract its author, its date and the kind of document it comes from", () => {
    for (const question of bundle.questions)
      for (const extract of question.extracts ?? [])
        for (const part of [extract.who, extract.when, extract.kind])
          expect(part.trim().length, question.id).toBeGreaterThan(3);
  });

  it("keeps dashes out of everything but the quotations", () => {
    for (const question of bundle.questions) {
      const text = [
        question.prompt,
        ...question.hints,
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((item) => item.feedback),
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.order?.items ?? []),
        ...(question.sort?.bins ?? []).map((bin) => bin.label),
        ...(question.sort?.items ?? []).flatMap((item) => [item.label, item.explanation ?? ""]),
        ...(question.extracts ?? []).flatMap((extract) => [
          extract.who,
          extract.when,
          extract.kind,
        ]),
      ].join(" ");
      expect(text, question.id).not.toMatch(/[—–]/u);
    }
    for (const lesson of bundle.lessons)
      for (const step of lesson.steps)
        for (const block of step.reveal ?? [])
          expect(JSON.stringify(block), `${lesson.id} ${step.id}`).not.toMatch(/[—–]/u);
    for (const card of bundle.flashcards)
      expect(`${card.front} ${card.back}`, card.id).not.toMatch(/[—–]/u);
  });

  it("keeps verdict words out of feedback", () => {
    for (const question of bundle.questions) {
      const text = [
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((item) => item.feedback),
      ].join(" ");
      expect(text, question.id).not.toMatch(
        /\b(Correct|Not quite|Great job|Well done|Incorrect)\b/u,
      );
    }
  });

  it("keeps the line shown on a right answer short", () => {
    for (const question of bundle.questions)
      expect(words(question.onCorrect ?? ""), question.id).toBeLessThanOrEqual(30);
  });

  it("marks one option right, keeps lengths from giving it away, and explains each wrong one", () => {
    const withOptions = bundle.questions.filter((question) => (question.choices?.length ?? 0) >= 3);
    let longest = 0;
    let shortest = 0;
    const places = new Set<number>();
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of others)
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
      const stops = new Set(question.choices.map((choice) => choice.label.trimEnd().endsWith(".")));
      expect(stops.size, `${question.id} mixes options with and without a full stop`).toBe(1);
      if (question.choices.length < 3) continue;
      const rightLength = right[0]?.label.length ?? 0;
      const lengths = others.map((choice) => choice.label.length);
      expect(rightLength, question.id).toBeLessThanOrEqual(Math.max(...lengths) * 1.15);
      if (rightLength > Math.max(...lengths)) longest += 1;
      if (rightLength < Math.min(...lengths)) shortest += 1;
      places.add(question.choices.indexOf(right[0] as (typeof question.choices)[number]));
    }
    expect(longest).toBeLessThanOrEqual(Math.floor(withOptions.length * 0.3));
    expect(longest).toBeGreaterThanOrEqual(Math.floor(withOptions.length * 0.1));
    expect(shortest).toBeLessThanOrEqual(Math.floor(withOptions.length * 0.4));
    expect([...places].sort()).toEqual([0, 1, 2, 3]);
  });

  it("keeps most questions multiple choice or short text, with some to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(3);
    expect(counts.sort).toBeGreaterThanOrEqual(5);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
  });

  it("writes an order question as distinct items and a sort question with every bin used", () => {
    for (const question of bundle.questions) {
      if (question.answerAuthority.kind !== "text") continue;
      const { order, sort } = question;
      if (order) {
        expect(new Set(order.items).size, question.id).toBe(order.items.length);
        expect(order.items.length, question.id).toBeGreaterThanOrEqual(4);
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([ORDER_ANSWER_IDEA]);
        expect(
          order.items.filter((item) => /^\d/u.test(item)),
          question.id,
        ).toEqual([]);
      }
      if (sort) {
        expect(new Set(sort.items.map((item) => item.label)).size, question.id).toBe(
          sort.items.length,
        );
        for (const bin of sort.bins)
          expect(
            sort.items.some((item) => item.bin === bin.id),
            `${question.id} ${bin.id}`,
          ).toBe(true);
        for (const item of sort.items) expect(item.explanation, question.id).toBeTruthy();
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([SORT_ANSWER_IDEA]);
      }
      if (order || sort) {
        expect(question.answerAuthority.exampleAnswer.length, question.id).toBeGreaterThan(40);
        expect(question.onCorrect, question.id).toBeTruthy();
      }
    }
  });

  it("sorts the ferry pilot's notes and the designer's pieces of story into groups that each hold something", () => {
    const summary = get("cregw-want-obstacle-change-final-summary-sort").sort;
    expect(summary?.bins.map((bin) => bin.id)).toEqual(["want", "obstacle", "stakes", "change"]);
    expect(summary?.items.map((item) => item.bin)).toEqual([
      "want",
      "obstacle",
      "obstacle",
      "stakes",
      "stakes",
      "change",
    ]);
    const shapes = get("cregw-branching-structures-final-shapes-sort").sort;
    expect(shapes?.bins.map((bin) => bin.id)).toEqual(["tree", "bottleneck", "hub", "gauntlet"]);
    for (const bin of shapes?.bins ?? [])
      expect(shapes?.items.filter((item) => item.bin === bin.id).length, bin.id).toBe(2);
  });

  it("asks for a term by name only where a case stands in front of it", () => {
    // The prompts that defined a term and asked for its name were replaced by decisions and
    // repairs. Two typed questions remain, and each one describes a new case without defining
    // the term that names it.
    expect(
      bundle.questions.filter((question) => kind(question) === "typed").map((q) => q.id),
    ).toEqual([
      "cregw-story-structure-final-kishotenketsu",
      "cregw-narrative-in-games-final-envstory",
    ]);
  });

  it("does not mark a typed answer right when it only repeats the prompt", () => {
    for (const question of bundle.questions) {
      if (question.choices || question.answerAuthority.kind !== "text") continue;
      if (question.order || question.sort) continue;
      expect(assessTextAnswer(question.prompt, question.answerAuthority).correct, question.id).toBe(
        false,
      );
      expect(
        assessTextAnswer(question.answerAuthority.exampleAnswer, question.answerAuthority).correct,
        question.id,
      ).toBe(true);
    }
  });

  it("accepts the likely right answers to the typed questions and refuses the likely wrong ones", () => {
    const check = (id: string, answer: string) => {
      const authority = get(id).answerAuthority;
      if (authority.kind !== "text") throw new Error(id);
      return assessTextAnswer(answer, authority).correct;
    };
    for (const answer of ["kishotenketsu", "Kishotenketsu", "kishōtenketsu", "ki-sho-ten-ketsu"])
      expect(check("cregw-story-structure-final-kishotenketsu", answer), answer).toBe(true);
    for (const answer of ["Freytag", "three acts", "the hero's journey", "ten", "I don't know"])
      expect(check("cregw-story-structure-final-kishotenketsu", answer), answer).toBe(false);
    for (const answer of ["environmental storytelling", "Environmental storytelling"])
      expect(check("cregw-narrative-in-games-final-envstory", answer), answer).toBe(true);
    for (const answer of ["embedded narrative", "a cutscene", "agency", "evoked"])
      expect(check("cregw-narrative-in-games-final-envstory", answer), answer).toBe(false);
  });

  it("gives hints that guide, with no first letters and no bare sums, and at least two for each question", () => {
    for (const question of bundle.questions) {
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
      }
    }
  });

  it("keeps the right choice of a question out of its own prompt", () => {
    for (const question of bundle.questions) {
      const right = rightChoice(question);
      if (!right) continue;
      // An ink script has to print every line it can show, so its prompt holds the right line.
      if (question.prompt.includes("VAR ")) continue;
      expect(question.prompt.includes(right.label), question.id).toBe(false);
    }
  });

  it("keeps the course's sources, lessons and cards pointing at records that exist", () => {
    const sources = new Set(bundle.sources.map((source) => source.id));
    for (const id of bundle.course.sourceIds) expect(sources.has(id), id).toBe(true);
    for (const question of bundle.questions)
      for (const id of question.sourceIds) expect(sources.has(id), question.id).toBe(true);
    for (const lesson of bundle.lessons)
      for (const id of lesson.sourceIds) expect(sources.has(id), lesson.id).toBe(true);
    for (const card of bundle.flashcards)
      for (const id of card.sourceIds) expect(sources.has(id), card.id).toBe(true);
  });
});
