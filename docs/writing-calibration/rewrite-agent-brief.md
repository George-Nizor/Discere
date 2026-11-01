# Brief for a course voice rewrite

You are rewriting the learner-facing prose of one Discere course into the voice George approved.
Only the prose changes; facts, numbers, answers and structure stay exactly as they are.

## Read first

1. `.claude/skills/discere-lesson-voice/SKILL.md`, all of it.
2. The examples for your course's voice: `references/voice-a-examples.md` or
   `references/voice-b-examples.md`, in the same skill folder. Your files' `voice` value says which
   voice to use.

## Your files

The course's prose is in `.rewrite/<course-id>/`, one JSON file per lesson plus `00-course.json`
for the "About this course" paragraphs.

- Edit only the values inside `fields`. Never change a key, `context`, `originals` or
  `emphasisAllowed`.
- Each field is one paragraph, or a single line such as a headline. Rewrite it in place. Within one
  screen you may move material between adjacent paragraphs, but every field must stay non-empty.
- Question prompts (`questions.N.prompt`) are editable, so that a question can match the new prose
  (for example, removing a framing story). Keep the question asking exactly the same thing, with the
  same numbers, so that its choices and answer still fit it exactly.
- `context` tells you each step's kind, its question (prompt, choices, answer authority and
  misconception matches) and its worked lines, so that your feedback and reveals stay accurate.
  Never put a step's answer into a lead or headline that the learner sees before answering.
- Edit the files with a short Python script (`json.load`, change, `json.dump` with `indent=2` and
  `ensure_ascii=False`), so the JSON stays valid.

## Rules

- Keep every number and every `$…$` maths span from the original field. The apply step rejects a
  field that drops one. Do not add facts you are not certain of. Check every calculation you
  write.
- Use `**bold**` and `*italic*` only in fields listed in `emphasisAllowed`. Elsewhere, write no
  asterisks.
- Length limits enforced by the validator:
  - question screens (`try`, `predict`, `transfer`, `faded_example`): the lead is at most 110
    words;
  - teaching screens (`explain` with no question): lead plus afterFigure is 80 to 420 words;
  - the opener's hook is at most 360 words;
  - `promise` and `onCorrect` are at most 45 words each, and `whyItMatters` at most 35;
  - a `headline` and the recap `keyIdea` are one or two sentences each, and short enough to read
    as a heading.
- Replies to answers (`onCorrect`, misconception `feedback`, `reveal`) follow the skill: state the
  fact and the reason, with no verdict words.
- Do not stretch text to fill a limit. Write until the idea is clear and stop.

## Process

1. Rewrite `01-…json` in full. Compare it side by side with the reference examples, and fix any
   run of short sentences, any framing story and any register slip.
2. Rewrite the remaining lessons, then `00-course.json`.
3. Run `node scripts/voice-rewrite.mjs apply <course-id>`, then
   `npx tsx scripts/voice-check.ts <course-id>`. If apply keeps an original because a number or
   maths span was dropped, fix that field in its file. Then run
   `git checkout content/<course-id>/bundle.json` and apply again. Repeat until apply reports no
   kept fields and the check reports 0 errors.
4. Do not commit. Report the number of fields rewritten, anything you were unsure of, and any
   fact you corrected.
