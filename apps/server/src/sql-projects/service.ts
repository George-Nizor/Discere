import { createHash, randomUUID } from "node:crypto";
import {
  SqlProjectActionSchema,
  SqlProjectDefinitionSchema,
  SqlProjectSessionSchema,
  SqlProjectsResponseSchema,
  SqlProjectStartSchema,
  SqlResultSchema,
  type SqlProjectAction,
  type SqlProjectDefinition,
  type SqlProjectSession,
  type TutoringMode,
} from "@discere/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { DiscereStore } from "../db/store.js";
import { HttpError } from "../errors.js";
import type { SqlProjectRepository } from "./repository.js";
import { sameSqlResult, type SqlRuntime } from "./runtime.js";

const USER = "local-user";
const StateSchema = z
  .object({
    query: z.string(),
    hints: z.number().int().nonnegative(),
    assisted: z.boolean(),
    revealed: z.boolean(),
    history: z.array(
      z
        .object({
          query: z.string(),
          correct: z.boolean(),
          independent: z.boolean(),
          at: z.string(),
        })
        .strict(),
    ),
    result: SqlResultSchema.optional(),
    error: z.string().optional(),
    checkedQuery: z.string().optional(),
    correct: z.boolean().optional(),
    firstCorrect: z.boolean().optional(),
    message: z.string().optional(),
    reveal: z
      .object({ token: z.string(), availableAt: z.string(), reason: z.string() })
      .strict()
      .optional(),
  })
  .strict();
type State = z.infer<typeof StateSchema>;
interface Row {
  id: string;
  course_id: string;
  project_id: string;
  project_hash: string;
  definition_json: string;
  mode: TutoringMode;
  revision: number;
  current_index: number;
  states_json: string;
  created_at: string;
  completed_at: string | null;
  xp: number;
}
const hash = (p: SqlProjectDefinition) =>
  createHash("sha256").update(JSON.stringify(p)).digest("hex");
const conflict = () =>
  new HttpError(
    409,
    "This project changed in another tab. Reload its saved progress before continuing.",
    "SQL_PROJECT_CONFLICT",
  );
export class SqlProjectService {
  constructor(
    private readonly store: DiscereStore,
    private readonly repository: SqlProjectRepository,
    private readonly runtime: SqlRuntime,
    private readonly revealDelayMs = 5000,
  ) {}
  private row(id: string): Row {
    const row = this.store.database
      .prepare("SELECT * FROM sql_project_sessions WHERE id = ? AND user_id = ?")
      .get(id, USER) as Row | undefined;
    if (!row) throw new HttpError(404, "This project was not found.", "SQL_PROJECT_NOT_FOUND");
    return row;
  }
  private saved(courseId: string, project: SqlProjectDefinition) {
    return this.store.database
      .prepare(
        "SELECT * FROM sql_project_sessions WHERE user_id = ? AND course_id = ? AND project_id = ? AND project_hash = ?",
      )
      .get(USER, courseId, project.id, hash(project)) as Row | undefined;
  }
  summaries(courseId: string) {
    const collection = this.repository.collections.find((c) => c.courseId === courseId);
    return SqlProjectsResponseSchema.parse({
      projects: (collection?.projects ?? []).map((p) => {
        const row = this.saved(courseId, p);
        return {
          id: p.id,
          courseId,
          title: p.title,
          description: p.description,
          taskCount: p.tasks.length,
          completed: row?.current_index ?? 0,
          finished: Boolean(row?.completed_at),
          ...(row ? { sessionId: row.id, mode: row.mode } : {}),
        };
      }),
    });
  }
  start(courseId: string, projectId: string, mode: TutoringMode) {
    const definition = this.repository.find(courseId, projectId);
    if (!definition)
      throw new HttpError(404, "This project was not found.", "SQL_PROJECT_NOT_FOUND");
    return this.store.database.transaction(() => {
      const existing = this.saved(courseId, definition);
      if (existing) {
        if (existing.mode !== mode)
          throw new HttpError(409, "This saved project's mode cannot change.", "SQL_MODE_LOCKED");
        return this.session(existing.id);
      }
      const id = randomUUID();
      const states: State[] = definition.tasks.map((t) => ({
        query: t.starter,
        hints: 0,
        assisted: false,
        revealed: false,
        history: [],
      }));
      this.store.database
        .prepare(
          "INSERT INTO sql_project_sessions (id,user_id,course_id,project_id,project_hash,definition_json,mode,states_json,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          USER,
          courseId,
          projectId,
          hash(definition),
          JSON.stringify(definition),
          mode,
          JSON.stringify(states),
          this.store.now(),
        );
      return this.session(id);
    })();
  }
  session(id: string): SqlProjectSession {
    const row = this.row(id);
    const def = SqlProjectDefinitionSchema.parse(JSON.parse(row.definition_json));
    const states = z.array(StateSchema).parse(JSON.parse(row.states_json));
    const task = def.tasks[row.current_index],
      state = states[row.current_index];
    const exam = row.mode === "exam";
    const current =
      task && state
        ? {
            id: task.id,
            title: task.title,
            prompt: task.prompt,
            lessonId: task.lessonId,
            tables: task.tables,
            outputColumns: task.outputColumns,
            ordered: task.ordered,
            query: state.query,
            hints: exam ? [] : task.hints.slice(0, state.hints),
            hintsRemaining:
              exam || state.correct || state.revealed ? 0 : task.hints.length - state.hints,
            assisted: state.assisted,
            locked:
              state.revealed || state.correct === true || (exam && state.correct !== undefined),
            canContinue:
              state.revealed || (state.correct !== undefined && state.checkedQuery === state.query),
            ...(state.result ? { result: state.result } : {}),
            ...(state.error ? { error: state.error } : {}),
            ...(!exam && state.correct !== undefined && state.checkedQuery === state.query
              ? { feedback: { correct: state.correct, message: state.message ?? "" } }
              : {}),
            ...(state.revealed
              ? { solution: { query: task.solution, explanation: task.explanation } }
              : {}),
          }
        : undefined;
    return SqlProjectSessionSchema.parse({
      id,
      courseId: row.course_id,
      projectId: row.project_id,
      title: def.title,
      mode: row.mode,
      revision: row.revision,
      completed: row.current_index,
      total: def.tasks.length,
      xp: row.xp,
      ...(current ? { current } : {}),
      ...(!exam && state?.reveal
        ? { reveal: { token: state.reveal.token, availableAt: state.reveal.availableAt } }
        : {}),
      ...(row.completed_at
        ? {
            results: def.tasks.map((t, i) => ({
              id: t.id,
              title: t.title,
              lessonId: t.lessonId,
              query: states[i]!.query,
              correct: states[i]!.correct === true && !states[i]!.revealed,
              independent: states[i]!.correct === true && !states[i]!.assisted,
              firstCorrect: states[i]!.firstCorrect === true,
              solution: t.solution,
              explanation: t.explanation,
            })),
          }
        : {}),
    });
  }
  private repeated(id: string, input: SqlProjectAction) {
    const previous = this.store.database
      .prepare(
        "SELECT request_json FROM sql_project_actions WHERE session_id = ? AND request_id = ?",
      )
      .get(id, input.requestId) as { request_json: string } | undefined;
    if (!previous) return false;
    if (previous.request_json !== JSON.stringify(input))
      throw new HttpError(
        409,
        "This request identifier already belongs to another action.",
        "SQL_REQUEST_REUSED",
      );
    return true;
  }
  async action(id: string, input: SqlProjectAction): Promise<SqlProjectSession> {
    if (this.repeated(id, input)) return this.session(id);
    const row = this.row(id);
    if (row.revision !== input.revision) throw conflict();
    const definition = SqlProjectDefinitionSchema.parse(JSON.parse(row.definition_json));
    const states = z.array(StateSchema).parse(JSON.parse(row.states_json));
    const task = definition.tasks[row.current_index],
      state = states[row.current_index];
    if (row.completed_at || !task || !state || task.id !== input.taskId)
      throw new HttpError(409, "Continue from the current saved task.", "SQL_PROJECT_ORDER");
    const exam = row.mode === "exam";
    const closed =
      state.revealed || state.correct === true || (exam && state.correct !== undefined);
    const canContinue =
      state.revealed || (state.correct !== undefined && state.checkedQuery === state.query);
    if (closed && input.action !== "next" && input.action !== "finish")
      throw new HttpError(
        409,
        "This response is already complete. Continue to the next task.",
        "SQL_RESPONSE_LOCKED",
      );
    if (exam && ["hint", "reveal_start", "reveal_confirm"].includes(input.action))
      throw new HttpError(
        403,
        "Hints and solutions are unavailable during an exam.",
        "EXAM_GUARDRAIL",
      );
    if (input.action === "finish") {
      if (!exam)
        throw new HttpError(
          403,
          "Continue through the project tasks to finish.",
          "SQL_FINISH_MODE",
        );
      if (!closed && input.query !== undefined) state.query = input.query;
    }
    if (["save", "run", "check"].includes(input.action)) {
      if (input.query === undefined)
        throw new HttpError(400, "Send your query with this action.", "SQL_QUERY_REQUIRED");
      if (input.action !== "save" && !input.query.trim())
        throw new HttpError(400, "Write a query first.", "SQL_QUERY_REQUIRED");
      if (state.query !== input.query) {
        state.query = input.query;
        delete state.result;
        delete state.error;
        delete state.message;
        delete state.correct;
        delete state.checkedQuery;
        delete state.reveal;
      }
    }
    if (input.action === "run" || input.action === "check") {
      if (state.history.length >= 100)
        throw new HttpError(
          409,
          "This task has reached 100 checks. Use its hints or worked query, then continue.",
          "SQL_CHECK_LIMIT",
        );
      const visible = await this.runtime.execute(state.query, task.tables);
      if ("error" in visible) {
        if (visible.error === "runtime")
          throw new HttpError(503, visible.message, "SQL_RUNTIME_UNAVAILABLE");
        state.error = visible.message;
        delete state.result;
        delete state.correct;
        delete state.checkedQuery;
      } else {
        state.result = visible.result;
        delete state.error;
        if (input.action === "check") {
          let correct = sameSqlResult(visible.result, task.cases[0]!.expected, task.ordered);
          const visibleCorrect = correct;
          // Always run all variants. Timing does not identify a failing private dataset.
          for (const fixture of task.cases.slice(1)) {
            const executed = await this.runtime.execute(state.query, fixture.tables);
            if ("error" in executed && executed.error === "runtime")
              throw new HttpError(503, executed.message, "SQL_RUNTIME_UNAVAILABLE");
            if (
              "error" in executed ||
              !sameSqlResult(executed.result, fixture.expected, task.ordered)
            )
              correct = false;
          }
          state.history.push({
            query: state.query,
            correct,
            independent: correct && !state.assisted,
            at: this.store.now(),
          });
          state.firstCorrect ??= correct;
          state.correct = correct;
          state.checkedQuery = state.query;
          // Exam feedback remains absent from every API surface until final submission.
          state.message = correct
            ? task.explanation
            : (visibleCorrect
                ? "This works for the displayed rows, but fails when the data changes. "
                : "") + task.correction;
          if (!correct && !exam) state.assisted = true;
        }
      }
    } else if (input.action === "hint") {
      if (state.hints >= task.hints.length)
        throw new HttpError(
          409,
          "All hints for this task are already open.",
          "SQL_HINTS_EXHAUSTED",
        );
      state.hints += 1;
      state.assisted = true;
    } else if (input.action === "reveal_start") {
      if (!input.reason)
        throw new HttpError(
          400,
          "Explain what you want to compare with the worked query.",
          "SQL_REVEAL_REASON",
        );
      state.reveal = {
        token: randomUUID(),
        availableAt: new Date(Date.parse(this.store.now()) + this.revealDelayMs).toISOString(),
        reason: input.reason,
      };
    } else if (input.action === "reveal_confirm") {
      if (!state.reveal || input.token !== state.reveal.token)
        throw new HttpError(
          404,
          "This worked-query request is no longer active.",
          "SQL_REVEAL_NOT_FOUND",
        );
      if (input.confirmation?.trim().toLowerCase() !== "show answer")
        throw new HttpError(400, "Type 'show answer' to confirm.", "CONFIRMATION_MISMATCH");
      if (this.store.now() < state.reveal.availableAt)
        throw new HttpError(425, "The reflection period has not finished.", "REVEAL_WAIT");
      state.revealed = true;
      state.assisted = true;
      delete state.reveal;
    } else if (input.action === "next" && !canContinue) {
      throw new HttpError(409, "Check your query before continuing.", "SQL_RESPONSE_REQUIRED");
    }
    return this.store.database.transaction(() => {
      if (this.repeated(id, input)) return this.session(id);
      if (this.row(id).revision !== input.revision) throw conflict();
      let current = row.current_index,
        xp = row.xp;
      if (input.action === "next" || input.action === "finish") {
        current = input.action === "finish" ? definition.tasks.length : current + 1;
        const award = (index: number) => {
          const answer = states[index]!,
            item = definition.tasks[index]!;
          const key = "sql-project:" + row.course_id + ":" + item.id;
          if (this.store.study.has(key)) return;
          const correct = answer.correct === true && !answer.revealed;
          const independent = correct && !answer.assisted;
          const gained = correct ? (independent ? 5 : 2) : 0;
          this.store.study.record({
            key,
            kind: "answer",
            referenceId: key,
            correct,
            independent,
            qualifying: answer.history.length > 0,
          });
          if (gained) this.store.study.reward(gained, key);
          xp += gained;
        };
        if (!exam) award(row.current_index);
        else if (current === definition.tasks.length) states.forEach((_, i) => award(i));
      }
      this.store.database
        .prepare(
          "UPDATE sql_project_sessions SET revision = revision + 1, current_index = ?, states_json = ?, completed_at = ?, xp = ? WHERE id = ? AND user_id = ?",
        )
        .run(
          current,
          JSON.stringify(states),
          current === definition.tasks.length ? this.store.now() : null,
          xp,
          id,
          USER,
        );
      this.store.database
        .prepare(
          "INSERT INTO sql_project_actions (session_id,request_id,request_json,occurred_at) VALUES (?,?,?,?)",
        )
        .run(id, input.requestId, JSON.stringify(input), this.store.now());
      return this.session(id);
    })();
  }
}
const StartParams = z
  .object({ courseId: z.string().min(1).max(120), projectId: z.string().min(1).max(120) })
  .strict();
const SessionParams = z.object({ sessionId: z.string().uuid() }).strict();
export async function registerSqlProjectRoutes(app: FastifyInstance, service: SqlProjectService) {
  app.get("/api/courses/:courseId/sql-projects", (request) => {
    const { courseId } = z
      .object({ courseId: z.string().min(1).max(120) })
      .strict()
      .parse(request.params);
    return service.summaries(courseId);
  });
  app.post("/api/courses/:courseId/sql-projects/:projectId", (request) => {
    const { courseId, projectId } = StartParams.parse(request.params);
    return service.start(courseId, projectId, SqlProjectStartSchema.parse(request.body).mode);
  });
  app.get("/api/sql-projects/:sessionId", (request) =>
    service.session(SessionParams.parse(request.params).sessionId),
  );
  app.post("/api/sql-projects/:sessionId/actions", (request) =>
    service.action(
      SessionParams.parse(request.params).sessionId,
      SqlProjectActionSchema.parse(request.body),
    ),
  );
}
