# SQL and Python course checks

Published locally: 2 October 2026. Both courses are now version 1.1.0.

| Course | Placement | Mixed challenge | Seven-day application | Total |
| --- | ---: | ---: | ---: | ---: |
| SQL: From Rows to Reports | 15 | 15 | 15 | 45 |
| Python for Data Analysis | 21 | 21 | 21 | 63 |

Every set covers every taught lesson once. These 108 problems bring the library to 398 independent
course-check problems across all eleven active courses. The 132 lessons, 792 lesson questions,
264 active recall cards and original illustrations are preserved.

## Content and given data

SQL starts with a repair workshop, then asks the learner to audit field samples and a delivery
report. Questions cover record grain, aliases, filtering, deterministic ordering, DISTINCT,
missing-value denominators, grouped reports, joins, subqueries, set operations and windows.
Duplicate keys, unmatched records, unknown measurements, equal ranks, peers and missing neighbours
are explicit. A join case uses two dispatch records and three routes to expose multiplication.

Each SQL question shows its actual input rows and the query. Unrelated columns are omitted to make
the givens readable on a phone; the resulting projected tables are the inputs executed by tests.
No solved output is sent with a question. Bounded schemas enforce rectangular tables, distinct
identifiers and names, finite values, limited row counts and limited query length. NULL is visually
and accessibly distinct from the literal string "NULL". SQL and input strings are escaped text.

Python questions trace original code and diagnose predictable mistakes: old bindings, notebook
state, negative floor division, strings, aliases and shallow copies, sets, loops, functions,
specific exceptions, arrays, axes and views. Later questions cover CSV types, labels versus
positions, Series alignment, Copy-on-Write, missing values, text/date parsing, groups, merges,
reshaping and report audits. Questions ask about the data or computed value rather than displaying
an execution result. Literal programs are bounded to 24 lines and 1,800 characters.

## Source and answer verification

The existing source records remain unchanged. Each new question maps to its taught lesson,
concept and primary references. No third-party course exercises, prose or artwork are imported.

Primary references rechecked for sensitive semantics include
[SQLite window functions](https://www.sqlite.org/windowfunctions.html),
[pandas Copy-on-Write](https://pandas.pydata.org/pandas-docs/version/3.0/user_guide/copy_on_write.html)
and [pandas merge](https://pandas.pydata.org/pandas-docs/version/3.0/reference/api/pandas.merge.html).
The pandas documentation branch is 3.0; the actual executions below use the recorded 3.0.1 runtime.

All 45 SQL queries execute independently in in-memory SQLite against the exact displayed input
tables. Tests compare the requested cells, column counts or row counts with manually authored keys.
This covers 36 numeric and nine choice problems.

All 63 Python probes execute in CPython 3.12.14 with NumPy 2.3.5 and pandas 3.0.1. Each probe runs
the displayed program and inspects the variable or expression requested by its prompt. Fifty-three
numeric results and ten choice cases match their expectations. The random-interval question also
has a separate bound check: a finite sample cannot establish the interval's limits.

The authoring utility runs trusted local code only. This extension adds no arbitrary learner
Python or SQL execution. Literal code and cells remain untouched by prose rewriting; prompts,
options and explanations pass the existing writing gate. Two additional Python prose warnings
were reviewed as necessary descriptions of actual string operations and matching observations.

## Publication and preservation

Both candidates were staged, schema-normalized, executed and exercised in disposable browser
databases before their exact hashes received accepted authoring-agent reviews under George's
delegated authority. The earlier accepted reviews remain in each course's review/history folder.

| Course | Accepted bundle SHA-256 |
| --- | --- |
| SQL | 35d46d605c468fb84efd8383e03ce52e003f64864a2044f0875e6a69df90f852 |
| Python | 1175dc6f0d3f26cc0b7a5a50c74e139dd9acd99c594e6336e4317457a26d4073 |

The preservation fingerprint removes only course.version and courseChecks from a schema-normalized
bundle. Every remaining field matches its prior value. SQL's older serialized property order
differs from today's schema order; its raw original hash is retained separately, and the unchanged
normalized content is checked before publication. No publication gate was bypassed.

Each review/check-extension.json retains preservation and accepted hashes. Python's
review/check-executions.json retains the exact probe-manifest digest and interpreter versions.
The curriculum tests bind the published code and keys back to that digest.

## Browser and visual evidence

Four staged browser scenarios passed. They exercise every new response at 1440×900, 1024×768 and
390×844, including saved drafts, confidence, answer concealment, explanations after submission,
missed-lesson recommendations and stored results. They earn every actual prerequisite lesson
stage, reject an early delayed check at seven days minus one millisecond, and offer it through
Review at exactly seven days. Owner study history is never used as test data.

Representative captures were inspected for legible inputs, code, spacing and reachable responses:

- [SQL join on a phone](screens/data/sql-from-rows-to-reports-placement-8-390.png)
- [SQL join on desktop](screens/data/sql-from-rows-to-reports-placement-8-1440.png)
- [SQL missing values on tablet](screens/data/sql-from-rows-to-reports-placement-15-1024.png)
- [Python exceptions on tablet](screens/data/python-for-data-analysis-placement-8-1024.png)
- [Python strings on a phone](screens/data/python-for-data-analysis-transfer-3-390.png)
- [Python result](screens/data/python-for-data-analysis-transfer-result-1440.png)

Longer problems scroll within the question pane. The action footer reserves its own space, and
keyboard users can scroll wide input tables and code. As in existing course checks, correctness
appears after the set is submitted. Teaching lessons retain immediate correction, sound and their
earned green frame.

The complete package check passes 1,132 tests and thirteen bundle validations. All 95 browser
scenarios passed together; a final focused four-scenario rerun passed after the accessibility markup
was refined. Production build/CSP and isolated smoke passed. The refreshed owner preview exposes
all 398 check problems and preserves every prior row, table count, study summary and preference.
[Implementation status](../implementation-status.md) records the verified online backup and release.

## Reproduce

Run pnpm exec tsx scripts/prepare-data-checks.ts to stage reviewed-content extensions and the
Python probe manifest. Execute scripts/python-examples.py with the generated check-probes.json
and check-executions.json paths in the pinned Python environment; --verify checks a prior record.
Run the SQL execution tests, curriculum tests and data-checks.spec.ts. To exercise staged content,
set DISCERE_DATA_CHECKS_CANDIDATE=1; only that suite's disposable server receives the candidate.
Publication still requires an accepted review of the exact serialized candidate hash.

## Remaining scope

These assessments test interpretation, prediction and diagnosis of taught ideas. Independent
query/program construction, larger real-data projects, flexible retake forms, wider technical
curricula and documented learner trials remain. The complete source-map goal is still active.
