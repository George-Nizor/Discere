import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type {
  PythonProjectSession,
  PythonProjectAction,
  PythonValue,
  TutoringMode,
} from "@discere/contracts";
import { pythonProjects } from "../../../content/python-for-data-analysis/authoring/projects.js";
import { createApp } from "../src/app.js";
import { DiscereStore } from "../src/db/store.js";
import { PythonProjectRepository } from "../src/python-projects/repository.js";
import { PythonProjectService } from "../src/python-projects/service.js";
import { IsolatedPythonRuntime, type PythonRuntime } from "../src/python-projects/runtime.js";
const stores: DiscereStore[] = [];
const collection = pythonProjects,
  project = collection.projects[0]!;
function setup(runtime: PythonRuntime = new IsolatedPythonRuntime()) {
  let time = new Date("2026-10-02T00:00:00Z");
  const store = new DiscereStore(":memory:", { migrate: true, clock: () => time });
  stores.push(store);
  return {
    store,
    service: new PythonProjectService(
      store,
      new PythonProjectRepository([collection]),
      runtime,
      5000,
    ),
    advance: () => {
      time = new Date(time.getTime() + 5000);
    },
  };
}
const action = (
  service: PythonProjectService,
  session: PythonProjectSession,
  kind: PythonProjectAction["action"],
  rest: Partial<PythonProjectAction> = {},
) =>
  service.action(session.id, {
    taskId: session.current!.id,
    revision: session.revision,
    requestId: randomUUID(),
    action: kind,
    ...rest,
  });
afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});

describe("saved Python construction", () => {
  it("loads only reviewed projects and keeps answers and private inputs off the API", async () => {
    const { app, store } = await createApp({ dbPath: ":memory:", migrate: true });
    expect(store.database.name).toBe(":memory:");
    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/courses/" + collection.courseId + "/python-projects",
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().projects).toHaveLength(3);
      const start = await app.inject({
        method: "POST",
        url: "/api/courses/" + collection.courseId + "/python-projects/" + project.id,
        payload: { mode: "coach" },
      });
      expect(start.statusCode).toBe(200);
      const session = start.json();
      expect(session.current.inputs).toEqual(project.tasks[0]!.inputs);
      expect(session.current).not.toHaveProperty("cases");
      expect(session.current).not.toHaveProperty("solution");
      expect(start.body).not.toContain(project.tasks[0]!.solution);
      expect(start.body).not.toContain('"expected"');
    } finally {
      await app.close();
    }
  });
  it("saves drafts, accepts alternative programs and applies rewards idempotently", async () => {
    const { service, store } = setup();
    let s = service.start(collection.courseId, project.id, "coach");
    s = await action(service, s, "save", { code: "result = callout + rate * hours" });
    expect(service.session(s.id).current?.code).toBe("result = callout + rate * hours");
    s = await action(service, s, "check", { code: s.current!.code });
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
    await expect(service.action(s.id, { ...next, action: "hint" })).rejects.toMatchObject({
      code: "PYTHON_REQUEST_REUSED",
    });
    expect(store.database.prepare("SELECT COUNT(*) AS n FROM attempts").get()).toEqual({ n: 0 });
  });
  it("rejects hardcoded visible answers, records help and allows corrected work", async () => {
    const { service } = setup();
    let s = service.start(collection.courseId, project.id, "assisted");
    s = await action(service, s, "check", { code: "result = 95" });
    expect(s.current?.feedback?.correct).toBe(false);
    expect(s.current?.feedback?.message).toContain("data changes");
    expect(s.current?.assisted).toBe(true);
    s = await action(service, s, "check", { code: project.tasks[0]!.solution });
    expect(s.current?.feedback?.correct).toBe(true);
    s = await action(service, s, "next");
    expect(s.xp).toBe(2);
  }, 15_000); // Six isolated program runs can exceed the runner's 5s default under a full-suite load.
  it("allows a valid mistaken result to continue without correctness credit", async () => {
    const { service } = setup();
    let s = service.start(collection.courseId, project.id, "coach");
    s = await action(service, s, "check", { code: "result = hours * (rate + callout)" });
    expect(s.current?.canContinue).toBe(true);
    expect(s.current?.feedback?.correct).toBe(false);
    s = await action(service, s, "next");
    expect(s.completed).toBe(1);
    expect(s.xp).toBe(0);
  });
  it("requires the reveal reason, delay and typed confirmation and records assistance", async () => {
    const { service, advance } = setup();
    let s = service.start(collection.courseId, project.id, "direct");
    await expect(action(service, s, "reveal_start")).rejects.toMatchObject({
      code: "PYTHON_REVEAL_REASON",
    });
    s = await action(service, s, "reveal_start", { reason: "Compare my calculation." });
    const token = s.reveal!.token;
    await expect(
      action(service, s, "reveal_confirm", { token, confirmation: "show answer" }),
    ).rejects.toMatchObject({ code: "REVEAL_WAIT" });
    advance();
    await expect(
      action(service, s, "reveal_confirm", { token, confirmation: "yes" }),
    ).rejects.toMatchObject({ code: "CONFIRMATION_MISMATCH" });
    s = await action(service, s, "reveal_confirm", { token, confirmation: "show answer" });
    expect(s.current?.solution?.code).toBe(project.tasks[0]!.solution);
    expect(s.current?.assisted).toBe(true);
    s = await action(service, s, "next");
    expect(s.xp).toBe(0);
  });
  it("withholds exam correctness, hints and XP until submission, with immutable mode and responses", async () => {
    const { service, store } = setup();
    let s = service.start(collection.courseId, project.id, "exam");
    expect(() => service.start(collection.courseId, project.id, "direct")).toThrow(
      "mode cannot change",
    );
    await expect(action(service, s, "hint")).rejects.toMatchObject({ code: "EXAM_GUARDRAIL" });
    await expect(action(service, s, "reveal_start", { reason: "peek" })).rejects.toMatchObject({
      code: "EXAM_GUARDRAIL",
    });
    s = await action(service, s, "check", { code: project.tasks[0]!.solution });
    expect(s.current).not.toHaveProperty("feedback");
    expect(s.current).not.toHaveProperty("solution");
    expect(s.xp).toBe(0);
    expect(store.database.prepare("SELECT COUNT(*) AS n FROM learning_events").get()).toEqual({
      n: 0,
    });
    await expect(action(service, s, "save", { code: "result=1" })).rejects.toMatchObject({
      code: "PYTHON_RESPONSE_LOCKED",
    });
    s = await action(service, s, "next");
    s = await action(service, s, "finish", {
      code: "result = {'boxes': items // capacity, 'left': items % capacity}",
    });
    expect(s.results).toHaveLength(8);
    expect(s.results?.filter((r) => r.correct)).toHaveLength(1);
    expect(s.results?.[1]?.code).toContain("boxes");
    expect(s.xp).toBe(5);
    expect(s.current).toBeUndefined();
  });
  it("preserves null and false results as visible data", async () => {
    for (const result of [null, false] as PythonValue[]) {
      const { service } = setup({ execute: async () => ({ result, output: "actual print\n" }) });
      let s = service.start(collection.courseId, project.id, "coach");
      s = await action(service, s, "run", { code: "result = None" });
      expect(s.current).toHaveProperty("result", result);
      expect(s.current?.output).toBe("actual print\n");
    }
  });
  it("discards stale asynchronous results after another tab saves a draft", async () => {
    let release: ((value: { result: PythonValue; output: string }) => void) | undefined;
    const { service } = setup({
      execute: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    });
    const s = service.start(collection.courseId, project.id, "coach");
    const running = action(service, s, "run", { code: "result = hours * rate + callout" });
    await action(service, s, "save", { code: "# newer draft" });
    release!({ result: 95, output: "" });
    await expect(running).rejects.toMatchObject({ code: "PYTHON_PROJECT_CONFLICT" });
    expect(service.session(s.id).current?.code).toBe("# newer draft");
  });
  it("keeps an in-progress definition stable across a publication change", () => {
    const { service, store } = setup();
    const s = service.start(collection.courseId, project.id, "coach");
    const altered = structuredClone(collection);
    altered.projects[0]!.tasks[0]!.prompt = "A revised prompt.";
    const newer = new PythonProjectService(
      store,
      new PythonProjectRepository([altered]),
      new IsolatedPythonRuntime(),
    );
    expect(newer.session(s.id).current?.prompt).toBe(project.tasks[0]!.prompt);
    expect(newer.start(collection.courseId, project.id, "coach").id).not.toBe(s.id);
  });
  it("keeps code errors ungraded and runtime outages recoverable", async () => {
    for (const error of ["code", "runtime"] as const) {
      const { service } = setup({
        execute: async () => ({ error, message: "Unavailable test execution." }),
      });
      const initial = service.start(collection.courseId, project.id, "coach");
      if (error === "runtime") {
        await expect(action(service, initial, "check", { code: "result=1" })).rejects.toMatchObject(
          { statusCode: 503 },
        );
        expect(service.session(initial.id).revision).toBe(0);
      } else {
        const saved = await action(service, initial, "check", { code: "result=(" });
        expect(saved.current?.canContinue).toBe(false);
        expect(saved.current?.feedback).toBeUndefined();
        await expect(action(service, saved, "next")).rejects.toMatchObject({
          code: "PYTHON_RESPONSE_REQUIRED",
        });
      }
    }
  });
  it.each(["coach", "direct", "exam"] as TutoringMode[])(
    "completes a real project in %s mode",
    async (mode) => {
      const { service } = setup();
      const index = mode === "coach" ? 0 : mode === "direct" ? 1 : 2;
      const definition = collection.projects[index]!;
      let s = service.start(collection.courseId, definition.id, mode);
      for (const task of definition.tasks) {
        s = await action(service, s, "check", { code: task.solution });
        if (mode === "exam") expect(s.current?.feedback).toBeUndefined();
        else expect(s.current?.feedback?.correct).toBe(true);
        s = await action(service, s, "next");
      }
      expect(s.results).toHaveLength(definition.tasks.length);
      expect(s.results?.every((r) => r.correct && r.independent)).toBe(true);
      expect(s.xp).toBe(5 * definition.tasks.length);
    },
    30000,
  );
});
