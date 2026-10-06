import { randomUUID } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import {
  evaluateDiagramChoice,
  evaluateGraphPlot,
  evaluateOrderSequence,
} from "@discere/activity-engine";
import {
  assessNumericAnswer,
  assessTextAnswer,
  parseNumericAnswer,
} from "@discere/assessment-engine";
import {
  ActivityAttemptRequestSchema,
  AttemptRequestSchema,
  EssaySaveRequestSchema,
  IllustrationRequestSchema,
  type IllustrationResponse,
  LessonDraftSchema,
  LessonFeedbackRequestSchema,
  type LessonResponse,
  NotebookSaveRequestSchema,
  type Question,
  RevealConfirmRequestSchema,
  RevealStartRequestSchema,
  ReviewRateRequestSchema,
  ReviewRecallRequestSchema,
  ReviewSessionCreateSchema,
  RomanReferenceEssayIdSchema,
  RomanReferenceQuestionIdSchema,
  StageProgressRequestSchema,
  StudyPreferencesUpdateSchema,
  StudyStatisticsPeriodSchema,
  TutorEnvelopeBaseSchema,
  TutoringModeSchema,
  TutorOperationSchema,
  TutorReplyRequestSchema,
  WritingLintRequestSchema,
} from "@discere/contracts";
import { createReviewState, scoreAttempt, updateMastery } from "@discere/progression-engine";
import { buildCompanionPacket } from "@discere/tutor-providers";
import {
  createImageGenerationPrompt,
  inspectVisualBrief,
  renderCircuitSvg,
  renderOhmsLawGraphSvg,
} from "@discere/visual-engine";
import { lintText, type WritingContext } from "@discere/writing-engine";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { assessResponse } from "./assessment.js";
import { illustrationsCapability } from "./capabilities.js";
import { acceptTutorReply, buildTutorReplyPayload } from "./companion.js";
import type { ContentRepository } from "./content.js";
import type { DiscereStore } from "./db/store.js";
import { HttpError } from "./errors.js";
import { buildLearningStatistics } from "./learning-statistics.js";
import { genericTutorContext } from "./generic-tutor-context.js";
import { illustrationImagePath, readIllustration, requestIllustration } from "./illustrations.js";
import { getNotebookPage, saveNotebookPage } from "./notebook.js";
import { coerceQueryBoolean } from "./query-coercion.js";
import { privateEssayQuestionForRomanReference } from "./roman-reference-essay.js";
import {
  lessonForRomanReferenceEssayTutor,
  lessonForRomanReferenceTutor,
  resolveRomanReferenceTutorEssay,
  resolveRomanReferenceTutorQuestion,
} from "./roman-reference-routes.js";
import type { TopicMapRepository } from "./topic-maps.js";

/** The IANA spelling of a time zone typed in any case, or null when there is no such zone. */
export function canonicalTimeZone(value: string): string | null {
  if (!value || value.length > 100) return null;
  try {
    return new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

export interface RouteDependencies {
  content: ContentRepository;
  store: DiscereStore;
  /** Curated outlines for courses that are planned but have no lessons yet. */
  topicMaps: TopicMapRepository;
  revealDelayMs: number;
}
const IllustrationParamsSchema = z.object({ key: z.string().regex(/^[0-9a-f]{32}$/) }).strict();
const AttemptBodySchema = AttemptRequestSchema.extend({ attemptId: z.string().uuid().optional() });
const CompanionBodySchema = z
  .object({
    operation: TutorOperationSchema.default("draft_lesson"),
    payload: z.unknown().optional(),
  })
  .strict();
const ImagePromptBodySchema = z.object({ visualBriefId: z.string().min(1) }).strict();
const CompanionImportBodySchema = z
  .object({
    text: z.string().min(2).max(500_000),
    mode: TutoringModeSchema.optional(),
    expectedRequestId: z.string().uuid(),
    attemptId: z.string().uuid().optional(),
    lessonId: z.string().min(1).max(200).optional(),
    questionId: z.string().min(1).max(200).optional(),
    referenceQuestionId: RomanReferenceQuestionIdSchema.optional(),
    referenceEssayId: RomanReferenceEssayIdSchema.optional(),
  })
  .strict()
  .refine((body) => body.referenceQuestionId === undefined || body.referenceEssayId === undefined, {
    message: "An import binds to the reference question or the essay, not both.",
  });
const LessonParamsSchema = z.object({ lessonId: z.string().min(1).max(200) }).strict();
const CourseParamsSchema = z.object({ courseId: z.string().min(1).max(200) }).strict();
const JourneyParamsSchema = z
  .object({ courseId: z.string().min(1).max(200), lessonId: z.string().min(1).max(200) })
  .strict();
const StageParamsSchema = JourneyParamsSchema.extend({
  stageId: z.string().min(1).max(240),
}).strict();
const EssayParamsSchema = z.object({ essayId: z.string().min(1).max(240) }).strict();
const AssetParamsSchema = z
  .object({ courseId: z.string().min(1).max(200), "*": z.string().min(1).max(300) })
  .strict();
const CircuitQuerySchema = z.object({
  voltage: z.coerce.number().positive().max(100).default(5),
  resistance: z.coerce.number().positive().max(1_000_000).default(100),
  values: z.unknown().optional(),
  lessonId: z.string().min(1).max(200).optional(),
});
const GraphQuerySchema = z.object({
  resistance: z.coerce.number().positive().max(1_000_000).default(100),
});

const ASSET_MEDIA_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
};

function assetMediaType(file: string): string {
  return ASSET_MEDIA_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

export async function registerRoutes(
  app: FastifyInstance,
  dependencies: RouteDependencies,
): Promise<void> {
  const { content, store, topicMaps, revealDelayMs } = dependencies;

  /** Concept mastery, named the way the course names each concept. */
  function conceptProgressWithTitles() {
    const titles = new Map(
      content.listedBundles
        .flatMap((bundle) => bundle.concepts)
        .map((concept) => [concept.id, concept.title]),
    );
    return store
      .getProgress()
      .filter((row) => titles.has(row.conceptId))
      .map((row) => ({ ...row, title: titles.get(row.conceptId) ?? row.conceptId }));
  }

  function currentLessonPacketPayload(): { lesson: unknown; sourceIds: string[] } {
    const lesson = content.currentLesson(store.courseActivity());
    return { lesson, sourceIds: lesson.lesson.sourceIds };
  }

  function assertLessonExists(lessonId: string): void {
    if (content.courseOfLesson(lessonId) === undefined) {
      throw new HttpError(404, "Lesson not found.", "LESSON_NOT_FOUND");
    }
  }

  /**
   * The launcher's readiness probe. Registration only happens after the content loaded and the
   * database passed its migration check, so a 200 here means the server can serve a lesson, not
   * merely that a process is listening.
   */
  app.get("/api/health", async () => ({
    status: "ok",
    service: "discere",
    version: "0.1.0",
    // The library's count. Archived courses still load (old links keep working) but are not
    // offered, so they are reported apart rather than inflating the number.
    courses: content.listedBundles.length,
    archivedCourses: content.bundles.length - content.listedBundles.length,
  }));
  app.get("/api/home", async () => {
    let { courseId, lessonId } = content.currentLessonId(store.courseActivity());
    const finished = store.completedJourneyIds();
    if (finished.has(`${courseId}:${lessonId}`)) {
      const lessons = content.bundle(courseId)?.lessons ?? [];
      const index = lessons.findIndex((lesson) => lesson.id === lessonId);
      const next = [...lessons.slice(index + 1), ...lessons.slice(0, index)].find(
        (lesson) => !finished.has(`${courseId}:${lesson.id}`),
      );
      if (next) lessonId = next.id;
      else {
        const priority = ["maths-foundations", "logic-and-reasoning", "cs-basics"];
        const bundles = [...content.listedBundles].sort(
          (a, b) =>
            (priority.includes(a.course.id) ? priority.indexOf(a.course.id) : 99) -
            (priority.includes(b.course.id) ? priority.indexOf(b.course.id) : 99),
        );
        for (const bundle of bundles) {
          const unfinished = bundle.lessons.find(
            (lesson) => !finished.has(`${bundle.course.id}:${lesson.id}`),
          );
          if (unfinished) {
            courseId = bundle.course.id;
            lessonId = unfinished.id;
            break;
          }
        }
      }
    }
    const journey = content.getJourney(courseId, lessonId);
    if (!journey)
      throw new HttpError(404, "The current lesson is unavailable.", "LESSON_NOT_FOUND");
    const lesson = content.getLesson(lessonId, courseId);
    return {
      ...store.getProfile(),
      dueReviews: visibleReviewCards().filter((item) => item.state.dueAt <= store.now()).length,
      todayMinutes: store.todayMinutes(),
      currentMission: {
        id: `mission:${journey.id}`,
        courseId,
        title: journey.title,
        description: lesson?.lesson.orientation ?? journey.title,
        estimatedMinutes: journey.estimatedMinutes,
        lessonBeatId: lessonId,
      },
      progress: conceptProgressWithTitles(),
    };
  });
  store.study.dueCardCounter = (until) =>
    visibleReviewCards().filter((item) => item.state.dueAt <= until).length;
  app.get("/api/study", async () => store.study.summary());
  app.post("/api/study/chest", async () => store.study.claimChest());
  app.post("/api/study/boost", async () => store.study.activateBoost());
  app.post("/api/study/quests/:questId/swap", async (request) => {
    const { questId } = z.object({ questId: z.string().min(1).max(40) }).parse(request.params);
    return store.study.swapQuest(questId);
  });
  app.get("/api/study/statistics", async (request) => {
    const { period } = z.object({ period: StudyStatisticsPeriodSchema.default("all") })
      .strict().parse(request.query);
    return buildLearningStatistics(store.study.events(), store.now(), store.study.preferences().timeZone, period);
  });
  app.get("/api/study/preferences", async () => store.study.preferences());
  app.put("/api/study/preferences", async (request) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    // A time zone is stored in its canonical spelling ("australia/sydney" becomes
    // "Australia/Sydney"), and one Discere does not recognise is named in the refusal.
    if (typeof body["timeZone"] === "string") {
      const typed = body["timeZone"].trim();
      const canonical = canonicalTimeZone(typed);
      if (!canonical)
        throw new HttpError(
          400,
          typed
            ? `“${typed.slice(0, 60)}” is not a time zone Discere recognises. Choose one from the list, such as Europe/London.`
            : "Choose a time zone from the list.",
          "TIME_ZONE_INVALID",
        );
      body["timeZone"] = canonical;
    }
    return store.study.updatePreferences(StudyPreferencesUpdateSchema.parse(body));
  });
  app.get("/api/courses/:courseId/lessons/:lessonId/result", async (request) => {
    const { courseId, lessonId } = JourneyParamsSchema.parse(request.params);
    const journey = content.getJourney(courseId, lessonId);
    if (!journey) throw new HttpError(404, "Lesson not found.", "LESSON_NOT_FOUND");
    const progress = store.getJourneyProgress(journey.id, journey.stageOrder);
    const completed = progress.stages.some(
      (entry) => entry.stageId.endsWith(":completion") && entry.state === "completed",
    );
    if (!completed)
      throw new HttpError(409, "Finish the lesson to see its results.", "LESSON_NOT_FINISHED");
    const questionIds = new Set(
      journey.stages.flatMap((stage) =>
        stage.type === "quiz"
          ? [stage.questionId]
          : stage.type === "explainer"
            ? stage.steps.flatMap((step) =>
                step.question
                  ? [step.question.id]
                  : step.activity
                    ? [`activity:${step.activity.id}`]
                    : [],
              )
            : [],
      ),
    );
    const cardIds = new Set(
      journey.stages.flatMap((stage) => (stage.type === "review" ? (stage.cardIds ?? []) : [])),
    );
    const transferIds = new Set(
      [...questionIds].flatMap((id) => {
        const transfer = content.getQuestion(id)?.transfer;
        return transfer ? [transfer.id] : [];
      }),
    );
    const events = store.study.events();
    const answers = events.filter(
      (event) => event.kind === "answer" && questionIds.has(event.referenceId) && event.qualifying,
    );
    const correct = new Set(
      answers.filter((event) => event.correct).map((event) => event.referenceId),
    );
    const independent = new Set(
      answers
        .filter((event) => event.correct && event.independent)
        .map((event) => event.referenceId),
    );
    const answered = new Set(answers.map((event) => event.referenceId)).size;
    const relevant = new Set(
      events
        .filter(
          (event) =>
            (event.kind === "answer" && questionIds.has(event.referenceId)) ||
            (event.kind === "review" && cardIds.has(event.referenceId)) ||
            (event.kind === "transfer" && transferIds.has(event.referenceId)) ||
            (event.kind === "stage" && event.referenceId === journey.id),
        )
        .map((event) => event.key),
    );
    const completion = events.find(
      (event) => event.key === `stage:${journey.id}:${lessonId}:completion`,
    );
    const reviews = cardIds.size
      ? (
          store.database
            .prepare(
              `SELECT COUNT(DISTINCT card_id) AS count FROM review_sessions WHERE user_id = 'local-user' AND rated = 1 AND card_id IN (${[...cardIds].map(() => "?").join(",")})`,
            )
            .get(...cardIds) as { count: number }
        ).count
      : 0;
    return {
      lessonId,
      completed,
      completedAt: completion?.occurredAt ?? null,
      xp: events
        .filter(
          (event) =>
            event.kind === "reward" &&
            relevant.has(event.referenceId) &&
            (!completion || event.occurredAt <= completion.occurredAt),
        )
        .reduce((sum, event) => sum + event.xp, 0),
      answered,
      correct: correct.size,
      independent: independent.size,
      // An explained mistake is learning with help; it never becomes independent correctness.
      assisted: answered - independent.size,
      reviews,
    };
  });
  app.get("/api/courses", async () => {
    const built = content.courseSummaries(store.courseActivity(), store.completedLessonsByCourse());
    const planned = topicMaps.plannedSummaries(new Set(built.map((course) => course.id)));
    return { courses: [...built, ...planned] };
  });

  /** Cover art for a course that is planned but not yet written. */
  app.get("/api/roadmap/:courseId/cover", async (request, reply) => {
    const { courseId } = CourseParamsSchema.parse(request.params);
    const absolute = topicMaps.coverPath(courseId);
    if (!absolute) throw new HttpError(404, "No cover.", "ASSET_NOT_FOUND");
    let file: Buffer;
    try {
      file = await readFile(absolute);
    } catch {
      throw new HttpError(404, "No cover.", "ASSET_NOT_FOUND");
    }
    return reply.type("image/webp").header("Cache-Control", "public, max-age=3600").send(file);
  });

  /**
   * Ten weeks of completions, so the progress screen can draw a calendar of real study rather
   * than a single streak number. Days with nothing done are absent, not zero.
   */
  app.get("/api/progress/activity", async () => {
    const WEEKS = 10;
    const from = new Date(Date.now() - WEEKS * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const days = store.activityByDay(from);
    return {
      days,
      busiestCount: days.reduce((most, day) => Math.max(most, day.completions), 0),
    };
  });
  app.get("/api/courses/:courseId", async (request) => {
    const { courseId } = CourseParamsSchema.parse(request.params);
    const finished = store.completedJourneyIds();
    const lessonIds = new Set(
      [...finished]
        .filter((journeyId) => journeyId.startsWith(`${courseId}:`))
        .map((journeyId) => journeyId.slice(courseId.length + 1)),
    );
    const detail = content.courseDetail(
      courseId,
      store.courseActivity().get(courseId)?.lastActiveAt ?? null,
      lessonIds,
      lessonIds.size,
    );
    if (!detail) throw new HttpError(404, "Course not found.", "COURSE_NOT_FOUND");
    const recent = store.courseActivity().get(courseId)?.lessonId;
    const available = detail.lessons.filter(lesson => lesson.available);
    const saved = available.find(lesson => lesson.id === recent);
    const index = available.findIndex(lesson => lesson.id === recent);
    const ordered = index < 0 ? available : [...available.slice(index + 1), ...available.slice(0, index)];
    const next = saved && !saved.completed ? saved : ordered.find(lesson => !lesson.completed) ?? available[0];
    return { ...detail, ...(next ? { resumeLessonId: next.id } : {}) };
  });
  app.get("/api/content/:courseId/assets/*", async (request, reply) => {
    const params = AssetParamsSchema.parse(request.params);
    const directory = content.assetDirectory(params.courseId);
    if (!directory) throw new HttpError(404, "Course not found.", "COURSE_NOT_FOUND");
    const requested = params["*"];
    // The file name is resolved inside the course directory and then checked, so a crafted
    // path can never read anything the course does not own.
    const absolute = path.resolve(directory, requested);
    const root = `${path.resolve(directory)}${path.sep}`;
    if (!absolute.startsWith(root)) throw new HttpError(404, "Asset not found.", "ASSET_NOT_FOUND");
    let file: Buffer;
    try {
      // The lexical check above cannot see through a symlink, which would otherwise resolve
      // to a file outside the course. Both ends are resolved and compared again before the
      // read. Course assets are first-party, so this costs one `realpath` per image.
      const realRoot = await realpath(path.resolve(directory));
      const realAbsolute = await realpath(absolute);
      if (realAbsolute !== realRoot && !realAbsolute.startsWith(`${realRoot}${path.sep}`)) {
        throw new HttpError(404, "Asset not found.", "ASSET_NOT_FOUND");
      }
      file = await readFile(realAbsolute);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(404, "Asset not found.", "ASSET_NOT_FOUND");
    }
    return reply
      .type(assetMediaType(absolute))
      .header("Cache-Control", "public, max-age=3600")
      .send(file);
  });
  app.get("/api/courses/:courseId/lessons/:lessonId/journey", async (request) => {
    const { courseId, lessonId } = JourneyParamsSchema.parse(request.params);
    if (!content.has(courseId)) throw new HttpError(404, "Course not found.", "COURSE_NOT_FOUND");
    const journey = content.getJourney(courseId, lessonId);
    if (!journey) throw new HttpError(404, "Lesson journey not found.", "JOURNEY_NOT_FOUND");
    return journey;
  });
  app.get("/api/courses/:courseId/lessons/:lessonId/stages/:stageId", async (request) => {
    const { courseId, lessonId, stageId } = StageParamsSchema.parse(request.params);
    if (!content.has(courseId)) throw new HttpError(404, "Course not found.", "COURSE_NOT_FOUND");
    const journey = content.getJourney(courseId, lessonId);
    const stage = journey?.stages.find((item) => item.id === stageId);
    if (!journey || !stage) throw new HttpError(404, "Stage not found.", "STAGE_NOT_FOUND");
    return stage;
  });
  app.get("/api/courses/:courseId/lessons/:lessonId/progress", async (request) => {
    const { courseId, lessonId } = JourneyParamsSchema.parse(request.params);
    if (!content.has(courseId)) throw new HttpError(404, "Course not found.", "COURSE_NOT_FOUND");
    const journey = content.getJourney(courseId, lessonId);
    if (!journey) throw new HttpError(404, "Lesson journey not found.", "JOURNEY_NOT_FOUND");
    return store.getJourneyProgress(journey.id, journey.stageOrder);
  });
  app.put("/api/courses/:courseId/lessons/:lessonId/progress", async (request) => {
    const { courseId, lessonId } = JourneyParamsSchema.parse(request.params);
    if (!content.has(courseId)) throw new HttpError(404, "Course not found.", "COURSE_NOT_FOUND");
    const journey = content.getJourney(courseId, lessonId);
    if (!journey) throw new HttpError(404, "Lesson journey not found.", "JOURNEY_NOT_FOUND");
    const body = StageProgressRequestSchema.parse(request.body);
    try {
      const stage = journey.stages.find((item) => item.id === body.stageId);
      if (body.state === "completed" && stage) {
        if (stage.type === "quiz" && !store.hasQuestionEvidence(stage.questionId))
          throw new HttpError(
            409,
            "Answer this question before continuing.",
            "STAGE_NEEDS_RESPONSE",
          );
        if (stage.type === "explainer") {
          for (const step of stage.steps) {
            if (step.question && !store.hasQuestionEvidence(step.question.id, step.kind !== "hook"))
              throw new HttpError(
                409,
                "Answer the remaining lesson question before continuing.",
                "STAGE_NEEDS_RESPONSE",
              );
            if (
              step.activity &&
              ["diagram_choice", "order_sequence", "graph_plot"].includes(step.activity.type) &&
              !store.hasQuestionEvidence(`activity:${step.activity.id}`)
            )
              throw new HttpError(
                409,
                "Complete the activity before continuing.",
                "STAGE_NEEDS_RESPONSE",
              );
          }
        }
        if (stage.type === "review" && stage.cardIds?.some((cardId) => !store.hasRatedCard(cardId)))
          throw new HttpError(
            409,
            "Review the remaining cards before continuing.",
            "STAGE_NEEDS_REVIEW",
          );
        if (stage.type === "completion") {
          const progress = store.getJourneyProgress(journey.id, journey.stageOrder);
          if (
            journey.stages.some(
              (item) =>
                item.type !== "completion" &&
                !item.optional &&
                !progress.stages.some(
                  (saved) => saved.stageId === item.id && saved.state === "completed",
                ),
            )
          )
            throw new HttpError(
              409,
              "Finish the lesson before recording completion.",
              "LESSON_INCOMPLETE",
            );
        }
      }
      return store.saveStageProgress(journey.id, journey.stageOrder, body, stage?.type);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Stage '"))
        throw new HttpError(409, error.message, "STAGE_NOT_IN_JOURNEY");
      throw error;
    }
  });
  app.get("/api/essays/:essayId", async (request) => {
    const { essayId } = EssayParamsSchema.parse(request.params);
    if (!content.getEssay(essayId)) throw new HttpError(404, "Essay not found.", "ESSAY_NOT_FOUND");
    const draft = store.getEssayDraft(essayId);
    return {
      ...draft,
      wordCount: draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0,
    };
  });
  app.put("/api/essays/:essayId", async (request) => {
    const { essayId } = EssayParamsSchema.parse(request.params);
    const body = EssaySaveRequestSchema.parse(request.body);
    if (!content.getEssay(essayId)) throw new HttpError(404, "Essay not found.", "ESSAY_NOT_FOUND");
    const draft = store.saveEssayDraft(essayId, body.content);
    return {
      ...draft,
      wordCount: draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0,
    };
  });
  app.post("/api/essays/:essayId/submit", async (request) => {
    const { essayId } = EssayParamsSchema.parse(request.params);
    const body = EssaySaveRequestSchema.parse(request.body);
    const topic = content.getEssay(essayId);
    if (!topic) throw new HttpError(404, "Essay not found.", "ESSAY_NOT_FOUND");
    const wordCount = body.content.trim() ? body.content.trim().split(/\s+/).length : 0;
    if (wordCount < topic.essay.minWords)
      throw new HttpError(
        400,
        `Write at least ${topic.essay.minWords} words before submitting.`,
        "ESSAY_TOO_SHORT",
      );
    // The writing gate stays mandatory for generated prose. A learner's own words are only
    // ever given advisory style notes, so submission always succeeds.
    const lint = lintText(body.content, { context: "assessment" });
    store.recordWritingGate("assessment", body.content, lint);
    const saved = store.submitEssay(essayId, body.content);
    return {
      essayId: saved.essayId,
      submitted: true as const,
      wordCount,
      feedback: "Your teach-back has been saved as submitted evidence.",
      styleNotes: lint.violations,
    };
  });
  /**
   * Every authored card in the library is registered once. Cards are written alongside the
   * lessons, so the queue reflects the whole course rather than the lesson last opened.
   */
  function ensureAuthoredReviewCards() {
    const reviewedAt = store.now();
    const registered = content.flashcards.map(({ courseId, card }) => {
      const flashcard = {
        id: card.id,
        questionId: card.questionId ?? card.id,
        conceptIds: [...card.conceptIds],
        front: card.front,
        back: card.back,
        sourceIds: [...card.sourceIds],
        reviewedAt,
      };
      return store.ensureReviewCard(
        courseId,
        flashcard,
        createReviewState(flashcard.id, reviewedAt),
      );
    });
    const first = registered[0];
    if (!first) throw new HttpError(404, "No review card is available.", "REVIEW_CARD_NOT_FOUND");
    return first;
  }
  /** Review only ideas already introduced, keeping archived histories out of general practice. */
  function visibleReviewCards() {
    ensureAuthoredReviewCards();
    const introduced = new Set<string>();
    for (const bundle of content.listedBundles) {
      for (const lesson of bundle.lessons) {
        const questionIds = [
          ...lesson.questionIds,
          ...lesson.steps.flatMap((step) => (step.checkQuestionId ? [step.checkQuestionId] : [])),
        ];
        if (questionIds.some((id) => store.hasQuestionEvidence(id, false)))
          for (const id of lesson.flashcardIds) introduced.add(id);
      }
    }
    return content.flashcards
      .filter((item) => content.isListed(item.courseId))
      .flatMap((item) => {
        const saved = store.getReviewCard(item.card.id);
        return saved && (introduced.has(item.card.id) || saved.state.lastReviewedAt !== null)
          ? [saved]
          : [];
      });
  }
  function safeReviewSession(sessionId: string) {
    const session = store.getReviewSession(sessionId);
    if (!session) throw new HttpError(404, "Review session not found.", "REVIEW_SESSION_NOT_FOUND");
    const card = store.getReviewCard(session.cardId);
    if (!card) throw new HttpError(404, "Review card not found.", "REVIEW_CARD_NOT_FOUND");
    return {
      sessionId: session.id,
      card: {
        cardId: card.card.id,
        questionId: card.card.questionId,
        front: card.card.front,
        conceptIds: card.card.conceptIds,
        conceptTitles: card.card.conceptIds.flatMap((id) => {
          const concept = content.concepts.find((item) => item.id === id);
          return concept ? [concept.title] : [];
        }),
        revealed: false as const,
      },
      rated: session.rated,
      mode: session.mode,
      response: session.response,
      correct: session.correct,
    };
  }
  app.get("/api/review", async () => {
    const cards = visibleReviewCards();
    // Newly introduced cards are registered at their own current instant.
    // Read the cutoff afterwards so the first queue response includes them.
    const timestamp = store.now();
    const dueCount = cards.filter((item) => item.state.dueAt <= timestamp).length;
    const courses = content.courseSummaries().flatMap((course) => {
      const inCourse = cards.filter((item) => item.courseId === course.id);
      return inCourse.length
        ? [
            {
              courseId: course.id,
              title: course.title,
              cardCount: inCourse.length,
              dueCount: inCourse.filter((item) => item.state.dueAt <= timestamp).length,
              nextDueAt: inCourse.map((item) => item.state.dueAt).sort()[0] ?? null,
            },
          ]
        : [];
    });
    return {
      dueCount,
      estimatedMinutes: dueCount === 0 ? 0 : Math.max(2, dueCount * 2),
      courses,
    };
  });
  app.post("/api/review/sessions", async (request) => {
    const body = ReviewSessionCreateSchema.parse(request.body ?? {});
    ensureAuthoredReviewCards();
    if (body.lessonId) {
      const lesson = content.getLesson(body.lessonId);
      if (!lesson) throw new HttpError(404, "Lesson not found.", "LESSON_NOT_FOUND");
      const cardId = body.cardId ?? lesson.lesson.flashcardIds[0];
      if (!cardId || !lesson.lesson.flashcardIds.includes(cardId))
        throw new HttpError(
          404,
          "This card does not belong to the lesson.",
          "REVIEW_CARD_NOT_FOUND",
        );
      return safeReviewSession(store.createReviewSession(cardId, body.mode).id);
    }
    if (body.cardId)
      throw new HttpError(400, "Choose a lesson with the card.", "REVIEW_LESSON_REQUIRED");
    const visible = visibleReviewCards();
    const ids = new Set(visible.map((item) => item.card.id));
    const next = store.dueReviewQueue(store.now()).find((item) => ids.has(item.cardId));
    const due = next
      ? store.getReviewCard(next.cardId)
      : visible.sort((a, b) => a.state.dueAt.localeCompare(b.state.dueAt))[0];
    if (!due)
      throw new HttpError(404, "Try a lesson first; its ideas will appear here.", "REVIEW_EMPTY");
    return safeReviewSession(store.createReviewSession(due.card.id, body.mode).id);
  });
  app.post("/api/review/sessions/:sessionId/respond", async (request) => {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const body = ReviewRecallRequestSchema.parse(request.body);
    const session = store.getReviewSession(sessionId);
    if (!session || session.revealed || session.rated || session.response !== null)
      throw new HttpError(
        409,
        "The first recall is already recorded or the answer has been revealed.",
        "REVIEW_RECALL_UNAVAILABLE",
      );
    const authority = content.flashcards.find((item) => item.card.id === session.cardId)?.card
      .answerAuthority;
    const correct = authority
      ? authority.kind === "numeric"
        ? assessNumericAnswer(body.response, authority).correct
        : (() => {
            const result = assessTextAnswer(body.response, authority);
            return result.coverage === 1 && result.rejectedIdeasFound.length === 0;
          })()
      : null;
    if (!store.recordReviewRecall(sessionId, body.response, correct))
      throw new HttpError(409, "The recall could not be recorded.", "REVIEW_RECALL_UNAVAILABLE");
    return {
      response: body.response,
      correct,
      feedback:
        correct === null
          ? "Reveal the answer and compare it with your response."
          : correct
            ? "Correct."
            : "Compare your response with the answer before returning to it.",
    };
  });
  app.get("/api/review/sessions/:sessionId", async (request) => {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    return safeReviewSession(sessionId);
  });
  app.post("/api/review/sessions/:sessionId/reveal", async (request) => {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const card = store.revealReviewSession(sessionId);
    if (!card)
      throw new HttpError(
        409,
        "This review session cannot reveal another answer.",
        "REVIEW_REVEAL_UNAVAILABLE",
      );
    return {
      sessionId,
      cardId: card.card.id,
      back: card.card.back,
      sourceIds: card.card.sourceIds,
    };
  });
  app.post("/api/review/sessions/:sessionId/rate", async (request) => {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const body = ReviewRateRequestSchema.parse(request.body);
    const result = store.rateReviewSession(sessionId, body.rating, body.recalled);
    if (!result)
      throw new HttpError(
        409,
        store.getReviewSession(sessionId)?.revealed
          ? "This card has already been reviewed. Open a new card."
          : "Reveal the card before rating this review.",
        "REVIEW_RATE_UNAVAILABLE",
      );
    return {
      sessionId,
      rating: body.rating,
      evidence: result.evidence,
      dueAt: result.state.dueAt,
      intervalDays: result.state.intervalDays,
      repetition: result.state.repetition,
      xpGained: result.xpGained,
    };
  });
  app.get("/api/lessons/current", async () => content.currentLesson(store.courseActivity()));
  app.get("/api/notebook/:lessonId", async (request) => {
    const { lessonId } = LessonParamsSchema.parse(request.params);
    assertLessonExists(lessonId);
    return getNotebookPage(store.database, lessonId);
  });
  app.put("/api/notebook/:lessonId", async (request) => {
    const { lessonId } = LessonParamsSchema.parse(request.params);
    assertLessonExists(lessonId);
    const body = NotebookSaveRequestSchema.parse(request.body);
    return saveNotebookPage(store.database, lessonId, body);
  });

  app.get("/api/visuals/circuit.svg", async (request, reply) => {
    const query = CircuitQuerySchema.parse(request.query);
    const showValues =
      query.values === undefined ? true : z.boolean().parse(coerceQueryBoolean(query.values));
    reply.type("image/svg+xml; charset=utf-8").header("Cache-Control", "no-store");
    // A named lesson draws its own authored circuit. Without one, the query alone describes a
    // single-resistor loop, which is what the explorer varies.
    if (query.lessonId !== undefined) {
      const spec = content.getLesson(query.lessonId)?.lesson.circuitSpec;
      if (!spec) throw new HttpError(404, "The lesson has no circuit visual.", "VISUAL_NOT_FOUND");
      return renderCircuitSvg(spec);
    }
    return renderCircuitSvg({
      id: "explorer-circuit",
      voltage: query.voltage,
      resistance: query.resistance,
      showCurrentArrow: true,
      showValues,
      batteryLabel: "Battery",
      resistorLabel: "Resistor",
    });
  });
  app.get("/api/visuals/graph.svg", async (request, reply) => {
    const query = GraphQuerySchema.parse(request.query);
    reply.type("image/svg+xml; charset=utf-8").header("Cache-Control", "no-store");
    return renderOhmsLawGraphSvg({ id: "ohms-law-graph", resistance: query.resistance });
  });
  /**
   * Draw something. Deliberately a POST the learner triggers rather than something a reply does
   * on its own: a picture costs about 150k tokens of the owner's subscription and two minutes,
   * so it happens when it is asked for, and never twice for the same request.
   */
  app.post("/api/illustrations", async (request): Promise<IllustrationResponse> => {
    const body = IllustrationRequestSchema.parse(request.body);
    // Checked here rather than only in the interface. The interface hides the control when the
    // capability is absent, but a stale page, a direct call, or a subscription that lapsed
    // mid-session would otherwise start a generation that can only fail two minutes later.
    const capability = illustrationsCapability();
    if (capability.state === "unavailable") {
      throw new HttpError(503, capability.reason, "ILLUSTRATIONS_UNAVAILABLE");
    }
    const record = await requestIllustration(body);
    return {
      key: record.key,
      status: record.status,
      alt: record.alt,
      url: record.status === "ready" ? `/api/illustrations/${record.key}/image` : "",
      detail: record.detail,
    };
  });

  app.get("/api/illustrations/:key", async (request): Promise<IllustrationResponse> => {
    const { key } = IllustrationParamsSchema.parse(request.params);
    const record = await readIllustration(key);
    if (!record) throw new HttpError(404, "No such illustration.", "ILLUSTRATION_NOT_FOUND");
    return {
      key: record.key,
      status: record.status,
      alt: record.alt,
      url: record.status === "ready" ? `/api/illustrations/${record.key}/image` : "",
      detail: record.detail,
    };
  });

  app.get("/api/illustrations/:key/image", async (request, reply) => {
    const { key } = IllustrationParamsSchema.parse(request.params);
    let file: Buffer;
    try {
      file = await readFile(illustrationImagePath(key));
    } catch {
      throw new HttpError(404, "No such illustration.", "ILLUSTRATION_NOT_FOUND");
    }
    return reply
      .type("image/png")
      .header("Cache-Control", "public, max-age=31536000, immutable")
      .send(file);
  });

  app.post("/api/visuals/image-prompt", async (request) => {
    const body = ImagePromptBodySchema.parse(request.body);
    const brief = content.visualBriefs().find((item) => item.id === body.visualBriefId);
    if (!brief) throw new HttpError(404, "Visual brief not found.", "VISUAL_NOT_FOUND");
    return { prompt: createImageGenerationPrompt(brief), visualBrief: brief };
  });

  app.post("/api/writing/lint", async (request) => {
    const body = WritingLintRequestSchema.parse(request.body);
    const result = lintText(body.text, {
      context: body.context,
      ...(body.hiddenAnswer === undefined ? {} : { hiddenAnswer: body.hiddenAnswer }),
    });
    store.recordWritingGate(body.context, body.text, result);
    return result;
  });

  app.post("/api/activity-attempts", async (request) => {
    const body = ActivityAttemptRequestSchema.parse(request.body);
    const activity = content.getActivity(body.activityId);
    if (!activity) throw new HttpError(404, "Activity not found.", "ACTIVITY_NOT_FOUND");
    const previous = body.attemptId ? store.getAttempt(body.attemptId) : null;
    const questionId = `activity:${activity.id}`;
    if (body.attemptId && !previous)
      throw new HttpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
    if (previous && (previous.questionId !== questionId || previous.mode !== body.mode))
      throw new HttpError(
        409,
        "This attempt belongs to another activity or mode.",
        "ATTEMPT_MISMATCH",
      );
    if (previous?.correct)
      throw new HttpError(409, "This attempt is complete.", "ATTEMPT_COMPLETE");
    let outcome: { correct: boolean; explanation: string; firstMisplacedId?: string };
    if (
      activity.type === "diagram_choice" &&
      typeof body.response === "string" &&
      activity.targets.some((target) => target.id === body.response)
    ) {
      outcome = evaluateDiagramChoice(activity, body.response);
    } else if (
      activity.type === "order_sequence" &&
      Array.isArray(body.response) &&
      body.response.length === activity.items.length &&
      new Set(body.response).size === body.response.length &&
      body.response.every((id) => activity.items.some((item) => item.id === id))
    ) {
      outcome = evaluateOrderSequence(activity, body.response);
    } else if (
      activity.type === "graph_plot" &&
      typeof body.response === "object" &&
      !Array.isArray(body.response) &&
      body.response.x >= activity.x.min &&
      body.response.x <= activity.x.max &&
      body.response.y >= activity.y.min &&
      body.response.y <= activity.y.max
    ) {
      outcome = evaluateGraphPlot(activity, body.response);
    } else {
      throw new HttpError(
        400,
        "Use a response supported by this activity.",
        "INVALID_ACTIVITY_RESPONSE",
      );
    }
    const evidence = scoreAttempt({
      correct: outcome.correct,
      mode: body.mode,
      hintsUsed: 0,
      answerRevealed: false,
      difficulty: 1,
    });
    const conceptMastery = Object.fromEntries(
      activity.conceptIds.map((id) => [
        id,
        outcome.correct
          ? updateMastery(store.getMastery(id), evidence.masteryEvidence)
          : store.getMastery(id),
      ]),
    );
    const saved = store.saveAttempt({
      ...(body.attemptId ? { id: body.attemptId } : {}),
      questionId,
      response: JSON.stringify(body.response),
      mode: body.mode,
      correct: outcome.correct,
      feedback: outcome.explanation,
      xpAwarded: evidence.xp,
      mastery: Math.min(...Object.values(conceptMastery)),
      conceptIds: activity.conceptIds,
      conceptMastery,
      independent: evidence.independent,
    });
    // The result becomes public only after a valid response has been recorded.
    return {
      attemptId: saved.id,
      correct: outcome.correct,
      explanation: outcome.explanation,
      xpGained: saved.xpGained ?? 0,
      ...(outcome.firstMisplacedId ? { firstMisplacedId: outcome.firstMisplacedId } : {}),
    };
  });

  app.post("/api/attempts", async (request) => {
    const body = AttemptBodySchema.parse(request.body);
    const question = content.getQuestion(body.questionId);
    if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
    const previous = body.attemptId
      ? store.getAttempt(body.attemptId)
      : store.getOpenAttempt(question.id, body.mode);
    if (body.attemptId && !previous)
      throw new HttpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
    if (previous && previous.questionId !== question.id)
      throw new HttpError(409, "Attempt belongs to another question.", "ATTEMPT_MISMATCH");
    if (previous && previous.mode !== body.mode) {
      throw new HttpError(
        409,
        "Start a new attempt to change tutoring mode.",
        "ATTEMPT_MODE_LOCKED",
      );
    }
    if (previous?.correct) {
      throw new HttpError(
        409,
        "This attempt is complete. Start a new attempt to answer again.",
        "ATTEMPT_COMPLETE",
      );
    }
    if (previous?.answerRevealed) {
      throw new HttpError(
        409,
        "The worked answer has already closed this attempt.",
        "ANSWER_ALREADY_REVEALED",
      );
    }
    const assessment = assessResponse(question, body.response);
    const qualifying =
      question.answerAuthority.kind === "numeric"
        ? parseNumericAnswer(body.response) !== null
        : question.choices?.length
          ? question.choices.some((choice) => choice.label === body.response.trim())
          : Boolean(body.response.trim());
    const evidence = scoreAttempt({
      correct: assessment.correct,
      mode: body.mode,
      hintsUsed:
        (previous?.hintCount ?? 0) + (previous && store.hasTutorAssistance(previous.id) ? 1 : 0),
      answerRevealed: previous?.answerRevealed ?? false,
      difficulty: question.difficulty,
    });
    const conceptMastery = Object.fromEntries(
      question.conceptIds.map((id) => {
        const current = store.getMastery(id);
        return [
          id,
          assessment.correct ? updateMastery(current, evidence.masteryEvidence) : current,
        ];
      }),
    );
    const masteryValues = Object.values(conceptMastery);
    const mastery = masteryValues.length === 0 ? 0 : Math.min(...masteryValues);
    const saved = store.saveAttempt({
      ...(previous ? { id: previous.id } : {}),
      questionId: question.id,
      response: body.response,
      mode: body.mode,
      correct: assessment.correct,
      feedback: assessment.feedback,
      xpAwarded: evidence.xp,
      mastery,
      conceptIds: question.conceptIds,
      conceptMastery,
      independent: evidence.independent,
      qualifying,
    });
    return {
      attemptId: saved.id,
      correct: saved.correct,
      feedback: saved.feedback,
      xpAwarded: saved.xpAwarded,
      xpGained: saved.xpGained ?? 0,
      mastery: saved.mastery,
      independent: evidence.independent,
      qualifying,
      ...(assessment.specific ? { specific: true } : {}),
    };
  });

  app.post("/api/attempts/:attemptId/lesson-feedback", async (request) => {
    const { attemptId } = z.object({ attemptId: z.string().uuid() }).parse(request.params);
    const body = LessonFeedbackRequestSchema.parse(request.body);
    const attempt = store.getAttempt(attemptId);
    if (!attempt) throw new HttpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
    if (attempt.mode === "exam")
      throw new HttpError(
        403,
        "Lesson explanations are unavailable in Exam mode.",
        "EXAM_GUARDRAIL",
      );
    const bundle = content.bundle(body.courseId);
    const lesson = bundle?.lessons.find((item) => item.id === body.lessonId);
    if (!bundle || !lesson) throw new HttpError(404, "Lesson not found.", "LESSON_NOT_FOUND");
    const belongs = body.stepId
      ? content.stepQuestionIds(lesson, body.stepId).includes(attempt.questionId)
      : lesson.questionIds.includes(attempt.questionId);
    if (!belongs)
      throw new HttpError(
        409,
        "The attempt does not belong to this lesson question.",
        "ATTEMPT_MISMATCH",
      );
    const question = content.getQuestion(attempt.questionId);
    if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
    const meaningful =
      question.answerAuthority.kind === "numeric"
        ? parseNumericAnswer(attempt.response) !== null
        : question.choices?.length
          ? question.choices.some((choice) => choice.label === attempt.response.trim())
          : Boolean(attempt.response.trim());
    if (!meaningful)
      throw new HttpError(
        409,
        "Enter an answer in the requested form before continuing.",
        "LESSON_NEEDS_RESPONSE",
      );
    // Opening the explanation after a wrong answer is the worked answer, recorded as
    // assistance; after a correct one it is only the idea, and records nothing.
    store.recordLessonExplanation(attemptId);
    const choiceId = question.choices?.find(
      (choice) => assessResponse(question, choice.label).correct,
    )?.id;
    return {
      attemptId,
      correct: attempt.correct,
      answer:
        question.answerAuthority.kind === "numeric"
          ? question.answerAuthority.workedAnswer
          : question.answerAuthority.exampleAnswer,
      blocks: body.stepId ? content.stepReveal(lesson, body.stepId) : [],
      reviewRequired: !attempt.correct,
      ...(question.onCorrect ? { onCorrect: question.onCorrect } : {}),
      ...(choiceId ? { correctChoiceId: choiceId } : {}),
    };
  });

  app.post("/api/attempts/:attemptId/hints", async (request) => {
    const { attemptId } = z.object({ attemptId: z.string().uuid() }).parse(request.params);
    const attempt = store.getAttempt(attemptId);
    if (!attempt) throw new HttpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
    if (attempt.correct)
      throw new HttpError(409, "This attempt is already complete.", "ATTEMPT_COMPLETE");
    if (attempt.answerRevealed)
      throw new HttpError(
        409,
        "The worked answer has already closed this attempt.",
        "ANSWER_ALREADY_REVEALED",
      );
    if (attempt.mode === "exam")
      throw new HttpError(403, "Hints are unavailable in exam mode.", "EXAM_GUARDRAIL");
    const question = content.getQuestion(attempt.questionId);
    if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
    const index = attempt.hintCount;
    const hint = question.hints[index];
    if (!hint) throw new HttpError(409, "No further hints are available.", "HINTS_EXHAUSTED");
    const level = store.recordHint(attemptId, hint);
    return { hint, level, remaining: Math.max(0, question.hints.length - level) };
  });

  app.post("/api/attempts/:attemptId/reveal/start", async (request) => {
    const { attemptId } = z.object({ attemptId: z.string().uuid() }).parse(request.params);
    const body = RevealStartRequestSchema.parse(request.body);
    const attempt = store.getAttempt(attemptId);
    if (!attempt) throw new HttpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
    if (attempt.mode === "exam")
      throw new HttpError(403, "Answers are unavailable in exam mode.", "EXAM_GUARDRAIL");
    if (attempt.correct)
      throw new HttpError(409, "This attempt is already correct.", "ANSWER_NOT_REQUIRED");
    if (attempt.answerRevealed)
      throw new HttpError(
        409,
        "The worked answer has already been shown.",
        "ANSWER_ALREADY_REVEALED",
      );
    const availableAt = new Date(Date.now() + revealDelayMs).toISOString();
    const reveal = store.createReveal(attemptId, body.reason, availableAt);
    return {
      token: reveal.token,
      availableAt: reveal.availableAt,
      confirmationPhrase: "show answer" as const,
    };
  });

  app.post("/api/attempts/:attemptId/reveal/confirm", async (request) => {
    const { attemptId } = z.object({ attemptId: z.string().uuid() }).parse(request.params);
    const body = RevealConfirmRequestSchema.parse(request.body);
    if (body.confirmation.trim().toLocaleLowerCase() !== "show answer")
      throw new HttpError(400, "Type 'show answer' to confirm.", "CONFIRMATION_MISMATCH");
    const reveal = store.getReveal(body.token);
    if (!reveal || reveal.attemptId !== attemptId)
      throw new HttpError(404, "Reveal token not found for this attempt.", "REVEAL_NOT_FOUND");
    if (reveal.usedAt)
      throw new HttpError(409, "Reveal token has already been used.", "REVEAL_USED");
    if (Date.now() < Date.parse(reveal.availableAt))
      throw new HttpError(425, "The reflection period has not finished.", "REVEAL_WAIT");
    const attempt = store.getAttempt(attemptId);
    if (!attempt) throw new HttpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
    if (attempt.correct)
      throw new HttpError(409, "This attempt is already complete.", "ATTEMPT_COMPLETE");
    if (attempt.answerRevealed)
      throw new HttpError(
        409,
        "The worked answer has already been shown.",
        "ANSWER_ALREADY_REVEALED",
      );
    const question = content.getQuestion(attempt.questionId);
    if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
    if (!store.consumeReveal(body.token))
      throw new HttpError(409, "Reveal token has already been used.", "REVEAL_USED");
    const answer =
      question.answerAuthority.kind === "numeric"
        ? question.answerAuthority.workedAnswer
        : question.answerAuthority.exampleAnswer;
    return { answer, transferPrompt: question.transfer?.prompt ?? null };
  });

  app.post("/api/tutor/companion/packets", async (request) => {
    const body = CompanionBodySchema.parse(request.body);
    const requestId = randomUUID();
    if (body.operation === "tutor_reply") {
      const replyRequest = TutorReplyRequestSchema.parse(body.payload);
      if (replyRequest.mode === "exam") {
        throw new HttpError(
          403,
          "ChatGPT assistance is unavailable in Exam mode.",
          "EXAM_GUARDRAIL",
        );
      }
      const packet = buildCompanionPacket({
        operation: body.operation,
        requestId,
        payload: buildTutorReplyPayload(
          content.currentLesson(store.courseActivity()),
          replyRequest,
        ),
      });
      return { ...packet, requestId, operation: body.operation };
    }
    const packet = buildCompanionPacket({
      operation: body.operation,
      requestId,
      payload: body.payload ?? currentLessonPacketPayload(),
    });
    return { ...packet, requestId, operation: body.operation };
  });

  app.post("/api/tutor/companion/import", async (request) => {
    const body = CompanionImportBodySchema.parse(request.body);
    let raw: unknown;
    try {
      raw = JSON.parse(body.text) as unknown;
    } catch {
      throw new HttpError(
        400,
        "The companion response is not valid JSON.",
        "COMPANION_JSON_INVALID",
      );
    }
    const envelope = TutorEnvelopeBaseSchema.parse(raw);

    if (envelope.operation === "tutor_reply") {
      if (!body.mode)
        throw new HttpError(
          400,
          "The tutoring mode is required for a tutor reply.",
          "TUTOR_MODE_REQUIRED",
        );
      const boundToReference =
        body.referenceQuestionId !== undefined || body.referenceEssayId !== undefined;
      if (boundToReference && body.questionId)
        throw new HttpError(
          400,
          "Choose a generic or reference question context.",
          "TUTOR_CONTEXT_MISMATCH",
        );
      if (boundToReference && body.attemptId !== undefined) {
        throw new HttpError(
          400,
          "Reference tutoring is not linked to a generic attempt.",
          "REFERENCE_ATTEMPT_UNSUPPORTED",
        );
      }
      // The pasted reply is re-resolved against server state rather than trusted from the packet,
      // so a mode changed between copying and pasting is caught here and not honoured.
      let currentLesson: LessonResponse;
      let question: Question | undefined;
      if (body.referenceQuestionId !== undefined) {
        question = resolveRomanReferenceTutorQuestion(store, {
          referenceQuestionId: body.referenceQuestionId,
          mode: body.mode,
        }).question;
        currentLesson = lessonForRomanReferenceTutor(content, body.referenceQuestionId);
      } else if (body.referenceEssayId !== undefined) {
        resolveRomanReferenceTutorEssay(store, { mode: body.mode });
        question = privateEssayQuestionForRomanReference();
        currentLesson = lessonForRomanReferenceEssayTutor(content);
      } else {
        const lesson = body.lessonId
          ? content.getLesson(body.lessonId)
          : content.currentLesson(store.courseActivity());
        if (!lesson) throw new HttpError(404, "Lesson not found.", "LESSON_NOT_FOUND");
        ({ lesson: currentLesson, question } = genericTutorContext(
          content,
          store,
          lesson,
          body.mode,
          body.questionId,
          body.attemptId,
        ));
      }
      if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
      // The pasted reply and the directly generated reply share this gate.
      return acceptTutorReply({
        envelope,
        expectedRequestId: body.expectedRequestId,
        mode: body.mode,
        lesson: currentLesson,
        question,
        store,
        ...(boundToReference ? {} : { attemptId: body.attemptId }),
        ...(body.referenceQuestionId === undefined
          ? {}
          : { referenceQuestionId: body.referenceQuestionId }),
        ...(body.referenceEssayId === undefined ? {} : { referenceEssayId: body.referenceEssayId }),
      });
    }

    if (envelope.operation !== "draft_lesson")
      return {
        accepted: true,
        operation: envelope.operation,
        requestId: envelope.requestId,
        issues: [],
      };
    const draft = LessonDraftSchema.parse(envelope.payload);
    const textFields: Array<[string, string, WritingContext]> = [
      ["title", draft.title, "lesson"],
      ["orientation", draft.orientation, "lesson"],
      ["explanation", draft.explanation, "lesson"],
      ["responsePrompt", draft.responsePrompt, "question"],
      ...draft.hints.map((hint, index): [string, string, WritingContext] => [
        `hints.${index}`,
        hint,
        "hint",
      ]),
    ];
    const issues = textFields.flatMap(([field, text, context]) =>
      lintText(text, { context }).violations.map((violation) => ({
        field,
        code: violation.ruleId,
        severity: violation.severity,
        message: violation.message,
      })),
    );
    issues.push(
      ...inspectVisualBrief(draft.visualBrief).map((issue) => ({
        field: "visualBrief",
        code: issue.code,
        severity: "hard" as const,
        message: issue.message,
      })),
    );
    return {
      accepted: issues.every((issue) => issue.severity !== "hard"),
      operation: envelope.operation,
      requestId: envelope.requestId,
      issues,
      draft,
    };
  });
}
