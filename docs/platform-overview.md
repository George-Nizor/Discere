# What Discere is and what it offers

Written on 14 November 2026, at release 1.19.0, to give one complete picture before deciding what
to change. Numbers come from `docs/library.md`, which `node scripts/library-report.mjs` generates
from the course bundles. Open work and decisions are in `docs/backlog.md`.

Discere is George's private learning app: a library of courses that teach through short lessons,
questions marked on the computer, practice and spaced review, with a tutor that runs on his own
Claude Code. It runs on his machine, installed and updated by Instrumenta, and works offline apart
from the tutor.

## What a learner gets

**Lessons.** Each lesson opens on a concrete case, teaches one idea per screen with a drawn figure
where it helps, asks questions as it goes (predict, try, worked and faded examples, transfer), ends
with a three-question check and a recap, and lists its sources. Courses have an introduction, a
lesson path and a Start again control.

**Questions and marking.** Multiple choice, numbers with units and tolerances, short typed answers,
order (put steps in sequence), sort (place items in groups), quoted source extracts set side by side,
and code. Every question is marked on the server, never by a model. Wrong options carry feedback
that names the mistake, and hints come in a ladder. Help is recorded: hinted, revealed and
tutor-assisted answers count separately from independent ones. Four modes (Coach, Assisted,
Direct, Exam) set how much help is allowed.

**Practice.**
- Code exercises written and run in a sandbox: Python (63), SQL (45), Rust (71), TypeScript (15,
  the first five lessons) and Systems Programming (8).
- Projects: three in Python, three in SQL, four in Rust, and a Rust playground.
- Writing tasks at the end of every lesson in the five writing courses, marked by the tutor
  against stated criteria, and revisable.
- Course checks (placement, a mixed check and a delayed check a week later) in 18 courses.

**Review and progress.** Spaced review on FSRS, with each lesson's cards and any question you missed
coming back as a card. XP, daily goals, streaks, leagues and achievements, kept honest: rewards
come from saved work and cannot be farmed. The You page shows weekly summaries, accuracy and activity.

**Tutor.** A tutor in the lesson that coaches without giving the answer away, can walk through a
similar problem ("Show me a similar one"), and reviews handwritten workings from the notebook. It
uses Claude Code if installed, then an OpenAI-compatible endpoint, then Codex, and otherwise
prepares a packet to paste into ChatGPT.

**Tools.** A drawing and notes page per lesson, a calculator, read aloud, search across courses and
lessons, Dark and Light themes, reduced motion and sound settings.

**Not there yet.** Use on a phone (`docs/phone-plan.md`), a screen-reader pass, dragging in order
and sort questions.

## The library

67 courses, 848 lessons, 8,812 questions, 2,263 review cards and 1,446 source records. Drawing is
in the content but archived, because Delineare teaches it.

The Courses page groups them like this:

| Group | Courses | Lessons | Questions |
|---|---|---|---|
| Mathematics and logic (foundations to calculus II, linear algebra, probability, causal inference, logic) | 9 | 105 | 1,162 |
| Programming and computer science (CS basics, networks, algorithms, Linux, Git, Rust, systems, the web, TypeScript, game programming) | 10 | 128 | 1,343 |
| Building software (backend, databases, testing, design, system design, DevOps, cloud, security, AI-assisted coding, UX, technical writing) | 11 | 143 | 1,333 |
| Data and AI (SQL, Python, data and analytics engineering, machine learning, AI engineering, agents) | 7 | 103 | 1,200 |
| Science (two physics, astronomy, chemistry, biology, the body, earth science) | 7 | 97 | 1,086 |
| Engineering and making (structures, electronics, mechanisms, materials, control, mechatronics, product design, small buildings) | 8 | 90 | 1,000 |
| Mind, society and decisions (psychology, economics, decision theory) | 3 | 36 | 350 |
| History, language and writing (philosophy, history, the Roman Republic, linguistics, English, reading and research, longer pieces, speaking, creative writing) | 9 | 107 | 981 |
| Music and sound | 2 | 25 | 243 |
| First aid | 1 | 14 | 114 |

About half the library is computing, software, data and AI, and that is the deepest part. Maths,
science and engineering are broad. The humanities are the thinnest: one general history course and
one period course. Missing altogether: foreign languages, law, business and finance, modern and
regional history, politics, sociology, geography, art history and literature.

Five courses are short for their titles: Maths Foundations, Probability and Statistics and CS
Basics (6 lessons each), Electronics (5) and Logic (8). Most courses have 12 to 16 lessons.

## How good the content is

Every course has been through about ten whole-library passes (`docs/content-history.md`). What
differs between courses is the last pass their questions had.

**36 courses had a full question rewrite** (35 listed, plus Drawing): computing, software, data
and AI, the humanities, and Technical Writing and Speaking. Their questions put material in front
of the learner (a log, a schema, a passage, a casualty, a plan) and ask for a judgement. They have
about 10 to 12 order and sort questions each, quote real sources where the subject has them, and
build wrong options from real mistakes. In most of them fewer than 20% of prompts are bare one-liners.
This is the standard to aim for.

**30 courses had a targeted pass**: maths, the sciences, engineering, CS Basics, Systems
Programming, Python, SQL, TypeScript, Rust, and three writing courses. Their teaching was
judged sound and their answers marked correctly. Multiple choice no longer gives the answer away,
every wrong option has feedback and every question has two hints. They have no order or sort
questions (except the writing courses), and in most of them 25 to 88% of prompts are bare. In maths,
physics, chemistry and engineering that is mostly fine, because working out the number is the
skill. Biology, Python, TypeScript and Systems Programming practise easier things than their
subjects ask: arithmetic in Biology, plain sums and short traces in Python.

**2 courses were written new on 14 November** (How the Body Works and The Roman Republic) from
fetched source packs, with a check that no run of eight words is copied from the sources.

**Sourcing.** Every source address was requested and recorded (1.13.0), and 18 courses cite the
section behind each lesson. The courses rewritten in November checked facts against fetched pages
and ran their code, SQL and arithmetic. The targeted-pass courses still rest on the sources they
were first written from, plus the full read of 1.11.2; their new wrong options were checked
against the lessons, not against outside sources. Known stale: two NIST documents in
Cybersecurity.

**What nobody has checked.** No one has worked through most courses as a learner in the app. Every
check so far reads the content or tests it, and agents wrote and reviewed most of it. George's own
use, and the learner-agent plan, are the missing step.

## Where to look

- `docs/library.md`: every course with its numbers and its last question pass.
- `docs/content-history.md`: every pass, why the passes kept coming, how to record the next one.
- `docs/backlog.md`: decisions and open work.
- `docs/authoring/README.md`: how courses are written and changed.
- `docs/implementation-status.md`: release notes and how each feature works.
