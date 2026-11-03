# Brief for authoring a course from the curriculum

You are writing every lesson of one Discere course from scratch, from what each lesson must
achieve, directly into the app's lesson format. George found that rewriting the old lesson text
keeps its weaknesses, and that a lesson written from the curriculum "reads much better". Your
lessons replace the old ones.

## Read first

1. `.claude/skills/discere-lesson-voice/SKILL.md`, all of it, including the emphasis rules, then
   the examples for your course's voice in `references/`.
2. `docs/writing-calibration/authoring-pilot/brief.md`, the design method George approved, and
   `docs/writing-calibration/authoring-pilot/maths-1.sonnet-emphasis.json`, the approved pilot
   lesson. It is the model of the approach and the density of emphasis, for any subject.
3. The lesson schema in `packages/contracts/src/curriculum.ts` (`LessonSchema`, `LessonStepSchema`,
   `LessonIntroSchema`, the recap, `QuestionSchema` and the diagram schemas you use), and the
   lesson rules in `packages/curriculum/src/lesson-v2.ts`.

Do not read the old lesson prose in `content/<course>/bundle.json` or `.rewrite/`. The question
pool in your input contains some old wording; treat it as material to reuse or rewrite, not as a
model.

## For each lesson, in course order

1. Run `node scripts/author-lesson.mjs brief <course> <lesson-id>` and read
   `.author/<course>/<lesson-id>/input.json`. It contains:
   - the curriculum: course, voice, objective, concepts, skills and sources;
   - the previous and next lessons;
   - `figurePool`: the figures already drawn for this lesson;
   - `questionPool` and the lesson's `flashcards`;
   - `formatExample`: the lesson's current data with all prose blanked, which shows valid
     structure only.
2. Read `.author/<course>/memory.md` if it exists. It records what earlier lessons taught: terms,
   examples used and hover-term notes.
3. Plan the lesson as the pilot brief describes. Its shape is yours to choose within the
   schema's step kinds and the validator's rules.
4. Write `.author/<course>/<lesson-id>/output.json` as
   `{ "lesson": { …complete lesson… }, "questions": [ …every question the lesson uses… ] }`.
   - Keep the lesson's `id`, `courseId`, `conceptIds`, `sourceIds`, `taughtSkills`,
     `flashcardIds` and `calculator`. You may rewrite `orientation` and every learner-facing
     string.
   - **Figures:** reuse figures from `figurePool`, adjusting their labels and alt text to your
     prose, or author a new `svg_figure` that follows its schema and safety rules. Use a figure
     only where it shows something the words cannot.
   - **Questions:** reuse a pool question's id when the lesson still asks essentially that
     question. You may reword it, but its answer must stay correct, and keeping the id preserves
     learners' history. Give a new question the id `<the pool's id prefix>-<lesson-id>-<slug>`. No
     question may ask for a free-text explanation; `short_text` is only for a single term. Every
     question needs `sourceIds`, `hints` (unless the validator allows none), replies to answers
     written to the skill, and a correct `answerAuthority`. Check every number by hand.
   - **Emphasis:** follow the skill. Use `**bold**`, `*italic*` and `[[term|note]]` in lesson
     prose, headlines, the recap and question prompts. Do not use them in `promise`, `onCorrect`,
     misconception `feedback` or `orientation`, which render as plain text.
5. Run `node scripts/author-lesson.mjs apply <course> <lesson-id>`, then
   `npx tsx scripts/voice-check.ts <course>`. Fix every error and repeat until there are 0.
6. Append to `.author/<course>/memory.md`: the terms this lesson defined (with their hover-note
   wording), the main examples it used, and what it left for the next lesson.

For Maths Foundations lesson 1, convert the approved pilot lesson into the app's format, keeping
its prose and emphasis and making only the changes the format and validator require.

## Finish

When every lesson is applied and the course check reports 0 errors, also rewrite the course
introduction paragraphs (`course.introduction.paragraphs`) in the voice, with no emphasis marks.
Do not commit. Report each lesson's shape in a line, the number of questions reused and new, any
fact you corrected, and anything you were unsure of.
