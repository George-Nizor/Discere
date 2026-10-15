import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import {
  RustProjectActionSchema,
  RustProjectDefinitionSchema,
  RustProjectSessionSchema,
  RustProjectsResponseSchema,
  RustProjectStartSchema,
  RustTaskRunSchema,
  type RustProjectAction,
  type RustProjectCollection,
  type RustProjectDefinition,
  type RustProjectSession,
  type TutoringMode,
} from "@discere/contracts";
import { courseDirectories, loadRustProjects } from "@discere/curriculum";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ContentRepository } from "../content.js";
import type { DiscereStore } from "../db/store.js";
import { HttpError } from "../errors.js";
import { mark, present, runCases } from "./grading.js";
import type { RustRuntime } from "./runtime.js";

export class RustProjectRepository {
  constructor(readonly collections: RustProjectCollection[]) {}
  static async load(root: string, content: ContentRepository) {
    const collections: RustProjectCollection[] = [];
    for (const directory of await courseDirectories(root)) {
      const bundle = content.bundles.find((b) => b.course.id === directory);
      if (!bundle || !content.isListed(bundle.course.id)) continue;
      const collection = await loadRustProjects(path.join(root, directory), bundle);
      if (collection) collections.push(collection);
    }
    return new RustProjectRepository(collections);
  }
  find(courseId: string, projectId: string) {
    return this.collections
      .find((c) => c.courseId === courseId)
      ?.projects.find((p) => p.id === projectId);
  }
}

const USER = "local-user";
const StateSchema = z
  .object({
    code: z.string(),
    hints: z.number().int().nonnegative(),
    assisted: z.boolean(),
    revealed: z.boolean(),
    history: z.array(
      z
        .object({
          code: z.string(),
          correct: z.boolean(),
          independent: z.boolean(),
          at: z.string(),
        })
        .strict(),
    ),
    run: RustTaskRunSchema.optional(),
    checkedCode: z.string().optional(),
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
  definition_json: string;
  mode: TutoringMode;
  revision: number;
  current_index: number;
  states_json: string;
  completed_at: string | null;
  xp: number;
}
const hash = (p: RustProjectDefinition) =>
  createHash("sha256").update(JSON.stringify(p)).digest("hex");
const conflict = () =>
  new HttpError(
    409,
    "This project changed in another tab. Reload its saved progress before continuing.",
    "RUST_PROJECT_CONFLICT",
  );

export class RustProjectService {
  constructor(
    private readonly store: DiscereStore,
    private readonly repository: RustProjectRepository,
    private readonly runtime: RustRuntime,
    private readonly revealDelayMs = 5000,
  ) {}
  private row(id: string): Row {
    const row = this.store.database
      .prepare("SELECT * FROM rust_project_sessions WHERE id = ? AND user_id = ?")
      .get(id, USER) as Row | undefined;
    if (!row) throw new HttpError(404, "This project was not found.", "RUST_PROJECT_NOT_FOUND");
    return row;
  }
  private saved(courseId: string, project: RustProjectDefinition) {
    return this.store.database
      .prepare(
        "SELECT * FROM rust_project_sessions WHERE user_id = ? AND course_id = ? AND project_id = ? AND project_hash = ?",
      )
      .get(USER, courseId, project.id, hash(project)) as Row | undefined;
  }
  summaries(courseId: string) {
    const collection = this.repository.collections.find((c) => c.courseId === courseId);
    return RustProjectsResponseSchema.parse({
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
      throw new HttpError(404, "This project was not found.", "RUST_PROJECT_NOT_FOUND");
    return this.store.database.transaction(() => {
      const existing = this.saved(courseId, definition);
      if (existing) {
        if (existing.mode !== mode)
          throw new HttpError(409, "This saved project's mode cannot change.", "RUST_MODE_LOCKED");
        return this.session(existing.id);
      }
      const id = randomUUID();
      const states: State[] = definition.tasks.map((t) => ({
        code: t.starter,
        hints: 0,
        assisted: false,
        revealed: false,
        history: [],
      }));
      this.store.database
        .prepare(
          "INSERT INTO rust_project_sessions (id,user_id,course_id,project_id,project_hash,definition_json,mode,states_json,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
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
  session(id: string): RustProjectSession {
    const row = this.row(id);
    const def = RustProjectDefinitionSchema.parse(JSON.parse(row.definition_json));
    const states = z.array(StateSchema).parse(JSON.parse(row.states_json));
    const task = def.tasks[row.current_index],
      state = states[row.current_index];
    const exam = row.mode === "exam";
    const visible = task?.cases[0];
    const current =
      task && state && visible
        ? {
            id: task.id,
            title: task.title,
            prompt: task.prompt,
            lessonId: task.lessonId,
            kind: task.kind,
            ...(task.call ? { call: task.call } : {}),
            example: {
              ...(visible.stdin !== undefined ? { stdin: visible.stdin } : {}),
              ...(visible.arguments ? { arguments: visible.arguments } : {}),
              expected: visible.expected,
            },
            code: state.code,
            hints: exam ? [] : task.hints.slice(0, state.hints),
            hintsRemaining:
              exam || state.correct || state.revealed ? 0 : task.hints.length - state.hints,
            assisted: state.assisted,
            locked:
              state.revealed || state.correct === true || (exam && state.correct !== undefined),
            canContinue:
              state.revealed || (state.correct !== undefined && state.checkedCode === state.code),
            // An exam keeps a check's pass count private until the end, like its verdict.
            ...(state.run
              ? {
                  run:
                    exam && state.run.total !== undefined
                      ? { ...state.run, passed: undefined, total: undefined }
                      : state.run,
                }
              : {}),
            ...(!exam && state.correct !== undefined && state.checkedCode === state.code
              ? { feedback: { correct: state.correct, message: state.message ?? "" } }
              : {}),
            ...(state.revealed
              ? { solution: { code: task.solution, explanation: task.explanation } }
              : {}),
          }
        : undefined;
    return RustProjectSessionSchema.parse({
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
              code: states[i]!.code,
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
  private repeated(id: string, input: RustProjectAction) {
    const previous = this.store.database
      .prepare("SELECT request_json FROM rust_project_actions WHERE session_id = ? AND request_id = ?")
      .get(id, input.requestId) as { request_json: string } | undefined;
    if (!previous) return false;
    if (previous.request_json !== JSON.stringify(input))
      throw new HttpError(
        409,
        "This request identifier already belongs to another action.",
        "RUST_REQUEST_REUSED",
      );
    return true;
  }
  async action(id: string, input: RustProjectAction): Promise<RustProjectSession> {
    if (this.repeated(id, input)) return this.session(id);
    const row = this.row(id);
    if (row.revision !== input.revision) throw conflict();
    const definition = RustProjectDefinitionSchema.parse(JSON.parse(row.definition_json));
    const states = z.array(StateSchema).parse(JSON.parse(row.states_json));
    const task = definition.tasks[row.current_index],
      state = states[row.current_index];
    if (row.completed_at || !task || !state || task.id !== input.taskId)
      throw new HttpError(409, "Continue from the current saved task.", "RUST_PROJECT_ORDER");
    const exam = row.mode === "exam";
    const closed =
      state.revealed || state.correct === true || (exam && state.correct !== undefined);
    const canContinue =
      state.revealed || (state.correct !== undefined && state.checkedCode === state.code);
    if (closed && input.action !== "next" && input.action !== "finish")
      throw new HttpError(
        409,
        "This task is already complete. Continue to the next one.",
        "RUST_RESPONSE_LOCKED",
      );
    if (exam && ["hint", "reveal_start", "reveal_confirm"].includes(input.action))
      throw new HttpError(403, "Hints and solutions are unavailable during an exam.", "EXAM_GUARDRAIL");
    if (input.action === "finish") {
      if (!exam)
        throw new HttpError(403, "Continue through the project tasks to finish.", "RUST_FINISH_MODE");
      if (!closed && input.code !== undefined) state.code = input.code;
    }
    if (["save", "run", "check"].includes(input.action)) {
      if (input.code === undefined)
        throw new HttpError(400, "Send your program with this action.", "RUST_CODE_REQUIRED");
      if (input.action !== "save" && !input.code.trim())
        throw new HttpError(400, "Write a program first.", "RUST_CODE_REQUIRED");
      if (state.code !== input.code) {
        state.code = input.code;
        delete state.run;
        delete state.message;
        delete state.correct;
        delete state.checkedCode;
        delete state.reveal;
      }
    }
    if (input.action === "run") {
      const [visible] = await runCases(this.runtime, task, state.code, 1);
      state.run = present(task, visible!);
    } else if (input.action === "check") {
      if (state.history.length >= 100)
        throw new HttpError(
          409,
          "This task has reached 100 checks. Use its hints or the worked program, then continue.",
          "RUST_CHECK_LIMIT",
        );
      const marked = await mark(this.runtime, task, state.code);
      const correct = marked.correct;
      state.run = marked.run;
      state.history.push({
        code: state.code,
        correct,
        independent: correct && !state.assisted,
        at: this.store.now(),
      });
      state.firstCorrect ??= correct;
      state.correct = correct;
      state.checkedCode = state.code;
      state.message = correct
        ? task.explanation
        : (marked.examplePassed
            ? "This works for the example, but not for every test input. "
            : "") + task.correction;
      if (!correct && !exam) state.assisted = true;
    } else if (input.action === "hint") {
      if (state.hints >= task.hints.length)
        throw new HttpError(409, "All hints for this task are already open.", "RUST_HINTS_EXHAUSTED");
      state.hints += 1;
      state.assisted = true;
    } else if (input.action === "reveal_start") {
      if (!input.reason)
        throw new HttpError(
          400,
          "Say what you want to compare with the worked program.",
          "RUST_REVEAL_REASON",
        );
      state.reveal = {
        token: randomUUID(),
        availableAt: new Date(Date.parse(this.store.now()) + this.revealDelayMs).toISOString(),
        reason: input.reason,
      };
    } else if (input.action === "reveal_confirm") {
      if (!state.reveal || input.token !== state.reveal.token)
        throw new HttpError(404, "This worked-program request is no longer active.", "RUST_REVEAL_NOT_FOUND");
      if (input.confirmation?.trim().toLowerCase() !== "show answer")
        throw new HttpError(400, "Type 'show answer' to confirm.", "CONFIRMATION_MISMATCH");
      if (this.store.now() < state.reveal.availableAt)
        throw new HttpError(425, "The reflection period has not finished.", "REVEAL_WAIT");
      state.revealed = true;
      state.assisted = true;
      delete state.reveal;
    } else if (input.action === "next" && !canContinue) {
      throw new HttpError(409, "Check your program before continuing.", "RUST_RESPONSE_REQUIRED");
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
          const key = "rust-project:" + row.course_id + ":" + item.id;
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
          "UPDATE rust_project_sessions SET revision = revision + 1, current_index = ?, states_json = ?, completed_at = ?, xp = ? WHERE id = ? AND user_id = ?",
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
          "INSERT INTO rust_project_actions (session_id,request_id,request_json,occurred_at) VALUES (?,?,?,?)",
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
export async function registerRustProjectRoutes(app: FastifyInstance, service: RustProjectService) {
  app.get("/api/courses/:courseId/rust-projects", (request) => {
    const { courseId } = z
      .object({ courseId: z.string().min(1).max(120) })
      .strict()
      .parse(request.params);
    return service.summaries(courseId);
  });
  app.post("/api/courses/:courseId/rust-projects/:projectId", (request) => {
    const { courseId, projectId } = StartParams.parse(request.params);
    return service.start(courseId, projectId, RustProjectStartSchema.parse(request.body).mode);
  });
  app.get("/api/rust-projects/:sessionId", (request) =>
    service.session(SessionParams.parse(request.params).sessionId),
  );
  app.post("/api/rust-projects/:sessionId/actions", (request) =>
    service.action(
      SessionParams.parse(request.params).sessionId,
      RustProjectActionSchema.parse(request.body),
    ),
  );
}
