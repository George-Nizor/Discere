## 16.2 Review interface

The learner answers before seeing the back. Rating choices may be:

- forgot
- difficult
- remembered
- easy

Do not call these choices correct when the answer itself is assessed separately.

## 16.3 Visual cards

Support:

- image occlusion
- diagram labelling
- component identification
- graph interpretation
- before/after comparison

## 16.4 Mission integration

Due reviews appear inside the daily mission. They should not live only in an isolated flashcard section.

---

# 17. Curriculum and topic breadth

## 17.1 Concept graph

Courses are graphs of concepts and prerequisite edges.

```ts
interface Concept {
  id: string;
  courseId: string;
  title: string;
  aliases: string[];
  summary: string;
  prerequisites: string[];
  outcomes: string[];
  misconceptions: string[];
  sourceIds: string[];
  domainCapabilities: DomainCapability[];
  assurance: AssuranceLevel;
  status: "draft" | "reviewed" | "published" | "retired";
}
```

## 17.2 Assurance levels

- `curated_validated` — reviewed content, sources, questions, and supported deterministic checks
- `source_backed` — generated from stored sources with citations and passing checks
- `generated` — generated from model knowledge with limited verification
- `exploratory` — open tutoring where reliable assessment may be unavailable

Display the assurance level without making the interface alarming.

## 17.3 Custom-topic creation

Flow:

1. learner enters a topic and goal
2. application asks only essential questions, or applies defaults
3. tutor drafts a concept graph
4. application lints and validates it
5. learner reviews the map
6. sources are attached when available
7. first lesson is generated on demand
8. course begins as `generated` or `source_backed`

Do not generate an entire textbook before the learner starts. Generate validated concept records and lesson beats incrementally.

## 17.4 Subject capability matrix

| Domain | Preferred visuals | Deterministic support | Typical activities |
|---|---|---|---|
| Mathematics | equations, graphs, geometry | symbolic/numeric checks | sliders, graph moves, step checks |
| Physics | diagrams, graphs, simulations | units and formulas | prediction, parameter explorer |
| Electronics | circuits, real photos, waveforms | circuit calculations | probe placement, fault finding |
| English | text annotation, structure maps | limited | annotation, revision, evidence selection |
| Philosophy | argument maps, source excerpts | logical structure checks | claim/evidence mapping, objections |
| History | maps, timelines, primary sources | date/order checks | source analysis, chronology |
| Biology | labelled diagrams, microscopy | label checks | classification, process sequence |
| Chemistry | structures, apparatus, graphs | equation and unit checks | balancing, lab sequence |
| Computing | code, state diagrams, architecture | tests and static checks | code tracing, debugging |
| Engineering | schematics, CAD views, graphs | domain-specific | design trade-offs, diagnosis |

The shared activity engine handles general structure. Domain packages add exact renderers and validators.

## 17.5 User-provided material

Support importing:

- PDF
- Markdown
- plain text
- images
- course outlines
- web source records

The application stores source metadata and chunks. When direct parsing is unavailable, allow manual text extraction or companion-mode analysis. Never claim an unread file was processed.

---

# 18. Seed curriculum: Foundations of Electronics and Circuits

## 18.1 Audience

Beginner with no formal electronics background. Assumes basic arithmetic. Uses safe, low-voltage DC examples suitable for an Arduino-style starter kit.

## 18.2 Safety boundary

The course must state clearly:

- use low-voltage battery or USB-powered circuits only
- do not work on mains wiring
- do not open power supplies or mains appliances
- observe component polarity and current limits
- disconnect power before changing a circuit
- stop when components heat, smell, smoke, or behave unexpectedly

Do not provide instructions for dangerous voltage, high-current batteries, microwave capacitors, CRTs, or similar hazards.

## 18.3 Modules

### Module 1 — What a circuit is

- charge and current
- voltage as potential difference
- closed and open paths
- conventional current direction
- circuit symbols

### Module 2 — Resistance and Ohm’s law

- resistance
- Ohm’s law
- units and prefixes
- resistor values and colour bands
- electrical power

### Module 3 — Series and parallel

- series paths
- parallel branches
- equivalent resistance
- voltage division at an introductory level
- current division conceptually

### Module 4 — Components

- LEDs and polarity
- switches and buttons
- potentiometers
- capacitors conceptually
- diodes conceptually
- transistors as switches conceptually

### Module 5 — Breadboards and measurement

- breadboard connectivity
- building a simple LED circuit
- multimeter modes
- measuring voltage
- measuring resistance safely
- measuring current safely

### Module 6 — Troubleshooting and practical challenge

- continuity and open circuits
- common breadboard errors
- wrong component value
- reversed LED
- missing common ground
- final fault-finding challenge

## 18.4 Seed content quantity

At minimum:

- 30 concept records
- 24 lesson beats
- 60 questions
- 30 flashcards
- 12 interactive activities
- 12 required visuals from section 9.6
- 6 module challenges
- 1 final practical mission

No more than 35% of questions may be multiple choice.

---

# 19. Source and provenance system

## 19.1 Source record

```ts
interface SourceRecord {
  id: string;
  title: string;
  creator?: string;
  publisher?: string;
  url?: string;
  sourceType: "official" | "textbook" | "course" | "article" | "image" | "user_file";
  licence?: string;
  attribution?: string;
  retrievedAt?: string;
  contentHash?: string;
  localPath?: string;
  notes?: string;
  trustTier: 1 | 2 | 3 | 4;
}
```

## 19.2 Claim records

Curated lessons should link important factual claims to source passages or deterministic calculations.

```ts
interface ClaimRecord {
  id: string;
  lessonBeatId: string;
  claimText: string;
  sourceIds: string[];
  deterministicCheckId?: string;
  verificationStatus: "verified" | "supported" | "unverified" | "disputed";
}
```

## 19.3 Image provenance

Store:

- original page URL
- direct asset URL when permitted
- creator
- licence
- attribution text
- retrieval date
- thumbnail and local cache state
- crop or annotation transformations

The UI must show attribution in the source drawer.

## 19.4 Prompt-injection handling

Treat imported source content as untrusted data. Never allow instructions embedded in source text to modify system behaviour, tool permissions, grading rules, or hidden answers.

---

# 20. Technical architecture

## 20.1 Technology choices

- **Language:** TypeScript
- **Package manager:** pnpm
- **Monorepo:** pnpm workspaces
- **Web:** React, Vite, React Router
- **Styling:** CSS modules or vanilla CSS with design tokens
- **State:** TanStack Query for server state; Zustand only for transient UI state if needed
- **Server:** Fastify
- **Validation:** Zod
- **Database:** SQLite with Drizzle ORM
- **Tests:** Vitest, Testing Library, Playwright
- **Diagrams:** SVG, Mermaid where appropriate, custom circuit SVG renderer
- **Equations:** KaTeX
- **Graphs:** lightweight SVG or a small chart library; avoid heavyweight dashboards
- **Canvas:** custom Pointer Events layer or a maintained lightweight drawing library
- **Scheduling:** FSRS implementation
- **MCP:** official or current TypeScript MCP SDK when ChatGPT-native mode is implemented

Do not add a framework merely because it is fashionable. Keep dependencies small and documented.

## 20.2 Repository structure

```text
discere/
├─ README.md
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ .env.example
├─ .gitignore
├─ apps/
│  ├─ web/
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  ├─ routes/
│  │  │  ├─ components/
│  │  │  ├─ features/
│  │  │  ├─ host/
│  │  │  └─ styles/
│  │  └─ tests/
│  ├─ server/
│  │  ├─ src/
│  │  │  ├─ api/
│  │  │  ├─ domain/
│  │  │  ├─ db/
│  │  │  ├─ providers/
│  │  │  ├─ services/
│  │  │  └─ lifecycle/
│  │  └─ tests/
│  └─ mcp/
│     └─ src/
├─ packages/
│  ├─ contracts/
│  ├─ curriculum/
│  ├─ writing-engine/
│  ├─ visual-engine/
│  ├─ activity-engine/
│  ├─ assessment-engine/
│  ├─ progression-engine/
│  ├─ tutor-providers/
│  └─ ui/
├─ content/
│  └─ electronics-foundations/
│     ├─ course.json
│     ├─ concepts/
│     ├─ lessons/
│     ├─ questions/
│     ├─ activities/
│     ├─ visuals/
│     └─ sources/
├─ prompts/
│  ├─ tutor-system.md
│  ├─ lesson-writer.md
│  ├─ style-editor.md
│  ├─ assessor.md
│  ├─ visual-director.md
│  └─ visual-reviewer.md
├─ docs/
│  ├─ spec-v0.2.md
│  ├─ writing-system.md
│  ├─ visual-system.md
│  ├─ luna-handoff.md
│  ├─ compatibility-report.md
│  ├─ architecture.md
│  └─ evaluation-report.md
├─ scripts/
│  ├─ dev.ts
│  ├─ stop.ts
│  ├─ validate-content.ts
│  ├─ seed.ts
│  └─ export-user-data.ts
└─ data/
   └─ .gitkeep
```

## 20.3 Process model

Default local processes:

- web development server
- local Fastify server
- optional MCP adapter

`pnpm dev` starts required processes, prints URLs, and handles Ctrl+C cleanly. `pnpm stop` terminates only processes started by the project. Production local mode uses `pnpm start`.

Do not start Docker, tunnels, workers, or model servers unless explicitly requested.

## 20.4 State ownership

- SQLite owns durable learning state.
- Server services own permissions and answer-reveal state.
- React owns temporary display state.
- Tutor providers return drafts.
- Domain services validate and commit drafts.
- Host adapters translate between ChatGPT/MCP or companion packets and the domain layer.

## 20.5 Offline behaviour

The seed electronics course, deterministic visuals, activities, questions, and progress tracking must work offline. Model-dependent generation and remote image retrieval may be unavailable. The UI should state this plainly and continue with cached content.

---

# 21. Domain data model

Use UUIDs or stable human-readable IDs for bundled content. All records include `created_at` and `updated_at` where applicable.

## 21.1 Core tables

- `user_profile`
- `user_preferences`
- `courses`
- `modules`
- `concepts`
- `concept_edges`
- `sources`
- `source_passages`
- `claims`
- `lesson_beats`
- `visuals`
- `visual_reviews`
- `activities`
- `questions`
- `question_hints`
- `flashcards`

## 21.2 Learning tables

- `learning_sessions`
- `attempts`
- `assessments`
- `assistance_events`
- `reveal_sessions`
- `mastery_evidence`
- `concept_mastery`
- `flashcard_reviews`
- `mission_history`
- `streak_history`
- `xp_events`
- `achievements`
- `achievement_unlocks`

## 21.3 Content quality tables

- `writing_gate_runs`
- `style_violations`
- `style_feedback`
- `generation_records`
- `content_reviews`
- `provider_packets`
- `provider_responses`

## 21.4 Notebook tables

- `notebooks`
- `notebook_pages`
- `notebook_strokes`
- `uploads`
- `upload_assessments`

## 21.5 Export tables

- `exports`
- `export_files`

Database migrations must be committed. Seed commands must be idempotent.

---

# 22. Server API and application services

Use REST for the standalone UI. Expose equivalent MCP tools through a thin adapter when supported.

## 22.1 Workspace

- `GET /api/home`
- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/progress`
- `GET /api/missions/today`

## 22.2 Courses

- `GET /api/courses`
- `GET /api/courses/:courseId`
- `POST /api/courses/draft-plan`
- `POST /api/courses/commit-plan`
- `GET /api/courses/:courseId/map`

## 22.3 Lessons

- `POST /api/sessions`
- `GET /api/sessions/:sessionId`
- `POST /api/lessons/draft`
- `POST /api/lessons/commit`
- `GET /api/lesson-beats/:beatId`
- `POST /api/lesson-beats/:beatId/complete`
