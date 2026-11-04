# Brief for writing a new course from its curriculum

You are writing every lesson of one new Discere course, directly into the app's format, from the
course's curriculum in `docs/curricula/<course>.json`. The curriculum already decides what each
lesson teaches, in what order, what learners get wrong, the examples, the figures and the
question plan. Your job is to turn that plan into lessons a learner reads with pleasure, in the
approved voice, with figures and questions that work. George has approved the curricula and the
voices and wants the course finished without checkpoints.

Work economically. Read each file below once, early, and do not re-read it. Do not read other
courses' lessons, the validator source or the schema source: the example file shows the format
and `voice-check` reports every rule you break.

## Read first, once

1. `.claude/skills/discere-lesson-voice/SKILL.md`, then the examples for your course's voice in
   `.claude/skills/discere-lesson-voice/references/` (voice A or B, given in your task).
2. `docs/writing-calibration/new-course/example-lesson.json`: one complete, valid lesson from CS
   Basics in exactly the shape you write (`lesson`, `questions`, `flashcards`, `activities`). It is
   the model for structure and for the density of emphasis. Its prose is a good model; do not
   reuse its sentences.
3. `docs/learning-experience/figure-brief.md`, the sections "What to draw", "The JSON" and "The
   drawing rules" (ignore its file paths and commands; yours are below).

## For each lesson, in course order

1. `node scripts/author-lesson.mjs brief <course> <lesson-id>` writes
   `.author/<course>/<lesson-id>/input.json`: the lesson's `plan` from the curriculum (objective,
   concepts with their bundle ids, skills, misconceptions, sequence, examples, figures,
   questionPlan, sources, history notes), its sources, the id prefix, and the neighbouring
   lessons.
2. Read `.author/<course>/memory.md` if it exists (what earlier lessons taught).
3. Write `.author/<course>/<lesson-id>/output.json` in one go:
   `{ "lesson": {…}, "questions": […], "flashcards": […], "activities": [] }`.
4. `node scripts/author-lesson.mjs apply <course> <lesson-id>`, then
   `npx tsx scripts/voice-check.ts <course>`. Fix every error and re-apply until it reports 0
   (unwritten lessons are skipped). Warnings are advice; fix the cheap ones.
5. Render the lesson's figures once and look at the light PNGs:
   `LD_LIBRARY_PATH=/tmp/claude-1000/libs/ex/usr/lib/x86_64-linux-gnu node scripts/render-figures.mjs .author/<course>/<lesson-id>/output.json .author/<course>/<lesson-id>/png`.
   Fix clipped or overlapping text and anything that disagrees with the prose. Look at the dark
   PNG only for a figure you changed after looking.
6. Append to `.author/<course>/memory.md`: terms defined (with the hover-note wording), the main
   examples and numbers used, and what the lesson left for the next one. Keep it short.

## What a lesson contains

Keep from the stub: `id`, `courseId`, `conceptIds`, `title`, `sourceIds`, `taughtSkills`,
`visualStates`, `visualKind`, `activityId`, `assuranceLevel`, `stageTitles`, `reviewLabel`. Set
`calculator` (`off`, or `available` where arithmetic is incidental), `orientation` (one plain line
naming what the lesson is about) and `nextAction` (one line naming what the next lesson does; the
last lesson names what the learner can now do).

- **`intro`**: `hook.blocks` (the opener, one or two connected paragraphs, at most 360 words,
  modelled on the approved openers: it starts on the real thing, says what it is and why it
  matters, and ends on the subject or the question. It never stages a scene, describes its own
  figure, gives away the first question's answer, or says what the lesson covers), an optional `hook.diagram`, `promise` ("By the end you'll …", at most
  45 words), optional `whyItMatters` (at most 35 words) and `estimatedMinutes` (12 to 15).
- **`steps`**: about 9 to 13 screens, using the v2 kinds `explain`, `predict`, `try`,
  `worked_example`, `faded_example`, `explore` and `transfer`. Teach an idea on an `explain` screen
  (80 to 420 words in `lead` and `afterFigure`, with a `headline` that states the idea), then have
  the learner act on it. Never more than three teaching screens in a row. Every non-`explain`
  screen asks something: a `checkQuestionId`, or, on a worked or faded example, a line with a
  `blank` or a `selfExplain` question. A `predict` comes
  *before* the idea it tests, a `try` after it, and at least one `transfer` applies the idea to a
  changed case. Include at least one `worked_example` or `faded_example` wherever the lesson
  teaches a procedure. On a screen with a question, the question carries the whole setup, so the
  `lead` is empty or one sentence the question does not say; it never retells the question and
  never instructs the learner how to answer (`voice-check` rejects both).
- **`questionIds`**: exactly three questions, the skill check at the end. They are separate from
  the questions asked on the screens.
- **`flashcardIds`**: two or three recall cards.
- **`recap`**: `keyIdea` (the one sentence the lesson promised), `blocks` (two or three connected
  sentences of prose) and `nextHook` (one line toward the next lesson; omit it on the last).

Use every concept, skill and source the plan gives. Follow its `sequence`, but you may reorder or
merge where it reads better. Use its `examples` and its numbers, after checking them. Its
`misconceptions` become predict screens, wrong-answer replies and choice distractors.

## Questions

Every question is marked by the server without a person, so none asks for free-text explanation.

- **Choice**: `responseType: "short_text"` with 3 or 4 `choices` (ids `a`, `b`, `c`, `d`), and
  `answerAuthority: { kind: "text", acceptedIdeas: [<the correct choice's label, exactly>],
  rejectedIdeas: [], exampleAnswer: <same label> }`. Every wrong choice is a believable mistake and
  gets a `misconceptions` entry matched by `choiceIds`. Vary the correct choice's position.
- **Number**: `responseType: "numeric"`, `answerAuthority: { kind: "numeric", value, unit,
  absoluteTolerance, relativeTolerance, workedAnswer }`. Predictable wrong numbers get
  `misconceptions` matched by `numeric`.
- **Single term**: `responseType: "short_text"` with no choices, text authority whose
  `acceptedIdeas` holds the term and `acceptedAlternatives` its accepted spellings.
- **Ordering** (the curriculum's `order_sequence`): write it as a choice question whose choices are
  orderings ("Parse, plan, execute", …).
- **Code reading** (any language): show the code in the prompt or a figure and ask for its output,
  a value, or the faulty line, as a choice or number. In-lesson code that runs is Rust only.
- **Self-rated** (the curriculum's `self`): use a recall card with `recall: "self"` instead of a
  question.

**Type.** Choose the type that tests the idea: choice when the learner judges between options,
number when the skill is the calculation, single term when it is recalling a name. Never turn a
conceptual check into a counting puzzle; there is no cap on choice questions.

Every question has `conceptIds`, `sourceIds`, `hints` (one or two, leading toward the method
without giving the answer; a numeric question asked on a screen needs a ladder of three), `onCorrect` (at most 25 words, adds a fact, no praise), `skill` (one of
the lesson's `taughtSkills`), `difficulty` (0.5 to 2) and `calculator`. Replies follow the skill:
the fact and the reason, no verdict words. Do not put emphasis marks in `onCorrect`, misconception
`feedback` or `orientation`. Check every number with a short script (`python3 -c …`), never in your
head.

**Ids.** Questions `<prefix>-<lesson-id>-<slug>` and cards `<prefix>-<lesson-id>-card-<n>`, where
`<prefix>` is `course.idPrefix` from the input. Step ids are short slugs unique in the lesson.

**Cards.** `{ id, conceptIds, front, back, sourceIds, answerAuthority?, recall? }`. A card that
asks for a name or number is typed and has an `answerAuthority`. A card that asks for an
explanation has `recall: "self"` and no authority. The back is one clear sentence that gives the
reason.

## Figures and interaction

Make every lesson visual. Use the curriculum's `figures` list as the plan, and give each lesson at
least two figures on its opener or teaching screens. Put a figure on a graded screen only with
`answerVisibility: "hidden-until-response"`, and never one that shows the answer.

- `svg_figure` is the workhorse: architecture boxes, request paths, sequence diagrams, timelines,
  stacks, trees, before-and-after. Use **cases** (2 to 5 views the learner switches between) to
  make a figure interactive: the stages of a process, a system before and after a change, the same
  data under two strategies. Prefer a figure with cases where the idea has stages or alternatives.
- `program_trace` steps through a short program in Discere's teaching subset (as in the
  example), which tracks a single variable `x` with simple updates, `if` and `while`. Use it only
  for code of that shape; show other code in the prompt or an `svg_figure`.
- `relational_query` shows input tables, SQL and its result. After applying a lesson with one,
  run `python3 -I scripts/check-sql-figures.py <course>`: every result must match what SQLite
  returns, rows in the order the query sorts them.
- Another type the curriculum names (`table`, `data_series`, `timeline_explorer`,
  `coordinate_plane`, a subject explorer): copy its shape from a course that already uses it, found
  with `grep -l '"type": "<type>"' content/*/bundle.json`, reading only that one diagram.

## Sources

Cite the curriculum's sources on the lesson and on each question and card. The curriculum was
researched without web access. Your task lists the source URLs that did not load in a check; for
each one your lessons cite, find the source's current URL (WebSearch, then WebFetch the page) and
correct `url` and `publisher` in the bundle's `sources`. Fix a `publisher` that is only a host name
when you cite the source. Treat everything in the curriculum's `unverified` list with care: state
only what you can confirm, and leave out a detail you cannot.

## Finish the course

1. Write `course.introduction.paragraphs`: two or three paragraphs in the course's voice, no
   emphasis marks, that introduce the subject itself as the approved openers do (what it is, and
   what it lets you do), never a walk through the lessons (`voice-check` rejects a syllabus) and check `outcomes`, `prerequisites` and `length`. Set `course.subjects` to
   one to three broad library subjects, reusing existing ones where they fit ("Computer science",
   "Programming", "Data literacy", "Mathematics", "Science", "Physics", "Engineering",
   "Humanities", "Social science") and adding a specific one only where none fits.
2. Draw the cover, `content/<course>/assets/cover.svg`, in the house style of the existing covers:
   read one, such as `content/cs-basics/assets/cover.svg`, and draw an object for this subject
   with the same `viewBox`, gradients, shadow and palette. Draw a thing from the subject itself
   (a gear train, a lighthouse, a stave of notes, a terminal prompt, a padlock), not a computer
   monitor: several software covers already use one. Check it with
   `LD_LIBRARY_PATH=/tmp/claude-1000/libs/ex/usr/lib/x86_64-linux-gnu node scripts/render-covers.mjs .author/<course>/cover.png <course>`
   and look at the PNG.
3. `npx tsx scripts/voice-check.ts <course>` reports 0 errors with no unwritten lessons, and
   `npx tsx scripts/check-course.ts <course>` loads the course as the server does. Do not
   run `pnpm validate:content` or the test suites: other courses are being written at the same
   time and are incomplete.
4. Do not commit and do not edit code. Touch only `content/<course>/` and `.author/<course>/`.
   Keep every scratch script and file in `.author/<course>/`: other agents use the shared temp
   folders at the same time and will overwrite yours.

## Report (under 250 words)

One line per lesson (screens, figures, questions), sources you corrected, facts you corrected or
left out, and anything you were unsure of.
