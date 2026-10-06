import { createHash, randomUUID } from "node:crypto";
import { assessNumericAnswer } from "@discere/assessment-engine";
import {
  CourseCheckDefinitionSchema,
  CourseCheckResponseRequestSchema,
  CourseCheckSessionSchema,
  CourseChecksResponseSchema,
  learnerQuestion,
  type CourseBundle,
  type CourseCheckDefinition,
  type CourseCheckResponseRequest,
  type CourseCheckSession,
  type CourseCheckSummary,
} from "@discere/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { assessResponse } from "./assessment.js";
import type { ContentRepository } from "./content.js";
import type { DiscereStore } from "./db/store.js";
import { HttpError } from "./errors.js";

const USER = "local-user";
const day = 86_400_000;
const Params = z
  .object({ courseId: z.string().min(1).max(200), checkId: z.string().min(1).max(100) })
  .strict();
const SessionParams = z.object({ sessionId: z.string().uuid() }).strict();
const SavedResponseSchema = CourseCheckResponseRequestSchema.extend({
  correct: z.boolean(),
  submittedAt: z.string().datetime(),
});
type SavedResponse = z.infer<typeof SavedResponseSchema>;
interface Row {
  id: string;
  course_id: string;
  check_id: string;
  check_hash: string;
  course_title: string;
  definition_json: string;
  lesson_titles_json: string;
  responses_json: string;
  created_at: string;
  completed_at: string | null;
  xp: number;
}
function hash(check: CourseCheckDefinition) {
  return createHash("sha256").update(JSON.stringify(check)).digest("hex");
}
function explanation(item: CourseCheckDefinition["items"][number]) {
  const authority = item.question.answerAuthority;
  return authority.kind === "numeric" ? authority.workedAnswer : authority.exampleAnswer;
}
function publicItem(item: CourseCheckDefinition["items"][number]) {
  return { lessonId: item.lessonId, visual: item.visual, question: learnerQuestion(item.question) };
}

/**
 * Lessons a placement shows the learner already knows: every question drawn from the lesson
 * answered correctly, and none of them marked as a guess. A lucky guess places nobody out.
 */
export function placedOutLessonIds(
  items: Array<{ lessonId: string }>,
  responses: Array<{ correct: boolean; confidence: string }>,
): Set<string> {
  const byLesson = new Map<string, boolean>();
  items.forEach((item, index) => {
    const response = responses[index];
    const known = Boolean(response?.correct) && response?.confidence !== "unsure";
    byLesson.set(item.lessonId, (byLesson.get(item.lessonId) ?? true) && known);
  });
  return new Set([...byLesson].filter(([, known]) => known).map(([id]) => id));
}

/** How many lessons a placement recommends starting with, in course order. */
const PLACEMENT_START_COUNT = 3;

/** Full definitions stay in the server snapshot; responses become immutable on submission. */
export class CourseCheckService {
  constructor(
    private readonly store: DiscereStore,
    private readonly content: ContentRepository,
  ) {}
  private find(courseId: string, check: CourseCheckDefinition): Row | undefined {
    return this.store.database
      .prepare(
        "SELECT * FROM course_check_sessions WHERE user_id = ? AND course_id = ? AND check_id = ? AND check_hash = ?",
      )
      .get(USER, courseId, check.id, hash(check)) as Row | undefined;
  }
  private row(id: string): Row {
    const row = this.store.database
      .prepare("SELECT * FROM course_check_sessions WHERE user_id = ? AND id = ?")
      .get(USER, id) as Row | undefined;
    if (!row) throw new HttpError(404, "This check was not found.", "CHECK_NOT_FOUND");
    return row;
  }
  private definition(courseId: string, checkId: string) {
    const bundle = this.content.listedBundles.find((b) => b.course.id === courseId);
    const check = bundle?.courseChecks?.find((c) => c.id === checkId);
    if (!bundle || !check)
      throw new HttpError(404, "This course check was not found.", "CHECK_NOT_FOUND");
    return { bundle, check };
  }
  private summary(bundle: CourseBundle, check: CourseCheckDefinition): CourseCheckSummary {
    const row = this.find(bundle.course.id, check);
    const remainingLessons = check.requiredLessonIds.filter((id) => {
      const journey = this.content.getJourney(bundle.course.id, id);
      if (!journey) return true;
      const progress = this.store.getJourneyProgress(journey.id, journey.stageOrder);
      return journey.stages.some(
        (stage) =>
          !stage.optional &&
          !progress.stages.some(
            (saved) => saved.stageId === stage.id && saved.state === "completed",
          ),
      );
    }).length;
    const prerequisite =
      check.afterCheckId && bundle.courseChecks?.find((c) => c.id === check.afterCheckId);
    const previous = prerequisite ? this.find(bundle.course.id, prerequisite) : undefined;
    const availableAt =
      previous?.completed_at && check.delayDays
        ? new Date(Date.parse(previous.completed_at) + check.delayDays * day).toISOString()
        : undefined;
    const locked =
      remainingLessons > 0 ||
      (check.kind === "transfer" && (!availableAt || availableAt > this.store.now()));
    const responses = row ? z.array(SavedResponseSchema).parse(JSON.parse(row.responses_json)) : [];
    return {
      id: check.id,
      courseId: bundle.course.id,
      courseTitle: bundle.course.title,
      kind: check.kind,
      title: check.title,
      description: check.description,
      questionCount: check.items.length,
      status: row?.completed_at
        ? "complete"
        : row
          ? "in_progress"
          : locked
            ? "locked"
            : "available",
      ...(row ? { sessionId: row.id } : {}),
      ...(availableAt ? { availableAt } : {}),
      remainingLessons,
      ...(row?.completed_at ? { correctCount: responses.filter((r) => r.correct).length } : {}),
    };
  }
  summaries(courseId?: string) {
    const bundles = this.content.listedBundles.filter((b) => !courseId || b.course.id === courseId);
    if (courseId && !bundles.length)
      throw new HttpError(404, "Course not found.", "COURSE_NOT_FOUND");
    return CourseChecksResponseSchema.parse({
      checks: bundles.flatMap((b) => (b.courseChecks ?? []).map((c) => this.summary(b, c))),
    });
  }
  due() {
    return CourseChecksResponseSchema.parse({
      checks: this.summaries().checks.filter(
        (c) => c.kind === "transfer" && (c.status === "available" || c.status === "in_progress"),
      ),
    });
  }
  start(courseId: string, checkId: string): CourseCheckSession {
    const { bundle, check } = this.definition(courseId, checkId);
    return this.store.database.transaction(() => {
      const existing = this.find(courseId, check);
      if (existing) return this.session(existing.id);
      const summary = this.summary(bundle, check);
      if (summary.status === "locked")
        throw new HttpError(
          409,
          summary.remainingLessons
            ? "Finish the course lessons before this challenge."
            : "This later check is not due yet.",
          "CHECK_LOCKED",
        );
      const id = randomUUID();
      this.store.database
        .prepare(`INSERT INTO course_check_sessions
        (id, user_id, course_id, check_id, check_hash, course_title, definition_json, lesson_titles_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          id,
          USER,
          courseId,
          checkId,
          hash(check),
          bundle.course.title,
          JSON.stringify(check),
          JSON.stringify(bundle.lessons.map((l) => ({ id: l.id, title: l.title }))),
          this.store.now(),
        );
      return this.session(id);
    })();
  }
  session(id: string): CourseCheckSession {
    const row = this.row(id);
    const check = CourseCheckDefinitionSchema.parse(JSON.parse(row.definition_json));
    const responses = z.array(SavedResponseSchema).parse(JSON.parse(row.responses_json));
    const titles = z
      .array(z.object({ id: z.string(), title: z.string() }))
      .parse(JSON.parse(row.lesson_titles_json));
    const base = {
      id: row.id,
      courseId: row.course_id,
      courseTitle: row.course_title,
      checkId: row.check_id,
      kind: check.kind,
      title: check.title,
      description: check.description,
      createdAt: row.created_at,
      total: check.items.length,
      answered: responses.length,
    };
    if (!row.completed_at)
      return CourseCheckSessionSchema.parse({
        ...base,
        current: publicItem(check.items[responses.length]!),
      });
    const weak = new Set(
      check.items.filter((_, i) => !responses[i]!.correct).map((i) => i.lessonId),
    );
    // A placement recommends where to start: the first few lessons, in course order, that it
    // did not show the learner already knows. A checkpoint lists the lessons it found weak.
    const placedOut = placedOutLessonIds(check.items, responses);
    const recommended =
      check.kind === "placement"
        ? titles.filter((l) => !placedOut.has(l.id)).slice(0, PLACEMENT_START_COUNT)
        : titles.filter((l) => weak.has(l.id));
    const next = this.summaries().checks.find(
      (c) => c.courseId === row.course_id && c.kind === "transfer" && c.status !== "complete",
    );
    return CourseCheckSessionSchema.parse({
      ...base,
      result: {
        completedAt: row.completed_at,
        correct: responses.filter((r) => r.correct).length,
        xp: row.xp,
        items: check.items.map((item, index) => ({
          ...publicItem(item),
          response:
            item.question.choices?.find((c) => c.id === responses[index]!.response)?.label ??
            responses[index]!.response,
          confidence: responses[index]!.confidence,
          correct: responses[index]!.correct,
          explanation: explanation(item),
        })),
        recommendedLessons: recommended,
        ...(check.kind === "checkpoint" && next?.availableAt
          ? { nextCheckAt: next.availableAt }
          : {}),
      },
    });
  }
  respond(id: string, input: CourseCheckResponseRequest): CourseCheckSession {
    return this.store.database.transaction(() => {
      const row = this.row(id);
      const check = CourseCheckDefinitionSchema.parse(JSON.parse(row.definition_json));
      const responses = z.array(SavedResponseSchema).parse(JSON.parse(row.responses_json));
      const previous = responses.find((r) => r.questionId === input.questionId);
      if (previous) {
        if (previous.response === input.response && previous.confidence === input.confidence)
          return this.session(id);
        throw new HttpError(409, "This response has already been saved.", "CHECK_RESPONSE_LOCKED");
      }
      const item = check.items[responses.length];
      if (row.completed_at || !item || item.question.id !== input.questionId)
        throw new HttpError(409, "Answer the current question before continuing.", "CHECK_ORDER");
      const question = item.question;
      let response = input.response;
      if (question.choices) {
        const choice = question.choices.find((c) => c.id === response);
        if (!choice)
          throw new HttpError(
            400,
            "Choose one of the displayed answers.",
            "CHECK_RESPONSE_INVALID",
          );
        response = choice.label;
      } else if (question.answerAuthority.kind === "numeric") {
        const marked = assessNumericAnswer(response, question.answerAuthority);
        if (marked.error === "unreadable" || marked.error === "unit_mismatch")
          throw new HttpError(
            400,
            "Enter a number or fraction in the requested unit.",
            "CHECK_RESPONSE_INVALID",
          );
      }
      const marked = assessResponse(question, response);
      responses.push({ ...input, correct: marked.correct, submittedAt: this.store.now() });
      const finished = responses.length === check.items.length;
      let xp = 0;
      if (finished) {
        for (const result of responses) {
          const referenceId =
            "course-check:" + row.course_id + ":" + row.check_id + ":" + result.questionId;
          const key = "answer:" + referenceId;
          if (this.store.study.has(key)) continue;
          this.store.study.record({
            key,
            referenceId,
            kind: "answer",
            correct: result.correct,
            independent: true,
            qualifying: true,
          });
          // Effort on a checkpoint earns a little; a wrong placement answer earns nothing, so a
          // placement never rewards a low score. Evidence is recorded the same either way.
          const award = result.correct ? 8 : check.kind === "placement" ? 0 : 2;
          if (award > 0) this.store.study.reward(award, referenceId);
          xp += award;
        }
      }
      this.store.database
        .prepare(
          "UPDATE course_check_sessions SET responses_json = ?, completed_at = ?, xp = ? WHERE id = ? AND user_id = ?",
        )
        .run(JSON.stringify(responses), finished ? this.store.now() : null, xp, id, USER);
      return this.session(id);
    })();
  }
}
export async function registerCourseCheckRoutes(
  app: FastifyInstance,
  dependencies: { store: DiscereStore; content: ContentRepository },
) {
  const checks = new CourseCheckService(dependencies.store, dependencies.content);
  app.get("/api/courses/:courseId/checks", async (request) => {
    const { courseId } = z
      .object({ courseId: z.string().min(1).max(200) })
      .strict()
      .parse(request.params);
    return checks.summaries(courseId);
  });
  app.get("/api/course-checks/due", async () => checks.due());
  app.post("/api/courses/:courseId/checks/:checkId/start", async (request) => {
    const { courseId, checkId } = Params.parse(request.params);
    z.object({})
      .strict()
      .parse(request.body ?? {});
    return checks.start(courseId, checkId);
  });
  app.get("/api/course-check-sessions/:sessionId", async (request) =>
    checks.session(SessionParams.parse(request.params).sessionId),
  );
  app.post("/api/course-check-sessions/:sessionId/responses", async (request) =>
    checks.respond(
      SessionParams.parse(request.params).sessionId,
      CourseCheckResponseRequestSchema.parse(request.body),
    ),
  );
}
