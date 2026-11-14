import { readFileSync } from "node:fs";
import {
  CourseBundleSchema,
  type CourseCheckDefinition,
  type FlashcardRecord,
  type Question,
} from "@discere/contracts";
import { historicalBundle } from "./published-history.js";

/**
 * A lesson's six questions and two recall cards as the live bundle holds them, kept only where the
 * key is still the one the course was first published with (the same number, or the same accepted
 * ideas over the same options). Wording, hints and worked answers may have moved on.
 * Position n - 1 holds question n (card n). A slot is `undefined` where the question was rewritten after first publication, since the tables
 * the content tests recompute from describe the first publication; that rewrite is checked by the
 * course's own v2 test, which recomputes every key written or changed in it.
 */
export type KeyedCard = FlashcardRecord & { answerAuthority: Question["answerAuthority"] };
export type KeyedLesson = {
  id: string;
  questions: Array<Question | undefined>;
  cards: Array<KeyedCard | undefined>;
};

type Keyed = {
  answerAuthority?: Question["answerAuthority"] | undefined;
  choices?: Question["choices"] | undefined;
};

/**
 * The same key: one number, or the same accepted ideas over the same options. A test that checks
 * the stated rounding against the exact value passes `tolerance` so that it also needs the same
 * tolerance, since a later pass may narrow it once the prompt asks for the rounded figure.
 */
const sameKey = (live: Keyed, first: Keyed, tolerance: boolean) => {
  const a = live.answerAuthority;
  const b = first.answerAuthority;
  if (!a || !b) return false;
  if (a.kind === "numeric" && b.kind === "numeric")
    return (
      a.value === b.value &&
      (!tolerance ||
        (a.absoluteTolerance === b.absoluteTolerance &&
          a.relativeTolerance === b.relativeTolerance))
    );
  if (a.kind === "text" && b.kind === "text")
    return (
      JSON.stringify([a.acceptedIdeas, live.choices?.map((choice) => choice.label)]) ===
      JSON.stringify([b.acceptedIdeas, first.choices?.map((choice) => choice.label)])
    );
  return false;
};

const bundlesOf = (courseId: string) => ({
  first: CourseBundleSchema.parse(historicalBundle(courseId)),
  live: CourseBundleSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../../../content/${courseId}/bundle.json`, import.meta.url), "utf8"),
    ),
  ),
});

export type KeyedCheck = {
  id: string;
  /** Position n - 1 holds the course check's nth item, or `undefined` where its key has changed. */
  items: Array<CourseCheckDefinition["items"][number] | undefined>;
};

/** The independent checks of a course, with the items whose key is still the one first published. */
export function unchangedChecks(
  courseId: string,
  { tolerance = false }: { tolerance?: boolean } = {},
): KeyedCheck[] {
  const { first, live } = bundlesOf(courseId);
  const liveItems = new Map(
    (live.courseChecks ?? []).flatMap((check) =>
      check.items.map((item) => [item.question.id, item] as const),
    ),
  );
  return (first.courseChecks ?? []).map((check) => ({
    id: check.id,
    items: check.items.map((original) => {
      const now = liveItems.get(original.question.id);
      return now && sameKey(now.question, original.question, tolerance) ? now : undefined;
    }),
  }));
}

export function unchangedKeys(
  courseId: string,
  prefix: string,
  { tolerance = false }: { tolerance?: boolean } = {},
): KeyedLesson[] {
  const { first, live } = bundlesOf(courseId);
  return first.lessons.map((lesson) => {
    const questions: KeyedLesson["questions"] = [];
    for (let n = 1; ; n++) {
      const id = `${prefix}-${lesson.id}-${n}`;
      const original = first.questions.find((item) => item.id === id);
      if (!original) break;
      const now = live.questions.find((item) => item.id === id);
      questions.push(now && sameKey(now, original, tolerance) ? now : undefined);
    }
    const cards: KeyedLesson["cards"] = [];
    for (let n = 1; ; n++) {
      const id = `${prefix}-${lesson.id}-card-${n}`;
      const original = first.flashcards.find((item) => item.id === id);
      if (!original) break;
      const now = live.flashcards.find((item) => item.id === id);
      cards.push(
        now?.answerAuthority && sameKey(now, original, tolerance) ? (now as KeyedCard) : undefined,
      );
    }
    return { id: lesson.id, questions, cards };
  });
}
