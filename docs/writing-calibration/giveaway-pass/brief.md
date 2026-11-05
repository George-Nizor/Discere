# Brief for the giveaway pass: questions whose answer is already on the page

A learner agent took Earth and Environmental Science through the app and found that many questions
ask for a number the learner has just read. A teaching screen or its figure works the exact case,
and the worked example, try or predict after it asks for the same number, so the learner copies
instead of thinking. Some predict screens also come after the screen that states their answer, so
nothing is predicted. `scripts/giveaway-check.mjs` finds about 530 suspects across the catalogue.

You are fixing that in one course. Leave everything else as it is, apart from the two smaller
faults at the end of this brief.

Read first, once: `.claude/skills/discere-lesson-voice/SKILL.md` (any new or changed prose follows
it), then this brief.

```bash
node scripts/giveaway-check.mjs <course>             # the suspects, by lesson, screen and question
node scripts/lesson-text.mjs <course> <lesson-id>    # a lesson screen by screen, with answers
npx tsx scripts/voice-check.ts <course>
npx tsx scripts/check-course.ts <course>
```

## What counts

A suspect is a fault when a learner could answer the question by reading it off the screen,
figure or example line they have just seen, without doing the step the question is there to make
them do. It is not a fault when:

- the number is an input, not the answer (the question gives 6,371 km and asks for something else);
- the match is a coincidence (the answer is 30 and an unrelated 30 appears nearby);
- the figure showing it is `hidden-until-response` (shown only after the answer);
- a recall question deliberately asks for a fact taught a few screens earlier, after other screens
  have intervened (that is retrieval practice), though not when it is the screen directly before.

Read every suspect on the page with `lesson-text.mjs` before deciding. Also read each lesson once for
the same fault where the script cannot see it: a choice question whose correct option is the
sentence just taught, or a predict screen placed after the explanation it is meant to come before.

## How to fix it

Prefer the smallest change that makes the learner do the step:

1. **Change the example on the teaching side.** If an explain screen or its figure works case X
   and the next question asks for case X, change the teaching screen's example to a different case
   (different numbers, same method), so the question becomes a new application. Change the figure's
   numbers and labels to match, and any later sentence that quotes them.
2. **Or change the question's numbers.** Give the question a new case, recompute its answer with a
   short script (`python3 -c …`, never in your head), and update every field that depends on it:
   `answerAuthority.value` and `workedAnswer`, hints, `onCorrect`, numeric `misconceptions` (their
   `numeric` values and feedback), the example's own lines (`workedSteps` text and `math`) and any
   recap or later screen that quotes the result. Keep the question's `id` when it still tests the
   same skill.
3. **Worked examples.** A worked example shows the method, and its blank is the one step the
   learner does. The lines before the blank must not contain the result, and the teaching screen
   before it must not have worked the same numbers. A faded example after it uses different
   numbers from the worked one.
4. **Predict screens.** A predict comes before the idea it tests. If the screen before already
   teaches the answer, move the predict to before that screen (reorder `steps`), and read the
   screens around it again so the order still makes sense (a screen that says "as you predicted" or
   "the answer is" may need a word changed). If moving it cannot work, turn it into a `try` with
   `kind: "try"`.

Do not delete questions or screens, do not change a question's type, and do not reorder choice
options. Keep figures consistent with the text: every number you change in prose is changed in the
figure's SVG text, alt text and caption too. Keep a changed label the same length or shorter so
nothing overflows, and move a bar or point in a chart when its value changes.

## Two smaller faults, while you are in each lesson

- **A term used before it is explained.** If a screen or question uses a technical term the course
  has not yet defined, define it in a clause where it first appears.
- **A fact that is wrong.** Correct it if you can confirm the right value; otherwise report it.

## How to work

1. `node scripts/giveaway-check.mjs <course>` and note the suspects.
2. For each lesson in order, read it with `lesson-text.mjs`, decide each suspect, and make the
   edits with a short Node script that loads `content/<course>/bundle.json`, changes the fields and
   writes it back with `JSON.stringify(bundle, null, 2) + "\n"`. Keep scratch scripts in
   `.author/<course>/giveaway/`.
3. After each lesson, read it again as a learner would, top to bottom.
4. At the end: `giveaway-check` lists only suspects you judged to be not faults, `voice-check`
   reports 0 errors, and `check-course` loads the course. For a course with SQL figures, run
   `python3 -I scripts/check-sql-figures.py <course>`. For rust-foundations, leave every code
   question's code untouched.

Touch only `content/<course>/` and `.author/<course>/`. Do not commit, do not edit code, and do
not run the test suites. Other agents are working on other courses at the same time.

## Report (under 150 words)

Counts: suspects, faults fixed (and how: teaching side, question side, predict moved), suspects
left as not faults with a short reason each, terms defined, facts corrected or reported.
