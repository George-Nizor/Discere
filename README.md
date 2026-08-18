# Discere

[![CI](https://github.com/George-Nizor/discere/actions/workflows/ci.yml/badge.svg)](https://github.com/George-Nizor/discere/actions/workflows/ci.yml)

Discere is a local-first learning workspace built around one useful visual, a direct explanation, a meaningful interaction, and a response from the learner.

The prototype opens on the Interactive Story v1 learner journey: a course home followed by separate explainer, interactive visual, quiz, essay, review, and completion screens for an introductory electronics lesson. Revealing an answer opens a fresh assessed problem so the learner can recover some evidence by applying the idea independently. No paid model API is required.

## What currently works

- React learning workspace with a light, visual-first interface
- routed course home with one dominant learning task per screen
- staged explainer → visual → quiz → essay → review → completion journey
- persisted stage progress with learner-safe stage contracts
- interactive Ohm's law circuit with concealed results
- prediction-first voltage and resistance experiments
- deterministic circuit SVGs and current/voltage graphs
- open numeric responses with unit conversion
- Coach, Assisted, Direct, and Exam modes
- incremental hints and a timed answer-reveal flow
- deterministic transfer challenge after answer reveal
- one-time recovery XP and mastery for solving the new problem
- separate XP, assistance, and concept-mastery records
- source provenance hidden during Exam mode
- persistent SQLite learning state
- digital notebook with pen, eraser, undo, redo, and paper grids
- typed notebook notes and PNG export
- ChatGPT review of saved handwritten or sketched workings
- transcription confidence, first-error, next-step, and source validation for workings reviews
- prose-quality checks for recognisable generated-writing habits
- learner-facing ChatGPT companion using an existing ChatGPT subscription
- tutor-reply validation for prose, answer leakage, source IDs, and request matching
- deterministic spaced-review and reviewed-question flashcard domain foundations
- authorised review sessions with concealed backs, reveal, evidence classification, and deterministic scheduling
- essay studio with autosave, word-count requirements, writing-quality gate, and accountable submission
- concept-mastery screen separating independent from assisted evidence
- in-lesson tutor drawer that states every provider fault rather than hiding it
- full-stack smoke tests and GitHub Actions validation

## Quick start

### Requirements

- Git
- Node.js **22.16.0 or newer**; Node.js 24 is recommended and pinned in `.nvmrc` and `.node-version`
- pnpm **11.17.0**

### 1. Clone the repository

```bash
git clone https://github.com/George-Nizor/discere.git
cd discere
```

### 2. Enable pnpm

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
```

When `corepack enable` requires Administrator access on Windows, use:

```bash
npm install --global pnpm@11.17.0
```

### 3. Prepare the complete prototype

```bash
pnpm run setup
```

This command:

- validates Node.js and pnpm
- creates `.env` when it is missing
- installs the monorepo dependencies
- creates and seeds the SQLite database
- builds the web interface
- runs local environment diagnostics

Existing configuration and learning data are preserved.

### 4. Start Discere

Run the built prototype:

```bash
pnpm start
```

Open the URL printed in the terminal. The default is:

```text
http://127.0.0.1:4318
```

Press `Ctrl+C` to stop the web and API services together.

For development with automatic reload:

```bash
pnpm dev
```

### Test the redesigned learning journey

Open the root URL. Discere now starts at the course home so the learner sees the course purpose before entering a lesson. Select **Continue learning** and move through the six separate screens:

```text
Explainer → Interactive visual → Quiz / check → Essay studio → Flashcards / review → Completion
```

The first lesson is currently the functional slice. The second series-circuit lesson is shown as planned course content until its learner-safe activity route is integrated.

Every screen has its own address, so refresh, browser back and forward, and deep links all work:

```text
/                                                     home, with the lesson to resume
/courses                                              the course library
/courses/:courseId                                    one course and its lessons
/courses/:courseId/lessons/:lessonId                  redirects to the active stage
/courses/:courseId/lessons/:lessonId/stages/:stageId  one lesson stage
/review                                               what is due for spaced review
/review/session/:sessionId                            one flashcard
/progress                                             concept mastery
```

The black rail on the left holds home, courses, review, and progress. The black bar at the
bottom of a lesson moves between stages and shows how far through the lesson you are.

When the original terminal was closed unexpectedly:

```bash
pnpm stop
```

The detailed platform notes, configuration table, backups, reset commands, and troubleshooting steps are in [docs/setup.md](docs/setup.md).

## Use ChatGPT as the lesson tutor

Discere uses an explicit handoff so an ordinary ChatGPT subscription can provide lesson-specific help without an API key.

1. Choose Coach, Assisted, or Direct mode.
2. Open **Ask a question using your ChatGPT subscription**.
3. Enter a question and select **Prepare tutor prompt**.
4. Paste the copied prompt into ChatGPT.
5. Copy ChatGPT's JSON reply back into Discere.
6. Select **Validate tutor reply**.

Discere displays the reply after it passes the active tutoring-mode rules, prose checks, source restrictions, and request-ID check. Coach and Assisted replies are rejected when they expose the active assessment answer. Direct mode permits the answer while retaining the writing and source checks. The companion is unavailable in Exam mode.

## Review handwritten or sketched workings

1. Draw the calculation in the notebook and select **Save workings**.
2. Select **Download PNG**.
3. Open **Have ChatGPT inspect the saved page**.
4. Prepare the review prompt and open ChatGPT.
5. Paste the prompt and attach the exported PNG.
6. Paste ChatGPT's JSON review into Discere and select **Validate review**.

An accepted review includes a visible-work transcription, reading confidence, overall assessment, first meaningful error, next step, uncertainty notes, and approved source references. Discere rejects reviews that omit the image, overstate a low-confidence reading, use unknown sources, return a stale request ID, or expose the active answer in Coach or Assisted mode.

See [docs/chatgpt-companion.md](docs/chatgpt-companion.md) for the protocols, expected JSON, privacy model, and rejection-handling workflow.

## Answer reveal and transfer recovery

Revealing the worked answer closes the original attempt. Discere then presents a different deterministic problem using the same relationship.

The learner may retry the transfer problem until it is correct. Incorrect retries award no XP or mastery. The first correct response:

- records the transfer as assisted recovery
- awards a smaller amount of recovery XP
- moves mastery using reduced evidence
- updates every concept attached to the original question
- permanently closes that transfer challenge

This lets the learner recover from needing the answer while keeping the original result distinct from an independent solution.

## Verify the installation

```bash
pnpm verify
```

The verification sequence runs environment diagnostics, linting, strict TypeScript checks, tests, curriculum validation, a production build, and a temporary full-stack smoke test.

The smoke test verifies:

- every learner route and every lesson stage deep link against the built bundle
- learner-safe course and six-stage journey contracts
- stage progress persistence and next-stage activation
- essay autosave/submission and review reveal/rating/scheduling
- web preview and API proxying
- learner-safe lesson delivery
- deterministic visual rendering
- generated-prose rejection rules
- ChatGPT tutor packet creation and reply validation
- guided-mode answer-leak rejection
- notebook persistence
- numeric assessment

The server and component suites additionally cover workings-review validation and transfer recovery, including image confirmation, transcription confidence, first-error requirements, transfer locking, retries, one-time recovery rewards, source restrictions, and request matching. Temporary smoke-test data is removed when verification finishes.

## Main commands

| Command | Purpose |
| --- | --- |
| `pnpm run setup` | Install, configure, migrate, seed, build, and diagnose the project. |
| `pnpm dev` | Start API and web development servers with automatic reload. |
| `pnpm start` | Start the built prototype. Run `pnpm build` first after source changes. |
| `pnpm stop` | Stop processes recorded by Discere after a terminal was lost. |
| `pnpm doctor` | Check Node, pnpm, ports, SQLite, configuration, and build readiness. |
| `pnpm verify` | Run every local quality and runtime verification step. |
| `pnpm check` | Run lint, TypeScript, tests, and curriculum validation. |
| `pnpm build` | Typecheck packages and create the production web bundle. |
| `pnpm smoke` | Start an isolated built stack and exercise its core routes. |
| `pnpm e2e` | Run the Playwright browser journey and screenshot suite. |
| `pnpm db:migrate` | Create the local database schema. |
| `pnpm db:seed` | Seed the initial concept graph. |

## Current lesson flow

```text
Course home and lesson purpose
        ↓
Read the explainer
        ↓
Interact with the circuit visual
        ↓
Predict what happens to current
        ↓
Check the deterministic result and explanation
        ↓
Answer the focused quiz
        ↓
Write and submit an accountable teach-back
        ↓
Review a concealed flashcard, reveal, and rate it
        ↓
Complete the lesson and return to the course home
        ↓
Open the notebook or ChatGPT companion when needed
        ↓
Record XP, assistance, and mastery separately
```

A correct attempt is immutable. A revealed worked answer closes the original attempt. Direct mode records assisted evidence. Transfer recovery awards reduced evidence once. Exam mode removes hints, answer reveal, source access, external tutoring, and workings review.

A correct attempt is immutable. A revealed worked answer closes the original attempt. Direct mode records assisted evidence. Transfer recovery awards reduced evidence once. Exam mode removes hints, answer reveal, source access, external tutoring, and workings review.

## Local data and privacy

Discere binds to loopback addresses during the prototype phase. Its default services are:

```text
Web: http://127.0.0.1:4318
API: http://127.0.0.1:4317
```

Durable state is stored at:

```text
data/discere.sqlite
```

The database holds the learner profile, attempts, XP, concept mastery, assistance events, reveal records, transfer results, prose-gate runs, and notebook pages. `.env`, database files, builds, uploaded data, and process records are ignored by Git.

Discere sends nothing to ChatGPT automatically. The learner controls which prepared prompt and PNG enter ChatGPT and which response returns to Discere. The local database stays on the learner's machine.

## ChatGPT integration

Discere does not call the OpenAI API. The companion interfaces create structured packets for a normal ChatGPT conversation. They contain learner-safe lesson context, the selected tutoring mode, allowed source IDs, an exact JSON response contract, and either the learner's question or a request to inspect an attached notebook PNG.

Returned material is validated before display. Checks cover schema integrity, request matching, source restrictions, anti-AI-writing rules, image-review confidence, and guided-mode answer boundaries.

A ChatGPT-native MCP host remains scaffolded behind a provider boundary. The core learning application does not depend on that host being available.

## Architecture

```text
React / Vite workspace
          │ REST
Fastify local server
    ├── curriculum and lesson services
    ├── deterministic visual engine
    ├── prose quality gate
    ├── assessment and accountability controls
    ├── progression and transfer recovery
    ├── notebook persistence
    └── provider adapters
             ├── offline seed content
             ├── ChatGPT tutor and workings handoffs
             └── future MCP host
          │
       SQLite
```

The repository is a pnpm TypeScript monorepo:

```text
apps/web                 learner interface
apps/server              local API and SQLite ownership
apps/mcp                 host-neutral MCP catalogue
packages/contracts       shared validated data contracts
packages/curriculum      course loading and integrity checks
packages/visual-engine   SVGs, graphs, and image briefs
packages/writing-engine  generated-prose rules
packages/assessment-engine
packages/progression-engine
packages/tutor-providers
content/                 reviewed seed curriculum
docs/                    product and implementation specifications
prompts/                 tutor, assessor, writer, and visual prompts
```

## Prototype boundary

The current vertical slice proves the visual, writing, accountability, assessment, answer-recovery, ChatGPT handoff, notebook, image-review, persistence, and local-runtime systems with one electronics lesson.

Planned work includes:

- persisted spaced-review queues and authorized flashcard review UI
- learner navigation for the validated additional electronics lessons and interactive activity types
- retrieved reference images with licence records
- generated illustration review and import
- broader course creation and curriculum adapters
- ChatGPT-native host integration when supported

See [docs/implementation-status.md](docs/implementation-status.md) for the exact implemented/deferred boundary.

## Documentation

- [Local setup and troubleshooting](docs/setup.md)
- [ChatGPT companion and workings review](docs/chatgpt-companion.md)
- [Prototype specification v0.2](docs/spec-v0.2.md)
- [Architecture](docs/architecture.md)
- [Writing system](docs/writing-system.md)
- [Visual system](docs/visual-system.md)
- [Implementation status](docs/implementation-status.md)
- [ChatGPT compatibility report](docs/compatibility-report.md)
- [Validation approach](docs/validation.md)
- [Latest recorded validation](docs/validation-results-2026-08-17.md)
- [Luna handoff](docs/luna-handoff.md)
