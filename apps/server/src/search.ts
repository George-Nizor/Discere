import type { CourseBundle, RichTextBlock } from "@discere/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ContentRepository } from "./content.js";

/**
 * A small in-memory index over the listed courses, so the library search finds ideas rather
 * than only course titles: "bayes" finds Psychology's "Base rates and Bayes", "entropy" finds
 * the lessons that teach it. Built once from the bundles at start-up; content does not change
 * while the engine runs. No answers are indexed: question keys and flashcard backs stay out.
 */

export type SearchMatch = "lesson" | "concept" | "content";

export interface LessonSearchResult {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  /** What matched best: the lesson's title, one of its concepts, or its teaching text. */
  match: SearchMatch;
  /** The matching concept's summary, or a short excerpt of the matching text. */
  snippet: string;
}

interface IndexedLesson {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  title: string;
  concepts: Array<{ title: string; summary: string; text: string }>;
  /** Teaching prose, kept as separate passages so an excerpt can be cut from one of them. */
  passages: string[];
}

export function normaliseSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function blockText(block: RichTextBlock): string {
  switch (block.kind) {
    case "paragraph":
    case "heading":
      return block.text;
    case "definition":
      return `${block.term}. ${block.text}`;
    case "callout":
      return "text" in block && typeof block.text === "string" ? block.text : "";
    default:
      return "";
  }
}

/** Markdown-ish emphasis and inline maths markers are noise in an excerpt. */
function plain(text: string): string {
  return text
    .replace(/\$\$?([^$]*)\$\$?/g, "$1")
    .replace(/[*_`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSearchIndex(bundles: CourseBundle[]): IndexedLesson[] {
  return bundles.flatMap((bundle) => {
    const concepts = new Map(bundle.concepts.map((concept) => [concept.id, concept]));
    return bundle.lessons.map((lesson) => ({
      courseId: bundle.course.id,
      courseTitle: bundle.course.title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      title: normaliseSearchText(lesson.title),
      concepts: lesson.conceptIds.flatMap((id) => {
        const concept = concepts.get(id);
        return concept
          ? [
              {
                title: concept.title,
                summary: plain(concept.summary ?? ""),
                text: normaliseSearchText(`${concept.title} ${concept.summary ?? ""}`),
              },
            ]
          : [];
      }),
      // Teaching text only: a v2 lesson's prose is in its opener, headlines, leads, worked lines
      // and key idea. Reveals and feedback state answers, so an excerpt must never draw on them.
      passages: [
        lesson.orientation ?? "",
        ...(lesson.intro
          ? [...lesson.intro.hook.blocks.map(blockText), lesson.intro.promise]
          : []),
        ...lesson.steps.flatMap((step) => [
          ...step.blocks.map(blockText),
          step.headline ?? "",
          ...(step.lead ?? []).map(blockText),
          ...(step.workedSteps ?? []).filter((line) => !line.blank).map((line) => line.text),
        ]),
        lesson.recap?.keyIdea ?? "",
      ]
        .map(plain)
        .filter(Boolean),
    }));
  });
}

/** Cut a readable excerpt of about `width` characters around the first term found. */
function excerpt(passage: string, terms: string[], width = 140): string {
  const lower = passage.toLocaleLowerCase();
  const at = Math.max(
    0,
    Math.min(...terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0)),
  );
  if (passage.length <= width) return passage;
  let start = Math.max(0, at - Math.floor(width / 3));
  if (start > 0) {
    const space = passage.indexOf(" ", start);
    start = space > 0 && space < at ? space + 1 : start;
  }
  let end = Math.min(passage.length, start + width);
  if (end < passage.length) {
    const space = passage.lastIndexOf(" ", end);
    end = space > start + width / 2 ? space : end;
  }
  return `${start > 0 ? "…" : ""}${passage.slice(start, end)}${end < passage.length ? "…" : ""}`;
}

/** Whole words score above a prefix, which scores above a fragment inside a word. */
function termScore(text: string, term: string): number {
  if (!text) return 0;
  const padded = ` ${text} `;
  if (padded.includes(` ${term} `)) return 3;
  if (padded.includes(` ${term}`)) return 2;
  return text.includes(term) ? 1 : 0;
}

export function searchLessons(
  index: IndexedLesson[],
  query: string,
  limit = 12,
): LessonSearchResult[] {
  const terms = normaliseSearchText(query).split(" ").filter(Boolean);
  if (!terms.length || terms.join("").length < 2) return [];
  const scored = index.flatMap((lesson) => {
    let score = 0;
    let match: SearchMatch | null = null;
    let snippet = "";
    for (const term of terms) {
      const inTitle = termScore(lesson.title, term);
      const concept = lesson.concepts
        .map((item) => ({ item, score: termScore(item.text, term) }))
        .sort((a, b) => b.score - a.score)[0];
      const passage = lesson.passages
        .map((text) => ({ text, score: termScore(normaliseSearchText(text), term) }))
        .sort((a, b) => b.score - a.score)[0];
      const best = Math.max(inTitle * 10, (concept?.score ?? 0) * 5, passage?.score ?? 0);
      // Every term must appear somewhere in the lesson.
      if (best === 0) return [];
      score += best;
      if (inTitle && match === null) match = "lesson";
      if (!inTitle && concept?.score && match !== "lesson" && match !== "concept") {
        match = "concept";
        snippet = concept.item.summary || concept.item.title;
      }
      if (!inTitle && !concept?.score && passage?.score && match === null) {
        match = "content";
        snippet = excerpt(passage.text, terms);
      }
    }
    if (match === "lesson") {
      // A title match is self-explanatory; show the opening line of what the lesson teaches.
      snippet = lesson.passages[0] ? excerpt(lesson.passages[0], terms) : "";
    }
    return [
      {
        score,
        result: {
          courseId: lesson.courseId,
          courseTitle: lesson.courseTitle,
          lessonId: lesson.lessonId,
          lessonTitle: lesson.lessonTitle,
          match: (match ?? "content") as SearchMatch,
          snippet,
        },
      },
    ];
  });
  return scored
    .sort((a, b) => b.score - a.score || a.result.lessonTitle.localeCompare(b.result.lessonTitle))
    .slice(0, limit)
    .map((item) => item.result);
}

export async function registerSearchRoutes(
  app: FastifyInstance,
  { content }: { content: ContentRepository },
): Promise<void> {
  const index = buildSearchIndex(content.listedBundles);
  app.get("/api/search", async (request) => {
    const { q } = z.object({ q: z.string().max(200).default("") }).parse(request.query);
    return { query: q, lessons: searchLessons(index, q) };
  });
}
