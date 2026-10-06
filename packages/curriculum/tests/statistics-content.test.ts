import { describe, expect, it } from "vitest";
import { probabilityLessons } from "../../../content/probability-statistics/authoring/probability-lessons.js";
import { statisticsLessons } from "../../../content/probability-statistics/authoring/statistics-lessons.js";

const definitions = [...probabilityLessons, ...statisticsLessons];
// An independent finite sample space verifies the authored marking keys; it does not call
// the UI's outcome-grid implementation.
const pairs = (sides: number) =>
  Array.from(
    { length: sides * sides },
    (_, n) => [Math.floor(n / sides) + 1, (n % sides) + 1] as const,
  );
const chance = (
  sides: number,
  event: (a: number, b: number) => boolean,
  given: (a: number, b: number) => boolean = () => true,
) => {
  const eligible = pairs(sides).filter(([a, b]) => given(a, b));
  return eligible.filter(([a, b]) => event(a, b)).length / eligible.length;
};
const average = (values: number[]) => values.reduce((sum, n) => sum + n, 0) / values.length;
const middle = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return (
    (sorted[Math.floor((sorted.length - 1) / 2)]! + sorted[Math.floor(sorted.length / 2)]!) / 2
  );
};
const width = (values: number[]) => Math.max(...values) - Math.min(...values);
const variance = (values: number[]) => average(values.map((n) => (n - average(values)) ** 2));
const checks: Record<string, Record<number, number>> = {
  "counting-outcomes": {
    1: pairs(6).length,
    3: chance(6, (a, b) => a + b >= 10),
    4: chance(6, (a, b) => a + b < 10),
    5: chance(4, (a, b) => a + b === 5),
  },
  "when-the-condition-changes": {
    1: pairs(6).filter(([a]) => a <= 2).length,
    2: chance(
      6,
      (_, b) => b <= 3,
      (a) => a <= 2,
    ),
    3: chance(
      6,
      (a, b) => a + b >= 7,
      (a) => a <= 2,
    ),
    4: chance(
      6,
      (a, b) => a + b === 7,
      (a) => a === 1,
    ),
    5: chance(
      6,
      (a, b) => a + b >= 5,
      (a) => a === 1,
    ),
  },
  "independent-repetitions": {
    1: chance(6, (a, b) => a <= 3 && b <= 3),
    2: chance(6, (a, b) => a <= 2 && b <= 2),
    4: chance(6, (a, b) => a > 3 || b > 3),
    5: chance(2, (a, b) => a === 1 && b === 1),
  },
  "centre-and-outliers": {
    2: average([2, 4, 4, 5, 5]),
    3: middle([2, 4, 4, 5, 25]),
    4: middle([2, 4, 6, 10]),
    5: average([1, 3, 3, 5, 18]),
  },
  "same-centre-different-spread": {
    2: width([2, 2, 6, 6]),
    3: Math.sqrt(variance([2, 2, 6, 6])),
    4: variance([0, 0, 8, 8]),
    5: width([3, 4, 4, 7, 13]),
  },
  "samples-and-populations": {
    1: Array(6).fill(2).concat(Array(6).fill(8)).length,
    2: average(Array(6).fill(2).concat(Array(6).fill(8))),
    4: average(Array(6).fill(4).concat(Array(6).fill(10))),
  },
};
const cardChecks: Record<string, number> = {
  "counting-outcomes": chance(6, (a, b) => a + b === 3),
  "when-the-condition-changes": chance(
    6,
    (a, b) => a + b === 4,
    (a) => a === 1,
  ),
  "independent-repetitions": chance(6, (a, b) => a === 6 && b === 6),
  "centre-and-outliers": middle([2, 7, 8, 15]),
  "same-centre-different-spread": width([1, 2, 7, 11]),
  "samples-and-populations": average(Array(4).fill(3).concat(Array(4).fill(9))),
};

describe("independent review of statistics teaching cases", () => {
  it.each(definitions)("recomputes every numeric question in $id", (lesson) => {
    const numeric = lesson.questions.flatMap((question, index) =>
      question.answerAuthority.kind === "numeric" ? [index + 1] : [],
    );
    expect(Object.keys(checks[lesson.id]!).map(Number)).toEqual(numeric);
    for (const index of numeric) {
      const authority = lesson.questions[index - 1]!.answerAuthority;
      if (authority.kind !== "numeric") throw new Error("Missing numeric authority");
      expect(authority.value).toBeCloseTo(checks[lesson.id]![index]!, 12);
      const probabilityQuestions: Record<string, number[]> = {
        "counting-outcomes": [3, 4, 5],
        "when-the-condition-changes": [2, 3, 4, 5],
        "independent-repetitions": [1, 2, 4, 5],
      };
      expect(authority.unit).toBe(
        probabilityQuestions[lesson.id]?.includes(index) ? "probability" : "",
      );
    }
  });
  it.each(definitions)("recomputes the standalone numeric recall card in $id", (lesson) => {
    const numeric = lesson.cards.filter((card) => card.answerAuthority.kind === "numeric");
    expect(numeric).toHaveLength(1);
    const authority = numeric[0]!.answerAuthority;
    if (authority.kind === "numeric")
      expect(authority.value).toBeCloseTo(cardChecks[lesson.id]!, 12);
  });
  it("gives each choice question exactly one accepted label", () => {
    for (const lesson of definitions)
      for (const question of lesson.questions) {
        if (!question.choices) continue;
        const authority = question.answerAuthority;
        if (authority.kind !== "text") throw new Error("Choice uses text authority");
        expect(
          question.choices.filter((choice) => authority.acceptedIdeas.includes(choice.label)),
        ).toHaveLength(1);
        expect(new Set(question.choices.map((choice) => choice.label)).size).toBe(
          question.choices.length,
        );
      }
  });
});
