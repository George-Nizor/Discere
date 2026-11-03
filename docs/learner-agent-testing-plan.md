# Testing the courses with learner agents

Status: planned on 4 November 2026, not started. George agreed the plan and will start it when he
wants to focus on testing.

The 46 expansion courses and the rewritten twenty were written by agents and checked by scripts,
but nobody has worked through most of them as a learner. George can only test a few courses
himself, so this plan uses cheap agents to read each course as a learner would and report where a
real learner would get stuck. It finds problems in the teaching; George's own use and other
people's feedback remain the better judges of pace, interest and the look of the app.

## What a learner agent does

One agent works through one course, lesson by lesson, in order. It reads each lesson the way the
app delivers it, which is the learner-safe journey from the server with no answer keys, and it
answers every question using only what the course has taught up to that point, never its own
knowledge of the subject, and records a finding whenever the lesson does not give it enough to
answer.

It also records a finding whenever:

- a question needs something the lessons have not taught yet;
- a prompt has two defensible answers, or the marking rejects a reasonable answer;
- a term is used before it is explained;
- a figure disagrees with the text beside it, or shows the answer to the question that follows;
- feedback on a wrong answer does not help the learner see the mistake;
- a screen repeats the previous one, jumps a step, or is much harder than the screens around it;
- a fact looks wrong or out of date.

Each finding is a JSON object: course, lesson id, step id or question id, the kind of problem from
the list above, a short quote of the text concerned, and one or two sentences saying what went
wrong. The agent also gives each lesson a rating from 1 to 5 for how easy it was to follow, with
one sentence of reason.

## Two passes

- A mechanical pass on every course, with Haiku, looks for the first four kinds of finding, which a
  careful reader can spot without judgement about teaching. This is cheap enough to run across all
  65 listed courses.
- A judgement pass on a sample, with Sonnet at medium effort, adds the last three kinds and the
  ratings. Run it on the courses George is taking, and on any course where the mechanical pass
  found a lot.

The agent should take the course's stated audience as its persona (the `audience` line in the
course bundle), so a beginner course is read as a beginner would read it.

## Turning findings into fixes

Findings are not fixed as they come in. The lead session collects them, checks each one against
the lesson, and throws out the false ones, which will be common because agents misread. The rest
are fixed course by course. A problem that turns up in several courses is fixed at its source
instead: in the writing brief (`docs/writing-calibration/new-course/brief.md`), the voice skill,
or `scripts/voice-check.ts`, the way announced openers were in 1.7.0. Content fixes follow the
usual checks (`voice-check`, `check-course`, `rebind-review` for courses with a review record)
and ship as a release.

## What has to be built first

- A way for an agent to take a lesson: a small script, for example
  `scripts/learner-run.ts <course> [<lesson>]`, that starts the app in memory (as the server tests
  do with `createApp`), prints the learner-safe journey of a lesson, and takes answers through
  `POST /api/attempts` so the agent sees the real marking and feedback. Several agents must be able
  to run it at once, each with its own in-memory database.
- A findings file per course, `.author/_learner/<course>.json`, and a short script that
  gathers them into one list sorted by course and kind.
- Figure checks. Agents read the figure's SVG and alt text from the journey. For a sample of lessons,
  render the figures with `scripts/render-figures.mjs` and have the agent look at the PNG,
  including the dark theme.

## Rough cost

At about 50,000 to 80,000 tokens per course, the mechanical pass over 65 courses is 3 to 5
million Haiku tokens. A Sonnet judgement pass over a sample of 10 to 15 courses is 1 to 2 million
tokens. Writing the courses took far more than either.

## What it cannot tell us

- A real beginner's experience. The agents already know the subjects, and answering only from
  the lesson text makes up for that only in part, so "this was easy to follow" from an agent is
  weak evidence.
- How the app looks and feels. The agents read data, not the screen, so layout, mobile, dark
  mode and how the player behaves are not tested, apart from the figure sample above.
- Interest and motivation. Whether a learner wants to come back tomorrow is something only
  people can report.

## How to start

1. Build the lesson script and the findings format, and try them on one lesson by hand.
2. Pilot both passes on three courses George is taking himself: one software course, one maths or
   science course and one humanities course.
3. Compare the agents' findings with what George noticed in the same courses. If they catch the
   problems he cares about, run the mechanical pass across the catalogue, then the judgement pass
   on the sample.
