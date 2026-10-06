import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { describe, it, expect } from "vitest";
import { CourseBundleSchema, type CourseCheckDefinition } from "@discere/contracts";
import { validateCourseBundle } from "../src/validate.js";
import { bundleDigest } from "../src/index.js";
import { logicCourseChecks } from "../../../content/logic-and-reasoning/authoring/course-checks.js";
import { csCourseChecks } from "../../../content/cs-basics/authoring/course-checks.js";
import { statisticsCourseChecks } from "../../../content/probability-statistics/authoring/course-checks.js";
import { restorePreGuidanceBundle } from "./helpers/guidance-history.js";
const definitions = {
  "logic-and-reasoning": logicCourseChecks,
  "cs-basics": csCourseChecks,
  "probability-statistics": statisticsCourseChecks,
};
const read = (id: string, file = "bundle.json") =>
  JSON.parse(readFileSync(new URL("../../../content/" + id + "/" + file, import.meta.url), "utf8"));
const items = (sets: CourseCheckDefinition[]) => sets.flatMap((c) => c.items);
const numbers = (sets: CourseCheckDefinition[]) =>
  items(sets).filter((i) => i.question.answerAuthority.kind === "numeric");
const rows = [false, true].flatMap((p) => [false, true].map((q) => ({ p, q })));
const mean = (vs: number[]) => vs.reduce((a, b) => a + b, 0) / vs.length;
const variance = (vs: number[]) => mean(vs.map((v) => (v - mean(vs)) ** 2));
const median = (vs: number[]) => {
  const s = vs.toSorted((a, b) => a - b),
    n = s.length;
  return (s[Math.floor((n - 1) / 2)]! + s[Math.floor(n / 2)]!) / 2;
};
const pairs = (a: number[], b: number[]) => a.flatMap((x) => b.map((y) => [x, y] as const));
const probability = (
  pairs: ReadonlyArray<readonly [number, number]>,
  event: (a: number, b: number) => boolean,
) => pairs.filter(([a, b]) => event(a, b)).length / pairs.length;
const linear = (values: number[], target: number) => {
  const index = values.indexOf(target);
  return index < 0 ? values.length : index + 1;
};
function binary(values: number[], target: number): number {
  if (!values.length) return 0;
  const middle = Math.floor((values.length - 1) / 2),
    v = values[middle]!;
  return (
    1 +
    (v === target
      ? 0
      : binary(v < target ? values.slice(middle + 1) : values.slice(0, middle), target))
  );
}
const worst = (length: number) => {
  const values = Array.from({ length }, (_, i) => i * 2);
  return Math.max(...Array.from({ length: length * 2 + 1 }, (_, i) => binary(values, i - 1)));
};
function python(code: string, result: string) {
  return Number(
    execFileSync("python3", ["-I", "-c", code + "\nprint(" + result + ")"], {
      encoding: "utf8",
      timeout: 2000,
    }),
  );
}
function codeAt(set: number, item: number): string {
  const v = csCourseChecks[set]!.items[item]!.visual;
  if (v.type !== "program") throw Error("Expected program");
  return v.code;
}
const logicNumeric = [
  rows.filter(({ p, q }) => (p || q) && !p).length,
  rows.filter(({ p, q }) => !(p && q)).length,
  rows.filter(({ p, q }) => p === !q && q === !p).length,
  rows.filter(({ p, q }) => p && (q || !q)).length,
];
const csNumeric = [
  python(codeAt(0, 0), "x"),
  python(codeAt(0, 1), "x"),
  python(codeAt(0, 2), "x"),
  linear([14, 6, 2, 19, 8, 11], 8),
  binary([2, 5, 9, 14, 18, 24, 31, 40], 31),
  worst(63),
  python(
    "checks = 0\ndef test(value):\n    global checks\n    checks += 1\n    return value > 2\n" +
      codeAt(1, 0).replace("while x > 2:", "while test(x):"),
    "checks",
  ),
  python(codeAt(1, 1), "x"),
  linear([4, 17, 3, 12, 21, 7], 9),
  binary([1, 4, 7, 10, 13, 16, 19, 22, 25, 28], 20),
  python(codeAt(2, 0), "slots"),
  linear([31, 8, 4, 16, 2, 49, 10, 7, 23, 9, 12, 35, 6], 23),
  python(codeAt(2, 2), "charge"),
  worst(256),
  python(codeAt(2, 4), "orders"),
];
const statsNumeric = [
  probability(pairs([1, 2, 3], [1, 2, 3, 4]), (a, b) => a + b === 5),
  9 / (9 + 11),
  probability(pairs([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]), (a, b) => a <= 4 && b <= 3),
  median([5, 11, 4, 8, 7]),
  variance([3, 3, 9, 9]),
  probability(pairs([1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]), (a, b) => a + b === 9 || a + b === 10),
  mean([2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 6]),
  3 / (3 + 1),
  variance([2, 4, 4, 6]),
  probability(pairs([1, 2, 3], [1, 2, 3, 4, 5]), (a, b) => a === 2 || b === 5),
  Math.sqrt(variance([7, 7, 13, 13])),
  probability(pairs([1, 2, 3, 4], [1, 2, 3, 4]), (a, b) => a === 1 || b === 1),
  median([3, 4, 5, 6, 7, 41]),
  1 / (2 + 1),
];
describe("Independent foundation course checks", () => {
  for (const [id, sets] of Object.entries(definitions)) {
    it(
      id + " covers every taught lesson in three fresh sets without replacing lesson content",
      () => {
        const base = CourseBundleSchema.parse(read(id)),
          candidate = CourseBundleSchema.parse({ ...base, courseChecks: sets });
        expect(validateCourseBundle(candidate).passed).toBe(true);
        const lessonIds = base.lessons.map((l) => l.id);
        for (const check of sets) {
          expect(check.items.map((i) => i.lessonId).toSorted()).toEqual(lessonIds.toSorted());
          expect(check.requiredLessonIds).toEqual(check.kind === "placement" ? [] : lessonIds);
          for (const item of check.items) {
            const lesson = base.lessons.find((l) => l.id === item.lessonId)!;
            expect(item.question.conceptIds.every((c) => lesson.conceptIds.includes(c))).toBe(true);
            expect(
              item.question.sourceIds.every((s) => base.sources.some((source) => source.id === s)),
            ).toBe(true);
            expect(base.questions.some((q) => q.prompt === item.question.prompt)).toBe(false);
            expect(base.flashcards.some((c) => c.front === item.question.prompt)).toBe(false);
          }
        }
        expect(new Set(items(sets).map((i) => i.question.prompt)).size).toBe(lessonIds.length * 3);
        expect(sets[2]!.afterCheckId).toBe(sets[1]!.id);
        expect(sets[2]!.delayDays).toBe(7);
      },
    );
    it(id + " preserves the exact original teaching-content fingerprint", () => {
      const base = CourseBundleSchema.parse(read(id));
      const stable = structuredClone(restorePreGuidanceBundle(id, base)) as {
        course: { version?: string };
        courseChecks?: unknown;
      };
      delete stable.courseChecks;
      delete stable.course.version;
      expect(createHash("sha256").update(JSON.stringify(stable)).digest("hex")).toBe(
        read(id, "review/check-extension.json").preservedContentSha256,
      );
    });
    it(id + " published checks retain exact editorial hash binding", () => {
      const base = CourseBundleSchema.parse(read(id));
      expect(base.courseChecks).toEqual(sets);
      expect(read(id, "review/publication.json").bundleSha256).toBe(bundleDigest(base));
      expect(read(id, "review/check-extension.json").publishedBundleSha256).toBe(
        bundleDigest(restorePreGuidanceBundle(id, base)),
      );
    });
  }
  for (const [sets, expected] of [
    [logicCourseChecks, logicNumeric],
    [csCourseChecks, csNumeric],
    [statisticsCourseChecks, statsNumeric],
  ] as const) {
    const numeric = numbers(sets);
    it(
      "has independent numeric evidence for every " + sets[0]!.items[0]!.question.id + " set",
      () => expect(numeric.length).toBe(expected.length),
    );
    for (const [i, item] of numeric.entries())
      it("recomputes " + item.question.id, () => {
        const a = item.question.answerAuthority;
        if (a.kind !== "numeric") throw Error("Numeric key expected");
        expect(a.value).toBeCloseTo(expected[i]!, 12);
      });
  }
  it("gates prose inside statement and dataset givens without rewriting literal code", () => {
    const banned = "Not only a value, but also a result.";
    const examples = [
      { type: "statements", title: banned, statements: [{ label: "A", text: "p" }] },
      { type: "statements", title: "Given", statements: [{ label: "A", text: banned }] },
      {
        type: "statements",
        title: "Given",
        statements: [{ label: "A", text: "p" }],
        conclusion: banned,
      },
      { type: "data_series", label: banned, series: [{ label: "A", values: [1, 2] }] },
      { type: "data_series", label: "Given", series: [{ label: banned, values: [1, 2] }] },
    ];
    for (const visual of examples) {
      const base = read("logic-and-reasoning");
      base.courseChecks[0].items[0].visual = visual;
      expect(
        validateCourseBundle(base).issues.some(
          (i) => i.path.endsWith(".visual") && i.code === "NEG001_NOT_ONLY_BUT_ALSO",
        ),
      ).toBe(true);
    }
    const base = read("cs-basics");
    base.courseChecks[0].items[0].visual = {
      type: "program",
      language: "python",
      code: JSON.stringify(banned),
    };
    expect(validateCourseBundle(base).passed).toBe(true);
  });
  it("enumerates the two new witness puzzles without assuming their labels", () => {
    expect(rows.filter(({ p, q }) => p === q && q === (p === q))).toEqual([{ p: true, q: true }]);
    expect(rows.filter(({ p, q }) => p === (p !== q) && q === p)).toEqual([{ p: false, q: false }]);
  });
  it("checks inference repairs and counterexamples on every assignment", () => {
    const implies = (p: boolean, q: boolean) => !p || q;
    expect(rows.every(({ p, q }) => !(implies(p, q) && !q) || !p)).toBe(true);
    expect(rows.filter(({ p, q }) => implies(p, q) && q && !p)).toEqual([{ p: false, q: true }]);
    expect(rows.filter(({ p, q }) => implies(p, q) && !p && q)).toEqual([{ p: false, q: true }]);
  });
  it("checks the threshold repair at values below, on and above the boundary in CPython", () => {
    for (const input of [9, 10, 11]) {
      const code = codeAt(1, 3)
        .replace("x = 10", "x = " + input)
        .replace("x > 10", "x >= 10");
      expect(python(code, "x")).toBe(input >= 10 ? input * 2 : input - 1);
    }
  });
  it("checks the changed-dataset claim and positive-probability disjoint events", () => {
    expect(mean([2, 6, 8, 10, 34]) - mean([2, 6, 8, 10, 14])).toBe(4);
    expect(median([2, 6, 8, 10, 34])).toBe(median([2, 6, 8, 10, 14]));
    expect(0).not.toBe((3 / 5) * (2 / 5));
  });
});
