import { randomUUID } from "node:crypto";
import type { RustProjectAction, RustProjectSession, TutoringMode } from "@discere/contracts";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { projects } from "../../../content/rust-foundations/authoring/course.js";
import { createApp } from "../src/app.js";
import { DiscereStore } from "../src/db/store.js";
import { RustProjectRepository, RustProjectService } from "../src/rust/projects.js";
import {
  functionHarness,
  IsolatedRustRuntime,
  sameDebug,
  samePrinted,
  splitReturned,
} from "../src/rust/runtime.js";

const runtime = new IsolatedRustRuntime();
let ready = false;
beforeAll(async () => {
  ready = (await runtime.status()).ready;
});
const stores: DiscereStore[] = [];
afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});

describe("Rust result comparison", () => {
  it("compares printed text without trailing whitespace", () => {
    expect(samePrinted("Hello  \n\n", "Hello")).toBe(true);
    expect(samePrinted("Hello\r\nthere\n", "Hello\nthere")).toBe(true);
    expect(samePrinted("hello", "Hello")).toBe(false);
  });
  it("compares numbers with a tolerance and everything else exactly", () => {
    expect(sameDebug("45.00000000000001", "45.0")).toBe(true);
    expect(sameDebug("45", "45.0")).toBe(false);
    expect(sameDebug('"a"', '"a"')).toBe(true);
    expect(sameDebug("[1, 2]", "[1, 2]")).toBe(true);
  });
  it("separates the checker's marker from printed text", () => {
    expect(splitReturned("hi\n\u001eDISCERE_RETURN 4\n")).toEqual({ printed: "hi\n", returned: "4" });
    expect(splitReturned("hi\n")).toEqual({ printed: "hi\n" });
  });
});

describe("sandboxed Rust", () => {
  it("compiles, runs, reads stdin and cannot see the host", async () => {
    if (!ready) return;
    const [result] = await runtime.run(
      {
        code: 'use std::io::Read;\nfn main() {\n    let mut s = String::new();\n    std::io::stdin().read_to_string(&mut s).unwrap();\n    println!("{} {}", s.trim(), std::fs::read_dir("/home").is_ok());\n}\n',
      },
      ["ferris"],
    );
    expect(result).toMatchObject({ status: "ok", stdout: "ferris false\n" });
  });
  it("returns rustc's diagnostics without host paths, and refuses include_str! of host files", async () => {
    if (!ready) return;
    const [result] = await runtime.run(
      { code: 'fn main() {\n    let s = include_str!("/etc/hostname");\n    println!("{s}");\n}\n' },
      [""],
    );
    expect(result?.status).toBe("compile_error");
    expect(result?.diagnostics).toContain("main.rs:2");
    expect(result?.diagnostics).not.toMatch(/\/work\/|\/tmp\/discere-rust/);
  });
  it("stops an endless loop and reports a panic", async () => {
    if (!ready) return;
    const [loop] = await runtime.run({ code: "fn main() { loop {} }" }, [""]);
    expect(loop?.status).toBe("limit");
    const [panic] = await runtime.run({ code: 'fn main() { panic!("boom"); }' }, [""]);
    expect(panic).toMatchObject({ status: "runtime_error", exitCode: 101 });
    expect(panic?.stderr).toContain("boom");
  });
  it("calls a learner function through the checker, even when the file has its own main", async () => {
    if (!ready) return;
    const results = await runtime.run(
      {
        code: "fn double(n: i32) -> i32 {\n    n * 2\n}\nfn main() {\n    println!(\"{}\", double(1));\n}\n",
        harness: functionHarness("double", [["2"], ["-7"]]),
      },
      ["0", "1"],
    );
    expect(results.map((r) => splitReturned(r.stdout).returned)).toEqual(["4", "-14"]);
  });
});

function setup() {
  const store = new DiscereStore(":memory:", { migrate: true });
  stores.push(store);
  return new RustProjectService(store, new RustProjectRepository([projects]), runtime, 0);
}
const act = (
  service: RustProjectService,
  session: RustProjectSession,
  action: RustProjectAction["action"],
  rest: Partial<RustProjectAction> = {},
) =>
  service.action(session.id, {
    taskId: session.current!.id,
    revision: session.revision,
    requestId: randomUUID(),
    action,
    ...rest,
  });
const start = (service: RustProjectService, mode: TutoringMode = "coach") =>
  service.start("rust-foundations", "first-programs", mode);

describe("Rust projects", () => {
  it("keeps solutions and hidden cases off the API", async () => {
    const { app } = await createApp({ dbPath: ":memory:", migrate: true });
    try {
      const listed = await app.inject({ url: "/api/courses/rust-foundations/rust-projects" });
      expect(listed.json().projects[0]).toMatchObject({ id: "first-programs", taskCount: 4 });
      const started = await app.inject({
        method: "POST",
        url: "/api/courses/rust-foundations/rust-projects/first-programs",
        payload: { mode: "coach" },
      });
      const text = started.body;
      expect(text).not.toContain("Grace Hopper");
      expect(text).not.toContain('println!(\\"Hello, {name}! Welcome to Rust.\\")');
      expect(started.json().current.example).toEqual({
        stdin: "Ada\n",
        expected: "Hello, Ada! Welcome to Rust.",
      });
    } finally {
      await app.close();
    }
  });
  it("passes a correct program and explains a wrong one", async () => {
    if (!ready) return;
    const service = setup();
    let session = start(service);
    const task = projects.projects[0]!.tasks[0]!;
    session = await act(service, session, "check", {
      code: task.solution.replace("Welcome to Rust.", "Welcome to Rust"),
    });
    expect(session.current?.feedback?.correct).toBe(false);
    expect(session.current?.run).toMatchObject({ status: "ok", passed: 0, total: 3 });
    session = await act(service, session, "check", { code: task.solution });
    expect(session.current?.feedback?.correct).toBe(true);
    expect(session.current?.run?.passed).toBe(3);
    session = await act(service, session, "next");
    expect(session.current?.id).toBe("rectangle-area");
    expect(session.xp).toBe(2);
  });
  it("shows the visible case's return value and never quotes a hidden case", async () => {
    if (!ready) return;
    const service = setup();
    let session = start(service);
    session = await act(service, session, "check", { code: projects.projects[0]!.tasks[0]!.solution });
    session = await act(service, session, "next");
    session = await act(service, session, "run", {
      code: "fn area(width: i32, height: i32) -> i32 {\n    width * height\n}\n",
    });
    expect(session.current?.run).toMatchObject({ status: "ok", returned: "12" });
    session = await act(service, session, "check", {
      code: "fn area(width: f64, height: f64) -> f64 {\n    width * height\n}\n",
    });
    expect(session.current?.run?.status).toBe("compile_error");
    expect(session.current?.run?.message).toContain("fn area(width: i32, height: i32) -> i32");
    expect(session.current?.run?.diagnostics).not.toContain("discere_check");
    expect(JSON.stringify(session)).not.toContain("(10, 10)");
  });
  it("keeps exam pass counts private", async () => {
    if (!ready) return;
    const service = setup();
    let session = start(service, "exam");
    session = await act(service, session, "check", { code: 'fn main() { println!("no"); }' });
    expect(session.current?.feedback).toBeUndefined();
    expect(session.current?.run?.passed).toBeUndefined();
    expect(session.current?.canContinue).toBe(true);
  });
});

describe("lesson questions answered with Rust", () => {
  const ask = (app: Awaited<ReturnType<typeof createApp>>["app"], questionId: string, response: string) =>
    app.inject({
      method: "POST",
      url: "/api/attempts",
      payload: { questionId, response, mode: "coach" },
    });
  it("sends the starter and example but never the hidden cases or worked program", async () => {
    const { app } = await createApp({ dbPath: ":memory:", migrate: true });
    try {
      const lesson = await app.inject({ url: "/api/courses/rust-foundations/lessons/types-and-functions/journey" });
      expect(lesson.statusCode).toBe(200);
      const text = lesson.body;
      expect(text).toContain('"responseType":"code"');
      expect(text).toContain("fn triple(n: i32) -> i32");
      expect(text).not.toContain("codeCases");
      expect(text).not.toContain('"-15"');
      expect(text).not.toContain("n * 3\\n");
    } finally {
      await app.close();
    }
  });
  it("marks a program by running it against every case", async () => {
    if (!ready) return;
    const { app } = await createApp({ dbPath: ":memory:", migrate: true });
    try {
      const wrong = await ask(app, "types-and-functions-triple", "fn triple(n: i32) -> i32 {\n    12\n}\n");
      expect(wrong.json()).toMatchObject({ correct: false, codeRun: { status: "ok", returned: "12", passed: 1, total: 3 } });
      expect(wrong.json().feedback).toContain("works for the example");
      const broken = await ask(app, "types-and-functions-triple", "fn triple(n: i32) -> i32 {\n    n * 3;\n}\n");
      expect(broken.json()).toMatchObject({ correct: false, codeRun: { status: "compile_error" } });
      expect(broken.json().codeRun.diagnostics).toContain("E0308");
      const right = await ask(app, "types-and-functions-triple", "fn triple(n: i32) -> i32 {\n    n * 3\n}\n");
      expect(right.json()).toMatchObject({ correct: true, codeRun: { passed: 3, total: 3 } });
      const run = await app.inject({
        method: "POST",
        url: "/api/questions/print-and-bind-first-program/run",
        payload: { code: 'fn main() {\n    println!("Hello, Rust!");\n}\n' },
      });
      expect(run.json()).toMatchObject({ status: "ok", stdout: "Hello, Rust!\n" });
      expect(run.json().passed).toBeUndefined();
    } finally {
      await app.close();
    }
  });
});
