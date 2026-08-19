import { randomUUID } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import {
  AttemptRequestSchema,
  EssaySaveRequestSchema,
  LessonDraftSchema,
  NotebookSaveRequestSchema,
  RevealConfirmRequestSchema,
  RevealStartRequestSchema,
  ReviewRateRequestSchema,
  StageProgressRequestSchema,
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
import { acceptTutorReply, buildTutorReplyPayload } from "./companion.js";
import type { ContentRepository } from "./content.js";
import type { DiscereStore } from "./db/store.js";
import { HttpError } from "./errors.js";
import { getNotebookPage, saveNotebookPage } from "./notebook.js";
import { coerceQueryBoolean } from "./query-coercion.js";
import type { TopicMapRepository } from "./topic-maps.js";

export interface RouteDependencies {
  content: ContentRepository;
  store: DiscereStore;
  /** Curated outlines for courses that are planned but have no lessons yet. */
  topicMaps: TopicMapRepository;
  revealDelayMs: number;
}
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
  })
  .strict();
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
    const titles = new Map(content.concepts.map((concept) => [concept.id, concept.title]));
    return store
      .getProgress()
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
    courses: content.bundles.length,
  }));
  app.get("/api/home", async () => {
    const { courseId, lessonId } = content.currentLessonId(store.courseActivity());
    const journey = content.getJourney(courseId, lessonId);
    if (!journey)
      throw new HttpError(404, "The current lesson is unavailable.", "LESSON_NOT_FOUND");
    const lesson = content.getLesson(lessonId, courseId);
    return {
      ...store.getProfile(),
      dueReviews: store.dueReviewCount(),
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
  app.get("/api/courses", async () => {
    const built = content.courseSummaries(store.courseActivity(), store.completedLessonsByCourse());
    const planned = topicMaps.plannedSummaries(new Set(built.map((course) => course.id)));
    return { courses: [...built, ...planned] };
  });

  /** Cover art for a course that is planned but not yet written. */
  app.get("/api/roadmap/:courseId/cover.svg", async (request, reply) => {
    const { courseId } = CourseParamsSchema.parse(request.params);
    const absolute = topicMaps.coverPath(courseId);
    if (!absolute) throw new HttpError(404, "No cover.", "ASSET_NOT_FOUND");
    let file: Buffer;
    try {
      file = await readFile(absolute);
    } catch {
      throw new HttpError(404, "No cover.", "ASSET_NOT_FOUND");
    }
    return reply
      .type("image/svg+xml; charset=utf-8")
      .header("Cache-Control", "public, max-age=3600")
      .send(file);
  });

  /**
   * Ten weeks of completions, so the progress screen can draw a calendar of real study rather
   * than a single streak number. Days with nothing done are absent, not zero.
   */
  app.get("/api/progress/activity", async () => {
    const WEEKS = 10;
    const from = new Date(Date.now() - WEEKS * 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
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
    return detail;
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
        revealed: false as const,
      },
      rated: session.rated,
    };
  }
  app.get("/api/review", async () => {
    ensureAuthoredReviewCards();
    const timestamp = store.now();
    const dueCount = store.countDueReviewCards(timestamp);
    // A course row is named by its own title. A card whose course is no longer in the library
    // still counts towards the total, and says so rather than disappearing.
    const courses = store.countDueReviewCardsByCourse(timestamp).map((row) => ({
      courseId: row.courseId,
      title: content.bundle(row.courseId)?.course.title ?? row.courseId,
      dueCount: row.dueCount,
      cardCount: row.cardCount,
      nextDueAt: row.nextDueAt,
    }));
    return {
      dueCount,
      estimatedMinutes: dueCount === 0 ? 0 : Math.max(2, dueCount * 2),
      courses,
    };
  });
  app.post("/api/review/sessions", async () => {
    const card = ensureAuthoredReviewCards();
    const due = store.getDueReviewCard(store.now()) ?? card;
    return safeReviewSession(store.createReviewSession(due.card.id).id);
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
        "Reveal the card before rating this review.",
        "REVIEW_RATE_UNAVAILABLE",
      );
    return {
      sessionId,
      rating: body.rating,
      evidence: result.evidence,
      dueAt: result.state.dueAt,
      intervalDays: result.state.intervalDays,
      repetition: result.state.repetition,
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

  app.post("/api/attempts", async (request) => {
    const body = AttemptBodySchema.parse(request.body);
    const question = content.getQuestion(body.questionId);
    if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
    const previous = body.attemptId ? store.getAttempt(body.attemptId) : null;
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
    const evidence = scoreAttempt({
      correct: assessment.correct,
      mode: body.mode,
      hintsUsed: previous?.hintCount ?? 0,
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
      ...(body.attemptId === undefined ? {} : { id: body.attemptId }),
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
    });
    return {
      attemptId: saved.id,
      correct: saved.correct,
      feedback: saved.feedback,
      xpAwarded: saved.xpAwarded,
      mastery: saved.mastery,
      independent: evidence.independent,
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
      const currentLesson = content.currentLesson(store.courseActivity());
      const question = content.getQuestion(currentLesson.question.id);
      if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
      // The pasted reply and the directly generated reply share this gate.
      return acceptTutorReply({
        envelope,
        expectedRequestId: body.expectedRequestId,
        mode: body.mode,
        lesson: currentLesson,
        question,
        store,
        attemptId: body.attemptId,
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
