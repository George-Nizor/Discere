import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { AttemptRequestSchema, EssaySaveRequestSchema, LessonDraftSchema, NotebookSaveRequestSchema, ReviewRateRequestSchema, RevealConfirmRequestSchema, RevealStartRequestSchema, StageProgressRequestSchema, TutorEnvelopeBaseSchema, TutorOperationSchema, TutorReplyDraftSchema, TutorReplyRequestSchema, TutoringModeSchema, WritingLintRequestSchema } from "@discere/contracts";
import { createFlashcardFromReviewedQuestion, createReviewState, scoreAttempt, updateMastery } from "@discere/progression-engine";
import { buildCompanionPacket } from "@discere/tutor-providers";
import { createImageGenerationPrompt, inspectVisualBrief, renderCircuitSvg, renderOhmsLawGraphSvg } from "@discere/visual-engine";
import { lintText, type WritingContext } from "@discere/writing-engine";
import { z } from "zod";
import { assessResponse } from "./assessment.js";
import { buildTutorReplyPayload, validateTutorReply } from "./companion.js";
import type { ContentRepository } from "./content.js";
import type { DiscereStore } from "./db/store.js";
import { HttpError } from "./errors.js";
import { ensureNotebookSchema, getNotebookPage, saveNotebookPage } from "./notebook.js";
import { coerceQueryBoolean } from "./query-coercion.js";

export interface RouteDependencies { content: ContentRepository; store: DiscereStore; revealDelayMs: number; }
const AttemptBodySchema = AttemptRequestSchema.extend({ attemptId: z.string().uuid().optional() });
const CompanionBodySchema = z.object({ operation: TutorOperationSchema.default("draft_lesson"), payload: z.unknown().optional() }).strict();
const ImagePromptBodySchema = z.object({ visualBriefId: z.string().min(1) }).strict();
const CompanionImportBodySchema = z.object({ text: z.string().min(2).max(500_000), mode: TutoringModeSchema.optional(), expectedRequestId: z.string().uuid() }).strict();
const LessonParamsSchema = z.object({ lessonId: z.string().min(1).max(200) }).strict();
const CourseParamsSchema = z.object({ courseId: z.string().min(1).max(200) }).strict();
const JourneyParamsSchema = z.object({ courseId: z.string().min(1).max(200), lessonId: z.string().min(1).max(200) }).strict();
const StageParamsSchema = JourneyParamsSchema.extend({ stageId: z.string().min(1).max(240) }).strict();
const EssayParamsSchema = z.object({ essayId: z.string().min(1).max(240) }).strict();
const CircuitQuerySchema = z.object({
  voltage: z.coerce.number().positive().max(100).default(5),
  resistance: z.coerce.number().positive().max(1_000_000).default(100),
  values: z.unknown().optional(),
});
const GraphQuerySchema = z.object({ resistance: z.coerce.number().positive().max(1_000_000).default(100) });

export async function registerRoutes(app: FastifyInstance, dependencies: RouteDependencies): Promise<void> {
  const { content, store, revealDelayMs } = dependencies;
  ensureNotebookSchema(store.database);

  function assertLessonExists(lessonId: string): void {
    if (!content.bundle.lessons.some((lesson) => lesson.id === lessonId)) {
      throw new HttpError(404, "Lesson not found.", "LESSON_NOT_FOUND");
    }
  }

  app.get("/api/health", async () => ({ status: "ok", service: "discere", version: "0.1.0" }));
  app.get("/api/home", async () => ({ ...store.getProfile(), currentMission: { id: "mission-current", title: "Follow the current", description: "Explore one circuit and calculate its current.", estimatedMinutes: 8, lessonBeatId: content.currentLesson.lesson.id }, progress: store.getProgress() }));
  app.get("/api/courses", async () => ({ courses: [content.courseSummary] }));
  app.get("/api/courses/:courseId", async (request) => {
    const { courseId } = CourseParamsSchema.parse(request.params);
    if (courseId !== content.courseSummary.id) throw new HttpError(404, "Course not found.", "COURSE_NOT_FOUND");
    return content.courseDetail;
  });
  app.get("/api/courses/:courseId/lessons/:lessonId/journey", async (request) => {
    const { courseId, lessonId } = JourneyParamsSchema.parse(request.params);
    if (courseId !== content.courseSummary.id) throw new HttpError(404, "Course not found.", "COURSE_NOT_FOUND");
    const journey = content.getJourney(lessonId);
    if (!journey) throw new HttpError(404, "Lesson journey not found.", "JOURNEY_NOT_FOUND");
    return journey;
  });
  app.get("/api/courses/:courseId/lessons/:lessonId/stages/:stageId", async (request) => {
    const { courseId, lessonId, stageId } = StageParamsSchema.parse(request.params);
    if (courseId !== content.courseSummary.id) throw new HttpError(404, "Course not found.", "COURSE_NOT_FOUND");
    const journey = content.getJourney(lessonId);
    const stage = journey?.stages.find((item) => item.id === stageId);
    if (!journey || !stage) throw new HttpError(404, "Stage not found.", "STAGE_NOT_FOUND");
    return stage;
  });
  app.get("/api/courses/:courseId/lessons/:lessonId/progress", async (request) => {
    const { courseId, lessonId } = JourneyParamsSchema.parse(request.params);
    if (courseId !== content.courseSummary.id) throw new HttpError(404, "Course not found.", "COURSE_NOT_FOUND");
    const journey = content.getJourney(lessonId);
    if (!journey) throw new HttpError(404, "Lesson journey not found.", "JOURNEY_NOT_FOUND");
    return store.getJourneyProgress(journey.id, journey.stageOrder);
  });
  app.put("/api/courses/:courseId/lessons/:lessonId/progress", async (request) => {
    const { courseId, lessonId } = JourneyParamsSchema.parse(request.params);
    if (courseId !== content.courseSummary.id) throw new HttpError(404, "Course not found.", "COURSE_NOT_FOUND");
    const journey = content.getJourney(lessonId);
    if (!journey) throw new HttpError(404, "Lesson journey not found.", "JOURNEY_NOT_FOUND");
    const body = StageProgressRequestSchema.parse(request.body);
    try {
      return store.saveStageProgress(journey.id, journey.stageOrder, body);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Stage '")) throw new HttpError(409, error.message, "STAGE_NOT_IN_JOURNEY");
      throw error;
    }
  });
  app.get("/api/essays/:essayId", async (request) => {
    const { essayId } = EssayParamsSchema.parse(request.params);
    const journey = content.getJourney(content.currentLesson.lesson.id);
    const stage = journey?.stages.find((item) => item.type === "essay" && item.essayId === essayId);
    if (!stage || stage.type !== "essay") throw new HttpError(404, "Essay not found.", "ESSAY_NOT_FOUND");
    const draft = store.getEssayDraft(essayId);
    return { ...draft, wordCount: draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0 };
  });
  app.put("/api/essays/:essayId", async (request) => {
    const { essayId } = EssayParamsSchema.parse(request.params);
    const body = EssaySaveRequestSchema.parse(request.body);
    const journey = content.getJourney(content.currentLesson.lesson.id);
    const stage = journey?.stages.find((item) => item.type === "essay" && item.essayId === essayId);
    if (!stage || stage.type !== "essay") throw new HttpError(404, "Essay not found.", "ESSAY_NOT_FOUND");
    const draft = store.saveEssayDraft(essayId, body.content);
    return { ...draft, wordCount: draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0 };
  });
  app.post("/api/essays/:essayId/submit", async (request) => {
    const { essayId } = EssayParamsSchema.parse(request.params);
    const body = EssaySaveRequestSchema.parse(request.body);
    const journey = content.getJourney(content.currentLesson.lesson.id);
    const stage = journey?.stages.find((item) => item.type === "essay" && item.essayId === essayId);
    if (!stage || stage.type !== "essay") throw new HttpError(404, "Essay not found.", "ESSAY_NOT_FOUND");
    const wordCount = body.content.trim() ? body.content.trim().split(/\s+/).length : 0;
    if (wordCount < stage.minWords) throw new HttpError(400, `Write at least ${stage.minWords} words before submitting.`, "ESSAY_TOO_SHORT");
    const lint = lintText(body.content, { context: "assessment" });
    store.recordWritingGate("assessment", body.content, lint);
    if (!lint.passed) throw new HttpError(400, "Revise the highlighted writing issues before submitting.", "ESSAY_WRITING_GATE");
    const saved = store.submitEssay(essayId, body.content);
    return { essayId: saved.essayId, submitted: true as const, wordCount, feedback: "Your teach-back has been saved as submitted evidence." };
  });
  function ensureDefaultReviewCard() {
    const question = content.getQuestion(content.currentLesson.question.id);
    if (!question) throw new HttpError(404, "Review question not found.", "REVIEW_QUESTION_NOT_FOUND");
    const reviewedAt = new Date().toISOString();
    const card = createFlashcardFromReviewedQuestion({ question, reviewedAt });
    return store.ensureReviewCard(card, createReviewState(card.id, reviewedAt));
  }
  function safeReviewSession(sessionId: string) {
    const session = store.getReviewSession(sessionId);
    if (!session) throw new HttpError(404, "Review session not found.", "REVIEW_SESSION_NOT_FOUND");
    const card = store.getReviewCard(session.cardId);
    if (!card) throw new HttpError(404, "Review card not found.", "REVIEW_CARD_NOT_FOUND");
    return { sessionId: session.id, card: { cardId: card.card.id, questionId: card.card.questionId, front: card.card.front, conceptIds: card.card.conceptIds, revealed: false as const }, rated: session.rated };
  }
  app.get("/api/review", async () => {
    ensureDefaultReviewCard();
    const dueCount = store.countDueReviewCards(new Date().toISOString());
    return { dueCount, estimatedMinutes: dueCount === 0 ? 0 : Math.max(2, dueCount * 2) };
  });
  app.post("/api/review/sessions", async () => {
    const card = ensureDefaultReviewCard();
    const due = store.getDueReviewCard(new Date().toISOString()) ?? card;
    return safeReviewSession(store.createReviewSession(due.card.id).id);
  });
  app.get("/api/review/sessions/:sessionId", async (request) => {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    return safeReviewSession(sessionId);
  });
  app.post("/api/review/sessions/:sessionId/reveal", async (request) => {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const card = store.revealReviewSession(sessionId);
    if (!card) throw new HttpError(409, "This review session cannot reveal another answer.", "REVIEW_REVEAL_UNAVAILABLE");
    return { sessionId, cardId: card.card.id, back: card.card.back, sourceIds: card.card.sourceIds };
  });
  app.post("/api/review/sessions/:sessionId/rate", async (request) => {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const body = ReviewRateRequestSchema.parse(request.body);
    const result = store.rateReviewSession(sessionId, body.rating, body.recalled);
    if (!result) throw new HttpError(409, "Reveal the card before rating this review.", "REVIEW_RATE_UNAVAILABLE");
    return { sessionId, rating: body.rating, evidence: result.evidence, dueAt: result.state.dueAt, intervalDays: result.state.intervalDays, repetition: result.state.repetition };
  });
  app.get("/api/lessons/current", async () => content.currentLesson);
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
    const showValues = query.values === undefined ? true : z.boolean().parse(coerceQueryBoolean(query.values));
    const base = content.currentLesson.lesson.circuitSpec;
    if (!base) throw new HttpError(404, "The lesson has no circuit visual.", "VISUAL_NOT_FOUND");
    reply.type("image/svg+xml; charset=utf-8").header("Cache-Control", "no-store");
    return renderCircuitSvg({ ...base, voltage: query.voltage, resistance: query.resistance, showValues });
  });
  app.get("/api/visuals/graph.svg", async (request, reply) => {
    const query = GraphQuerySchema.parse(request.query);
    reply.type("image/svg+xml; charset=utf-8").header("Cache-Control", "no-store");
    return renderOhmsLawGraphSvg({ id: "ohms-law-graph", resistance: query.resistance });
  });
  app.post("/api/visuals/image-prompt", async (request) => {
    const body = ImagePromptBodySchema.parse(request.body);
    const brief = content.bundle.lessons.map((item) => item.visualBrief).find((item) => item.id === body.visualBriefId);
    if (!brief) throw new HttpError(404, "Visual brief not found.", "VISUAL_NOT_FOUND");
    return { prompt: createImageGenerationPrompt(brief), visualBrief: brief };
  });

  app.post("/api/writing/lint", async (request) => {
    const body = WritingLintRequestSchema.parse(request.body);
    const result = lintText(body.text, { context: body.context, ...(body.hiddenAnswer === undefined ? {} : { hiddenAnswer: body.hiddenAnswer }) });
    store.recordWritingGate(body.context, body.text, result);
    return result;
  });

  app.post("/api/attempts", async (request) => {
    const body = AttemptBodySchema.parse(request.body);
    const question = content.getQuestion(body.questionId);
    if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
    const previous = body.attemptId ? store.getAttempt(body.attemptId) : null;
    if (body.attemptId && !previous) throw new HttpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
    if (previous && previous.questionId !== question.id) throw new HttpError(409, "Attempt belongs to another question.", "ATTEMPT_MISMATCH");
    if (previous && previous.mode !== body.mode) {
      throw new HttpError(409, "Start a new attempt to change tutoring mode.", "ATTEMPT_MODE_LOCKED");
    }
    if (previous?.correct) {
      throw new HttpError(409, "This attempt is complete. Start a new attempt to answer again.", "ATTEMPT_COMPLETE");
    }
    if (previous?.answerRevealed) {
      throw new HttpError(409, "The worked answer has already closed this attempt.", "ANSWER_ALREADY_REVEALED");
    }
    const assessment = assessResponse(question, body.response);
    const evidence = scoreAttempt({ correct: assessment.correct, mode: body.mode, hintsUsed: previous?.hintCount ?? 0, answerRevealed: previous?.answerRevealed ?? false, difficulty: question.difficulty });
    const conceptMastery = Object.fromEntries(
      question.conceptIds.map((id) => {
        const current = store.getMastery(id);
        return [id, assessment.correct ? updateMastery(current, evidence.masteryEvidence) : current];
      }),
    );
    const masteryValues = Object.values(conceptMastery);
    const mastery = masteryValues.length === 0 ? 0 : Math.min(...masteryValues);
    const saved = store.saveAttempt({ ...(body.attemptId === undefined ? {} : { id: body.attemptId }), questionId: question.id, response: body.response, mode: body.mode, correct: assessment.correct, feedback: assessment.feedback, xpAwarded: evidence.xp, mastery, conceptIds: question.conceptIds, conceptMastery, independent: evidence.independent });
    return { attemptId: saved.id, correct: saved.correct, feedback: saved.feedback, xpAwarded: saved.xpAwarded, mastery: saved.mastery, independent: evidence.independent };
  });

  app.post("/api/attempts/:attemptId/hints", async (request) => {
    const { attemptId } = z.object({ attemptId: z.string().uuid() }).parse(request.params);
    const attempt = store.getAttempt(attemptId);
    if (!attempt) throw new HttpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
    if (attempt.correct) throw new HttpError(409, "This attempt is already complete.", "ATTEMPT_COMPLETE");
    if (attempt.answerRevealed) throw new HttpError(409, "The worked answer has already closed this attempt.", "ANSWER_ALREADY_REVEALED");
    if (attempt.mode === "exam") throw new HttpError(403, "Hints are unavailable in exam mode.", "EXAM_GUARDRAIL");
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
    if (attempt.mode === "exam") throw new HttpError(403, "Answers are unavailable in exam mode.", "EXAM_GUARDRAIL");
    if (attempt.correct) throw new HttpError(409, "This attempt is already correct.", "ANSWER_NOT_REQUIRED");
    if (attempt.answerRevealed) throw new HttpError(409, "The worked answer has already been shown.", "ANSWER_ALREADY_REVEALED");
    const availableAt = new Date(Date.now() + revealDelayMs).toISOString();
    const reveal = store.createReveal(attemptId, body.reason, availableAt);
    return { token: reveal.token, availableAt: reveal.availableAt, confirmationPhrase: "show answer" as const };
  });

  app.post("/api/attempts/:attemptId/reveal/confirm", async (request) => {
    const { attemptId } = z.object({ attemptId: z.string().uuid() }).parse(request.params);
    const body = RevealConfirmRequestSchema.parse(request.body);
    if (body.confirmation.trim().toLocaleLowerCase() !== "show answer") throw new HttpError(400, "Type 'show answer' to confirm.", "CONFIRMATION_MISMATCH");
    const reveal = store.getReveal(body.token);
    if (!reveal || reveal.attemptId !== attemptId) throw new HttpError(404, "Reveal token not found for this attempt.", "REVEAL_NOT_FOUND");
    if (reveal.usedAt) throw new HttpError(409, "Reveal token has already been used.", "REVEAL_USED");
    if (Date.now() < Date.parse(reveal.availableAt)) throw new HttpError(425, "The reflection period has not finished.", "REVEAL_WAIT");
    const attempt = store.getAttempt(attemptId);
    if (!attempt) throw new HttpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
    if (attempt.correct) throw new HttpError(409, "This attempt is already complete.", "ATTEMPT_COMPLETE");
    if (attempt.answerRevealed) throw new HttpError(409, "The worked answer has already been shown.", "ANSWER_ALREADY_REVEALED");
    const question = content.getQuestion(attempt.questionId);
    if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
    if (!store.consumeReveal(body.token)) throw new HttpError(409, "Reveal token has already been used.", "REVEAL_USED");
    const answer = question.answerAuthority.kind === "numeric" ? question.answerAuthority.workedAnswer : question.answerAuthority.exampleAnswer;
    return { answer, transferPrompt: "A 6 V battery is connected across a 200 Ω resistor. Calculate the current in amperes." };
  });

  app.post("/api/tutor/companion/packets", async (request) => {
    const body = CompanionBodySchema.parse(request.body);
    const requestId = randomUUID();
    if (body.operation === "tutor_reply") {
      const replyRequest = TutorReplyRequestSchema.parse(body.payload);
      if (replyRequest.mode === "exam") {
        throw new HttpError(403, "ChatGPT assistance is unavailable in Exam mode.", "EXAM_GUARDRAIL");
      }
      const packet = buildCompanionPacket({
        operation: body.operation,
        requestId,
        payload: buildTutorReplyPayload(content.currentLesson, replyRequest),
      });
      return { ...packet, requestId, operation: body.operation };
    }
    const packet = buildCompanionPacket({
      operation: body.operation,
      requestId,
      payload: body.payload ?? { lesson: content.currentLesson, sourceIds: content.currentLesson.lesson.sourceIds },
    });
    return { ...packet, requestId, operation: body.operation };
  });

  app.post("/api/tutor/companion/import", async (request) => {
    const body = CompanionImportBodySchema.parse(request.body);
    let raw: unknown;
    try { raw = JSON.parse(body.text) as unknown; }
    catch { throw new HttpError(400, "The companion response is not valid JSON.", "COMPANION_JSON_INVALID"); }
    const envelope = TutorEnvelopeBaseSchema.parse(raw);

    if (envelope.operation === "tutor_reply") {
      if (envelope.requestId !== body.expectedRequestId) {
        throw new HttpError(
          409,
          "This response belongs to a different tutor request. Copy the latest prompt and try again.",
          "COMPANION_REQUEST_MISMATCH",
        );
      }
      if (!body.mode) throw new HttpError(400, "The tutoring mode is required for a tutor reply.", "TUTOR_MODE_REQUIRED");
      if (body.mode === "exam") throw new HttpError(403, "ChatGPT assistance is unavailable in Exam mode.", "EXAM_GUARDRAIL");
      const reply = TutorReplyDraftSchema.parse(envelope.payload);
      const currentLesson = content.currentLesson;
      const question = content.getQuestion(currentLesson.question.id);
      if (!question) throw new HttpError(404, "Question not found.", "QUESTION_NOT_FOUND");
      const issues = validateTutorReply({ reply, mode: body.mode, lesson: currentLesson, question });
      return {
        accepted: issues.every((issue) => issue.severity !== "hard"),
        operation: envelope.operation,
        requestId: envelope.requestId,
        issues,
        reply,
      };
    }

    if (envelope.operation !== "draft_lesson") return { accepted: true, operation: envelope.operation, requestId: envelope.requestId, issues: [] };
    const draft = LessonDraftSchema.parse(envelope.payload);
    const textFields: Array<[string, string, WritingContext]> = [
      ["title", draft.title, "lesson"],
      ["orientation", draft.orientation, "lesson"],
      ["explanation", draft.explanation, "lesson"],
      ["responsePrompt", draft.responsePrompt, "question"],
      ...draft.hints.map((hint, index): [string, string, WritingContext] => [`hints.${index}`, hint, "hint"]),
    ];
    const issues = textFields.flatMap(([field, text, context]) => lintText(text, { context }).violations.map((violation) => ({ field, code: violation.ruleId, severity: violation.severity, message: violation.message })));
    issues.push(...inspectVisualBrief(draft.visualBrief).map((issue) => ({ field: "visualBrief", code: issue.code, severity: "hard" as const, message: issue.message })));
    return { accepted: issues.every((issue) => issue.severity !== "hard"), operation: envelope.operation, requestId: envelope.requestId, issues, draft };
  });
}
