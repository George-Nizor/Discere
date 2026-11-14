import { assessTextAnswer } from "@discere/assessment-engine";
import { describe, expect, it } from "vitest";
import { unchangedChecks, unchangedKeys } from "./helpers/unchanged-keys.js";

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

const lessons = unchangedKeys("english-reading-writing-and-rhetoric", "lang");
const keyedChecks = unchangedChecks("english-reading-writing-and-rhetoric");

// The tables describe the course as first published. A key is checked here while the live bundle
// still holds it; a question rewritten since is recomputed by english-reading-writing-and-rhetoric-v2.test.ts.
describe("independent English content review", () => {
  it.each(lessons)(
    "recomputes the numerical answers still keyed as first published in $id",
    (lesson) => {
      const values = expected[lesson.id]!;
      expect(values).toHaveLength(6);
      lesson.questions.forEach((q, i) => {
        if (!q) return;
        if (q.answerAuthority.kind === "numeric") {
          expect(values[i]).not.toBeNull();
          expect(q.answerAuthority.value).toBe(values[i]);
        } else expect(values[i]).toBeNull();
      });
    },
  );
  it("rejects the likeliest confusions in written answers", () => {
    const find = (id: string, n: number) => {
      const a = lessons.find((l) => l.id === id)!.questions[n - 1]?.answerAuthority;
      // A question rewritten since first publication is marked by the v2 test instead.
      if (!a) return undefined;
      if (a.kind !== "text") throw Error("Expected a written answer");
      return a;
    };
    const rejects = (id: string, n: number, answer: string) => {
      const a = find(id, n);
      if (a) expect(assessTextAnswer(answer, a).correct).toBe(false);
    };
    rejects("sound-and-image", 3, "metaphor");
    rejects("point-of-view", 1, "first person");
    rejects("figures-of-speech", 3, "anaphora");
    rejects("appeals-and-occasion", 1, "logos");
    rejects("joining-clauses", 4, "and");
    rejects("irony-and-reliability", 3, "dramatic irony");
  });
  it.each(lessons)("checks the recall keys still keyed as first published in $id", (lesson) => {
    lesson.cards.forEach((card, i) => {
      if (!card) return;
      const value = recall[lesson.id]![i];
      if (card.answerAuthority.kind === "numeric") expect(card.answerAuthority.value).toBe(value);
      else {
        expect(value).toBeNull();
        expect(
          assessTextAnswer(card.answerAuthority.acceptedIdeas[0]!, card.answerAuthority).correct,
        ).toBe(true);
      }
    });
  });
  it.each(keyedChecks)(
    "recomputes the fresh problems still keyed as first published in $id",
    (check) => {
      check.items.forEach((item, i) => {
        if (!item) return;
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
    },
  );
});
