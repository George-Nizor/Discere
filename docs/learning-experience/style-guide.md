# Converting a lesson to the v2 format

This is the working guide for rewriting a Discere lesson into the v2 lesson format. It is written for
the content agent doing the rewrite, one course at a time. The reasons behind each rule are in
[the learning-experience spec](README.md). This page says what to do and checks that you did it.

The finished example is Maths Foundations lesson 1, *What a letter stands for*. Its source is
`scripts/prepare-maths-gold-lesson.ts` and it is published in
`content/maths-foundations/bundle.json`. When this guide and the example disagree, follow the
example and report the disagreement.

## 1. The workflow

```bash
pnpm tsx scripts/lesson-migration/scaffold.ts <course-id> [lesson-id]  # 1. mechanical draft
# 2. edit content/<course>/.authoring/migration/<lesson>.json until no "TODO:" is left
pnpm tsx scripts/lesson-migration/scaffold.ts <course-id> --apply      # 3. merge and validate
# 4. add citations for new steps and questions to authoringMetadata in the candidate
pnpm curate review <course-id>     # 5. write the review record against the candidate hash
pnpm curate publish <course-id>    # 6. publish
```

The scaffold does the mechanical work and leaves a `TODO:` wherever real writing is needed. Its
`migrationNotes` list every decision it left to you. `--apply` skips any draft that still contains
`TODO:`. It then runs the full validator and writes `.authoring/candidate.json` only when the
validator passes.

Before step 5, if `.authoring/candidate.json` exists, move `review/publication.json` into
`review/history/<old hash>-publication.json` first. The review command will not overwrite a record.

**The review record must be honest.** It lists only the checks you actually ran:

- "Recomputed every numeric key" means you did the arithmetic yourself and wrote a test for it
  (see `packages/curriculum/tests/maths-gold-lesson.test.ts`).
- Do not claim learner testing that did not happen.

Do one lesson, validate it, and look at it before you start the next. Check it at 1440×900,
1024×768 and 390×844.

## 2. The anatomy

A v2 lesson takes about 10 minutes and teaches one idea that the learner can state in one sentence.

| Part | Field | Rules |
|---|---|---|
| Opener | `intro` | **hook**: a specific situation or puzzle the learner can attempt with what they already know. It is usually a question (`intro.hook.questionId`). It is never a definition, and never "In this lesson we will". **promise**: at most 25 words, in the learner's voice: "By the end you'll …". **estimatedMinutes**: an honest figure. **whyItMatters** is optional, at most 20 words, and concrete. |
| Learn | `steps` | 5 to 7 screens of the v2 kinds below, with at least one `transfer`. |
| Check | `questionIds` | Exactly 3 items. The learner gets no hints and no figures. Each item tests something this lesson taught. |
| Close | `recap` | **keyIdea**: the promise, stated as a fact. **blocks**: what the learner did, in their own numbers. **nextHook**: one line that bridges to the next lesson. |
| Scope | `taughtSkills` | Kebab-case skills, for example `evaluate-expression`. Every question in the lesson carries a `skill` from this lesson or an earlier one. |
| Tools | `calculator` | Use the course default from spec §6.3: `off`, `available` or `suggested`. Override it on a step or question only for a reason. |

### Step kinds

| Kind | Screen order | Use it when |
|---|---|---|
| `explain` | `headline` (the key idea as a sentence), then `lead`, an optional figure and an optional one-tap check | The step introduces a new word, symbol or convention. **It must come before any question that depends on that term.** List the terms in `introducesTerms`. |
| `explore` | `lead`, then the question, then a live figure whose state is the answer (`answerVisibility: "live"`, with `bindAnswer` on the diagram) | The learner can find the value by playing with the figure. No answer box is drawn. |
| `predict` | `lead`, then the question, then the figure with results hidden, then the reveal | A prequestion the learner can reason about from prior knowledge. They get one try, then the outcome. The `reveal` must refer to their prediction. |
| `worked_example` | `headline` (the problem), then `workedSteps` shown one line per press | Showing the method before asking for it. Give one line a `selfExplain` question ("Why …?"). |
| `faded_example` | `headline`, then the same kind of lines with `blank`s for the learner to fill | The bridge from watching to doing. Use at least one blank. |
| `try` | `lead` (optional), then the prompt as headline, then the response | An independent problem with the same shape as the example. |
| `transfer` | A short context in `lead`, then the prompt, then the response | The same idea in a changed situation. Every lesson needs one. |

How to choose the order:

- If answering needs a new term, explain it first.
- Otherwise, if the learner can reason to the answer, ask first (`predict` or `explore`).
- Otherwise, show a worked example, then a faded example, then a `try`.

## 3. Writing rules

**Prose**

- **Lead**: at most 60 words, always shown before the interaction. It teaches what the question
  needs. It never states the question's answer: no key, and no number the answer derives that the
  prompt does not give.
- **Headline**: one per screen. On `explain` it is the key idea. On a worked or faded example it is
  the problem. On every other step the prompt is the headline, so write the prompt as a full
  sentence that the learner acts on.
- **Eyebrow**: optional and small. The player already prints "3 of 7 · Try it". Old step titles such
  as "One letter, one value" do not become eyebrows. If a title names the idea, use it as an
  `onCorrect` line or an `explain` headline. The gold lesson's old title became the `onCorrect` of
  its self-explanation.
- **Reveal**: shown with the verdict. It names the term or the generalisation, and refers to what the
  learner just did: "You just did it several times."

**Feedback**

- **onCorrect**: required on every graded item. At most 25 words, it states the idea and not only
  that the answer was right: "14. Multiply first, then subtract: the order is written into the
  expression."
- **Misconceptions**: one for each predictable wrong answer, matched by value, choice id or phrase.
  Each one names the slip in one or two sentences. **It must never state the key**: the learner
  still has a retry.
- **Hints**: a numeric item has exactly three. Phrase them as questions or next moves, and never
  state the answer. The third may come close: "Take the 5 back off the 12."

**Style**

- **Maths in prose is plain text**: x + 5 = 12, 3x − 4, 2 × 4 + 1.
  - Use the Unicode minus (−), times (×) and divide (÷).
  - Keep `$…$` and equation blocks for real typesetting: fractions, powers, display equations.
  - Mixing KaTeX into a sentence changes the typeface mid-line.
- **Voice**:
  - British spelling. Short sentences. Talk to the learner ("you").
  - No filler, no hype, no "Great job!".
  - The writing gate (`@discere/writing-engine`) runs on every new field. Fix its errors, and
    justify any warning you keep in the review record.
- **Choices**: keep them few. Multiple choice may be at most 35% of a course, so prefer numeric
  answers when the idea is quantitative. A two-option choice reveals the answer after one miss.

## 4. Layout rules

- **One input per answer.** If the figure's control is the answer, set `answerVisibility: "live"` on
  an `explore` step and add no box. If there is a box, the figure's controls are for exploring only.
- **The screen never shows its own answer.** Every figure in a graded step declares
  `answerVisibility: "hidden-until-response"`. The player then draws givens only: the number
  machine shows "?", and the balance stays level and unevaluated. The
  `apps/web/src/journey/activities/answer-leak.test.tsx` test checks this for every diagram type. If
  your content still prints the key (a case chip, a "given values" card), change the content.
- Not every screen needs a figure. Use one where it carries the idea, such as a number machine, a
  balance or a graph.
- Keep screens short. At 1024×768 the prompt and the answer input should both be visible without
  scrolling.

## 5. Conversion checklist

Work through this list for every lesson, in order. Do not tick an item you did not do.

- [ ] Run the scaffold and read every `migrationNotes` entry.
- [ ] Decide the lesson's one idea and write it as `recap.keyIdea`. Write the promise from it.
- [ ] Write the hook: a puzzle the learner can attempt in under 20 seconds with what they already
      know. If it has a question, give it a key, three hints, `onCorrect` and misconceptions.
- [ ] List the terms the lesson introduces. Add an `explain` step for each one before its first
      use, with `introducesTerms`.
- [ ] For each step, check the mapped kind against §2 and change it where the order of teaching and
      asking is wrong.
- [ ] Rewrite each `lead` (the scaffold's split is raw material). Read it aloud with the question:
      does it teach, and does it avoid giving the answer away?
- [ ] Rewrite each `reveal` so that it refers to the attempt.
- [ ] Turn every `worked_example` into `workedSteps`, with one self-explanation. Recompute every
      number.
- [ ] Add a `faded_example` between the worked example and the `try` where the method has more than
      one move.
- [ ] Make sure there is at least one `transfer`.
- [ ] Give every question `onCorrect`, `skill`, and misconceptions for predictable slips.
- [ ] Choose exactly three skill-check items on taught skills. Move any item that tests a later
      lesson's method to that lesson, and keep its id so learner history still points at it.
- [ ] Set `taughtSkills` and `calculator`.
- [ ] Run `--apply` and clear every error. Accept a warning only with a reason in the review record.
- [ ] Add citations for new step and question ids in `authoringMetadata`.
- [ ] Write a content test that recomputes each key from the arithmetic.
- [ ] Look at the lesson at three sizes. Answer one question wrongly, then rightly, and check that
      the verdict, the hint and the reveal all read well.
- [ ] Run `pnpm curate review`, fill in the record honestly, then run `pnpm curate publish`.

## 6. Before and after

Maths Foundations lesson 1, first step.

**Before** (legacy, 1.1.1). The step title became the page's largest text. The paragraph was
withheld until after the answer. The machine printed 7 beside the question "For x = 2, what is
x + 5?". Nothing on the screen taught what a letter is.

```json
{
  "id": "predict",
  "kind": "hook",
  "blocks": [
    { "kind": "heading", "text": "One letter, one value" },
    { "kind": "paragraph", "text": "The machine adds 5 to the value you choose for x. Move the input and follow it through the arrow. A letter lets us describe the same calculation for many possible inputs. Commit to a value before trying the next case." }
  ],
  "checkQuestionId": "maths-what-a-letter-stands-for-1",
  "diagram": { "type": "number_machine", "input": { "min": -4, "max": 20, "value": 2, "step": 1 }, "operations": [{ "operator": "add", "operand": 5 }] }
}
```

**After** (v2, 1.2.0). The lesson now opens on a puzzle the learner can already do: "I'm thinking of
a number. I add 5 to it and get 12." The first step then names what they just did:

```json
{
  "id": "a-name-for-the-number",
  "kind": "explain",
  "headline": "A letter stands for a number you haven't been told yet.",
  "lead": [
    { "kind": "paragraph", "text": "Writing “my number” every time gets clumsy. So we use a box, and then a letter." },
    { "kind": "equation", "latex": "\\text{my number} + 5 = 12" },
    { "kind": "equation", "latex": "\\square + 5 = 12" },
    { "kind": "equation", "latex": "x + 5 = 12" },
    { "kind": "callout", "tone": "key", "text": "x is just the name. It doesn't mean multiply, and it isn't the 24th number. A letter used like this is called a variable." }
  ],
  "introducesTerms": ["variable"],
  "checkQuestionId": "maths-what-a-letter-stands-for-notation"
}
```

The check question carries its own teaching in its feedback:

```json
{
  "prompt": "Which says “a number plus 5 is 12”?",
  "choices": [{ "id": "a", "label": "x + 5 = 12" }, { "id": "b", "label": "5x = 12" }, { "id": "c", "label": "x = 12 + 5" }],
  "onCorrect": "Same sentence, shorter. x is the number; the rest says what happens to it.",
  "misconceptions": [
    { "match": { "choiceIds": ["b"] }, "feedback": "5x means 5 × x. That's five lots of the number, not the number plus 5." },
    { "match": { "choiceIds": ["c"] }, "feedback": "That says x is 12 + 5. Add 5 to that and you overshoot 12." }
  ],
  "skill": "read-notation"
}
```

The old number machine survives as the `explore` step, "Set x so the machine gives 12.". There it is
live on purpose: finding the input is the task.

## 7. What the validator checks

These rules apply only to lessons with an `intro`. Legacy lessons are unaffected until they are
converted.

| Code | Severity | Rule |
|---|---|---|
| `V2_MISSING_CLOSE` | error | A v2 lesson has a `recap`. |
| `SKILL_CHECK_SIZE` | error | The lesson has exactly 3 `questionIds`. |
| `PROMISE_TOO_LONG`, `WHY_TOO_LONG`, `LEAD_TOO_LONG`, `ON_CORRECT_TOO_LONG` | error | The word limits above. |
| `V2_LEGACY_KIND`, `V2_HEADING_BLOCK` | error | Steps use only the v2 kinds and contain no heading blocks. |
| `STEP_MISSING_HEADLINE`, `STEP_MISSING_WORKED_LINES`, `FADED_WITHOUT_BLANK`, `STEP_MISSING_QUESTION` | error | Each kind has its parts. |
| `ANSWER_VISIBILITY_UNDECLARED`, `LIVE_FIGURE_OUTSIDE_EXPLORE` | error | Every figure in a graded step declares its visibility, and only `explore` is live. |
| `FIRST_LESSON_OPENS_WITH_TRY` | error | A course's first lesson does not open with a graded `try`. |
| `V2_WITHOUT_TRANSFER` | error | Every lesson has a transfer. |
| `TERM_NOT_INTRODUCED` | error | A question's `usesTerms` were introduced by an earlier `explain` step. |
| `TERM_BEFORE_INTRODUCTION` | warning | A term an `explain` step introduces appears in an earlier prompt. |
| `ITEM_OUTSIDE_SCOPE` | error | An item's `skill` is taught by this lesson or an earlier one. |
| `ITEM_WITHOUT_SKILL`, `V2_MISSING_SKILLS`, `PROMISE_VOICE` | warning | Tag skills, and write the promise in the learner's voice. |
| `MISCONCEPTION_IS_KEY` | error | A misconception never matches the right answer. |
| `STEP_WITHOUT_TEXT` | error | Every step has prose: blocks (legacy) or a lead or headline (v2). |

The validator also lints every new learner-facing string with the writing gate. Misconception
feedback is linted as a hint, against the hidden answer.
