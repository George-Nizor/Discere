# Python for Data Analysis

Published locally: 2 October 2026. Course ID: `python-for-data-analysis`.

This course implements an introductory teaching sequence from George's
[Python for Data Analysts guide](https://app.notion.com/p/3ebea4c04f4c8121b614d35f8ba2c271),
read in full from the connected Notion library on 2 October. The source revision is
30 September 2026, 10:55:50.750 UTC. Its sanitised body is retained in
`technical-source-snapshots.json`; signed image URLs are omitted.

The 21 lessons contain 84 answered teaching beats, 126 questions, 42 fresh recall cards and
21 concepts. Every beat provides two original Python examples to compare. Each lesson follows
four teaching responses with two changed-input skills checks and two standalone recall prompts.

## Source-to-lesson mapping

| Guide sections | Implemented lessons |
| --- | --- |
| Python files, code/Markdown cells, variables, comments, execution order | Follow a value through a program |
| Numeric/string/Boolean types, arithmetic, comparison, integer limits | Know what a number means |
| String escapes, indexing, slicing, methods | Take exactly the text you need |
| Lists, tuples, object references, mutable values | Change a collection without surprises |
| Dictionaries, sets, membership | Choose the right collection |
| if/elif/else, for/range, while, logical and bitwise operations | Control which work happens |
| Functions, arguments, return, modules, aliases, installation versus import | Turn a calculation into a tool |
| try/except, with, file handling | Handle failure without hiding it |
| NumPy arrays, dtype, shape, reshape, dimensions | Give data a shape |
| Elementwise arithmetic, scalar broadcasting, reductions, axes, views/copies | Calculate across the right axis |
| arange, linspace, random draws, seed and endpoint boundaries | Generate values with clear boundaries |
| CSV/Excel readers, Series, DataFrames, headers, dtypes, inspection | Meet a real table |
| loc/iloc, rows/columns, slicing, index alignment | Find the intended row |
| Boolean selection, derived/dropped columns, safe assignment | Keep the rows that answer the question |
| Missing data, fillna, dropna, counts and denominators | Keep unknown separate from zero |
| str methods, splitting, renaming, map/lambda, rowwise apply | Turn messy text into usable columns |
| Date parsing, invalid dates, epoch units, calendar fields and durations | Read a date without guessing |
| Descriptive statistics, unique values, groupby, aggregation and sorting | Summarise the right observations |
| Concatenation, inner/left joins, duplicate/null keys and relationship validation | Combine data without multiplying the answer |
| Pivot, aggregate pivot tables, melt and missing cells | Change the layout without losing the meaning |
| End-to-end application of the guide's analysis techniques | Build a report you can defend |

All examples, datasets, exercises, prose and artwork are original. The guide supplies learning
intent; its prose, third-party screenshots, commercial-course exercises and video dataset are
not copied into the playable course. Primary references and exact sections are recorded against
each lesson, question and recall card.

## Corrections and assumptions

- Python's built-in int has arbitrary precision; NumPy integer dtypes may be fixed width.
- set is mutable and unordered; frozenset is immutable.
- String/list/iloc stops are exclusive. Sorted loc label slices include both existing endpoints.
- // floors toward negative infinity. Decimal floats are not assumed to represent every fraction exactly.
- Assigning a list does not copy it; list.copy is shallow. Basic NumPy slices can share storage.
- arange excludes its stop; linspace includes its endpoint by default. Random integer high is
  exclusive unless endpoint=True is requested.
- Series assignment aligns labels. DataFrame.apply defaults to columns; axis=1 supplies rows.
- Missing observations remain distinct from zero. Count and size have different denominators.
- Datetime integers need an explicit unit. A raw datetime integer is not automatically Unix seconds.
- pandas 3.0 uses Copy-on-Write. Examples use explicit loc or column reassignment rather than
  chained inplace operations.
- concat retains duplicate records. Merge multiplicity is checked; pandas can match null keys.
- The source's left-join description with how='inner' is corrected through paired actual results.
- Grouped aggregation returns a Series or DataFrame; it is distinct from the intermediate GroupBy object.
- The guided sales report preserves its unknown-price count beside known revenue.

## Execution and assessment

Authoring runs on CPython 3.12.14, NumPy 2.3.5 and pandas 3.0.1. All 168 worked examples execute in
fresh namespaces, and each authored code block records its resulting watched values, table cells
and output. Numeric marking values were chosen explicitly and then verified by 105 separate
changed-case programs: 84 question keys and 21 recall keys. Unit tests independently recompute
all 84 numeric question results outside the Python generator.

The introductory lesson diagrams replay these reviewed executions. Playback supports case
changes, single steps, pause/reset, keyboard scrolling and manual/system reduced motion. The
separate [construction workspace](../python-projects/README.md) now executes learner-written
programs inside the recorded mandatory sandbox. It remains a teaching comparison; the question states its own
changed inputs. No marking authority is stored in a diagram.

A schema rejects invalid code ranges, ambiguous case IDs, ragged tables, duplicate watched names
and unknown answer-bearing fields. The server retains the answers and continues to enforce
question-first feedback, Exam restrictions, recall and completion evidence.

To reproduce the authoring checks from the repository root:

```sh
pnpm exec tsx scripts/prepare-python.ts manifest
python scripts/python-examples.py content/python-for-data-analysis/.authoring/execution-manifest.json content/python-for-data-analysis/.authoring/executions.json
pnpm exec tsx scripts/prepare-python.ts
python scripts/python-examples.py content/python-for-data-analysis/.authoring/execution-manifest.json content/python-for-data-analysis/.authoring/executions.json --verify
```

Use a Python environment containing the recorded NumPy and pandas versions. The bundled desktop
Python environment provided those dependencies for this checkpoint. This authoring utility executes
trusted repository examples; it is not an execution sandbox and has no learner-facing API.
At the original version 1.0.0 checkpoint, no Python runtime was required by the API. The separate
construction release now requires the pinned local runtime described in ADR 0005; the web app
still has no Python/NumPy/pandas executable dependency.

The original version 1.0.0 accepted bundle SHA-256 is
`867e9f8336d76d432039f2dc565ff6877d8ba92d7b19788543f6c90bb6b9f1ea`.
`content/python-for-data-analysis/review/` retains exact publication and execution evidence.
The original cover was inspected in `screens/python-cover-review.png` before its hash was accepted.
Reviews are agent reviews under George's delegation, not independent human subject review.

## Scope still open

The guide sequence now includes prediction, explanation, recall and 22 independent code-writing
tasks in three projects. These do not finish the parent Python collection, Google Advanced Data
Analytics, AI/ML Engineer pathway or broad Computer Science curriculum. Random-sampling work,
environment setup practice, larger datasets, advanced structures, inference, machine learning and
fresh delayed construction assessments remain. Finite checked outputs do not establish all-input
correctness or retention. Parent records stay partial in `topic-coverage.json`.

## Verification

The focused contract, playback and curriculum tests pass. The complete package check passes
722 tests and validates eight stored bundles. Production build/CSP, isolated full-stack smoke and
all 58 Playwright scenarios pass. The Python scenarios play every lesson at 1440×900, 1024×768
and 390×844, finish the first lesson through fresh recall, preserve completion after reload,
continue through a corrected capstone response, and verify pause, keyboard access and reduced
motion. Representative code, table, feedback, completion and roadmap captures were inspected.
The full authoring rerun reproduces all 168 examples and 105 numeric marking checks.

## Version 1.1.0 assessment extension

The course now has 63 additional problems: 21 each for placement, a mixed final challenge and a
seven-day delayed application. All 63 displayed programs and answer probes were executed in the
same recorded runtime; every prior teaching field has an unchanged preservation fingerprint.
[Assessment sources, publication and responsive verification](../course-checks/data-expansion.md)
record the current accepted bundle and checks. The version 1.0.0 verification above is retained
as a historical publication record.

## Executable construction projects

Three original projects now cover every published lesson with 22 learner-written programs and
66 separately specified dataset cases. The current project runtime uses CPython 3.12.3, NumPy 2.3.5
and pandas 3.0.1, independently of the historical trusted authoring runtime above. A required
function task calls the learner's function; table tasks retain ordered columns, duplicate rows
and explicit missing values. Run, private changed-input checks, assistance, saved drafts and
all four modes are enforced by the server. Projects earn bounded XP without awarding lesson
completion or inferred mastery.

[Project publication and release records](../python-projects/README.md) retain the exact sidecar
hash, all 66 reference executions, isolation tests, the 1,227-test repository checkpoint,
eight focused project browser scenarios, production/smoke checks, live captures and unchanged
owner records after the managed preview restart. Broader curriculum coverage remains partial.
