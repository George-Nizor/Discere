# Python construction projects

Three original projects add 22 learner-written programs with 66 reviewed dataset cases to
Python for Data Analysis. Eight workshop tasks develop basic Python; six measurement/table
tasks use NumPy and pandas; eight reporting tasks cover missing observations, transformations,
dates, aggregation, validated joins, pivot, melt and an auditable revenue report.

The full retained Python for Data Analysts guide was read before authoring. All published Python
lessons have construction tasks and primary source references. Earlier lesson, question, card,
source and art records retain their bundle SHA-256:

    1175dc6f0d3f26cc0b7a5a50c74e139dd9acd99c594e6336e4317457a26d4073

The accepted project sidecar hash is:

    107268979cb344aa6edc016da7b84baf56498c16a8456b8d66f5a7c922dd5c27

The review is an agent review under George's delegated implementation authority, not independent
human subject review. All 66 reference executions matched separately specified expected values
in CPython 3.12.3, NumPy 2.3.5 and pandas 3.0.1 through the actual sandbox.

## Runtime and setup

From x86_64 Ubuntu/WSL, install system Python 3.12, python3.12-venv, Bubblewrap 0.9+ and libseccomp2
if they are absent, then run:

    pnpm python:setup
    pnpm python:check

The pinned packages live only in ignored data/python-runtime. No model API, paid dependency or
network connection is required during a run. Native Windows and other architectures currently
return a runtime-specific unavailable message. [ADR 0005](../adr/0005-isolated-python-projects.md)
records the filesystem, namespace, resource and syscall controls and their limits.

## Learning behavior

The roadmap opens an actual programming workspace. Supplied variables are shown as values or
tables. Run executes the displayed inputs; Check also runs two private variants. Hints, authored
corrections and confirmed worked programs record assistance. A logical mistake can Continue;
code errors need repair. Correctness earns the same original sound and green frame as a lesson,
with an optional Why explanation. Drafts save to the server and a revision-bound device cache.
Conflicting tabs load saved progress explicitly.

Function tasks require an actual learner-defined function and call it with reviewed arguments.
Printed text and the value returned for grading are separate. Results keep independent and
assisted work distinct. Exam answers are immutable after submission, with feedback and XP hidden
until completion or an explicit early end. Project rewards never imply lesson mastery or retention.

## Verification and release state

The completed checkpoint passes pnpm check: lint, strict typechecking, 1,227 package tests,
thirteen stored bundle validations and the reviewed SQL/Python sidecars. The actual Python
runtime suite passes 30 tests; project persistence and permissions pass 13 more. Production
build/CSP, python:check, doctor and the disposable full-stack smoke check pass.

Eight focused browser scenarios pass together: four Python and four SQL project scenarios.
They exercise all 22 Python tasks, saved drafts, conflicting tabs, changed inputs, actual
function calls, correction, confirmed reveal, sound, green feedback, completion and early Exam
submission. Question screens were captured at 1440x900, 1024x768 and 390x844. Representative
captures were inspected. The earlier full 98-scenario browser run is historical evidence; a
complete 102-scenario run was not newly performed.

The managed owner preview was restarted on 2 October and serves all three Python projects.
Before restart, SQLite online backup created
[data/backups/discere-before-python-projects-release-20261002T012816Z.sqlite](../../data/backups/discere-before-python-projects-release-20261002T012816Z.sqlite).
Source and backup integrity checks passed. Every prior row fingerprint and count, study summary
and preference remains unchanged after restart. Python/SQL project sessions and actions remain
empty; saved review cards remain 282. Live read-only introductions and roadmaps have no horizontal
overflow or page errors at all three sizes, with Start visible on each introduction. No owner
mutation request was made by these live captures.

Live captures:

- [Desktop introduction](screens/live/introduction-1440.png)
- [Tablet introduction](screens/live/introduction-1024.png)
- [Phone introduction](screens/live/introduction-390.png)
- [Desktop roadmap](screens/live/roadmap-1440.png)
- [Tablet roadmap](screens/live/roadmap-1024.png)
- [Phone roadmap](screens/live/roadmap-390.png)

The existing large frontend-chunk warning remains. Physical devices and learner outcomes were
not measured.

A test configuration mistake used the default database for one API-start test. It created only an
empty Python session, with no actions, answers or rewards. That exact session was backed up and
removed after its unchanged zero-action state was checked. Every earlier row fingerprint, the
study summary and preferences matched the prior SQL release snapshot afterwards. Migration 0008
is already present. The backup is
data/backups/discere-before-python-test-cleanup-20261002T005155Z.sqlite.
All further API/browser tests assert or explicitly use disposable/in-memory databases.

## Remaining curriculum scope

These tasks cover the current introductory course. They do not finish all Python curricula or
the broader topic map. Independent random-sampling work, larger datasets, environment setup
practice, inference, machine learning and fresh delayed construction assessments remain.
Finite checked outputs do not prove all-input correctness or a particular implementation method.
