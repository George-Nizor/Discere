# ADR 0006: Compile and run learner Rust in two Bubblewrap sandboxes

Status: Accepted
Date: 2026-10-15

Rust Foundations needs a real compiler. Learners write programs in an editor inside Discere, and
lessons show what rustc actually says about each example, including its error messages. The Rust
Playground at play.rust-lang.org is a community service with no API for other applications and
needs the network, so Discere runs its own.

## Decision

`apps/server/src/rust/runtime.ts` compiles and runs each program in two Bubblewrap sandboxes. There
is no unsandboxed fallback: without the toolchain, every Rust route answers 503 and says how to set
it up.

**Compile.** rustc 1.93.1 (pinned by `pnpm rust:setup`, installed through rustup and recorded in
the ignored `data/rust-runtime/runtime.json`) runs with new user, mount, PID, IPC, network and UTS
namespaces, as UID 65534 with every capability dropped. It sees the toolchain read-only, `/usr` and
`/etc/alternatives` read-only for the `cc` linker, a 256 MiB `/tmp`, and one scratch directory that
holds `main.rs`. Home, the workspace and the owner database are absent, so `include_str!` cannot read
them. prlimit caps CPU at 20 seconds and files at 64 MiB, and the parent kills the sandbox after 15
seconds. Only the standard library is available; there is no Cargo and no crate download.

**Run.** The binary runs in a second sandbox that holds only itself, the shared libraries and
prlimit. The root is read-only, `/tmp` is 16 MiB and there is no network. prlimit sets 256 MiB of
address space, 2 seconds of CPU, 1 MiB files, 32 descriptors and at most four processes or threads,
counted inside the sandbox's own user namespace. The parent kills it after 4 seconds and bounds
stdout to 8,000 and stderr to 4,000 characters. At most two programs compile or run at once.

**Grading.** A program task feeds each case's stdin and compares printed text, ignoring trailing
spaces and blank lines. A function task appends a checker module that calls the learner's function
with each case's arguments and prints the `{:?}` form of the result; numbers compare with a 1e-9
tolerance. Expected values and worked programs stay in the server. Hidden arguments are compiled
into the checker, so diagnostics located in the checker are removed before a learner sees them and
replaced with the expected signature. Run only compiles the visible case.

Lesson questions answered with code use the same marking. The question carries its starter and
visible example publicly and its hidden cases in `codeCases`, which the learner payload omits. Its
`answerAuthority` is text whose only accepted idea is a fixed sentinel, so a path that marks it as
text marks it wrong; `POST /api/attempts` runs it instead.

Lesson programs are compiled at authoring time by `pnpm rust:prepare`, which records rustc's real
output in the bundle and fails if a program does something other than what its author declared.

## Limits

Namespaces and resource limits reduce exposure. They do not remove kernel, rustc or linker
vulnerabilities, and there is no seccomp filter on the compiled program. This is a boundary for a
single local learner, not a multi-tenant service. Native Windows has no runtime; Discere already runs
its server in WSL there.
