# Improvements taken from Atlas Open Academy

Atlas Open Academy (atlasopenacademy.org) is a free site of machine-assisted courses, read on
10 November 2026 and compared with Discere 1.9.4. This file lists what Discere should take
from it. None of it is started. George agreed with almost all of the list on the same day;
which item he doubts is not recorded, so confirm before starting one.

## What Atlas is

It claims 313 courses in 39 subjects, from early years to doctoral level. The count includes
courses whose outline the player builds from a template, so the number of written courses is
lower. Each written course has 16 lessons of 2,000 to 3,000 words, 10 multiple-choice
questions per lesson and a 20-question final bank. A lesson has objectives, a real-world
opening, worked examples, a "Common misconceptions" section, a recap, 4 to 9 numbered sources
and key terms.

Five courses were read in full: Python (cs101), classical mechanics, philosophy, Spanish and
biology. Biology is the best of them, with 219 in-text citation markers, a readiness check and
a rubric per outcome.

## Where Discere is already ahead

Atlas marks only four-option multiple choice at undergraduate level, locks the answer on the
first click and gives no hints. Its final exam is about 88% repeated lesson questions in a
fixed order. Its Python course cannot run Python. The question types that look inventive
(find the bug, sort, decide, code) have one authored item across the five courses; the rest
are built by pattern matching on lesson text. Copy the ideas below, and write the items
properly through Discere's own authoring.

## Improvements

### 1. Show sources to the learner

Discere has 882 source records and `sourceIds` on every lesson, question and card. The server
already attaches resolved sources to the lesson response (`apps/server/src/content.ts`), and
no screen renders them. Add a sources list at the end of a lesson, with section or page where
the record has one, and a further-reading link.

Check the sources first. The 46 expansion courses' sources were written from memory
(`docs/expansion-plan-2026-11.md`), with `unverified` lists in `docs/curricula/*.json`. A
link check and a read of each cited section should come before any of it is shown.

### 2. Use more question types

Questions today are 52% numeric, 37% multiple choice, 10% short text and under 1% code.
`order_sequence`, `diagram_choice`, `graph_plot` and `timeline_explorer` are built and appear
in only 5 activities. Types from Atlas that fit one short screen:

- Tap the line with the bug.
- Myth or fact, written from the `misconceptions` the questions already carry.
- Sort items into bins.
- A scenario where each choice shows its outcome.
- Complete a table.
- Pin a place on a map (Discere has no map component yet).
- Build a sentence from shuffled words, for language courses.
- Rate each lesson objective "could explain it" or "not yet", with a link back to the screen.

### 3. Fill subject gaps

About 28 of the 65 courses are computing. Missing: foreign languages, law, health beyond
first aid, business and finance, period and regional history, politics, sociology,
anthropology, geography, religion, art history, literature. Atlas's catalogue at
`atlasopenacademy.org/learn/` is a usable topic list.

### 4. Course-level checks in every course

Placement, checkpoint and delayed-transfer sets exist in 18 courses. Extend them to the
expansion courses. Two cheap additions from Atlas: a readiness check where each missed
question links to the lesson to review, and a capstone the learner rates against the course
outcomes on a written rubric.

### 5. Bring missed lesson questions back in review

Atlas reschedules quiz questions, opens some lessons with a few earlier questions, and gives
no credit for answering early. Discere's review queue holds only the 2 or 3 authored cards
per lesson; missed lesson questions never return (see `docs/holistic-review-2026-11.md`).
`createFlashcardFromReviewedQuestion` in `packages/progression-engine/src/review.ts` already
builds a card from a question and is unused.

### 6. Written answers in humanities courses

Atlas returns a mark out of 10, what was done well, what to improve and a next step, with a
notice that the feedback is written by AI. Discere has essay assessment through the tutor
provider, one essay, and no `long_text` question in use. Add short written responses to
philosophy, history, writing and rhetoric, with a model answer to compare against when no
provider is available.

### 7. Smaller items

- Photographs with credit and licence. `CourseImageSchema` supports them and no lesson uses
  one. Biology, astronomy, earth science and history gain most.
- A glossary page per course, from the inline terms and `introducesTerms`.
- A "try it on paper" version beside each explorer, with the model's assumptions stated.
- A dyslexia font and a high-contrast setting.
- Video: Atlas embeds one checked clip per lesson. Undecided for Discere; a link in further
  reading costs nothing.

## Suggested order

Items 1 and 2 first. Both use data and components that exist.
