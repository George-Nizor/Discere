# Story lessons: the brief for the writing agents

You are rewriting Discere lessons so that they teach the way a good teacher does: by telling the
learner a story and taking them on a journey, with questions placed after the teaching and not
instead of it. The owner has approved one worked example. Read it first, then follow this brief.

## Why this exists

The v2 lessons (see `style-guide.md`) open with a quiz, give each screen about 20 words of lead and
hold the real explanation back until after the learner has answered. A learner who has never met the
subject is asked questions about words nobody has explained. The owner wants the opposite: screens
that simply explain, in connected paragraphs, with a figure where one helps, and questions that come
once the learner has been told enough to answer them.

Read these two files before you write anything:

1. `docs/learning-experience/story-prototype/astronomy-turning-sky.md`: the approved lesson as plain
   text. The exact wording is in the `SCREENS` array of `astronomy-turning-sky.html` beside it.
2. `docs/learning-experience/style-guide.md`: still the rules for questions, feedback, hints,
   misconceptions, skills and the validator. Where it disagrees with this brief about the shape of a
   lesson or the length of a lead, this brief wins.

## The shape of a lesson

| Part | Where it lives | What it is |
|---|---|---|
| Opener | `intro` | A scene that makes the learner want to know, 120 to 200 words in two or three paragraphs, with a figure if one helps. It asks nothing (leave `hook.questionId` out). `promise` is one sentence of at most 25 words: "By the end you'll …". `estimatedMinutes` is honest. |
| Teaching screens | `steps` of kind `explain` with **no** `checkQuestionId` | 100 to 250 words each, in two to four connected paragraphs. Prose before the figure goes in `lead`, prose after it in `afterFigure`. The `headline` names what the screen is about, in plain words. |
| Practice screens | `steps` of kind `predict`, `try` or `transfer` | One question each, placed right after the teaching that makes it answerable. At most 60 words of `lead`. |
| Skill check | `questionIds` | Exactly 3 items, no hints, no figures, testing what the lesson taught. |
| Close | `recap` | `keyIdea`, a short account of what the learner worked out, and a `nextHook` that is a statement. |

Proportions: at least 40 percent of the steps are teaching screens, and never more than three in a
row (the validator warns on the fourth). The lesson never opens with a question. A lesson has 8 to
14 steps, 3 to 7 of them with a question (a worked or faded example counts), and at least one `transfer`. Keep the lesson to about 12
minutes.

## The story spine

Before you write a word of prose, decide the lesson's spine in two sentences and keep it in the
notes of your draft. A spine is one journey the whole lesson takes, so that each screen is the next
stop and not a separate topic. Examples of the kinds of journey that work:

- Go somewhere and watch what changes (the approved lesson walks north from the equator and watches
  the pole star climb).
- Follow one thing through a process from start to end.
- Take a puzzle that is simple at first and let it grow as each idea is added.
- Retrace how people found something out, one discovery at a time.

Every teaching screen does three jobs, in this order, without announcing them:

1. It says where we are, in a clause or a sentence that picks up from the screen before.
2. It teaches one new idea properly, with a concrete example or an analogy the learner can picture.
3. It says what that idea now lets us do or what question it leaves open, which is the way into the
   next screen.

The opener sets up the journey and the close returns to where it began.

## The voice

You are a teacher talking to one person. The owner reads every word, so these are firm.

- Plain, specific sentences. Contractions and "you" are fine. British spelling.
- Concrete before abstract. Start from something the learner can see, hold or do, then name it.
- A term is explained where it first appears and listed in the step's `introducesTerms`. Never use a
  technical word on an earlier screen than the one that introduces it, in prose, in a figure label or
  in a question. If a screen needs a word you have not taught, teach it first.
- Short paragraphs that connect. Each paragraph follows from the last one. Do not write a list of
  facts as separate sentences.
- No headline that is a slogan. A headline names what the screen holds ("The hub of the wheel").
- No kicker labels, no "In this lesson we will", no "Let's dive in", no "Imagine a world where".
- No rhetorical questions. Say what the question is instead: "That raises a puzzle: …".
- No "not X but Y", no tricolons for rhythm, no one-line punchlines, no em dashes, no
  stock praise, no hype or sales language ("fascinating", "powerful", "crucial").
- Equations and units: plain text with Unicode (x², ×, −, °). Typeset maths only inside `$…$`.
- Run the `humanizer` skill over your prose before you save it, if you have it. The writing gate
  (`@discere/writing-engine`) runs on every new field when you apply; fix its errors.

A paragraph from the approved lesson, to hear the register: "Earth spins once a day, and you spin
with it. Because you share the motion you don't feel it, just as you don't feel a train gliding along a
smooth, straight track. What you notice is the world outside sliding the other way."

## The course introduction

The first agent on a course also writes its introduction, once, to
`content/<course>/.authoring/course-intro.json`. A learner who has never heard of the subject reads
it before lesson 1, so it says what the subject is and why people study it, how the course is laid
out, and what they will be able to do. The shape:

```json
{
  "paragraphs": ["two or three connected paragraphs, 120 to 200 words in all"],
  "outcomes": ["You'll be able to …", "three to five of these, each a thing you can do"],
  "prerequisites": "One sentence on what the learner should already know.",
  "length": "12 lessons, about 10 minutes each"
}
```

Use the course's `description`, `audience` and module list in its `bundle.json` as source material,
and the same voice as the lessons.

## Figures

The prototype's figures were built for it. The real app only has the diagram types the course already
uses (`diagram.type` in the course's bundle). So:

- Use an existing diagram type where one fits the screen. A figure on a teaching screen shows its
  results freely. A figure on a screen with a graded question declares `answerVisibility`
  (`hidden-until-response`), and its case labels never contain the answer.
- If the screen really needs a figure the course does not have, write the screen so that it still
  teaches without it, and append an entry to `content/<course>/.authoring/figure-wishlist.md`:
  lesson id, step id, what it shows, what the learner can change, and the caption you would use.
  Do not invent diagram types and do not edit any code.
- Every lesson needs at least one step with a `diagram`.

## Questions

- Keep every existing question id and its answer key. Learner history points at them. You may
  rewrite a prompt so that it stands on its own now that the opener no longer sets it up, and you may
  rewrite `hints`, `onCorrect` and `misconceptions`. If an item's meaning or key would change, give
  the new item a new id in the course's id style and leave the old one out of the lesson.
- Recompute every numeric key yourself. If an original key is wrong, fix it and say so in your report.
- The question comes after the teaching. The step's `lead` is at most 60 words and never states the
  answer. Teaching the principle on the screen before is expected and is not leaking.
- A predict question must be answerable by someone who has read the screens before it.
- Multiple choice is at most 35 percent of the course. Prefer numeric or short-answer items.
- `onCorrect` is at most 25 words and states the idea. Hints are three questions or next moves that
  never state the answer. A misconception never matches the key and never states it.

## How the files work

Each lesson has a draft at `content/<course>/.authoring/migration/<lesson-id>.json` with keys
`lesson`, `questions` and `citations`. Edit that file in place. Do not run the scaffold script without
`--apply`, and do not run any `prepare-*.ts` script: they regenerate the course from its old source
and would erase this work.

A teaching step looks like this:

```json
{
  "id": "hub-of-the-wheel",
  "kind": "explain",
  "blocks": [],
  "headline": "The hub of the wheel",
  "lead": [{ "kind": "paragraph", "text": "…" }, { "kind": "paragraph", "text": "…" }],
  "afterFigure": [{ "kind": "paragraph", "text": "…" }],
  "introducesTerms": ["north celestial pole"],
  "visualStateId": "",
  "checkQuestionId": "",
  "activityId": "",
  "diagram": { "type": "astronomy_explorer", "…": "…" }
}
```

`afterFigure` is only valid on a teaching screen, and only the screen's own prose counts towards the
limits (80 to 280 words across `lead` and `afterFigure`). Delete the opener's old question from
`intro.hook`. Update `taughtSkills` so that every question's `skill` is taught by this lesson or an
earlier one.

Citations: every step, every question and every flashcard needs at least one citation. A teaching
step's `claim` states what that screen asserts. Reuse the `sourceId` and `section` values already in
the draft.

Apply and validate:

```bash
pnpm tsx scripts/lesson-migration/scaffold.ts <course-id> --apply
```

Clear every error. Warnings: fix them, or list them with a reason in your report. The codes you will
meet are in `packages/curriculum/src/lesson-v2.ts`: `EXPLAIN_TOO_LONG` and `EXPLAIN_TOO_THIN` (screen
prose outside 80 to 280 words), `EXPLAIN_RUN_TOO_LONG` (four teaching screens in a row),
`TERM_BEFORE_INTRODUCTION` (a word is used before the screen that introduces it), `LEAD_TOO_LONG`,
`AFTER_FIGURE_MISPLACED`, `STEP_WITHOUT_RESPONSE` (a practice screen with no question).

Then update the course's content test, `packages/curriculum/tests/<course-id>-v2.test.ts`, so that it
recomputes every numeric key you wrote or changed, and run it from `packages/curriculum`:

```bash
pnpm exec vitest run tests/<course-id>-v2.test.ts
pnpm --filter @discere/curriculum typecheck
```

## Do not

- Do not run `pnpm curate review` or `pnpm curate publish`. The lead reviews and publishes.
- Do not edit code, other courses, or anything outside your course's `content/<course>/.authoring/`
  folder and your course's one test file.
- Do not commit, and do not start servers or browsers.
- Do not touch lessons you were not assigned.
- Keep scratch files in your own folder under the scratchpad directory you are given.

## Report (your final message, under 400 words)

Lessons done, and for each its spine in one sentence; validator state (errors 0, warnings with
reasons); the word count of its teaching screens; numeric keys you corrected; figures you wished for;
the three lines of your own writing you are least sure about; and anything in this brief or the
tooling that got in your way.

## Lessons learned in the pilot

- Questions your lesson no longer asks: keep their ids in the bundle, but delete their citations from the
  draft (a citation on an unused question is an error). The `UNREACHABLE_CONTENT` warnings for them are
  expected; list the ids in your report.
- The writing lint treats "X, then Y, and Z" as a forced group of three. Reword the sentence or split it.
- Numeric items need three hints, even in the skill check.
- `--apply` merges every finished draft in the course folder. That is normal; it only rewrites `candidate.json`.
- Figures: use only types the course already has. List missing ones in the wishlist; keep the screen teaching without them.
- Your course test must read the draft/candidate content you wrote and still pass; do not weaken other assertions.
- Do not edit `story-format.test.ts` or any code.
- Other agents work on other courses at the same time. Never touch another course's files.
- Placement checks (`course-checks`) that name a lesson skill you moved: list them in your report, do not edit them.
