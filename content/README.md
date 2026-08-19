# Course content

Every directory here that contains a `bundle.json` is a course. The server scans this directory
at start-up, so adding a course is adding a directory. Nothing in `apps/server` names a course.

```text
content/
  <course-id>/
    bundle.json        the course, validated by @discere/curriculum
    assets/            retrieved images, served read-only at /api/content/<course-id>/assets/*
    review/            one Markdown review file per generated item, kept in Git
    generated/         raw Codex output, ignored by Git
    README.md
```

## What a bundle holds

| Collection   | Purpose                                                                              |
| ------------ | ------------------------------------------------------------------------------------ |
| `course`     | Title, audience, assurance level, and the sources the whole course rests on.          |
| `modules`    | Groupings of concepts. Every concept belongs to exactly one module.                   |
| `concepts`   | The learnable units, with prerequisites. The graph must be acyclic.                   |
| `lessons`    | Lesson beats. Each one becomes a journey of stages at request time.                   |
| `activities` | Interactive models: `ohms_law_explorer`, `series_circuit_explorer`, `parallel_circuit_explorer`, `timeline_explorer`. |
| `questions`  | Prompts with hidden answer authority, hint ladders, and an optional transfer case.    |
| `flashcards` | Authored recall cards. Each must be answerable without the lesson around it.          |
| `essays`     | Extended writing topics with an expected scope and success criteria.                  |
| `sources`    | Every source the course cites, including one record per retrieved image.              |

A lesson names its own stages rather than inheriting a fixed shape: `questionIds` decides how
many quiz stages the journey has, `essayId` decides whether there is an essay stage,
`flashcardIds` feeds the review stage, and `stageTitles`, `takeaway`, `reviewLabel`, and
`nextAction` are the learner-facing strings those stages display. `visualKind` says what the
explainer shows, which is either an authored `circuitSpec` or a retrieved `image`.

## Retrieved images

`scripts/retrieve-images.ts` fetches from the Wikimedia Commons API and accepts only public
domain, CC0, CC BY, or CC BY-SA material. It writes the file into `assets/` and records the
landing page, creator, licence, attribution string, retrieval date, and a SHA-256 of the bytes
into `assets/provenance.json`. The bundle repeats that provenance on the lesson, and the
interface prints the attribution beneath the picture.

```bash
npx tsx scripts/retrieve-images.ts <course-id>
```

Validation refuses a licence it cannot redistribute, an attribution that does not name its
creator, and a bundle that references a file which is not on disk.

## Working on content

```bash
pnpm author validate      # schema, references, answer markability, MCQ share, licences
pnpm author lint          # the writing gate over every learner-facing string
pnpm validate:content     # the same validation the server runs at start-up
```

The authoring pipeline that generates, repairs, reviews, and merges new material is documented
in [`docs/authoring-pipeline.md`](../docs/authoring-pipeline.md).

## Rules the validator enforces

- Every reference resolves, and the prerequisite graph has no cycles.
- Numeric questions carry a three-step hint ladder, and no hint states the answer or an
  equivalent form of it.
- A selectable question is marked by exactly one of its options.
- An accepted idea for a written answer is a short phrase, not a sentence that could never be
  matched inside what a learner wrote.
- At most 35% of a course's questions are multiple choice (spec v0.2 section 18.4).
- Every learner-facing string passes the writing gate in `@discere/writing-engine`.
