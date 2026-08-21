# Implementation status

This file records the current boundary. Older dated plans remain useful as design history; they are
not a reliable feature list.

## Runtime

Discere is a pnpm TypeScript workspace with a React/Vite learner app, Fastify loopback service, and
SQLite database. `pnpm run setup` installs dependencies, creates configuration when needed, migrates
and seeds the database, builds the web app, and runs diagnostics.

`pnpm start` serves the built interface and API. `pnpm dev` runs the development pair. `pnpm stop`
cleans processes from Discere's own PID record.

The built service can also serve the learner app from one origin. Instrumenta uses that path through
the `web-service` adapter, a WSL command bridge, a health check, and launcher-owned security headers.

## Curriculum

Two checked-in courses are active:

- Electronics Foundations has five lessons, twenty questions, ten flashcards, five deterministic
  activities, and teach-back work.
- The Rise of the Roman Empire has three lessons, thirteen questions, eight flashcards, two essay
  topics, timeline activities, and sourced images.

`ContentRepository` discovers bundles under `content/`. Startup rejects duplicate identifiers and
invalid references. Retrieved images carry a redistributable licence record, attribution, landing
page, retrieval date, and content hash.

The authoring pipeline supports `generate`, `lint`, `validate`, `review`, `merge`, and an end-to-end
`pipeline` command. Generated drafts stay ignored until review and validation pass.

## Learner interface

The current shell has routed course, lesson, review, progress, and notebook screens. Lessons are
assembled from content-owned stages. A stage renders one main learning task.

Implemented surfaces include:

- explainer pages with deterministic or licensed visuals;
- circuit and timeline activities with prediction before reveal;
- numeric, written, and multiple-choice questions;
- mode-aware hints, worked-answer confirmation, and transfer recovery;
- essay autosave, submission, prose findings, and tutor assessment;
- FSRS review sessions with concealed backs and explicit rating;
- course-interleaved due queues and concept evidence;
- a drawing notebook with typed notes and PNG export;
- desktop and mobile route coverage in Playwright.

## Accountability

Attempts keep their tutoring mode. Completed attempts are immutable. Hints, worked-answer reveals,
transfer recovery, Direct mode, and tutor exchanges are recorded as assistance.

A worked answer closes the original question. The optional transfer problem is different, retryable,
and awards reduced recovery evidence once. XP, independent evidence, assisted evidence, and review
scheduler state remain distinct.

Exam mode removes tutoring, hints, answer reveal, source access, and workings review.

## Tutoring and workings

`DISCERE_TUTOR_PROVIDER` selects `codex`, `companion`, or `mock`.

The Codex provider launches the local CLI with a JSON Schema derived from shared contracts. It limits
wall-clock time, kills the process group after timeout, runs one request at a time, and keeps session
IDs for follow-up tutoring.

The companion provider creates a packet for manual use with ChatGPT. Pasted replies pass the same
schema, request, source, mode, and prose checks as generated replies.

Notebook review sends a temporary PNG attachment to Codex or prepares a manual companion packet. The
review contract requires a transcription, confidence, assessment, uncertainty, first meaningful
error when applicable, and a next step. Guided modes reject answer leakage.

## Review and progress

Review cards use deterministic FSRS scheduling. Fuzz is disabled for reproducible tests. Assisted
recall is capped at Hard before grading. The due queue alternates courses using persisted review
history.

The home-screen streak is calculated from actual attempt, transfer, and review dates. Concept progress
shows independent and assisted evidence separately.

## Local boundaries

The service binds to loopback. The database and notebook pages stay local. ChatGPT companion packets
leave the app only when the learner copies them. Codex attachments are placed in a temporary run and
removed afterward.

The production build checks its Content Security Policy for remote scripts, styles, images, fonts,
workers, WebSockets, and fetch targets. Local MCP tools expose course, journey, progress, review, tutor,
and attempt-feedback operations without returning hidden answer authority.

## Verification

The maintained gate is:

```bash
pnpm verify
```

It covers environment diagnostics, lint, typechecking, package tests, curriculum validation, the
production bundle, CSP, and an isolated full-stack smoke. `pnpm e2e` runs the browser journey and
screenshot suite when Playwright's system libraries are installed.

Dated validation records are snapshots. Run the current gate before using an old count in a release
note.

## Unfinished work

- Direct ChatGPT MCP transport still depends on host compatibility.
- Generated images do not return automatically into the local curriculum.
- Workings-review history is shown once and is not formal mastery evidence.
- Transfer variants and delayed transfer scheduling are limited.
- Broad curriculum importers remain future work.
- Playwright CI needs the browser system libraries on the runner.
