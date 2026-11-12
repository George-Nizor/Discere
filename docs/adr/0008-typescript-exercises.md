# ADR 0008: Run learner TypeScript on the app's own Node, inside the existing sandboxes

Status: Accepted
Date: 2026-11-11

TypeScript and Node.js taught its first lessons with multiple choice and numbers only. A learner
never wrote a line of TypeScript. Python and SQL lessons already hold exercises that are run and
marked on the server, and the TypeScript course should work the same way.

## Decision

A code question may say `code.language: "typescript"`. The server type-checks the program with the
native TypeScript compiler and runs it on Node, both inside the sandbox that already runs Rust and
Python. There is no unsandboxed fallback, and nothing runs in the browser, where the
Content-Security-Policy allows scripts from the app's own origin only.

**What runs it.** Node is the binary the server itself runs on: the machine's Node in a checkout,
`runtime/node.exe` in a release. The compiler is `tsc` from TypeScript 7, a single native program
with its `lib.*.d.ts` files beside it. A checkout gets it from the `typescript` dependency
(`@typescript/typescript-linux-x64`). A release carries the Windows one under `runtime/typescript`,
which `scripts/package-release.mjs` downloads from npm and checks against a pinned SHA-256. It adds
about 10 MB to the zip. Nothing is downloaded on the learner's computer.

**The boundary on Linux.** `apps/server/src/typescript/runtime.ts` starts each program in
Bubblewrap with new user, mount, PID, IPC, network and UTS namespaces, as UID 65534 with every
capability dropped. The sandbox holds the Node binary (or the compiler's folder and one file to
check), the shared libraries, prlimit, an empty 16 MiB `/tmp` and nothing else, on a read-only
root. prlimit caps address space at 1.5 GiB, CPU at 3 seconds, files at 1 MiB and threads at 32,
and the parent kills the run after 5 seconds. A seccomp filter, built in the server and handed to
Bubblewrap, refuses `fork`, `vfork`, any `clone` that is not a thread, `socket`, and the namespace,
mount, tracing and key calls. Bubblewrap installs the filter before it starts the program, so
`execve` stays allowed; the sandbox contains nothing to execute but the program already running.

**The boundary on Windows.** `apps/server/src/typescript/windows.ts` uses `discere-sandbox.exe`
unchanged: an AppContainer with no capabilities inside a Job Object with one process, 256 MB,
3 seconds of CPU and 6 seconds of wall clock for Node (1 GB and 10 seconds for the compiler).
Node cannot resolve the real path of a script file inside an AppContainer, because it may not read
the drive's root, so the runner is passed with `-e` on both platforms.

**Node's own layers.** Node runs with `--permission`, which refuses
files, child processes and workers, and the learner's code runs in a `vm` context that holds
`console` and nothing of Node. Neither is a security boundary: code can reach `process` from
inside the context, and a test does exactly that to show that the sandbox still gives it no files,
no network and no new process.

**How TypeScript becomes runnable.** The runner removes the types with
`module.stripTypeScriptTypes` (Node 22.13 and later), the same step `node file.ts` performs since
22.18. It replaces each annotation with spaces, so a runtime error's line number is the learner's
line, and it does no type checking. It refuses syntax that needs generated code (enums, namespaces
with code, parameter properties). `--disable-wasm-trap-handler` is needed because the stripper is
WebAssembly, and V8 otherwise reserves more address space for it than the limit allows.

**Type checking.** An exercise with `typeCheck: true` is compiled first, with `--strict`,
`--noImplicitReturns` and `--erasableSyntaxOnly` (so what compiles also runs). The compiler's errors
in the learner's own lines are shown with the line number, a plain sentence for the commonest codes
and the compiler's own sentence. They stop the run and are not counted as a wrong answer. Such an
exercise also refuses `any` and the `@ts-ignore`, `@ts-expect-error` and `@ts-nocheck` comments,
by reading the text. A question may carry `typescriptTypeTests`: lines compiled after the program
and never run, each with a message. A type test that does not compile is a failed test, which is
how an exercise marks a type. A line that must be refused is written under
`// @ts-expect-error`. The compiler takes about 50 ms for an exercise.

**Marking.** As for Python: a `call` exercise is judged on what a function returns for each case,
a `names` exercise on what named values hold at the end, both as JSON values compared with a 1e-9
tolerance for numbers. All cases of a check run in one Node process, each in a fresh context. The
first failing case is reported with what was expected and what came back. The cases, the type
tests and the worked program never leave the server.

`packages/curriculum` holds the runner, the compiler flags and `checkTypeScriptExercises`, which
compiles and runs every worked program and starter without the sandbox, since authored code is
trusted.

## Limits

- Namespaces, AppContainer and resource limits reduce exposure. They do not remove kernel, V8 or
  compiler vulnerabilities. This is a boundary for one local learner, as in ADR 0005 and 0006.
- A program is one file. It cannot import a module, read a file or open a socket, so the Node
  lessons later in the course (streams, HTTP, the event loop's timers) cannot be exercised this
  way yet. `setTimeout` is not provided.
- Results must be JSON values. A function that returns `undefined`, a `Map` or a class instance is
  told so and is not marked.
- The `any` check reads the text without parsing it, so unusual formatting can fool it in either
  direction.
- Linux needs x86-64, as the seccomp filter is written for that architecture.
