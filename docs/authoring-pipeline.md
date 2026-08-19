# The authoring pipeline

`scripts/author.ts`, run as `pnpm author <command>`, is the documented path for adding content to
a course. It exists so that generated material is subject to the same gates as hand-written
material, and so that nothing reaches a learner without a human deciding it should.

## The stages

```text
generate ─► lint (+ one style-editor repair) ─► semantic preservation ─► curriculum validate ─► review file ─► merge
```

1. **Generate.** Spawns the local Codex CLI through `CodexTutorProvider` with the
   `prompts/lesson-writer.md` system prompt and a JSON Schema derived from
   `AuthoredLessonDraftSchema`. `DISCERE_CODEX_EFFORT` defaults to `medium` for authoring.
   The raw answer is written to `content/<course>/generated/<slug>.json`, which is ignored by
   Git, and a later run reuses it instead of spending the subscription again. `--force`
   regenerates.
2. **Lint.** Every learner-facing string in the draft goes through `@discere/writing-engine`
   with the rule family that field answers to. Hints are linted against the hidden answer, so a
   hint that leaks the result is caught here.
3. **One repair pass.** Each field with a hard violation goes to `prompts/style-editor.md` once,
   with the flagged spans. A field that still fails is reported rather than quietly kept.
4. **Semantic preservation.** `checkPreservation` compares the field before and after the
   repair. If a number, unit, equation, or citation moved, the repair is discarded and the
   original text is kept with its violation recorded.
5. **Validate.** The merge candidate is assembled into the whole bundle and put through
   `validateCourseBundle`. Nothing is written unless the entire bundle passes.
6. **Review.** `content/<course>/review/<slug>.md` records the pipeline result, the prose, every
   question with its answer and hints, the recall cards, the repairs, the remaining lint notes,
   and any uncertainty the model declared. This file is committed; it is the human decision
   record.
7. **Merge.** Folds the accepted draft into `bundle.json`, revalidating first.

## Commands

```bash
pnpm author generate --course <id> --slug <name> --concepts <a,b> --plan "<text|@file>" [--force]
pnpm author lint      [--course <id>]
pnpm author validate  [--course <id>]
pnpm author review    --course <id> --item <slug>
pnpm author merge     --course <id> --item <slug> --lesson <lessonId>
pnpm author pipeline  --course <id> --slug <name> --concepts <a,b> --plan <…> --lesson <lessonId>
```

`generate` needs the lesson's plumbing to exist already: the activity, the visual brief, and the
sources are authoring decisions, not generation decisions. The pipeline writes prose, questions,
and recall cards into a lesson that already knows what it is showing.

## What the model is asked for, and why the schema is flat

Constrained decoding rejects `oneOf` and treats optional properties as an error, so
`AuthoredLessonDraftSchema` has no unions and no optional fields. An answer authority arrives as
a single object carrying both a numeric half and a text half, with the unused half left empty,
and `toAnswerAuthority` turns it back into the discriminated form the bundle stores. A question
that is not selectable returns an empty `choices` array rather than omitting the field.

## What it caught in practice

Both generated lessons in this repository returned accepted ideas written as whole sentences.
A text answer is marked by looking for its accepted ideas inside what the learner wrote, so a
sentence can never match and the question would have been unanswerable. The curriculum validator
now refuses that shape (`ACCEPTED_IDEA_TOO_LONG`), the merge was blocked, and the drafts were
corrected before they were accepted.

## Honest limits

- Generation is slow and interactive. A lesson takes around half a minute of wall time, plus the
  repair pass when one is needed.
- The pipeline does not check physics or history. It checks that prose passes the writing gate,
  that references resolve, that answers are markable, and that repairs preserved the facts they
  were given. Correctness of a numeric answer or a date is a human responsibility, and the
  courses in this repository were verified by recomputing every numeric answer and checking every
  date against its cited source.
- A merge overwrites the lesson's prose and adds its questions and cards. It never deletes
  material a previous round added; pruning superseded items is a deliberate editing step.
