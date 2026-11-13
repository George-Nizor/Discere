import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * In a multiple-choice question the right option must not give itself away by being the longest.
 * For each course below, among questions with three or more options (the right one is the choice
 * whose label is an accepted idea), the right option is strictly the longest in at most 30% of
 * them, and is never longer than every other option by more than 15%. No question mixes options
 * that end in a full stop with options that do not.
 *
 * `devops-and-delivery` and `cloud-fundamentals` will be added to this list once their rewrites
 * merge.
 */
const COURSES = [
  "history",
  "psychology-how-minds-work",
  "drawing-and-visual-art-fundamentals",
  "philosophy-knowledge-mind-and-ethics",
  "first-aid",
  "git-and-version-control",
  "linguistics",
  "reading-and-research",
  "music-theory",
  "ai-engineering",
];

type Choice = { id: string; label: string };
type Question = {
  id: string;
  choices?: Choice[];
  answerAuthority: { acceptedIdeas: string[] };
};

function load(course: string): Question[] {
  const url = new URL(`../../../content/${course}/bundle.json`, import.meta.url);
  return (JSON.parse(readFileSync(url, "utf8")) as { questions: Question[] }).questions;
}

describe.each(COURSES)("option lengths in %s", (course) => {
  const questions = load(course).filter((q) => (q.choices?.length ?? 0) >= 3);
  const rows = questions.map((q) => {
    const choices = q.choices as Choice[];
    const right = choices.filter((c) => q.answerAuthority.acceptedIdeas.includes(c.label));
    const others = choices.filter((c) => !right.includes(c));
    const longestOther = Math.max(...others.map((c) => c.label.length));
    return { id: q.id, right, rightLength: right[0]?.label.length ?? 0, longestOther };
  });

  it("has exactly one right option in each question", () => {
    expect(rows.filter((r) => r.right.length !== 1).map((r) => r.id)).toEqual([]);
  });

  it("makes the right option strictly the longest in at most 30% of questions", () => {
    const longest = rows.filter((r) => r.rightLength > r.longestOther);
    expect(longest.length).toBeLessThanOrEqual(Math.floor(rows.length * 0.3));
  });

  it("never makes the right option more than 15% longer than every other option", () => {
    const far = rows.filter((r) => r.rightLength > r.longestOther * 1.15);
    expect(far.map((r) => r.id)).toEqual([]);
  });

  it("ends all options of a question, or none, with a full stop", () => {
    const mixed = questions.filter((q) => {
      const ends = new Set((q.choices as Choice[]).map((c) => c.label.trimEnd().endsWith(".")));
      return ends.size > 1;
    });
    expect(mixed.map((q) => q.id)).toEqual([]);
  });
});
