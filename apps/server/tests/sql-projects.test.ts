import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { SqlProjectSession, SqlProjectAction, SqlResult } from "@discere/contracts";
import { sqlProjects } from "../../../content/sql-from-rows-to-reports/authoring/projects.js";
import { DiscereStore } from "../src/db/store.js";
import { SqlProjectRepository } from "../src/sql-projects/repository.js";
import { SqlProjectService } from "../src/sql-projects/service.js";
import { IsolatedSqlRuntime, type SqlRuntime } from "../src/sql-projects/runtime.js";
const stores: DiscereStore[] = [];
const collection = sqlProjects;
const project = collection.projects[0]!;
function setup(runtime: SqlRuntime = new IsolatedSqlRuntime()) {
  let time = new Date("2026-10-02T00:00:00Z");
  const store = new DiscereStore(":memory:", { migrate: true, clock: () => time });
  stores.push(store);
  const service = new SqlProjectService(
    store,
    new SqlProjectRepository([collection]),
    runtime,
    5000,
  );
  return {
    store,
    service,
    advance: () => {
      time = new Date(time.getTime() + 5000);
    },
  };
}
function action(
  service: SqlProjectService,
  s: SqlProjectSession,
  kind: SqlProjectAction["action"],
  rest: Partial<SqlProjectAction> = {},
) {
  return service.action(s.id, {
    taskId: s.current!.id,
    revision: s.revision,
    requestId: randomUUID(),
    action: kind,
    ...rest,
  });
}
afterEach(() => {
  for (const s of stores.splice(0)) s.close();
});
describe("saved SQL projects", () => {
  it("can end an exam early, preserving checked queries and withholding credit for drafts", async () => {
    const { service } = setup();
    let s = service.start(collection.courseId, project.id, "exam");
    s = await action(service, s, "check", { query: project.tasks[0]!.solution });
    s = await action(service, s, "next");
    s = await action(service, s, "finish", { query: "SELECT item FROM repairs" });
    expect(s.results).toHaveLength(5);
    expect(s.results?.filter((r) => r.correct)).toHaveLength(1);
    expect(s.results?.[1]?.query).toBe("SELECT item FROM repairs");
    expect(s.xp).toBe(5);
    expect(s.current).toBeUndefined();
  });

  it("keeps authority private, saves drafts, accepts alternative queries and rewards only once", async () => {
    const { service, store } = setup();
    let s = service.start(collection.courseId, project.id, "coach");
    expect(JSON.stringify(s)).not.toContain(project.tasks[0]!.solution);
    expect(s.current).not.toHaveProperty("cases");
    s = await action(service, s, "save", {
      query: "SELECT j.id, j.item FROM jobs AS j ORDER BY j.id DESC",
    });
    expect(service.session(s.id).current?.query).toBe(s.current?.query);
    s = await action(service, s, "check", { query: s.current!.query });
    expect(s.current?.feedback?.correct).toBe(true);
    expect(s.current?.assisted).toBe(false);
    const next = {
      taskId: s.current!.id,
      revision: s.revision,
      requestId: randomUUID(),
      action: "next" as const,
    };
    s = await service.action(s.id, next);
    expect(s.xp).toBe(5);
    expect((await service.action(s.id, next)).xp).toBe(5);
    expect(store.database.prepare("SELECT COUNT(*) AS n FROM attempts").get()).toEqual({ n: 0 });
    await expect(service.action(s.id, { ...next, action: "hint" })).rejects.toMatchObject({
      code: "SQL_REQUEST_REUSED",
    });
  });
  it("catches hardcoded results across variants and records corrections as assistance", async () => {
    const { service } = setup();
    let s = service.start(collection.courseId, project.id, "assisted");
    s = await action(service, s, "check", {
      query:
        "SELECT 12 AS id, 'lamp' AS item UNION ALL SELECT 15, 'chair' UNION ALL SELECT 19, 'lamp'",
    });
    expect(s.current?.feedback?.correct).toBe(false);
    expect(s.current?.feedback?.message).toContain("data changes");
    expect(s.current?.assisted).toBe(true);
    s = await action(service, s, "check", { query: project.tasks[0]!.solution });
    expect(s.current?.feedback?.correct).toBe(true);
    s = await action(service, s, "next");
    expect(s.xp).toBe(2);
  });
  it("allows a mistaken answer to continue without pretending it was correct", async () => {
    const { service } = setup();
    let s = service.start(collection.courseId, project.id, "coach");
    s = await action(service, s, "check", { query: "SELECT id FROM jobs" });
    expect(s.current?.canContinue).toBe(true);
    s = await action(service, s, "next");
    expect(s.completed).toBe(1);
    expect(s.xp).toBe(0);
  });
  it("enforces the reveal reason, delay, confirmation and assistance", async () => {
    const { service, advance } = setup();
    let s = service.start(collection.courseId, project.id, "direct");
    await expect(action(service, s, "reveal_start")).rejects.toMatchObject({
      code: "SQL_REVEAL_REASON",
    });
    s = await action(service, s, "reveal_start", { reason: "Compare the columns." });
    const token = s.reveal!.token;
    await expect(
      action(service, s, "reveal_confirm", { token, confirmation: "show answer" }),
    ).rejects.toMatchObject({ code: "REVEAL_WAIT" });
    advance();
    await expect(
      action(service, s, "reveal_confirm", { token, confirmation: "yes" }),
    ).rejects.toMatchObject({ code: "CONFIRMATION_MISMATCH" });
    s = await action(service, s, "reveal_confirm", { token, confirmation: "show answer" });
    expect(s.current?.solution?.query).toBe(project.tasks[0]!.solution);
    expect(s.current?.assisted).toBe(true);
    s = await action(service, s, "next");
    expect(s.xp).toBe(0);
  });
  it("withholds exam answers, correctness and XP until final submission; mode is immutable", async () => {
    const { service, store } = setup();
    let s = service.start(collection.courseId, project.id, "exam");
    expect(() => service.start(collection.courseId, project.id, "direct")).toThrow(
      "mode cannot change",
    );
    for (const task of project.tasks) {
      await expect(action(service, s, "hint")).rejects.toMatchObject({ code: "EXAM_GUARDRAIL" });
      await expect(action(service, s, "reveal_start", { reason: "peek" })).rejects.toMatchObject({
        code: "EXAM_GUARDRAIL",
      });
      s = await action(service, s, "check", { query: task.solution });
      expect(s.current).not.toHaveProperty("feedback");
      expect(s.current).not.toHaveProperty("solution");
      expect(s.xp).toBe(0);
      expect(store.database.prepare("SELECT COUNT(*) AS n FROM learning_events").get()).toEqual({
        n: 0,
      });
      await expect(action(service, s, "save", { query: "SELECT 1" })).rejects.toMatchObject({
        code: "SQL_RESPONSE_LOCKED",
      });
      s = await action(service, s, "next");
    }
    expect(s.results).toHaveLength(5);
    expect(s.results?.every((r) => r.correct && r.independent)).toBe(true);
    expect(s.xp).toBe(25);
  });
  it("rejects stale work even when execution finishes after another tab saves", async () => {
    let release: ((value: { result: SqlResult }) => void) | undefined;
    const { service } = setup({
      execute: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    });
    const s = service.start(collection.courseId, project.id, "coach");
    const running = action(service, s, "run", { query: "SELECT id, item FROM jobs" });
    await action(service, s, "save", { query: "-- newer draft" });
    release!({ result: project.tasks[0]!.cases[0]!.expected });
    await expect(running).rejects.toMatchObject({ code: "SQL_PROJECT_CONFLICT" });
    expect(service.session(s.id).current?.query).toBe("-- newer draft");
  });
  it("keeps an in-progress definition stable across a publication change", async () => {
    const { service, store } = setup();
    const s = service.start(collection.courseId, project.id, "coach");
    const altered = structuredClone(collection);
    altered.projects[0]!.tasks[0]!.prompt = "A new prompt.";
    const newer = new SqlProjectService(
      store,
      new SqlProjectRepository([altered]),
      new IsolatedSqlRuntime(),
    );
    expect(newer.session(s.id).current?.prompt).toBe(project.tasks[0]!.prompt);
    expect(newer.start(collection.courseId, project.id, "coach").id).not.toBe(s.id);
  });
  it("does not advance or grade on syntax errors or runtime outages", async () => {
    const { service } = setup({
      execute: async () => ({ error: "query", message: "near SELECT: syntax error" }),
    });
    let s = service.start(collection.courseId, project.id, "coach");
    s = await action(service, s, "check", { query: "SELECT SELECT" });
    expect(s.current?.canContinue).toBe(false);
    expect(s.current?.feedback).toBeUndefined();
    await expect(action(service, s, "next")).rejects.toMatchObject({
      code: "SQL_RESPONSE_REQUIRED",
    });
  });
});
