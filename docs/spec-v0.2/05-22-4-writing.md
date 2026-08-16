## 22.4 Writing

- `POST /api/writing/lint`
- `POST /api/writing/commit`
- `POST /api/writing/feedback`

`/writing/commit` must rerun the linter server-side. Never trust a client-provided pass result.

## 22.5 Visuals

- `POST /api/visuals/briefs`
- `GET /api/visuals/search`
- `POST /api/visuals/render`
- `POST /api/visuals/register-generated`
- `POST /api/visuals/:visualId/review`
- `GET /api/visuals/:visualId`

## 22.6 Activities

- `GET /api/activities/:activityId`
- `POST /api/activities/:activityId/events`
- `POST /api/activities/:activityId/submit`

## 22.7 Questions and attempts

- `GET /api/questions/next`
- `GET /api/questions/:questionId`
- `POST /api/attempts`
- `POST /api/attempts/:attemptId/assess-draft`
- `POST /api/attempts/:attemptId/commit-assessment`
- `POST /api/attempts/:attemptId/hints`
- `POST /api/attempts/:attemptId/reveal/start`
- `POST /api/attempts/:attemptId/reveal/confirm`

## 22.8 Review and progression

- `GET /api/reviews/due`
- `POST /api/reviews/:cardId`
- `GET /api/mastery/:conceptId`
- `GET /api/xp`
- `GET /api/streak`
- `GET /api/achievements`

## 22.9 Notebook and uploads

- `POST /api/notebooks`
- `GET /api/notebooks/:id`
- `PUT /api/notebook-pages/:id`
- `POST /api/uploads`
- `POST /api/uploads/:id/assessment-packet`

## 22.10 Exports

- `POST /api/exports/notebooklm`
- `POST /api/exports/user-data`
- `DELETE /api/user-data`

Destructive deletion requires an explicit typed confirmation in the UI.

---

# 23. Tutor packet and response protocol

Companion and ChatGPT-native modes should use the same logical protocol.

## 23.1 Envelope

```ts
interface TutorEnvelope<T> {
  protocolVersion: "0.2";
  operation: TutorOperation;
  requestId: string;
  generatedAt: string;
  payload: T;
  modelNotes?: string[];
}
```

## 23.2 Lesson draft response

```ts
interface LessonDraft {
  conceptIds: string[];
  title: string;
  orientation: string;
  visualBrief: VisualBriefDraft;
  explanation: string;
  activityDraft: LearningActivityDraft;
  responsePrompt: string;
  answerAuthority: AnswerAuthorityDraft;
  hints: HintDraft[];
  sourceClaimMap: SourceClaimDraft[];
  uncertainty: string[];
}
```

The provider must not include hidden chain-of-thought. Expected reasoning is represented as concise answer criteria or rubric elements.

## 23.3 Validation order

1. parse JSON
2. validate protocol version
3. validate operation and request ID
4. validate Zod schema
5. verify referenced IDs
6. run writing gate on every learner-facing string
7. run deterministic content checks
8. inspect assurance claims
9. present draft for review or commit automatically according to content status

Curated content must never be auto-published from a single model response.

---

# 24. Prompt package

The repository must contain versioned prompt files. They are application assets, not hard-coded multi-line strings scattered through source files.

## 24.1 `tutor-system.md`

Defines:

- learner-centred tutoring behaviour
- accountability modes
- source boundaries
- answer leakage rules
- schema discipline
- writing contract reference
- visual policy reference
- assessment confidence

## 24.2 `lesson-writer.md`

Requires:

- one main idea per beat
- direct reference to the selected visual
- concrete examples
- concise text
- no formulaic introduction or summary
- output as structured JSON

## 24.3 `style-editor.md`

Receives the original plan, draft, and linter violations. It edits only flagged spans unless a broader change is required for coherence. It must preserve facts, values, units, claims, citations, answer boundaries, and learner level.

## 24.4 `visual-director.md`

Produces a Visual Brief and chooses a visual class. It must justify image generation after considering interactive, deterministic, and retrieved options.

## 24.5 `visual-reviewer.md`

Checks a visual against explicit verification items. It reports visible evidence, missing items, contradictions, unreadable labels, and uncertainty.

## 24.6 `assessor.md`

Produces rubric-linked feedback and confidence. It must not expose the full answer in Coach or Assisted mode.

The complete required prompt content appears in the supporting writing and visual documents. Luna must copy those prompts into the repository and add automated snapshot tests for their required clauses.

---

# 25. ChatGPT-native adapter

## 25.1 Compatibility spike

Create the smallest possible host app and test:

- custom app/plugin visibility
- embedded UI rendering
- fullscreen or large-view support
- tool calls from UI
- follow-up messages
- file upload
- model access to uploaded images
- persistent local-server state
- generated-image return path, if any
- external link handling

Record:

- account plan and surface tested
- exact date
- capability result
- screenshots where helpful
- fallback chosen

Do not block the standalone prototype while investigating unsupported host features.

## 25.2 MCP tool principles

- narrow operations
- explicit schemas
- no hidden answer fields in learner-visible results
- idempotency keys for commits
- confirmation for destructive actions
- no arbitrary file access
- no arbitrary SQL or shell tools

## 25.3 Generated image handoff

Preferred path when supported:

1. application commits a Visual Brief
2. UI asks ChatGPT to generate the illustration
3. returned image is made available to the app through a supported file or attachment reference
4. application registers it
5. visual review runs

Fallback:

1. application provides a copyable generation request
2. user generates the image in ChatGPT
3. user downloads or drags the result into Discere
4. application registers and reviews it

The application must not pretend the preferred path works until verified.

---

# 26. Read-aloud and voice

## 26.1 Exact read-aloud

Use browser speech synthesis for displayed text when available.

Controls:

- play/pause
- stop
- sentence back/forward
- speed
- voice selection
- highlight current sentence

Store preferences locally. Do not send text to a paid speech service by default.

## 26.2 Spoken explanation

Provide `Prepare voice explanation`, which creates a concise spoken-style Tutor Packet. In ChatGPT-native mode, send it into the conversation when supported. In companion mode, copy it for use in ChatGPT Voice.

Do not claim the application directly embeds subscription-backed ChatGPT Voice unless the host exposes that capability.

---

# 27. NotebookLM export

NotebookLM is an export destination, not a runtime dependency.

## 27.1 Export package

Generate a ZIP containing:

- `overview.md`
- `learning-objectives.md`
- `lesson-notes.md`
- `glossary.md`
- `sources.md`
- `source-files/` where redistribution is permitted
- `visuals/` with attribution
- `quiz-bank.md`
- `generation-brief.md`

## 27.2 Generation brief

Include suggested instructions for:

- audio overview
- slide deck
- video overview
- quiz
- study guide

The brief must state the intended audience, duration, emphasis, terminology, exclusions, and source-priority rules.

## 27.3 Manual handoff

The UI explains how to import the pack. Do not automate consumer NotebookLM through browser scripting.

---

# 28. Security, privacy, and local lifecycle

## 28.1 Local-first

- Bind local services to `127.0.0.1` by default.
- Store the database under `data/`.
- Do not transmit progress or notes except during an explicit provider operation.
- Show exactly what a Tutor Packet contains before copying or sending it.
- Allow export and deletion.

## 28.2 Secrets

- No secrets committed.
- `.env.example` documents optional values.
- Tunnel credentials, if used, are separate from model inference.
- Redact secrets and personal paths from logs.

## 28.3 Uploads

- validate MIME type and actual file signature
- apply size limits
- generate safe filenames
- reject SVG uploads containing scripts unless sanitised
- strip unnecessary metadata when creating derived previews
- never execute uploaded files

## 28.4 Logging

Default logs include operation names, duration, and errors. Learner text and images are excluded unless debug logging is explicitly enabled.

## 28.5 Shutdown

Ctrl+C and `pnpm stop` must close:

- HTTP server
- SQLite connections
- file watchers started by the project
- optional tunnel process started by the project

Tests must verify no project ports remain open after shutdown.

---

# 29. Testing and evaluation

## 29.1 Unit tests

### Writing engine

Test every hard rule and warning with positive and negative examples. Include:

- negative parallelism variants
- forced triads
- legitimate three-item factual lists
- em dash limits
- canned phrases
- repeated praise
- repeated transitions
- heading density
- answer leakage markers

### Visual engine

Test:

- Visual Brief schemas
- renderer bounds
- circuit topology fixtures
- label overlays
- provenance requirements
- review state transitions

### Activity engine

Test every activity schema and validation function.

### Assessment

Test numeric tolerance, units, series/parallel calculations, hidden answer handling, and deterministic/model disagreement.

### Progression

Test XP idempotency, streak qualification, recovery, mastery weighting, and repeated-question diminishing returns.

## 29.2 Integration tests

- generate draft → lint fails → targeted edit → commit succeeds
- create visual brief → render deterministic visual → review passes
- begin lesson → activity → answer → feedback → mastery update
- Coach mode blocks answer → reveal flow grants access → transfer question recorded
- companion packet → paste response → validate → commit
- offline seed course remains usable
- export pack contains expected files and attribution

## 29.3 UI tests

- lesson visual remains dominant at desktop widths
- no horizontal overflow
- keyboard-only lesson completion
- screen reader labels
- reduced motion
- digital-notepad persistence
- image zoom and source drawer
- no empty or dead controls

## 29.4 Manual writing evaluation

Create at least 100 evaluation prompts across:

- electronics
- mathematics
- physics
- English
- philosophy
- history
- feedback on wrong answers
- hints
- course introductions

For each output record:

- linter results
- factual correctness
- answer leakage
- perceived AI-writing score from 1–5
- clarity
- preference against an unedited baseline

Target:

- zero hard-rule violations in committed seed content
- fewer than 0.3 warning violations per 300 words after justified exceptions
- edited output preferred over baseline in at least 80% of human comparisons
- no factual regression caused by style editing in the evaluation set

## 29.5 Manual visual evaluation

Review every seed visual for:

- correctness
- learning relevance
- readability
- label accuracy
- accessibility
- attribution
- mobile legibility

Generated images require a separate check against the Visual Brief.

---

# 30. Implementation phases and gates

## Phase 0 — Repository and compatibility foundation

Deliver:

- monorepo skeleton
- scripts
- SQLite migration setup
- mock provider
- compatibility spike shell
- `compatibility-report.md`

Gate:

- dev and stop commands work
- mock lesson renders
- host result documented

## Phase 1 — Visual-first application shell

Deliver:

- Workshop
- Knowledge map
- Lesson layout
- visual stage
- explanation panel
- response area
- seed mock lesson

Gate:

- the core lesson is usable by keyboard
- visual occupies the intended majority of the stage
- no placeholder controls

## Phase 2 — Humanised writing engine

Deliver:

- prompt files
- deterministic linter
- violation UI
- commit gate
- targeted edit packet
- style feedback controls
- evaluation fixtures

Gate:

- all hard-rule tests pass
- seed explanations contain no hard violations
- rejected text cannot bypass the server gate
