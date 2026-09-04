# Implementation status

Updated: 2026-08-22

This file records the current boundary. Older dated plans remain useful as design history; they
are not a reliable feature list. The complete product target and delivery order live in
[`product-goal-and-library-roadmap.md`](product-goal-and-library-roadmap.md).

## Runtime

Discere is a pnpm TypeScript workspace with a React/Vite learner app, Fastify loopback service,
and SQLite database. `pnpm run setup` installs dependencies, creates configuration when needed,
migrates and seeds the database, builds the web app, and runs diagnostics.

`pnpm start` serves the built interface and API. `pnpm dev` runs the development pair. `pnpm stop`
cleans processes from Discere's own PID record.

The built service can also serve the learner app from one origin. Instrumenta uses that path
through the `web-service` adapter, a WSL command bridge, a health check, and launcher-owned
security headers.

## Curriculum

Two checked-in courses are active:

- Electronics Foundations has five lessons, twenty questions, ten flashcards, five deterministic
  activities, and teach-back work.
- The Rise of the Roman Empire has three lessons, thirteen questions, eight flashcards, two essay
  topics, timeline activities, and sourced images.

The live corpus totals eight lessons, nineteen concepts, thirty-three questions, eighteen
flashcards, three essays, and eleven activities. Maths Foundations, Logic Foundations, and
Computer Science Foundations contain topic maps for twenty further lessons; those maps are not
runtime bundles.

`ContentRepository` discovers bundles under `content/`. Startup rejects duplicate identifiers and
invalid references. Retrieved lesson images carry a redistributable licence record, attribution,
landing page, retrieval date, and content hash.

The authoring pipeline supports `generate`, `lint`, `validate`, `review`, `merge`, and an end-to-end
`pipeline` command. Generated drafts stay ignored until review and validation pass.

The newer topic-map curation path is not yet production-safe. It loses prerequisite and uncertainty
data, scaffolds placeholder licences, and assigns sources too broadly. Do not bulk-import the twenty
planned lessons until the provenance and final-review work in the product roadmap is complete.

## Recovery v2 reference experience

Recovery v2 Gates 1, 2, and 3 are approved. Gate 4 is implemented and verified, and is waiting on
George's visual approval.

Gate 1 established the Roman course's visual direction:

- approved course home;
- opening ordering challenge;
- Augustus explanation with exact approved copy;
- expansion map and prompt;
- isolated white/black/green shell with real routes;
- drag and keyboard ordering;
- selectable map milestones and text equivalent;
- live read-aloud and source controls;
- twelve refreshed screenshots at 1440 × 900, 1024 × 768, and 390 × 844;
- focused component and Playwright coverage.

Gate 2 is implemented for the same isolated first-half journey:

- reference progress is stored separately in SQLite and does not write attempts, XP, mastery,
  review state, or catalogue completion;
- the server owns and checks the opening sequence answer;
- the course action resumes the learner's saved reference beat;
- opening order, checked or skipped state, Augustus completion, map milestone, open answer state,
  and saved response restore across reload, browser back, and browser forward;
- sources open in an accessible modal with focus management and keyboard dismissal;
- reference writes serialize across beat navigation, and a stale save response cannot overwrite or
  mark newer learner writing as saved;
- impossible stored state and invalid timestamps fall back safely, repair on the next write, and
  identical terminal retries are idempotent;
- the tutor remains in place across the reference beats and is suppressed in Exam mode;
- the provenance-tracked 117 CE map remains a truthfully labelled fixed comparison rather than
  pretending to show unverified boundaries for the other milestones.

Gate 3 is implemented for the isolated assessment slice:

- four semantic one-question routes cover ordering, 476 CE continuity, 117 CE map reading, and an
  exactly two-sentence response;
- canonical answers, rubrics, grading, feedback, and hints stay on the server rather than shipping
  in public route data;
- Coach, Assisted, Direct, and Exam lock per question on the server. Exam defers results until
  assessment finish and suppresses sources, tutor, hints, and reveal controls;
- formative partly correct, incorrect, and ungradable attempts remain revisable, while Direct
  reveal stays distinct from correctness;
- the 117 CE map uses the checked-in Tataryn Wikimedia Commons record (CC BY-SA 3.0). OpenStax
  10.1, “The Eastward Shift” (CC BY 4.0), is the explicit source for the 395 CE division; and
- the current recovery route intentionally jumps from implemented Stage 3 to Stage 7. Stages 4–6
  remain unimplemented.

Gate 4 adds the essay:

- progress schema v3, with in-memory upgrades from v1 and v2 that preserve Gates 2–3 state and add
  a blank essay, and a fallback to a clean default for a stored row that contradicts itself;
- a server-owned prompt, evidence pack, five-part rubric, and deterministic feedback quoting exact
  learner sentences, with the evidence pack withheld until the learner opens it;
- a semantic essay route with planning, evidence selection, autosave, submission, rubric feedback,
  revision, and finish, all enforced on the server rather than in the browser;
- tutor and companion-import binding through `resolveRomanReferenceTutorEssay`, which takes the
  mode from the server's own row, with a hard `ANS007_REFERENCE_ESSAY_WRITTEN` issue for a reply
  that supplies wording the learner is meant to write; and
- a `@discere/writing-engine` run over the generated feedback at every submission, retained as
  `recovery-v2:roman-reference-essay-feedback` in `writing_gate_runs`.

The isolated reference row still awards no XP, records no attempt, and creates no catalogue
completion. Two feedback defects were fixed while closing the gate: rubric rows quoting the same
sentence repeatedly, and the complication row matching "while" inside an unrelated clause. A row's
status is now decided over the whole essay, independent of which quote was still unused.

The previous generic Roman course page remains available at `/legacy/courses/roman-empire`, and its
existing lesson routes remain intact. Do not generalise the recovery UI until Gate 4 is completed
and explicitly approved.

The comparison and known compromises are recorded in
[`recovery-v2/visual-comparison.md`](recovery-v2/visual-comparison.md).

## Existing learner interface

Outside the isolated reference routes, the current shell has routed course, lesson, review,
progress, and notebook screens. Lessons are assembled from content-owned stages.

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

The generic stage flow still exposes labels and repeated framing rejected by Recovery v2. It is a
preserved implementation, not the design standard for new courses.

## Accountability

Attempts keep their tutoring mode. Completed attempts are immutable. Hints, worked-answer reveals,
transfer recovery, Direct mode, and tutor exchanges are recorded as assistance.

A worked answer closes the original question. The optional transfer problem is different,
retryable, and awards reduced recovery evidence once. XP, independent evidence, assisted evidence,
and review scheduler state remain distinct.

Exam mode removes tutoring, hints, answer reveal, source access, and workings review.

## Tutoring and workings

`DISCERE_TUTOR_PROVIDER` selects `codex`, `companion`, or `mock`.

Tutor conversations now persist in a versioned local record keyed by lesson. Closing the panel or
refreshing keeps its visible history and provider session; malformed records are discarded and the
stored exchange count is capped. An invalid provider session clears only that session boundary, so
the readable thread remains while the next request starts cleanly.

Coach mode may explain definitions, mechanisms, governing relationships, and genuinely analogous
examples. It withholds only the active question's requested value, selection, wording, code, or
conclusion and equivalents. Direct and Exam behaviour is unchanged.

The Codex provider launches the local CLI with a JSON Schema derived from shared contracts. It
limits wall-clock time, kills the process group after timeout, runs one request at a time, and keeps
session IDs for follow-up tutoring.

The companion provider creates a packet for manual use with ChatGPT. Pasted replies pass the same
schema, request, source, mode, and prose checks as generated replies.

Notebook review sends a temporary PNG attachment to Codex or prepares a manual companion packet.
The review contract requires a transcription, confidence, assessment, uncertainty, first
meaningful error when applicable, and a next step. Guided modes reject answer leakage.

## Review and progress

Review cards use deterministic FSRS scheduling. Fuzz is disabled for reproducible tests. Assisted
recall is capped at Hard before grading. The due queue alternates courses using persisted review
history.

The home-screen streak is calculated from actual attempt, transfer, and review dates. Concept
progress shows independent and assisted evidence separately.

## Local boundaries

The service binds to loopback. The database and notebook pages stay local. ChatGPT companion
packets leave the app only when the learner copies them. Codex attachments are placed in a
temporary run and removed afterward.

The production build checks its Content Security Policy for remote scripts, styles, images, fonts,
workers, WebSockets, and fetch targets. Local MCP tools expose course, journey, progress, review,
tutor, and attempt-feedback operations without returning hidden answer authority.

## Verification

The maintained gate is:

```bash
pnpm verify
```

It covers environment diagnostics, lint, typechecking, package tests, curriculum validation, the
production bundle, CSP, and an isolated full-stack smoke. `pnpm e2e` runs the browser journey and
screenshot suite when Playwright's system libraries are installed.

Gate 2 implementation verification is complete. On 2026-08-22, `pnpm verify` passed, including 26
web test files with 155 tests and 12 server test files with 115 tests. Full Playwright passed 28/28,
and the focused Gate 2 browser suite passed 8/8. The browser gate now proves loaded lesson images,
mouse and keyboard ordering, persistent tutor exchanges, Exam suppression, and containment across
every 390 px reference screen. All twelve screenshots were regenerated and visually checked at
1440 × 900, 1024 × 768, and 390 × 844. George approved Gate 2.

Gate 3 browser verification is green: focused Gate 3 passed 3/3, the combined recovery-v2 suite
passed 11/11, and all 12 responsive captures have the required dimensions.

Gate 4 verification, 2026-08-26: `pnpm verify` passed with 29 web files/185 tests and 15 server
files/164 tests, and the full Playwright suite passed 34/34. The six Gate 4 captures
(`05a-essay-studio` and `05b-essay-feedback`) have the required 1440 × 900, 1024 × 768, and
390 × 844 dimensions. Four assertions left stale by the v2 → v3 schema bump were corrected: three
server tests and one browser test still expected `version: 2`, and one browser test expected a
finished assessment to resume into Q4 rather than into the essay.

## Unfinished work

- Recovery v2 Gate 4 is implemented and verified but not visually approved. Do not begin Gate 5 or
  generalise the lesson grammar until it is; Gates 5–6 remain unimplemented.
- Generation runs on the owner's Codex subscription, which is currently unavailable.
  `GET /api/capabilities` reports `tutor_generation`, `illustrations`, and `authoring` with a reason
  and a fallback; the interface removes controls it cannot honour, and Settings explains the
  absence once. `DISCERE_IMAGE_GENERATION=off` forces drawing off regardless of the CLI.
- Direct ChatGPT MCP transport still depends on host compatibility.
- Generated images do not return automatically into the local curriculum.
- Cover assets lack the same reviewed provenance manifest enforced for lesson images.
- Workings-review history is shown once and is not formal mastery evidence.
- Learner-owned flashcard collections, ordering, generation lineage, and edit history are absent.
- Transfer variants and delayed transfer scheduling are limited.
- The topic-map import path needs claim-level sources, exact licences, uncertainty retention, and
  signed final reviews before broad course production.
- The writing engine does not yet implement every normative editorial rule.
- Tutor and notebook panes, dark mode, and the mascot remain later interface work.
- Playwright CI needs browser system libraries on the runner.
