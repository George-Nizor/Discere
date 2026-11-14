# Backlog

Open work and open decisions, checked against the code and content on 14 November 2026. This is
the only list of what is left; plans and hand-offs are deleted once their work ships. Each item
says what is wrong now and how it was measured, so nobody has to redo a pass to find out.

## Decided on 14 November 2026

- **The Roman Republic stays**, filed under History with the History course (both carry the
  History subject). Later it should become a module of a broader ancient-history course, or the
  first of a set of era courses written the same way.
- **The short foundation courses stay short.** Maths Foundations, Probability and Statistics and
  CS Basics (6 lessons), Electronics (5) and Logic (8) are starters, and that is fine.
- **Questions are rewritten only where they are genuinely not good enough**, judged on a blind
  sample against fully rewritten courses. Done the same day: five courses were below the bar and
  were rewritten; the other 25 were at the bar and only their named weak questions were fixed
  (`docs/content-history.md`, release 1.20.0).
- **New subjects come next**, to complete the library's breadth for a polymath learner, drawing on
  the sources Atlas Open Academy uses. The prioritised list is `docs/new-subjects.md`.

## Decisions for George

- **OpenStax and AI.** OpenStax book pages now forbid ingesting the books into large language
  models or generative AI without OpenStax's written permission. 31 courses cite OpenStax, and
  nine rest almost entirely on it (Calculus II, Astronomy, Physics, Economics, Biology,
  Trigonometry, Calculus, Chemistry, Geometry and Maths Foundations among them); several were
  written or rewritten by agents that read OpenStax pages. Options: ask OpenStax for written
  permission for a private, non-commercial app; accept the risk for private use; or move those
  courses onto other sources over time. New courses use no OpenStax text until this is settled.

- **Learner-agent testing** (`docs/learner-agent-testing-plan.md`): agents work through each
  course as a learner and report where they get stuck. Planned on 4 November; one trial run;
  not started.
- **Phone.** `docs/phone-plan.md` sets out remote use over Tailscale or an offline lite app.
- **The mascot** (`docs/mascot/README.md`) is awaiting a choice.
- **End-check retries for order and sort questions.** An end check gives one try, which is harsh
  for a six-item order question.
- **Drag** for order and sort questions, on top of the buttons and keys.

## Content, small and measured

- **Right option never the longest** in ten fully rewritten courses (the reverse of the old
  giveaway): Statistical and Causal Inference 0%, Industrial Design 0%, Small Buildings 0%,
  Economics 1%, Music Theory 1%, Cybersecurity 2%, The Web 2%, History 3%, Data Structures 3%,
  Data Engineering 3% (`docs/library.md`, "Right longest"). The 1.19.0 rebalance covered only the
  targeted-pass courses. About five questions per course.
- **Course checks** (placement, mixed check, delayed check) exist in 18 courses only. Philosophy
  and Psychology's inline check questions are bare recall; English's 36 have no hints and 18 have
  no feedback on wrong options.
- **Cybersecurity** cites NIST SP 800-63B and SP 800-61 Revision 2, both superseded.
- **Licences.** OpenStax books are CC BY-NC-SA, which suits private use; NHS and WHO pages are
  paraphrased, never quoted.

## Marking

- The typed-answer marker stems "dominates" and "dominated" to the same word.
- Two typed options that differ only by an operator or a bracket can both match, because the
  marker strips `& | [ ] ( ) .` before comparing. Writers have worked around it.

## App

- Requests that list review cards (`visibleReviewCards` in `apps/server/src/routes.ts`) upsert
  every authored card and query per question on Home and Review; a server test that starts the app
  takes four to five seconds for the same reason.
- The Origin check passes any loopback port (`apps/server/src/host-guard.ts`).
- Exam mode lets a closed question be reopened (more tries, never independent credit).
- Leagues pay about 20 XP for a new question and 3 to 8 for a review, and drop a league per idle
  week.
- `instrumenta/product.json` pins `DISCERE_CLAUDE_SMART_MODEL` to Haiku, so an installed copy
  uses Haiku for judging too.
- The release zip ships `content/*/.authoring/` and `review/history/`.
- 40 stylesheets with tokens redefined in five layers.
- Nothing has been tried with a screen reader.

## Ideas, not started

From the November comparison with Atlas Open Academy: tap the line with the bug, a scenario
where each choice shows its outcome, complete a table, short written answers in humanities with
a model answer, photographs with credit, a glossary page per course, a dyslexia font and a
high-contrast setting.
