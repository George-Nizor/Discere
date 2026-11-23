import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * The Roman Republic asks most of its questions about a quoted passage from a public-domain translation,
 * and every number in it can be recomputed. This file checks the shape of the questions, the length of
 * the right options, the quoted extracts against passages copied from the source pack, and the figures
 * behind each judgement question that used to ask for a number.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/roman-republic/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
const passages = JSON.parse(
  readFileSync(new URL("./fixtures/roman-republic-passages.json", import.meta.url), "utf8"),
) as { files: Record<string, string[]> };
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const kind = (question: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  question.responseType === "numeric"
    ? "numeric"
    : question.responseType === "order" || question.responseType === "sort"
      ? question.responseType
      : question.choices
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
  (question) =>
    question.choices &&
    question.choices.length >= 3 &&
    question.answerAuthority.kind === "text" &&
    !question.order &&
    !question.sort,
);
const rightOption = (question: Question) => {
  const authority = question.answerAuthority;
  if (authority.kind !== "text") throw new Error(question.id);
  const right = (question.choices ?? []).filter(
    (choice) => assessTextAnswer(choice.label, authority).correct,
  );
  expect(right, question.id).toHaveLength(1);
  return right[0] as NonNullable<Question["choices"]>[number];
};
const squash = (text: string) =>
  text.replace(/[‘’]/gu, "'").replace(/[“”]/gu, '"').replace(/\s+/gu, " ").trim();

describe("questions in The Roman Republic", () => {
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
    expect(bundle.questions.filter((question) => !asked.has(question.id)).map((q) => q.id)).toEqual(
      [],
    );
    const cards = bundle.lessons.flatMap((lesson) => lesson.flashcardIds);
    expect(new Set(cards).size).toBe(cards.length);
    expect(
      bundle.flashcards.filter((card) => !cards.includes(card.id)).map((card) => card.id),
    ).toEqual([]);
    const ids = [...bundle.questions.map((q) => q.id), ...bundle.flashcards.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not repeat a flashcard front across lessons", () => {
    const fronts = bundle.flashcards.map((card) => card.front.toLowerCase());
    expect(new Set(fronts).size).toBe(fronts.length);
  });

  it("ends each lesson with three checks of at least two types", () => {
    // The one lesson that ends on three choices: its typed question used to ask for the lesson's own
    // phrase "chain of testimony", and is now a choice about what tracing a claim back shows.
    const threeChoices = new Set(["the-gracchi-in-plutarch"]);
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      if (threeChoices.has(lesson.id)) expect(types, lesson.id).toEqual(["choice", "choice", "choice"]);
      else expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps the right option the longest in at most 30 percent of choice questions, and never far longer", () => {
    let longest = 0;
    let shortest = 0;
    for (const question of choiceQuestions) {
      const right = rightOption(question).label.length;
      const rightId = rightOption(question).id;
      const others = (question.choices ?? [])
        .filter((choice) => choice.id !== rightId)
        .map((choice) => choice.label.length);
      if (right > Math.max(...others)) longest += 1;
      if (right < Math.min(...others)) shortest += 1;
      expect(right, question.id).toBeLessThanOrEqual(Math.max(...others) * 1.15);
    }
    expect(longest / choiceQuestions.length).toBeLessThanOrEqual(0.3);
    expect(shortest / choiceQuestions.length).toBeLessThanOrEqual(0.4);
  });

  it("explains every wrong option and gives two hints to every question that is not numeric", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
      }
      if (kind(question) !== "numeric") expect(question.hints.length, question.id).toBe(2);
      else expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const right = rightOption(question);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of question.choices.filter((item) => item.id !== right.id))
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
    }
  });

  it("keeps dashes and verdict words out of the course text, apart from quoted extracts", () => {
    const withoutExtracts = JSON.stringify(
      { course: bundle.course, lessons: bundle.lessons, flashcards: bundle.flashcards },
      (_key, value) => value,
    );
    expect(withoutExtracts).not.toMatch(/[—–]/u);
    for (const question of bundle.questions) {
      const { extracts: _extracts, ...rest } = question;
      const text = JSON.stringify(rest);
      expect(text, question.id).not.toMatch(/[—–]/u);
      expect(text, question.id).not.toMatch(/\b(Correct|Not quite|Great job)\b/u);
    }
  });

  it("finds every quoted extract word for word in a passage copied from the source pack", () => {
    const pool = Object.values(passages.files).flat().map(squash);
    let checked = 0;
    for (const question of bundle.questions) {
      for (const extract of question.extracts ?? []) {
        checked += 1;
        expect(
          pool.some((passage) => passage.includes(squash(extract.text))),
          question.id,
        ).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("cites a verified public-domain source for every quoted extract", () => {
    const sources = new Map(bundle.sources.map((source) => [source.id, source]));
    for (const question of bundle.questions) {
      if (!question.extracts?.length) continue;
      const usable = (question.sourceIds ?? []).filter((id) => {
        const source = sources.get(id);
        return (
          source !== undefined &&
          /^public domain/iu.test(source.licence) &&
          source.checked?.status === "verified"
        );
      });
      expect(usable.length, question.id).toBeGreaterThan(0);
    }
  });

  it("states that the Cannae count of Livy's dead is the figure in this translation", () => {
    const text = JSON.stringify(
      bundle.lessons.find((lesson) => lesson.id === "hannibal-and-the-numbers"),
    );
    expect(text).toMatch(/in this translation/iu);
    for (const id of ["romr-hannibal-and-the-numbers-total", "romr-hannibal-and-the-numbers-hedge"])
      expect(questions.get(id)?.prompt, id).toMatch(/in this translation/iu);
  });

  it("asks no numeric question, and the figures behind each judgement hold", () => {
    expect(bundle.questions.filter((question) => kind(question) === "numeric")).toEqual([]);
    /**
     * The 14 questions that used to ask for a number now ask for a judgement. Each entry names the right
     * option, checks the figures that make it right and the figures each wrong option comes from, and lists
     * what the prompt must still carry.
     */
    const judged: Record<string, { right: string; holds: () => boolean; uses: string[] }> = {
      "what-livy-knew-kings-years": {
        right: "About 250 years",
        // 753 - 509 = 244; adding the dates gives 1,262; reading 753 as a length gives about 750.
        holds: () => 753 - 509 === 244 && 753 + 509 === 1262,
        uses: ["753 BCE", "509 BCE"],
      },
      "what-livy-knew-first-four": {
        right: "About 140 years",
        // The last three reigns add to 103; 244 - 103 = 141; adding them instead gives 347.
        holds: () => 38 + 40 + 25 === 103 && 244 - 103 === 141 && 244 + 103 === 347,
        uses: ["38, 40 and 25", "244"],
      },
      "the-constitution-from-outside-years": {
        right: "It fits, since the plan spans about fifty years",
        // 220 - 168 = 52, under fifty-three; adding the year numbers gives 388; counting both ends gives 53.
        holds: () => 220 - 168 === 52 && 220 - 168 < 53 && 220 + 168 === 388,
        uses: ["220 BCE", "168 BCE"],
      },
      "orders-and-the-twelve-tables-eighty": {
        right: "About eighty years, so the Struggle was slow",
        // 367 - 287 = 80; adding the years gives 654.
        holds: () => 367 - 287 === 80 && 367 + 287 === 654,
        uses: ["367 BCE", "287 BCE"],
      },
      "rome-and-italy-four-legions": {
        right: "About 18,000 men, the citizens' levy only",
        // One legion holds 4,500; four hold 18,000.
        holds: () => 4200 + 300 === 4500 && 4 * (4200 + 300) === 18000,
        uses: ["4,200", "300"],
      },
      "why-the-second-punic-war-began-gap": {
        right: "About two decades",
        // 241 - 218 = 23; from the start of the First war it is 264 - 218 = 46; adding gives 459.
        holds: () => 241 - 218 === 23 && 264 - 218 === 46 && 241 + 218 === 459,
        uses: ["241 BCE", "218 BCE"],
      },
      "hannibal-and-the-numbers-total": {
        right: "About 43,000, the foot and horse together",
        // 40,000 + 2,700 = 42,700; counting the allies again would give 85,400.
        holds: () => 40000 + 2700 === 42700 && 2 * 42700 === 85400,
        uses: [],
      },
      "what-empire-did-to-rome-gap": {
        right: "About a generation",
        // 146 - 112 = 34; adding the dates gives 258.
        holds: () => 146 - 112 === 34 && 146 + 112 === 258,
        uses: ["146 BCE", "112 BCE"],
      },
      "the-gracchi-in-plutarch-gap": {
        right: "No, since Gaius died about a dozen years after the law",
        // 133 - 121 = 12, under thirty; adding the dates gives 254.
        holds: () => 133 - 121 === 12 && 133 - 121 < 30 && 133 + 121 === 254,
        uses: ["133 BCE", "121 BCE"],
      },
      "marius-sulla-and-their-armies-whole-list": {
        right: "About 520, the third list as large as the second",
        // 80 + 220 = 300; with "as many" read as 220 the total is 520; read as 80 it is 380.
        holds: () => 80 + 220 === 300 && 80 + 220 + 220 === 520 && 80 + 220 + 80 === 380,
        uses: ["as many"],
      },
      "catiline-cicero-and-the-triumvirate-the-gap": {
        right: "About a decade passed, so the claim needs more than the two dates",
        // 60 - 49 = 11; adding the year numbers gives 109.
        holds: () => 60 - 49 === 11 && 60 + 49 === 109,
        uses: ["60 BCE", "49 BCE"],
      },
      "caesar-in-his-own-words-not-at-home": {
        right: "About seven in ten, the share missing from the count",
        // 368,000 - 110,000 = 258,000, which is 70 per cent; 110,000 is 30 per cent; 92,000 is 25 per cent.
        holds: () =>
          368000 - 110000 === 258000 &&
          Math.abs(258000 / 368000 - 0.7) < 0.01 &&
          Math.abs(110000 / 368000 - 0.3) < 0.01 &&
          92000 / 368000 === 0.25,
        uses: ["368,000"],
      },
      "augustus-and-the-res-gestae-tribunician-power": {
        right: "Yes, since 14 CE is the thirty-seventh year counted from 23 BCE",
        // There is no year 0, so 36 years passed and counting 23 BCE as year one makes 14 CE year 37.
        holds: () => 23 + 14 - 1 === 36 && 23 + 14 === 37 && 23 - 14 === 9,
        uses: ["23 BCE", "14 CE"],
      },
    };
    for (const [key, entry] of Object.entries(judged)) {
      const question = questions.get(`romr-${key}`) as Question;
      expect(kind(question), key).toBe("choice");
      expect(rightOption(question).label, key).toBe(entry.right);
      expect(entry.holds(), key).toBe(true);
      for (const figure of entry.uses) expect(question.prompt, key).toContain(figure);
    }
    // The levy question is an order question: one legion, four legions, the danger levy, and the allies on top.
    const levy = questions.get("romr-rome-and-italy-end-danger") as Question;
    expect(kind(levy)).toBe("order");
    expect(levy.order?.items).toEqual([
      "One legion at ordinary strength",
      "Four legions at ordinary strength",
      "Four legions in a time of special danger",
      "Four legions in a time of special danger, with the allied troops added",
    ]);
    expect(4200 + 300 < 4 * (4200 + 300) && 4 * (4200 + 300) < 4 * (5000 + 300)).toBe(true);
    expect(4 * (5000 + 300) - 4 * (4200 + 300)).toBe(3200);
  });
});
