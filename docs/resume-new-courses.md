# Resume: the first two new courses (paused 15 November 2026)

George paused this work to save usage for the week. Delete this file once both courses ship.

## State

- **Branch** `course/modern-world-and-government` (pushed). It holds the OpenStax decision
  (`docs/authoring/open-sources.md`, `docs/backlog.md`), the How Government Works curriculum
  (`docs/curricula/how-government-works.json`, 13 lessons) and its scaffolded bundle
  (`content/how-government-works/`, lesson stubs only), and the curriculum checker accepting
  `sort`. The scaffolded course has empty lessons, so do not merge or release the branch until
  its lessons are written.
- **Planning material** is saved in `~/.cache/discere-old-work/new-courses-2026-11-15/`
  (it was in a temporary folder): `government/` and `modern-world/`, each with `pack/` (the
  source pack), `curriculum-draft.json`, `passages.md` and `plan-notes.md`, plus `plan-brief.md`
  and `atlas-research/`. The `excluded*/` folders hold OpenStax and UN text that must not be used.
- **How Government Works:** plan approved (13 lessons). Lesson inputs are in
  `.author/how-government-works/<lesson>/input.json` (ignored by git). Three writers were
  stopped part-way; one lesson output exists (see below). Next: rerun the three writers with
  `docs/authoring/new-course-lesson-brief.md`, pointing them at the saved planning folder:
  lessons 1 to 5, 6 to 9 and 10 to 13 (ids in the curriculum). Then integrate (apply each lesson
  with `node scripts/author-lesson.mjs apply`, draw `content/how-government-works/assets/cover.svg`,
  add `subjects: ["Politics", "Social science"]`, put the course in the "Mind, society and
  decisions" group in `apps/web/src/home/CourseLibrary.tsx` and `scripts/library-report.mjs`, add a
  content test, run `scripts/copy-check.py` against the pack), record it in
  `docs/content-ledger.json`, and release.
- **The Modern World, 1750 to Today:** plan written (14 lessons) but not yet approved. It was
  being revised to add non-European voices and primary texts it lacks: Equiano (1789), the
  Haitian Declaration of Independence (1804), Douglass (1852), Lin Zexu's letter (1839), the
  Meiji Charter Oath, Gandhi's Hind Swaraj (1910), Roosevelt's first inaugural (1933) and the
  Nuremberg judgment (1946). Also: drop the Wikipedia-only claims the planner flagged
  (Smith on slavery, the Haiti indemnity as a cause, Casement's "three million", the purpose of
  article 231) and fix the Polity scale in the pack README (0 to 20). That revision was stopped;
  check which of those texts reached `modern-world/pack/` before redoing it. Then approve,
  copy the curriculum to `docs/curricula/modern-world.json`, scaffold, and write as above.
- **After these two:** the other six of the first eight in `docs/new-subjects.md` (Personal
  Finance, Law, Art History, Reading Literature, Modern Physics, World Religions). Personal
  Finance and Law need George to say which country's rules to teach.

## Usage

The week's usage was at 93% when paused (resets 16 November 2026, 18:00 UTC). A new course
costs roughly one to two per cent: the planner for each course alone used most of a million
Sonnet tokens, so keep plans tighter next time.
