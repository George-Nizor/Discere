# Authoring a lesson from the curriculum

You are writing one Discere lesson from scratch, from what the lesson must achieve. Do not
rewrite, and do not try to find, the lesson the app has now: George judged that rewriting the
old text keeps its weaknesses. The output is a preview for George to read, not yet wired into the
app.

## Read first

1. `.claude/skills/discere-lesson-voice/SKILL.md`, all of it, then the examples for this lesson's
   voice in `references/`. Write in that voice.
2. The lesson's curriculum inputs below.

## Design the lesson before writing it

Plan it first, as a good teacher would, and record the plan in the output's `plan` field:

- **What the learner must be able to do at the end.** Base it on the objective and skills.
- **What they already have,** from the audience and prerequisites, and **what they are likely to
  get wrong,** meaning the real misconceptions about this idea.
- **The order of ideas.** Each idea should need only what came before it.
- **Where the learner acts.** A prediction, a question, a worked example or a figure to try,
  placed at the point where acting helps understanding, not on a fixed schedule.
- **The figures.** A figure earns its place only when it shows something the words cannot.

There is no required structure: no fixed opener, number of screens, skill check or recap format.
Use what this idea needs. Most lessons will still open by drawing the learner in, teach, have them
practise, and close by consolidating, but the shape and proportions are yours to decide. Aim for a
lesson of about 10 to 15 minutes.

## Figures

The app can draw these figure types, among others: `number_machine` (an input passing through
operation boxes), `equation_balance` (two pans showing the two sides of an equation, with a
slider for x), `coordinate_plane`, `outcome_grid` and `truth_table`. It can also draw
`svg_figure`, a hand-drawn figure made of plain shapes with switchable views. For the preview,
describe each figure precisely: its type, what it shows, and what the learner can change. You may
also include a small inline SVG sketch for the preview, using only basic shapes and text, with
`currentColor` for strokes and fills.

## Questions

Write the questions this lesson needs. Each is either:

- a **choice** question (2 to 4 options, every wrong option a believable mistake);
- a **number** question (one exact numeric answer);
- a **self-check**, where the learner thinks, reveals and rates themselves.

Free-text answers are not allowed, because they cannot be marked fairly. Give every question its
answer, a reply for a right answer, and a reply for each likely wrong answer, following the skill
(fact and reason, no verdict words). Check every calculation by hand.

## Output

Write a single JSON file at the path given in your task, with this shape:

```json
{
  "lesson": "title",
  "voice": "A",
  "plan": { "goal": "", "startingPoint": "", "misconceptions": [""], "sequence": [""], "notes": "" },
  "screens": [
    {
      "kind": "teach | worked | question | figure",
      "heading": "optional short heading",
      "paragraphs": ["prose, with **bold** at a term's definition and *italic* for stress"],
      "figure": { "type": "", "description": "", "svg": "<svg …>optional</svg>" },
      "workedLines": [{ "text": "", "math": "" }],
      "question": {
        "type": "choice | number | self",
        "prompt": "",
        "choices": [""],
        "answer": "",
        "onRight": "",
        "onWrong": [{ "when": "the choice or value", "reply": "" }]
      },
      "after": ["optional prose shown after the figure or after answering"]
    }
  ],
  "recap": { "keyIdea": "", "paragraphs": [""] }
}
```

Omit any key a screen does not use. When you have written the file, read the whole lesson once as
the learner would, and fix anything that breaks the skill's checklist.

## Curriculum inputs: Maths Foundations, lesson 1

- **Course:** Maths Foundations, voice A. Audience: an adult returning to algebra who is
  comfortable with whole-number arithmetic. The course outcomes are to read 3x − 4 as a
  calculation and evaluate it, to solve equations such as 3x + 2 = 23 and justify each step, to
  undo calculations in order (including with brackets), to find a gradient from two points, and
  to draw and read y = mx + c.
- **Lesson:** "What a letter stands for". Objective: read a letter as a number not yet given, and
  test whether a number solves an equation by substituting it.
- **Concepts:** *variable* (a letter representing a value; a solution fixes that value within an
  equation) and *substitution* (replacing a letter with a value, which is how an answer is
  checked).
- **Skills the lesson must teach:** finding a value by trying numbers; reading algebraic notation
  (including that 3x means 3 × x, and the order of operations in an expression like 3x − 4);
  evaluating an expression for a given value; checking whether a value is a solution.
- **Comes first in the course.** The next lesson, "Keeping the balance", teaches solving by doing
  the same operation to both sides. This lesson should leave the learner wanting a better method
  than trial, without teaching that method.
- **Source for fact-checking:** OpenStax *Elementary Algebra 2e*, section 1.2, "Use the Language
  of Algebra".
