# Brief for writing lessons of a new Discere course

The third step of the new-course route in `docs/authoring/README.md`: three writers each take a third
of the lessons, from a source pack and an approved plan.

You write complete lessons for a new course. Your task message names the course, the worktree, your lessons, and the planning folder. Everything below applies to every lesson.

## Working rules
- Work in the worktree named in your task. Write ONLY the files `.author/<course>/<lesson-id>/output.json` for your own lessons. Do not edit `content/`, `docs/` or tests, do not run `author-lesson.mjs apply`, do not commit, do not push. Other writers are writing the other lessons of the same course at the same time.
- Do not spawn subagents. Be economical.
- Scratch files go in the scratchpad folder named in your task.

## Read first
1. `.author/<course>/<lesson-id>/input.json` for each of your lessons: the lesson's plan from the curriculum and the exact shape of valid lesson data, with prose blanked. Read `scripts/author-lesson.mjs` to see what `output.json` must contain: `{ "lesson": <complete lesson object>, "questions": [...], "flashcards": [...], "activities": [...] }` (activities may be empty).
2. The planning folder: `curriculum-draft.json` (your lessons' objectives, concepts, misconceptions, question plan), `passages.md` (the ONLY passages you may quote or rely on for facts, with licence and whether each may be quoted or only paraphrased) and `plan-notes.md` (what each lesson asks the learner to do, every number and claim with where it is stated, and figures NOT to use).
3. The approved voice: load the `discere-lesson-voice` skill with the Skill tool and follow it exactly. Plain sentences, contractions and "you" are fine, no em or en dashes, no slogans, no "not X but Y", no verdict words.
4. `docs/question-writing-guide.md`, and two finished lessons from an existing course for shape and quality (named in your task). Copy their structure: an intro with a hook question, teaching steps that each carry one idea with a figure where the plan asks for one, try and predict steps, a worked or faded example where the plan has one, a transfer step, three end-check questions of at least two types, flashcards, a recap.

## Rules for content
- Every fact, number and health or historical claim must come from a passage in `passages.md` or the plan notes' stated sources. If the plan notes flag a figure as unreliable, do not use it. Never invent a quotation or attribute words to a real person, organisation or study that the passages do not contain.
- Quote only passages marked quotable, word for word, in a question's `extracts` with attribution (`who`, `when`, `kind`) as the finished examples do. Paraphrase the rest and cite through `sourceIds`.
- Questions follow the guide: situations and material to work from, misconception distractors with feedback naming each mistake, order and sort where the plan asks, numeric only where computing is the point. Option lengths: the right option may not stand out by length (longest in no more than 30% of a lesson's multiple-choice questions, never more than 15% longer than every other option). All options of one question in the same form.
- Every question has at least two hints that guide thinking. Every lesson's end check mixes at least two question types.
- Ids: use the course's id prefix as the scaffold and `input.json` show; ids must be unique.
- Compute every number with a script and keep it in the scratchpad.

## Check your work
For each lesson, write a small script that loads your `output.json` and checks: it parses; every question id referenced by the lesson exists in `questions`; every `sourceIds` entry exists in the course's sources (`content/<course>/bundle.json`); no em or en dashes in any string outside quoted extracts; each multiple-choice question has exactly one accepted option and feedback for every other option. Fix anything it finds.

## Report briefly
For each lesson: its title, the question count by type, one question in full, every figure you used with its passage, and anything you were unsure of.
