import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assessTextAnswer } from "@discere/assessment-engine";
import { LanguageDiagramSchema } from "@discere/contracts";
import { loadCourseBundle, assertEditorialApproval, validateCourseBundle } from "../src/index.js";
import { languageLessons } from "../../../content/english-reading-writing-and-rhetoric/authoring/lessons.js";
import { languageChecks } from "../../../content/english-reading-writing-and-rhetoric/authoring/course-checks.js";
import { historicalBundle } from "./helpers/published-history.js";
import { CourseBundleSchema } from "@discere/contracts";

/*
 * Every numeric key is recomputed here from the text or the stated rule, without the activity
 * engine. Word counts use this file's own counter; syllables are listed by hand.
 */
const words = (s: string) => s.split(/\s+/u).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
const turns = (pairs: string[]) => pairs.filter((p) => p[0] !== p[1]).length;
const highest = (heights: number[]) => heights.indexOf(Math.max(...heights)) + 1;
const scheme = (letters: string) => new Set(letters).size;
const summersDay = ["shall", "I", "com", "pare", "thee", "to", "a", "sum", "mer's", "day"];
const shaken = ["that", "looks", "on", "tem", "pests", "and", "is", "ne", "ver", "sha", "ken"];
const perches = ["that", "per", "ches", "in", "the", "soul"];
const waite = ["they", "al", "so", "serve", "who", "on", "ly", "stand", "and", "waite"];
const mists = ["sea", "son", "of", "mists", "and", "mel", "low", "fruit", "ful", "ness"];
const question = ["to", "be", "or", "not", "to", "be", "that", "is", "the", "ques", "tion"];
const romeoScenePairs = ["-+", "++", "++", "+-", "+-", "-+", "+-", "--"];
const antonyLines = [
  "For Brutus is an honourable man,",
  "So are they all, all honourable men,",
  "But Brutus says he was ambitious,",
  "And Brutus is an honourable man.",
  "Yet Brutus says he was ambitious;",
  "And Brutus is an honourable man.",
  "Yet Brutus says he was ambitious;",
  "And sure he is an honourable man.",
].join(" ");

const expected: Record<string, Array<number | null>> = {
  "clause-anatomy": [null, null, null, ["is", "alters", "finds"].length, 2, null],
  "joining-clauses": [null, null, null, null, null, 3],
  "actors-and-actions": [
    words("The committee rejected the motion."),
    null,
    words("The committee made a decision to conduct a review of the policy.") -
      words("The committee decided to review the policy."),
    words(
      "In my personal opinion, it is basically true that the final outcome depends on the weather.",
    ) -
      words("In my opinion, it is true that") -
      ["personal", "basically", "final"].length,
    words("The budget was approved by the council in March.") -
      words("The council approved the budget in March."),
    null,
  ],
  "claim-grounds-warrant": [
    null,
    null,
    null,
    ["grounds", "warrant", "claim", "rebuttal"].indexOf("warrant") + 1,
    ["claim", "grounds", "warrant", "rebuttal"].indexOf("grounds") + 1,
    null,
  ],
  "appeals-and-occasion": [null, null, 1863 - (4 * 20 + 7), null, null, null],
  "figures-of-speech": [
    "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness".match(
      /\bit was\b/giu,
    )!.length,
    null,
    null,
    null,
    null,
    null,
  ],
  "metre-and-scansion": [
    summersDay.length,
    [2, 4, 6, 8, 10][2]!,
    shaken.length,
    null,
    perches.length,
    null,
  ],
  "sound-and-image": [
    "When to the sessions of sweet silent thought".split(" ").filter((w) => /^s/u.test(w)).length,
    ["bride", "quietness"].length,
    null,
    null,
    null,
    null,
  ],
  "sonnet-and-volta": [
    scheme("ABABCDCDEFEFGG"),
    scheme("ABBAABBA"),
    4 + 4 + 1,
    4 * 3 + 1,
    null,
    null,
  ],
  "point-of-view": [null, null, null, 3, null, null],
  "irony-and-reliability": [
    antonyLines.match(/an honourable man/gu)!.length,
    null,
    null,
    null,
    null,
    null,
  ],
  "structure-and-scenes": [
    3,
    null,
    turns(romeoScenePairs),
    highest([2, 4, 7, 10, 6, 3]),
    null,
    null,
  ],
};
const recall: Record<string, Array<number | null>> = {
  "clause-anatomy": [null, ["consider", "is spent", "ask"].length],
  "joining-clauses": [null, null],
  "actors-and-actions": [
    words("We had a discussion about the budget") - words("We discussed the budget"),
    null,
  ],
  "claim-grounds-warrant": [null, null],
  "appeals-and-occasion": [4 * 20 + 7, null],
  "figures-of-speech": [null, null],
  "metre-and-scansion": [waite.length, null],
  "sound-and-image": [
    "Season of mists and mellow fruitfulness".split(" ").filter((w) => /^m/u.test(w)).length,
    null,
  ],
  "sonnet-and-volta": [14 - 8, null],
  "point-of-view": [null, null],
  "irony-and-reliability": [null, null],
  "structure-and-scenes": [turns(["++", "+-", "--", "-+", "++"]), null],
};
const checkValues: Record<string, Array<number | null>> = {
  "starting-point": [
    ["wandered", "floats"].length,
    null,
    words("Two reviewers checked the results."),
    null,
    (1856 - 1776) / 20,
    null,
    mists.length,
    null,
    [..."ABBAABBA"].filter((c) => c === "A").length,
    null,
    null,
    turns(["+-", "--", "-+", "++", "+-"]),
  ],
  "mixed-challenge": [
    null,
    3,
    words("The team carried out an analysis of the data") - words("The team analysed the data"),
    ["rebuttal", "claim", "grounds", "warrant"].indexOf("claim") + 1,
    null,
    "To him, your celebration is a sham; your boasted liberty, an unholy license; your national greatness, swelling vanity; your sounds of rejoicing are empty and heartless".match(
      /(?:^|; |, )your\b/gu,
    )!.length,
    question.length,
    "And with old woes new wail my dear time's waste".split(" ").filter((w) => /^w/u.test(w))
      .length,
    "ABABCDCDEFEFGG".indexOf("G") + 1,
    null,
    null,
    highest([3, 5, 9, 6, 4, 2]),
  ],
  "later-applications": [
    null,
    null,
    words("The board took the decision."),
    null,
    null,
    null,
    ["DOU", "DOU", "TOIL", "TROU"].length,
    null,
    3 * 4,
    3,
    null,
    null,
  ],
};

describe("independent English content review", () => {
  it("ships the reviewed candidate, exact cover and independently checked authoring", async () => {
    const root = path.resolve(
      import.meta.dirname,
      "../../../content/english-reading-writing-and-rhetoric",
    );
    // The authoring source describes the lessons as first published. A course rewritten to v2
    // keeps that bundle in review/history (helpers/published-history.ts); approval is on the current one.
    const current = await loadCourseBundle(path.join(root, "bundle.json"));
    const bundle = CourseBundleSchema.parse(historicalBundle("english-reading-writing-and-rhetoric"));
    const review = JSON.parse(await readFile(path.join(root, "review/publication.json"), "utf8"));
    expect(() =>
      assertEditorialApproval(current, review, validateCourseBundle(current)),
    ).not.toThrow();
    for (const lesson of languageLessons) {
      lesson.questions.forEach((q, i) =>
        expect(
          bundle.questions.find((item) => item.id === "lang-" + lesson.id + "-" + (i + 1)),
        ).toMatchObject(q),
      );
      lesson.cards.forEach((c, i) =>
        expect(
          bundle.flashcards.find((item) => item.id === "lang-" + lesson.id + "-card-" + (i + 1)),
        ).toMatchObject(c),
      );
      const shipped = bundle.lessons.find((item) => item.id === lesson.id)!;
      expect(shipped.steps.map((s) => s.diagram)).toEqual(lesson.beats.map((b) => b.diagram));
    }
    expect(bundle.courseChecks).toEqual(languageChecks);
    const choices = bundle.questions.filter((q) => q.choices?.length).length;
    expect(choices / bundle.questions.length).toBeLessThanOrEqual(0.25);
  });
  it.each(languageLessons)("recomputes the numerical answers in $id", (lesson) => {
    expect(lesson.questions).toHaveLength(6);
    const values = expected[lesson.id]!;
    expect(values).toHaveLength(6);
    lesson.questions.forEach((q, i) => {
      if (q.answerAuthority.kind === "numeric") {
        expect(values[i]).not.toBeNull();
        expect(q.answerAuthority.value).toBe(values[i]);
        expect(q.hints).toHaveLength(3);
      } else expect(values[i]).toBeNull();
    });
  });
  it.each(languageLessons)("marks the written answers in $id as intended", (lesson) => {
    for (const q of lesson.questions) {
      const a = q.answerAuthority;
      if (a.kind !== "text") continue;
      if (q.choices) {
        // Exactly one option is accepted.
        expect(q.choices.filter((c) => assessTextAnswer(c.label, a).correct)).toHaveLength(1);
        continue;
      }
      expect(assessTextAnswer(a.acceptedIdeas[0]!, a).correct).toBe(true);
      expect(assessTextAnswer(a.exampleAnswer, a).correct).toBe(true);
      for (const alternative of a.acceptedAlternatives ?? [])
        expect(assessTextAnswer(alternative, a).correct).toBe(true);
      expect(assessTextAnswer("I am not sure", a).correct).toBe(false);
    }
  });
  it("rejects the likeliest confusions in written answers", () => {
    const find = (id: string, n: number) => {
      const a = languageLessons.find((l) => l.id === id)!.questions[n - 1]!.answerAuthority;
      if (a.kind !== "text") throw Error("Expected a written answer");
      return a;
    };
    expect(assessTextAnswer("metaphor", find("sound-and-image", 3)).correct).toBe(false);
    expect(assessTextAnswer("first person", find("point-of-view", 1)).correct).toBe(false);
    expect(assessTextAnswer("anaphora", find("figures-of-speech", 3)).correct).toBe(false);
    expect(assessTextAnswer("logos", find("appeals-and-occasion", 1)).correct).toBe(false);
    expect(assessTextAnswer("and", find("joining-clauses", 4)).correct).toBe(false);
    expect(assessTextAnswer("dramatic irony", find("irony-and-reliability", 3)).correct).toBe(
      false,
    );
  });
  it.each(languageLessons)("checks both fresh recall keys and all diagrams in $id", (lesson) => {
    expect(lesson.cards).toHaveLength(2);
    expect(lesson.beats).toHaveLength(4);
    lesson.cards.forEach((card, i) => {
      const value = recall[lesson.id]![i];
      if (card.answerAuthority.kind === "numeric") expect(card.answerAuthority.value).toBe(value);
      else {
        expect(value).toBeNull();
        expect(
          assessTextAnswer(card.answerAuthority.acceptedIdeas[0]!, card.answerAuthority).correct,
        ).toBe(true);
      }
      expect(lesson.questions.some((q) => q.prompt === card.front)).toBe(false);
    });
    for (const beat of lesson.beats)
      expect(LanguageDiagramSchema.safeParse(beat.diagram).success).toBe(true);
  });
  it.each(languageChecks)("recomputes every fresh problem in $id", (check) => {
    expect(check.items).toHaveLength(12);
    expect(new Set(check.items.map((i) => i.lessonId)).size).toBe(12);
    check.items.forEach((item, i) => {
      const a = item.question.answerAuthority;
      const value = checkValues[check.id]![i];
      if (a.kind === "numeric") expect(a.value).toBe(value);
      else {
        expect(value).toBeNull();
        expect(
          item.question.choices!.filter((c) => assessTextAnswer(c.label, a).correct),
        ).toHaveLength(1);
      }
    });
  });
  it("keeps independent checks distinct from teaching and requires a delayed final application", () => {
    const prompts = [
      ...languageLessons.flatMap((l) => l.questions.map((q) => q.prompt)),
      ...languageChecks.flatMap((c) => c.items.map((i) => i.question.prompt)),
    ];
    expect(new Set(prompts).size).toBe(prompts.length);
    expect(languageChecks[0]!.requiredLessonIds).toEqual([]);
    for (const c of languageChecks.slice(1)) expect(c.requiredLessonIds).toHaveLength(12);
    expect(languageChecks[2]).toMatchObject({ afterCheckId: "mixed-challenge", delayDays: 7 });
  });
});
