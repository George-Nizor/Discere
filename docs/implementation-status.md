# Implementation Status

## Implemented in the current vertical slice

### Local runtime and verification

- pnpm TypeScript monorepo
- Node.js 24 pinning for common version managers
- one-command `pnpm run setup` workflow
- cross-platform environment diagnostics through `pnpm doctor`
- coordinated development and built-prototype startup
- targeted process cleanup through `pnpm stop`
- configurable local API and web ports
- loopback-only prototype binding
- temporary full-stack smoke testing on isolated ports and SQLite data
- GitHub Actions coverage for lint, TypeScript, tests, curriculum validation, build, and smoke checks

### Learning experience

- React/Vite visual lesson shell
- Fastify REST server and SQLite persistence
- electronics seed course and concept map
- deterministic circuit SVG and Ohm's law explorer
- prediction-first circuit changes with stale-result invalidation
- deterministic current-against-voltage relationship graph
- numeric assessment with SI unit aliases
- visible lesson provenance and licensing outside Exam mode
- read-aloud through browser speech synthesis

### Accountability and progression

- Coach, Assisted, Direct, and Exam tutoring modes
- immutable tutoring mode within an attempt
- immutable completed attempts
- hint event recording and closed assistance after completion
- timed, single-use answer-reveal flow
- original-attempt closure after a worked answer is revealed
- duplicate reveal, hint, and resubmission rejection after answer reveal
- deterministic transfer challenge unlocked after reveal
- retryable transfer assessment with SI-unit support
- no recovery reward for incorrect transfer attempts
- one-time recovery XP and reduced mastery evidence for a correct transfer
- assisted-attempt recording for recovered concepts
- permanent transfer closure after completion
- Exam-mode hint, reveal, source, tutor, and workings-review guardrails
- XP and mastery separation with per-concept mastery updates
- Direct-mode evidence classified as assisted

### Generated content and ChatGPT companion

- generated-prose lint rules, including equivalent-unit answer-leak detection
- source-number and factual-token preservation checks
- visual-brief validation and curriculum referential-integrity checks
- learner-facing ChatGPT companion handoff using the normal ChatGPT subscription
- structured tutor packets containing the current lesson, mode, source IDs, response contract, and the tutor system prompt read from `prompts/tutor-system.md`
- pasted JSON validation before a tutor reply is shown
- final-answer leakage rejection in Coach and Assisted modes
- unknown-source rejection and response-request matching
- Direct-mode answer support with the same prose and source validation
- host-neutral MCP tool catalogue for a future native host

### Local automatic generation

- selectable tutor provider through `DISCERE_TUTOR_PROVIDER`: `companion`, `codex`, or `mock`
- `CodexTutorProvider` spawning the local Codex CLI as a read-only child process against the owner's own subscription
- JSON Schema constrained replies, derived from the same Zod contracts the API uses
- one targeted style-editor repair pass when the writing gate rejects generated prose, and a typed failure when the repair does not hold
- typed provider failures for spawn, timeout, exit, malformed output, and writing-gate outcomes, surfaced instead of a degraded reply
- wall-clock limits enforced in the parent, with process-group termination and no orphaned CLI processes
- one generation at a time, so a single subscription is never used twice at once
- session capture and resume for multi-turn tutoring
- `POST /api/tutor/ask` for in-journey questions, sharing one validation core with the pasted-companion import path
- `POST /api/essays/:essayId/assess` and `GET /api/essays/:essayId/assessment` for background teach-back assessment with a polled status
- provider-neutral endpoints: the companion provider returns the packet to paste, and the mock provider returns fixed text, so one client flow serves every provider
- assistance events recorded for a tutor exchange linked to an open attempt

### Learner workings

- persisted digital working page per lesson
- pen and eraser pointer input with undo, redo, and clear
- blank, lined, and graph-paper notebook backgrounds
- typed notebook notes and PNG export
- bounded notebook payloads and unsaved-navigation protection
- ChatGPT review packets tied to a saved notebook page
- explicit PNG attachment instructions and expected filenames
- structured transcription, confidence, assessment, feedback, first-error, and next-step results
- rejection when the model did not review a usable image
- low-confidence overclaim detection
- first-error requirements for incorrect and partly correct reviews
- guided-mode answer-leak checks across review feedback and next steps
- source restrictions and request-ID matching for image reviews

### Engineering controls

- explicit query parsing that preserves `values=false` for technical visuals
- prerequisite-cycle and orphan-reference detection for curriculum bundles
- learner-safe lesson lookup by ID
- transfer result persistence in SQLite
- one declared database schema: every table lives in `apps/server/src/db/schema.ts` and an ordered SQL file under `apps/server/drizzle/`, recorded in `schema_migrations`
- server startup that fails with the list of outstanding migrations instead of creating tables during request handling
- repository-root path resolution for the database and the prompt package, so a relative `DISCERE_DATABASE_PATH` means the same file for every workspace command
- versioned prompt files loaded from `prompts/` at runtime, with clause tests guarding against prompt drift
- agent operating contract in `AGENTS.md`
- detailed README, setup guide, ChatGPT workflow, troubleshooting, backup, and reset instructions

## First fleet round additions

- deterministic spaced-review domain functions with fixed, explainable intervals
- independent and assisted review evidence kept separate
- reviewed-question flashcard generation behind an answer-bearing domain boundary
- sourced series-circuit lesson, activity contract, state transitions, and deterministic SVG renderer
- server-side tutor request-ID matching for pasted tutor replies
- adversarial regression coverage rejecting injected answer authority in learner attempt payloads
- fleet coordination reports in `docs/agent-fleet/`

## Interactive Story v1 migration — 17 August 2026

Superseded by the interface rebuild below. The `/legacy` route and the `/qa/roman` fixture named
here no longer exist.

The approved redesign is now the default learner entry point. It is implemented as separate routed screens rather than one comparison-board dashboard or long page.

- course home at `/`, `/courses`, and `/courses/electronics-foundations`
- learner-safe journey and stage contracts in `packages/contracts`
- SQLite-backed journey progress with next-stage activation
- lesson route at `/courses/electronics-foundations/lessons/current-in-one-loop/stages/:stageId`
- explainer screen with visual orientation and key takeaway
- deterministic interactive circuit screen with prediction-first feedback
- focused quiz with mode-aware hints, reveal boundary, and transfer recovery
- essay studio with autosave, minimum-word gate, prose-quality validation, and submission persistence
- authorised review session with concealed card backs, explicit reveal, rating, evidence classification, and fixed scheduling
- completion screen and return-to-course path
- separate `/review` home and `/legacy` preservation route
- Roman Empire five-screen visual QA fixture at `/qa/roman?stage=0..4`
- expanded full-stack smoke test covering the new routes, contracts, persistence, essay, and review flow

The functional migration currently covers the first electronics lesson. The sourced series-circuit lesson remains validated course content but is intentionally marked planned until the learner-safe activity union and navigation are integrated. Full browser screenshots are documented in [`docs/ui-ux/screenshots/README.md`](ui-ux/screenshots/README.md); this environment lacks the host libraries required to execute Chromium.

## Repository hygiene — 18 August 2026

Groundwork for the v1 rebuild. No learner-facing behaviour changed.

- Biome ignores build output again. The previous `!!dist` patterns re-included the directories they named, so a present `apps/web/dist` produced thousands of lint errors. Biome 2 uses a single `!` prefix and no trailing `/**` for a directory.
- Runtime artefacts are untracked: the duplicate `apps/server/data/` SQLite files, `apps/web/tsconfig.tsbuildinfo`, and the `.discere-pids.json` process record.
- One canonical database. `@discere/paths` finds the repository root by walking up to `pnpm-workspace.yaml`, so `DISCERE_DATABASE_PATH=./data/discere.sqlite` no longer resolved against each package directory. The stray `apps/server/data/discere.sqlite` came from that mismatch.
- One schema. The `CREATE TABLE IF NOT EXISTS` statements that lived in the store constructor and in the notebook, transfer, and route modules now exist only as migrations.
- `@discere/prompts` reads the seven prompt files from `prompts/` and supplies the tutor system prompt and the accountability-mode policy to the companion packet builder. Clause tests cover every file, as spec v0.2 section 24 requires.

## Interface rebuild — 18 August 2026

`apps/web` was rewritten from scratch. The beige and orange theme, the thin white and green
overlay, the twelve-line pathname router, the hardcoded course and lesson identifiers, the
disabled placeholder controls, and the Unicode glyph icons are all gone. Nothing from the old
`src/` tree survives.

- one design system: tokens in `src/styles/tokens.css`, hand-written CSS, no framework
- `react-router` v7 routes for `/`, `/courses`, `/courses/:courseId`,
  `/courses/:courseId/lessons/:lessonId`, `.../stages/:stageId`, `/review`,
  `/review/session/:sessionId`, and `/progress`
- `lucide-react` thin-line icons throughout; `katex` renders `$…$` inline equations wherever
  learner prose is displayed
- a pure stage machine (`src/journey/stage-machine.ts`) turns the journey and progress payloads
  into stage state; no stage, course, or lesson identifier is written into a component
- the explainer visual comes from `stage.visual`; a visual kind with no deterministic renderer
  falls back to the written description rather than a broken image
- both activity types render from the activity payload; an unrecognised type states that it is
  unavailable instead of drawing a control that does nothing
- the quiz carries mode selection, the three-level hint ladder with its evidence cost, the
  reason-then-wait-then-confirm reveal, the transfer question, and MCQ option cards that appear
  whenever a question carries `choices`
- the essay studio autosaves against the draft endpoint, shows a word count against the minimum,
  and polls the assessment endpoint through pending, ready, failed, and packet-required states
- the tutor drawer calls `POST /api/tutor/ask`, keeps the session identifier for follow-ups,
  renders the companion packet when the provider cannot answer in place, and gives each provider
  fault its own sentence
- no disabled control appears anywhere: an action the learner has not unlocked is rendered as
  text explaining what would open it

Server change: submitting a teach-back no longer fails the writing gate. The gate still runs and
is still recorded, and its findings return as optional `styleNotes`. The mandatory gate remains
in force for generated prose.

Test position: 76 web unit and component tests (from 24), 58 server tests, and the full-stack
smoke suite, which now also checks every stage deep link against the built bundle. The Playwright
suite in `apps/web/e2e` runs 11 tests green: home → explainer → visual → quiz (wrong, hint,
right) → essay → review → completion, refresh restoration, browser history, the explainer's jump
to the question and back, the tutor, Exam restrictions, mobile overflow, an opaque tutor drawer
above the navigator, and navigator clearance beneath a stage's last action. Twenty-six
screenshots at 1440×900 and 390×844 are in this repository, captured from the running
application. Chromium needs `libnss3`, `libnssutil3`, `libnspr4`, and `libasound2`; the supported
fix is `playwright install-deps` as root, and the run here used the same libraries extracted to a
scratch directory on `LD_LIBRARY_PATH`. See
[`ui-ux/screenshots/README.md`](ui-ux/screenshots/README.md).

Fixed after the first browser run: completing a stage now moves to the next stage in order rather
than to the server's global active stage, which only differed when revisiting a finished journey;
the explainer's jump to the question records where it came from in history state, so the return
link no longer depends on the quiz being locked; the tutor drawer is opaque at every animation
frame, carries a scrim, and sits above the bottom navigator; the stage canvas reserves a
navigator height of bottom clearance; and the essay editor takes the wide column with the success
criteria beside it, as the approved mockup shows.

Deferred from this round: the notebook and the workings-review handoff have no place in the new
shell yet. Their server endpoints and contracts are untouched, so the tools return when the
notebook route is designed.

## Content pipeline and a second subject — 19 August 2026

Phase 3. Discere went from one subject with two lessons to two courses with eight, and gained the
authoring pipeline that produced part of them.

### Authoring pipeline

- `pnpm author` (`scripts/author.ts`): `generate`, `lint`, `validate`, `review`, `merge`, and a
  `pipeline` command that runs the chain end to end
- generation spawns the local Codex CLI with `prompts/lesson-writer.md` and a JSON Schema derived
  from `AuthoredLessonDraftSchema`, at `DISCERE_CODEX_EFFORT=medium`
- raw model output is cached in `content/<course>/generated/`, ignored by Git, so nothing is
  regenerated needlessly
- one targeted style-editor repair pass per failing field, followed by a semantic preservation
  check that discards a repair which moved a number, unit, equation, or citation
- a human-readable review file per generated item in `content/<course>/review/`, committed as the
  decision record
- `merge` refuses to write unless the whole bundle revalidates
- documented in [`authoring-pipeline.md`](authoring-pipeline.md)

### Curriculum validation

- flashcards and essay topics are first-class bundle collections with their own referential and
  prose checks
- a selectable question must be marked by exactly one of its options, checked by running the real
  text assessor over every option
- an accepted idea for a written answer must be a matchable phrase rather than a sentence
- numeric questions must carry a three-step hint ladder
- at most 35% of a course's questions may be multiple choice
- a bundled image must carry a redistributable licence, an attribution naming its creator, and a
  file that is actually on disk
- material no lesson reaches is reported as a warning

### Content

- Electronics Foundations: 5 lessons, 20 questions (10 numeric, 6 written, 4 multiple choice),
  10 authored flashcards, 5 activities. Every numeric answer was recomputed from the physics.
- The Rise of the Roman Empire: 3 lessons, 13 questions, 8 flashcards, 2 essay topics, 3 timeline
  activities, 3 retrieved images. Every date checked against its cited source.
- lesson 2 of the electronics course is reachable at last: the series explorer had been in the
  activity engine and unreachable since it was written

### Activities and visuals

- `parallel_circuit_explorer` in `@discere/activity-engine`, with conductances added and branch
  currents reported
- `timeline_explorer`: a scrubbed horizontal track whose markers light as the year advances, with
  an ordering prediction whose answer is recomputed from the event dates rather than stored
- `scripts/retrieve-images.ts` retrieves from the Wikimedia Commons API, accepts only public
  domain, CC0, CC BY, or CC BY-SA, and records landing page, creator, licence, attribution,
  retrieval date, and a content hash
- `GET /api/content/:courseId/assets/*` serves course images read-only, resolving inside the
  course directory and refusing anything that escapes it
- the web renders a retrieved image with its caption and a visible attribution line

### Server

- `ContentRepository` scans `content/` and loads every bundle; no course identifier is written
  into the server
- start-up refuses two bundles that define the same identifier, because identifiers reach the API
  without a course prefix
- the journey is built from the lesson's own data: one quiz stage per question it asks, an essay
  stage only when it names one, and the takeaway, review label, next action, and stage titles all
  authored rather than hardcoded
- `/api/courses` lists every course; course detail carries concept titles, which `/progress` and
  the completion screen now show instead of humanised identifiers
- home continues the most recently worked course, defaulting to the first
- the transfer challenge belongs to the question that offers it, instead of one electronics case
  applied to every subject
- assessment feedback is subject-neutral
- the review queue is fed by the authored flashcards of every course

### Fixed

- moving between two quiz stages carried the first stage's answer, hints, and result into the
  second. Stage views are now keyed by stage id, so each stage starts clean. The bug could not
  appear while a lesson had a single question.
- `/api/visuals/circuit.svg` drew the current lesson's circuit whatever lesson asked for it. It
  now takes an explicit `lessonId`, or renders the single-resistor loop the query describes.
- concept progress opened only the very first concept in the library. A concept with no
  prerequisites is now available, which stays correct with more than one course.

### Verification

`pnpm check`, `pnpm build`, and `pnpm smoke` are green. The Playwright suite runs 12 tests,
including a Roman Empire walk from the retrieved map through the timeline to a marked
multiple-choice answer, and it asserts the image actually loads and its attribution is shown.
Thirty-four screenshots at 1440×900 and 390×844 were recaptured, four of them from the new
course.

## Deliberately deferred

- direct ChatGPT MCP transport, pending host compatibility testing
- generated-image return from ChatGPT into the local workspace
- automatic in-app handwriting recognition without the ChatGPT handoff
- persistence of image-review history and formal mastery evidence from reviewed workings
- multiple generated transfer variants and delayed transfer scheduling
- FSRS scheduling, which remains deferred behind the deterministic scheduler interface
- NotebookLM handoff automation
- broad curriculum importers
- Playwright in CI, which still needs the browser system libraries installed as root
- the notebook and the workings-review handoff, which have no route in the rebuilt shell yet

These are later phases rather than hidden placeholders. The current vertical slice can operate offline after dependencies are installed. ChatGPT tutoring and image review remain explicit user-controlled handoffs and do not require an OpenAI API key.

## Build boundary

The Fastify service and shared packages are source-run TypeScript modules during the local prototype. Their build commands perform strict typechecking. The React application produces the deployable browser bundle. This avoids publishing a server artifact whose workspace imports still point at TypeScript source.

The latest verification record is in [`validation-results-2026-08-17.md`](validation-results-2026-08-17.md).
