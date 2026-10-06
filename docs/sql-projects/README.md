# SQL query projects

Three reviewed projects now extend SQL: From Rows to Reports with fifteen original construction tasks:

| Project | Tasks |
| --- | --- |
| Your first workshop reports | Row grain, calculated columns, filtering, deterministic top rows, distinct categories |
| Connect the workshop records | NULL-aware aggregates, grouped reports, inner joins, left joins, full outer joins |
| Make reports that adapt | Subqueries, duplicate-preserving unions, tied ranks, partitioned averages, running totals and neighbours |

The source scope comes from the retained SQL and Advanced SQL Notion notes. Each task links to an
existing reviewed lesson and its primary SQLite sources. The course bundle and its existing hash
remain unchanged; projects have their own [exact-hash review](../../content/sql-from-rows-to-reports/review/projects.json):
`7aafdeab5080d38d5835fc79d5172365585bc0d1fc645aef939bf372f867f182`.

Learners start from the course roadmap, choose a mode, write queries and inspect literal input and
result tables. Drafts save to the server and have a local reload fallback. Check query grades the
visible dataset and two private variants. Cases include missing durations, empty inputs, repeated
donations, unmatched keys, tied scores and changing averages. Different query formulations can
pass. Finite cases do not prove a query correct on every possible database.

A correct check earns the existing original sound and green frame. A mistake explains the relevant
issue and permits Continue or an edited query. Hints, corrections and worked solutions count as
assistance. Exam responses are immutable; grading and XP remain private until final or explicit
early submission. Unsubmitted drafts earn no correctness credit. Completed results retain the
learner query, one working query, explanation and a lesson link. Study XP is bounded; project work
does not manufacture lesson completion or concept mastery.

The implementation uses SQLite through isolated Python processes. The interpreter requirement,
authorizer and resource limits are documented in [ADR 0004](../adr/0004-isolated-sql-projects.md).
Run `pnpm doctor` to check the installed interpreter. Set DISCERE_SQL_PYTHON if it is outside PATH.

## Verification

All 45 independently authored expected outputs match real SQLite execution. Forty-three server
tests cover alternative queries, access restrictions, instruction/row/concurrency bounds, NULL and
duplicate semantics, saved snapshots, conflicting writes, assistance, reveal delay and Exam privacy
including early submission. Three curriculum tests cover publication and data validity.

The complete repository check passes 1,178 package tests and thirteen bundle validations plus the
reviewed project sidecar. The production build/CSP and isolated smoke check pass. All 98 browser
scenarios passed together; a final four-scenario SQL run also covered early Exam submission. The
compact mode chooser then passed the same four walkthroughs.

Screenshots at 1440×900, 1024×768 and 390×844 are under [screens](screens/). Visual review corrected
clipped phone input tables and shortened the introduction. Screenshot capture resets scroll position
before measuring the screen, so a sticky header is not mistaken for a misplaced header.

## Owner preview

The verified online backup is
`data/backups/discere-before-sql-projects-20261001T232409Z.sqlite`.
Source and backup integrity checks returned `ok`. Migration 0007 added two empty project tables and
one migration-ledger row. The managed preview was restarted on 4317/4318.

Every prior row fingerprint was preserved. Study summary and preferences, including sound, are
unchanged. Attempts and course-check sessions remain zero; review cards remain 282. Both new project
tables are empty. Read-only live checks returned all three five-task projects, and roadmap/start
screens rendered at all three sizes with no horizontal overflow or page errors and the same
`rgb(20, 21, 21)` background. Tests did not add responses to the owner's history.

## Remaining scope

Python construction, editable later attempts with separate fresh assessment, DDL, views, indexing,
triggers, stored procedures and query optimisation remain. These projects deepen the published
SELECT course; they do not finish the wider SQL curriculum.

The final compact introduction was also checked against the live owner preview at 1440×900,
1024×768 and 390×844 after the release build. Start remains visible without scrolling, no
horizontal overflow or page errors occurred, and the read-only check created no project sessions.
The current captures are in `screens/live/introduction-*.png`.
