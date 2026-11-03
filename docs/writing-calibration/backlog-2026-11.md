# Backlog from the 1 November 2026 review

George's priority is the lesson voice. Everything below is parked until the voice is calibrated, and
is written down so it can be picked up in depth later.

## Done in this round

- Review cards that ask for an explanation ("What must be true after substituting…") are no longer
  typed and keyword-marked. They are recalled, revealed and self-rated (`recall: "self"`). The
  validator rule `FREE_TEXT_EXPLANATION_CARD` stops new ones. Naming cards ("Which join keeps every
  left row?") and numeric cards stay typed.
- The finish screen says "Next lesson" and "Start the check" instead of the next item's title. The
  recap no longer prints "Next: <title>." and keeps only the hook sentence.
- Eyebrow labels are removed across the player, review, roadmap, projects and tutor panels. Labels
  that carry content are now plain sentence-case subheads.

## 1. Lesson voice (in progress, top priority)

Decisions so far (rounds 3 to 5). The voices are stored as skills in `.claude/skills/discere-lesson-voice` (with approved examples) and `.claude/skills/discere-tutor-voice`.

- Round 4 result: A was best for astronomy, with B a good variation; B was clearly better for philosophy; A and B were equal for psychology. The rule for assigning voices to courses is in the lesson-voice skill.
- The voice C tutor was rejected as slop. The trial replacement is voice B made more concise, with lists for steps (`round-5-tutor.html`).

- Voice A ("blend, led by the book", `round-3-voices.html`) is the default lesson voice.
- Voice B ("blend, led by the lecturer") is the alternative, and a candidate primary voice for less
  quantitative subjects such as philosophy and psychology. Round 4 tests both on astronomy,
  philosophy and psychology.
- Voice C ("explain, then think aloud", built on Claude's learn skill) is for the dialogue tutor,
  not for lessons. Round 4 shows a tutor session with its guardrails.
- The writing engine's style bans no longer constrain lesson prose. Keep only the checks that
  protect facts: numbers, equations, units and citations kept exactly, and no answer leaks.
- Emphasis, prototyped in round 4: bold for a term at its definition, italics for stress, and
  dotted-underline terms with a hover or tap note that links back to an earlier lesson. If George
  approves it, it needs a rich-text mark in the lesson schema and a component in the player
  (`InlineRichText`).

1. Round 1: pick a voice from `round-1-voices.html` (four candidates plus today's text).
2. Round 2: the chosen voice applied to a different subject, checked against the same lesson.
3. Write the voice guide per text type: lesson screens, course "About" paragraphs, recaps,
   feedback on answers, question prompts, review cards. Dot-point style stays only for "You'll be
   able to" lists.
4. Split the rewrite across Sonnet subagents with that guide, one course each, and sample-read
   every course before accepting it. Last time only a sample of courses was read, which is how the
   voice drifted.
5. Review the limits that push prose towards clipped sentences (see below) before the rewrite.

### Limits to review before the rewrite

| Limit | Where | Suspected effect |
| --- | --- | --- |
| `TRI005_REPEATED_TRIADS` hard fail at 3+ "X, Y and Z" lists per passage | `packages/writing-engine/src/triads.ts` | Natural lists get split into short separate sentences ("Substitute… then work out… Last, compare…") |
| `REP001` repeated transitions hardened at 3 | `packages/writing-engine/src/lint.ts` | Discourages the connectives that give prose flow |
| One-line fields capped at 25 words (`onCorrect`, promise) | `packages/curriculum/src/lesson-v2.ts` | Feedback compressed into telegraphic lines |
| "Why it matters" capped at 20 words | same | Same |
| Step lead capped at 60 words on question screens | same | Teaching before a question is squeezed |
| Explain body 280 words, opener 260 words | same | Probably fine; check against the chosen voice |
| Headline 160 characters, recap `keyIdea` rendered as a headline | contracts, `RecapStageView` | Recap reads as a compressed slogan; consider making it a short paragraph |
| Multiple-choice share capped at 35% | `packages/curriculum/src/validate.ts` | Pushes authors towards free text, which conflicts with the free-text policy below |
| `prompts/lesson-writer.md` and `style-editor.md` are a list of bans | `prompts/` | Bans without a positive model of good prose lead writers to play safe with short sentences |

## 2. Free-text answers

Policy from George: free text appears only when an LLM verifies it (with feedback like roadmap.sh's
"explain it back"), or not at all.

- 252 in-lesson `short_text` questions have no choices. Most are single-term answers
  ("perihelion"), which keyword marking handles fairly. About 10 ask for an explanation and need
  converting: 6 in Electronics, 2 in English, 1 in Philosophy, 1 in SQL. Convert them to choices
  or term questions, or route them to LLM marking.
- Build an LLM-verified "explain it back" question. Teach-back essays already have tutor
  assessment (`apps/server/src/tutor-routes.ts`); reuse that path for short explanations and show
  it only when a tutor is connected.
- Revisit the 35% multiple-choice cap in light of this policy.

## 3. End-of-lesson summary

George's reference (roadmap.sh) shows a score ("5 of 5, solved on the first try"), "How each idea
went" with a per-concept verdict (Solid, Shaky), and a "Remember" list of the lesson's key
sentences. The Discere finish screen shows XP, "On your own" n/m, cards recalled, streak, level,
earned items and quests: mostly game stats, with no per-idea verdict and no take-away list.

To do: add a per-concept verdict (the evidence exists in progression-engine) and a "Remember"
list drawn from the recap, and move game stats below them. The recap screen and finish screen
should not repeat each other.

## 4. New courses

- Existing queue: `docs/library-expansion/courses-to-create.md`.
- roadmap.sh roadmaps (github.com/nilbuild/developer-roadmap) as course sources. Licence: the repo
  allows personal use only and forbids republishing its text, images or project files in any form.
  So use the roadmaps only as George's personal topic checklists. Write lessons from primary
  sources (official docs, openly licensed texts), and do not copy roadmap node text or
  descriptions into this repo.
- Candidate roadmaps, in suggested order (overlap with existing courses noted):
  Git and GitHub; Linux; Computer Science; Data Structures and Algorithms; JavaScript; TypeScript;
  Frontend; React; Node.js; Backend; API design; PostgreSQL (extends SQL); Docker; Kubernetes;
  DevOps; AWS; System Design; Software Architecture; Cyber Security; Data Analyst (extends Python
  and statistics); Data Engineer; Machine Learning; MLOps; AI Engineer; Prompt engineering.

## Status, 3 November 2026: every course written from the curriculum

All twenty courses are re-authored from their objectives by Sonnet agents to
`docs/writing-calibration/authoring-brief.md` and the `discere-lesson-voice` skill, and committed.
Review pages for each are in `docs/writing-calibration/courses/`. George has read the pilot lesson
and the early review pages, not every course.

For each course the lead (Opus):

- ran `scripts/voice-check.ts` (0 errors);
- ran `scripts/check-reused-answers.mjs`, so no reused question id changed how it is marked
  (dropped units in Probability and Philosophy were caught and restored);
- recomputed new answers by hand;
- checked flagged facts against its own knowledge, not the sources, which were unreachable;
- checked publishability, and restored or added citations where an author's rebuild dropped them
  (Linear Algebra, SQL and Python);
- rebound `review/publication.json` with `scripts/rebind-review.ts`, which records exactly what
  was checked.

Final full run on 3 November 2026:

- typecheck: clean;
- contracts: 86/86;
- curriculum: 724/724, with 11 files that cannot load `.authoring/candidate.json`, a
  desktop-only file;
- web: 392/392;
- server: 355 passed, with 7 Python project tests failing because the container has no Python
  sandbox runtime, as on a clean checkout;
- content validation: all 20 courses.

### Still open

- **The running app.** Nobody has played the new lessons in it. Figures and hover terms have only
  been seen in the preview pages, and no desktop, tablet or mobile screenshots exist.
- **Flashcards** were not rewritten. A few use terms the new lessons do not teach, and one prints
  Milton's "waite".
- **Rust** has no citations or review record (see below), and its bundle would be overwritten by
  `scripts/prepare-rust.ts`.
- **The `*-v2.test.ts` files** that read `.authoring/candidate.json` should be pointed at
  `bundle.json`, as the Geometry, Calculus, Philosophy, Economics and Astronomy ones were.
- **`pnpm check`** still stops at lint, on four old errors in `cs-basics-v2.test.ts`.
### Known gaps

- Figures and hover terms have not been seen in the running player, and no screenshots have been
  taken.
- Each course's `*-v2.test.ts` that reads `.authoring/candidate.json` cannot run in the cloud,
  because that file exists only on George's machine.
- Flashcards were not rewritten; a few use terms the new lessons do not teach (noted in the agents'
  reports).
- Rust Foundations was re-authored in the bundle, but `content/rust-foundations/authoring/course.ts`
  still holds the old text, and `scripts/prepare-rust.ts` builds the bundle from it. Port the new
  lessons into that file, or stop the script overwriting authored prose, before running it again.
- Rust Foundations has never had `authoringMetadata` citations or a `review/publication.json`, so
  `assertLessonsPublishable` rejects it (unchanged by the rewrite). Add citations and a review record
  if it is to go through the same publication gate as the other courses.
- Linear Algebra: one italic per teaching screen was placed by script where a screen had none
  (`.author/linear-algebra-vectors-and-maps/_tools/italics.log`); worth a read for mechanical ones.
