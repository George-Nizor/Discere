# ADR 0004: Run query construction in isolated SQLite processes

Status: Accepted  
Date: 2026-10-02

The SQL course needs learner-written queries. The existing lesson and course-check contracts assess
responses against server-owned answers; they should not become a general code executor.

A separate project service executes a learner's single SELECT in a short-lived Python standard-library
SQLite process. The child receives only the query and the current exercise's reviewed input tables.
It opens an in-memory database and receives a minimal environment. It never receives the study
database path, model credentials or hidden solution SQL. No learner Python is evaluated and no
runtime model generates executable code.

SQLite's authorizer permits reads of displayed tables and a bounded list of deterministic
aggregate, string and window functions. It refuses changes, attachments, PRAGMAs, system-table
reads, extension loading and other functions. Defensive configuration and disabled trusted schema
apply before preparation. SQLite limits bound expressions, columns, statement size and memory;
a progress callback bounds executed instructions and elapsed query time. The parent enforces a
three-second deadline, a bounded output and at most four simultaneous children.

This follows SQLite's [untrusted SQL guidance](https://www.sqlite.org/security.html) and
[authorizer contract](https://www.sqlite.org/c3ref/set_authorizer.html), through the
[Python 3.12 sqlite3 interface](https://docs.python.org/3.12/library/sqlite3.html).
This is an application restriction around SQLite, not an operating-system security sandbox or a
general Python execution service. A vulnerability in the interpreter or database engine remains
a runtime dependency risk.

The free runtime requirement is Python 3.12+ with SQLite 3.39+. DISCERE_SQL_PYTHON can name an
absolute interpreter path; default commands are python3 on Unix and python on Windows.
No Python packages, network access or API subscription are needed. The doctor command checks the
runtime, and an unavailable worker produces a recoverable SQL-specific message. Existing lessons
do not depend on that worker. Windows launches hide the helper window.

Projects are reviewed sidecars beside the course bundle. Publication requires strict schemas,
valid lesson/concept/source references, the prose gate and a review of the exact serialized hash.
The initial three projects contain fifteen tasks. Each has one visible dataset and two private
variants with manually specified expected rows. The reference solutions were executed against all
45 expected tables before publication.

Grading compares result column names and values. Unordered results are multisets, preserving
duplicates; ordered results require the requested sequence. NULL differs from the string "NULL".
Numbers use a small documented floating-point tolerance. Different valid queries are accepted.
Finite datasets provide evidence, not a proof of general correctness.

Migration 0007 adds project snapshots and an action history. Session mode is immutable. Saved drafts
and asynchronous runs use revision checks; repeated request IDs cannot duplicate rewards.
A project keeps its original definition after later content changes. Exam marking and XP remain
private until every task is submitted or the learner explicitly ends the exam early. Early
submission preserves checked responses and gives unanswered drafts no correctness credit. Other modes expose corrections after a failed check and
record assistance; hints and confirmed worked-query reveals also remain on the record. Reveals use
the existing five-second, reason-and-confirmation pattern. A mistaken query may Continue without
being counted as correct. Revealing a solution does not earn independent credit.

Rewards are bounded per course/task identity across revisions: five XP for a correct independent
response, two after help, zero for incorrect or revealed work. Projects do not complete lessons,
increase concept mastery or claim retention. Python construction, SQL data-definition/admin work
and independent later project reassessment remain separate future work.
