# Course content

Every directory here that contains a `bundle.json` is a course. The server scans this directory
at start-up, so adding a course is adding a directory. Nothing in `apps/server` names a course.

```text
content/
  <course-id>/
    bundle.json        the course, validated by @discere/curriculum
    assets/            cover art and retrieved images, with provenance.json
    review/            the publication record and what backs it (see below)
    authoring/         TypeScript that defines a course's checks, in the older courses
    generated/         raw Codex output from `pnpm author`, ignored by Git
  _topic-maps/         inputs to `pnpm curate`
```

The shape of a bundle is `CourseBundleSchema` in `packages/contracts/src/curriculum.ts`. The rules
beyond the schema are in `packages/curriculum/src/validate.ts` and, for v2 lessons,
`packages/curriculum/src/lesson-v2.ts`.

## What a bundle holds

A bundle is a set of flat pools. Nothing is nested inside a lesson: a lesson points at questions,
cards, activities and essays by id.

| Collection         | Purpose                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `course`           | Title, description, audience, assurance level, accent, cover, subjects, an optional introduction and `catalogueVisibility` (`listed` or `archived`). |
| `modules`          | Groupings of concepts. Every concept belongs to exactly one module.                      |
| `concepts`         | The learnable units, with prerequisites. The graph must be acyclic.                      |
| `lessons`          | The lessons, described below.                                                            |
| `activities`       | Interactive models a lesson can name: `ohms_law_explorer`, `series_circuit_explorer`, `parallel_circuit_explorer`, `timeline_explorer`, `diagram_choice`, `order_sequence` and `graph_plot`. |
| `questions`        | Prompts with hidden answer authority, hint ladders, and an optional transfer case.       |
| `flashcards`       | Authored recall cards. Each must be answerable without the lesson around it.             |
| `essays`           | Extended writing topics with an expected scope and success criteria.                     |
| `sources`          | Every source the course cites, including one record per retrieved image.                 |
| `authoringMetadata` | Optional. Per-lesson claim citations, prerequisite lessons and declared uncertainty.     |
| `courseChecks`     | Optional. One to three checks: placement, checkpoint and a delayed transfer check.       |

## A lesson

A lesson with an `intro` is a v2 lesson, and every lesson in the checked-in courses is one. It has:

- `intro`: a `hook` (blocks, with an optional diagram and first question), a `promise`, an optional
  `whyItMatters` and `warmUpQuestionId`, and `estimatedMinutes`.
- `steps`: at least three screens. A v2 step has one of the kinds `explore`, `predict`, `explain`,
  `worked_example`, `faded_example`, `try` and `transfer`, and at least one `transfer` step is
  required. Its prose is a `lead`, an optional `afterFigure` and a `reveal` shown after the response.
  A step that asks something names its question in `checkQuestionId`. A worked or faded example lists
  `workedSteps`, and a line can point at a `blank` or `selfExplain` question. The older kinds `hook`,
  `check`, `interact` and `teach_back` are still valid in the schema but rejected in a v2 lesson.
- `questionIds`: exactly three, the skill check the lesson ends on. A question a step already asks
  must not be repeated here.
- `flashcardIds`: the lesson's recall cards.
- `recap`: the `keyIdea`, optional blocks, and a `nextHook` that leads into the next lesson.

The lesson also keeps `title`, `orientation`, `conceptIds`, `sourceIds`, `taughtSkills` and the
learner-facing `stageTitles`, `reviewLabel` and `nextAction`. `visualKind` and `visualBrief` describe
a lesson's own diagram, and `visualStates` are the states its steps move between. An `activityId` adds
an interactive stage and an `essayId` adds an essay stage, and a lesson without them has neither.

## What `review/` holds

`review/publication.json` is the editorial record. It has `decision` (`pending`, `accepted` or
`rejected`), `reviewer`, `reviewedAt`, the SHA-256 of the bundle it approves (`bundleSha256`),
`factChecks`, `acceptedWarnings`, `resolvedUncertainty`, `unresolvedIssues` and `changes`
(`EditorialApprovalSchema` in `packages/contracts/src/curation.ts`). `pnpm curate publish` refuses a
record that is not accepted, has unresolved issues, or names a different hash from the candidate.

Some content is written straight into `bundle.json` and is in no authoring file: the SQL and Python
code exercises and the writing tasks. A `scripts/prepare-*.ts` script that rebuilds a candidate from
`authoring/*.ts`, and `pnpm curate publish`, therefore stop when the candidate lacks questions,
lesson steps or writing tasks that the published bundle has, and say how many would go. Pass
`--force`, or set `DISCERE_ALLOW_CONTENT_LOSS=1`, to drop them on purpose.

`review/history/` keeps earlier published bundles and their records, named by hash
(`<sha256>-bundle.json`, `<sha256>-publication.json`). The history tests check a past release
against the bundle it shipped, so a course can move on without losing that evidence. Files such as
`learner-refinement.json` and `guidance-refinement.json` list what changed between two published
bundles, from `previousBundleSha256` to `publishedBundleSha256`.

The courses added in the November 2026 expansion have no `review/` directory.

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
pnpm validate:content     # the same validation the server runs at start-up
pnpm author validate      # schema, references, answer markability, licences
pnpm author lint          # the writing gate over every learner-facing string
```

New lessons are written with `scripts/author-lesson.mjs`, described under Authoring in the
[README](../README.md). The older `pnpm author` pipeline is documented in
[`docs/authoring-pipeline.md`](../docs/authoring-pipeline.md).

## Rules the validator enforces

- Every reference resolves, and the prerequisite graph has no cycles.
- Hints are linted against the hidden answer. A numeric question with fewer than three hints draws
  a warning.
- A selectable question is marked by exactly one of its options.
- An accepted idea for a written answer is a short phrase, not a sentence that could never be
  matched inside what a learner wrote.
- A v2 lesson has three skill-check questions and at least one transfer step.
- Content that no lesson reaches is reported as a warning.
- Every learner-facing string passes the writing gate in `@discere/writing-engine`.
