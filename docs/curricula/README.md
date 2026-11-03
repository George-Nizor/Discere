# Curricula for the expansion

Each new course in `docs/expansion-plan-2026-11.md` gets one curriculum file here,
`docs/curricula/<course-id>.json`. A curriculum is complete enough for a writer agent to author
the course with `docs/writing-calibration/authoring-brief.md` and the `discere-lesson-voice`
skill, and for figures and interactions to be built, without doing any research of its own.

## Brief for a curriculum researcher

You are designing a course, not writing its lessons. A good teacher designing a course for a
curious adult would decide what the course should achieve, the order of ideas, what learners get
wrong, which examples make each idea click, what the learner should see and do on each screen,
and how to check that they learned it. That is your job.

### Rules

- **roadmap.sh is a topic checklist only.** Its licence forbids republishing its content. You may
  use a roadmap to check which topics a role needs. Never copy its node text, descriptions or
  structure wording. Do not cite roadmap.sh as a source.
- **Sources** are primary or openly licensed: official documentation, standards, OpenStax, MDN,
  OWASP, government and university open courseware, classic papers, and freely available
  materials such as Red Cross guidance. Record each source's licence and whether lessons may
  adapt it or only use it as reference. Prefer sources a writer can cite section by section. Try
  to open each source to confirm it exists and says what you claim. Mark any source you could
  not open as `"verified": false`.
- **Vendor-neutral.** Teach concepts; name tools only as current examples. No tool tutorials
  (Blender, CAD and similar are out of scope).
- **Course size.** 8 to 16 lessons of about 12 to 15 minutes each, in 2 to 4 modules. Every lesson
  must need only what came before it, in this course or in a stated prerequisite course.
- **Audience.** A capable adult. Say what they already know, and link existing Discere courses as
  prerequisites by id (listed below).
- **Answers.** Every question plan is markable without free text: numeric, choice, single term, a
  self-rated recall, or code (Python, SQL and Rust can run in the app's sandbox; other languages
  are code-reading questions until runners exist). Give two or three sample items per lesson with
  their answers, worked out exactly.
- **Figures and interactions.** For each lesson, say what the learner should see and do, using the
  available figure types below. Prefer an existing type. Where a new figure type or runner would
  clearly help, describe it under `platformNeeds` and also give an `svg_figure` fallback the writer
  can use now. A figure must never show the answer to a question that follows it.
- **Facts.** Dates, names and numbers must be accurate. List anything you wrote from memory and
  could not check in `unverified`.

### File format

```json
{
  "id": "system-design",
  "title": "System Design",
  "family": "A",
  "voice": "A",
  "description": "One or two sentences for the course card.",
  "audience": "Who it is for and what they already know.",
  "prerequisites": ["cs-basics"],
  "outcomes": ["You'll be able to …"],
  "sources": [
    { "id": "sre-book", "title": "Site Reliability Engineering (Google)", "url": "https://sre.google/sre-book/table-of-contents/",
      "licence": "CC BY-NC-ND 4.0", "use": "reference", "verified": true }
  ],
  "modules": [{ "id": "foundations", "title": "…", "summary": "…" }],
  "lessons": [
    {
      "id": "what-a-request-meets", "moduleId": "foundations", "title": "…",
      "objective": "What the learner can do at the end, as one sentence.",
      "prerequisiteLessonIds": [],
      "concepts": [{ "id": "latency", "title": "Latency", "summary": "One exact sentence." }],
      "skills": ["estimate-latency"],
      "misconceptions": ["Real, specific mistakes learners make, and why they make them."],
      "sequence": ["The order of ideas, one line each, as a teacher would plan it."],
      "examples": ["Concrete subject-native examples with real numbers, worked out."],
      "figures": [
        { "type": "svg_figure", "shows": "…", "learnerAction": "… or none", "placement": "which idea it serves" }
      ],
      "questionPlan": [
        { "kind": "numeric|choice|single-term|self|code-run-python|code-run-sql|code-run-rust|code-reading",
          "targets": "skill or misconception", "sample": "Prompt text", "answer": "Exact answer", "choices": ["only for choice"] }
      ],
      "sourceIds": ["sre-book"],
      "historyNotes": ["Optional accurate dated details that explain why something is as it is."],
      "estimatedMinutes": 13
    }
  ],
  "courseCheck": "What a final mixed check across the course should test.",
  "platformNeeds": ["New figure types or runners that would clearly improve the course."],
  "unverified": ["Anything written from memory that the writer must treat with care."]
}
```

Write valid JSON with `ensure_ascii=False` and check that it parses.

### Available figure types today

- **Generic:**
  - `svg_figure`: a hand-drawn figure from plain shapes, with switchable views. Use it for
    architecture boxes, sequence diagrams, network paths and timelines drawn as SVG.
  - `coordinate_plane`, `graph_plot`, `data_distribution`, `data_series`, `table`,
    `timeline_explorer`, `order_sequence`, `diagram_choice`, `number_machine`,
    `equation_balance`, `outcome_grid`, `sampling_population`, `truth_table`.
- **Code:**
  - `program_trace`: step through a program's variables.
  - `python_execution`, `relational_query` (SQL tables and results), `search_array`,
    `rust_program`.
- **Subject explorers:** `mechanics_explorer`, `engineering_explorer`, `chemistry_explorer`,
  `biology_explorer`, `astronomy_explorer`, `calculus_explorer`, `geometry_explorer`,
  `linear_algebra_explorer`, `economics_explorer`, `psychology_explorer`,
  `philosophy_explorer`, `language_explorer`, `inference_explorer`, and the circuit explorers
  (`ohms_law_explorer`, `series_circuit_explorer`, `parallel_circuit_explorer`).

### Existing courses (use as prerequisites)

maths-foundations, geometry-shape-and-space, calculus-change-and-accumulation,
linear-algebra-vectors-and-maps, probability-statistics, physics-motion-and-forces,
chemistry-atoms-to-reactions, biology-cells-to-ecosystems, astronomy-sky-to-cosmos,
engineering-structures-and-machines, electronics-foundations, cs-basics, python-for-data-analysis,
sql-from-rows-to-reports, rust-foundations, logic-and-reasoning,
philosophy-knowledge-mind-and-ethics, psychology-how-minds-work, economics-markets-and-strategy,
english-reading-writing-and-rhetoric.
