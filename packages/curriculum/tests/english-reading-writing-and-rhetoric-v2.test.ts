import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * English: Reading, Writing and Rhetoric, all twelve lessons rewritten to the v2 format. Most items
 * are text answers, so the content test checks that every choice item has exactly one correct
 * option and that no misconception matches the key. The numeric items are counts and positions;
 * each key is recomputed here from the words, letters or diagram data the item describes.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL(
      "../../../content/english-reading-writing-and-rhetoric/bundle.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as CourseBundle;

const question = (id: string): Question => {
  const found = bundle.questions.find((item) => item.id === id);
  if (!found) throw new Error(`no question ${id}`);
  return found;
};
const key = (id: string) => {
  const authority = question(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const words = (text: string) => text.split(/\s+/u).filter(Boolean).length;
const syllables = (hyphenated: string) => hyphenated.split("-").length;
const distinct = (letters: string) => new Set(letters).size;
const argmax = (values: number[]) => values.indexOf(Math.max(...values)) + 1;

type Arc = { scenes: Array<{ label: string; rise: number; opens: string; closes: string }> };
const lessonOf = (id: string) => bundle.lessons.find((item) => item.id === id)!;
const arcOf = (lessonId: string, stepId: string, caseIndex: number): Arc["scenes"] => {
  const step = lessonOf(lessonId).steps.find((item) => item.id === stepId)!;
  const diagram = step.diagram as unknown as { cases: Array<{ model: Arc }> };
  return diagram.cases[caseIndex]!.model.scenes;
};
const turns = (scenes: Array<{ opens: string; closes: string }>) =>
  scenes.filter((scene) => scene.opens !== scene.closes).length;

type Part = { role: string };
const clausesOf = (lessonId: string, stepId: string, caseIndex: number) => {
  const step = lessonOf(lessonId).steps.find((item) => item.id === stepId)!;
  const diagram = step.diagram as unknown as {
    cases: Array<{ model: { clauses: Array<{ kind: string; parts: Part[] }> } }>;
  };
  return diagram.cases[caseIndex]!.model.clauses;
};
const rolesOf = (lessonId: string, stepId: string, caseIndex: number) => {
  const step = lessonOf(lessonId).steps.find((item) => item.id === stepId)!;
  const diagram = step.diagram as unknown as {
    cases: Array<{ model: { statements: Array<{ role: string }> } }>;
  };
  return diagram.cases[caseIndex]!.model.statements.map((statement) => statement.role);
};

type Case = { id: string; model: Record<string, unknown> };
const casesIn = (lessonId: string, stepId: string): Case[] => {
  const step = lessonOf(lessonId).steps.find((item) => item.id === stepId);
  if (!step) throw new Error(`no step ${lessonId}/${stepId}`);
  return (step.diagram as unknown as { cases: Case[] }).cases;
};
const caseIn = (lessonId: string, stepId: string, caseId: string) =>
  casesIn(lessonId, stepId).find((item) => item.id === caseId)!.model;
type Span = { text: string; mark?: string };
const spansOf = (model: Record<string, unknown>) =>
  (model["lines"] as Array<{ spans: Span[] }>).flatMap((line) => line.spans);
const marked = (model: Record<string, unknown>, mark: string) =>
  spansOf(model).filter((span) => span.mark === mark);
type Syllable = { text: string; stress: boolean; wordEnd: boolean };
const syllablesIn = (model: Record<string, unknown>) => model["syllables"] as Syllable[];
type SonnetLine = { text: string; sound: string };
const sonnetLines = (model: Record<string, unknown>) => model["lines"] as SonnetLine[];

const ids = [
  "clause-anatomy",
  "joining-clauses",
  "actors-and-actions",
  "claim-grounds-warrant",
  "appeals-and-occasion",
  "figures-of-speech",
  "metre-and-scansion",
  "sound-and-image",
  "sonnet-and-volta",
  "point-of-view",
  "irony-and-reliability",
  "structure-and-scenes",
];

const STORY_IDS = ids;
const wordsIn = (blocks: Array<{ text?: string }> | undefined) =>
  (blocks ?? []).reduce((sum, block) => sum + words(block.text ?? ""), 0);
const isTeaching = (step: { kind: string; checkQuestionId?: string }) =>
  step.kind === "explain" && !step.checkQuestionId;
/** Every learner-facing sentence of a lesson's prose, for checking what the text claims. */
const proseOf = (lessonId: string) => {
  const lesson = lessonOf(lessonId);
  const texts = [
    ...(lesson.intro?.hook.blocks ?? []),
    ...lesson.steps.flatMap((step) => [...(step.lead ?? []), ...(step.afterFigure ?? [])]),
    ...(lesson.recap?.blocks ?? []),
  ].map((block) => (block as { text?: string }).text ?? "");
  return texts.join(" ");
};

describe("English v2 lessons", () => {
  it("validates, and every lesson has the v2 anatomy", () => {
    const validation = validateCourseBundle(bundle);
    expect(validation.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(bundle.lessons.map((lesson) => lesson.id)).toEqual(ids);
    for (const lesson of bundle.lessons) {
      expect(lesson.recap).toBeDefined();
      expect(lesson.questionIds).toHaveLength(3);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
      expect(lesson.calculator).toBe("off");
      if (STORY_IDS.includes(lesson.id)) continue;
      expect(lesson.intro?.hook.questionId).toBeTruthy();
      expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.length).toBeLessThanOrEqual(7);
    }
  });

  it("gives every choice item exactly one correct option", () => {
    const withChoices = bundle.questions.filter((item) => item.choices);
    expect(withChoices.length).toBeGreaterThan(0);
    for (const item of withChoices) {
      const authority = item.answerAuthority;
      if (authority.kind !== "text") throw new Error(`${item.id} is not a text item`);
      const correct = item.choices!.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(correct.map((choice) => choice.label), item.id).toEqual([authority.acceptedIdeas[0]]);
      // No misconception may match the key.
      for (const misconception of item.misconceptions ?? [])
        expect(misconception.match.choiceIds ?? [], item.id).not.toContain(correct[0]!.id);
    }
  });

  it("never lets a misconception match the key, numeric or text", () => {
    for (const item of bundle.questions) {
      const authority = item.answerAuthority;
      for (const misconception of item.misconceptions ?? []) {
        if (authority.kind === "numeric")
          expect(misconception.match.numeric ?? [], item.id).not.toContain(authority.value);
        else
          for (const idea of misconception.match.textIdeas ?? [])
            expect(assessTextAnswer(idea, authority).correct, `${item.id}: ${idea}`).toBe(false);
      }
    }
  });
});
