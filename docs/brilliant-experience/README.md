# Discere learner experience — 2 October 2026

George's 1 October request replaces the Roman reference direction for the active product. Roman
and Electronics prototypes are archived from the catalogue, home suggestions and general review.
Saved links and study history remain available.

## Reference study

The three supplied screenshots define the requested composition: illustrated connected learning
paths; staggered dimensional pedestals with a companion on the current lesson; a focused question
player with an earned green frame, a short correctness sound, an optional explanation and Continue.

Primary Brilliant guidance inspected:

- [Learning paths](https://brilliant.org/help/features/what-are-learning-paths/)
- [Interactives](https://brilliant.org/help/features/how-do-i-use-interactives-on-brilliant/)
- [Differentiation guide](https://brilliant.org/help/schools-and-educators/differentiation-guide/)
- [Practice methodology](https://brilliant.org/practice/guides/trust-and-methodology/)

Public practice pages were inspected in disposable Chromium. A numerical response was submitted
in the [account-free ten-frame activity](https://brilliant.org/practice/kindergarten/counting/count-with-tenframes/);
it immediately showed a short visual hint and Try again. This public K–5 practice is a different
surface from the authenticated player in George's screenshots. The supplied screenshots and
explicit request remain the authority for Discere's confirm, feedback, explanation and Continue flow.
The desktop browser controller failed to initialise, so the working inspection used isolated
Chromium. This work does not claim access to private Brilliant courses or their marking/sound source.

All course icons, pedestal SVGs, companion artwork and sound cues are original Discere work.
Brilliant's course text and assets were not imported.

## Active library and roadmap

Twelve courses contain 152 lessons, 912 questions, 304 recall cards, 153 concepts and 608 answered visual
teaching beats. Maths, Geometry, Linear Algebra, Calculus, Logic and Probability/Statistics form one illustrated path; Computer Science,
SQL and Python form another. Physics, Chemistry and Biology form the natural-science path. Subject, multi-word search and progress filters persist in the URL.
Longer desktop and tablet course rows scroll within their own bounds; keyboard focus reveals the
entire selected course card. Phone paths use two columns.
Keyboard users can select a lesson pedestal and activate its actual Start link. Selecting a stop
brings its pedestal and companion above the Start tray, including on phones. The phone tray now
anchors above navigation even before the roadmap is scrolled into view; the final stop has enough
reserved space to remain reachable.

Module headers divide the course roadmap. Gold completed stops, the current illuminated pedestal,
an original green reading companion, pending stops and the selected-lesson tray use real saved
progress. No node represents an unimplemented lesson. The twelve original cover assets have reviewed
provenance and exact hashes; the loader continues to reject unreviewed replacements.

## Learning behavior

The title, question and useful diagram appear before the authored explanation. Answer keys, hint
text, computed statistics readouts, worked geometry measurements, numerical mechanics results and calculus summaries are concealed before a response. Every lesson contains four
teaching questions, two clearly labelled skills-check questions and two new recall cards.

Check answer records a response on the server. Correctness earns a full green frame, a quiet
two-note sound, optional Why explanation and Continue. A mistake opens its authored correction and
allows the learner to continue; it remains failed correctness and assisted learning. The later
review asks for fresh recall rather than treating the revealed correction as independent mastery.
Blank or malformed responses cannot earn continuation. Exam explanations remain closed on the
server. Completion still requires recorded evidence, the required stages and every lesson card.

A real footer reserves space for the verdict, explanation and controls. Longer diagrams and
answers scroll inside the question pane. Checked answers are brought into view, and all controls
remain available during finite motion. Fresh sound preferences are enabled; saved mute is honoured
and can be changed in the lesson. Correctness cues play for each new correct response even after
its bounded XP reward is exhausted.

A new learner's general review queue is empty until a lesson has been introduced by a recorded
response. Due cards are interleaved across introduced active courses. Archived saved card sessions
remain readable through their explicit routes. Review, completion and roadmaps survive reload.
Manual and system reduced motion stop learner animations.

Maths course checks use the same visual language with twenty new problems across placement,
a mixed final challenge and delayed applications. Unlike immediate lesson feedback, these brief
checks release results after all responses are saved, then recommend lessons and show explanations.
Geometry adds 36 new problems across the same three check kinds, using exact given-data drawings.
Physics adds 54, spanning every one of its eighteen lessons with bounded mechanics drawings.
Calculus adds 36, spanning all twelve lessons with given-function graphs. Chemistry adds another 36, using given particle models and tables. Biology adds 48 mixed numeric and qualitative problems. Logic adds 24; Computer Science and Statistics each add eighteen. SQL and Python add 108, and Linear Algebra adds sixty. All twelve courses provide
458 independent check problems. [Foundation assessment records](../course-checks/foundation-expansion.md)
show the original statement, code and dot-plot givens.
[Data assessment records](../course-checks/data-expansion.md) retain executed SQL/Python checks and compact query givens.
Confidence is recorded separately from correctness; a due delayed check appears in Review.
[Course-check captures and behavior](../course-checks/README.md) document this assessment flow.

Biology: Cells to Ecosystems adds sixteen lessons, 96 questions, 32 fresh recall cards and 48
independent checks. Ten models connect cells, energy, inheritance, evolution and ecology. All 64
teaching beats and 128 cases work at three sizes. Eighty-one numeric keys were recomputed, and
95 term/choice answers were reviewed. Equivalent scientific terms are explicitly supported.
[Biology records](../library-expansion/biology-course.md) retain the source-note correction, review,
model limits, screenshots and substantial remaining subject scope.

Linear Algebra adds twenty lessons with matrix/vector givens, earned transformations and actual
row operations. Visible unit directions make the SVD factor controls meaningful through rotations;
rectangular factor shapes are shown without implying a two-dimensional plot. Its sixty independent
check questions retain hidden marking until completion. [Linear Algebra records](../library-expansion/linear-algebra-course.md)
retain the reviewed source mapping, numeric audit and responsive captures.

## Verification and visual comparison

`pnpm check` passes 1,295 package tests and fourteen stored bundle validations. Production build/CSP,
Python readiness, doctor and isolated smoke pass. The complete 113-scenario browser run passed
112 scenarios and exposed an obsolete Progress summary-text assertion. After its repair, all
seventeen affected Home, journey and reward/sound scenarios passed together. Four Home/You
scenarios passed again after the completed-course refinement; the complete suite was not repeated
afterwards. Browser and smoke databases are disposable.

The preview serves [Home](http://127.0.0.1:4318/), [Learning paths](http://127.0.0.1:4318/courses)
and [You](http://127.0.0.1:4318/you), with twelve active courses and 152 lessons. The Home release
preserves every saved study row, table count and preference, including sound. Six new read-only
live Home/You captures recorded no overflow, page errors, API failures or attempted writes.
[Home release evidence](../home-redesign/README.md) records the backup and exact verification.

Desktop, tablet and phone captures use 1440×900, 1024×768 and 390×844. They were compared with
George's screenshots for hierarchy, connected illustrations, pedestal depth, title/question
spacing, full earned frame, feedback controls and the correction-to-review sequence. Responsive
assertions check horizontal containment and that the footer does not cover the answer pane.
All 21 Python lessons additionally play their real recorded examples at all three sizes. Python
checks cover case selection, step/pause/reset, keyboard scrolling, reduced motion, fresh recall,
completion and wrong-answer correction through the final report lesson. Geometry adds all twelve
lesson openings at the three sizes, case comparisons, foldable nets, fresh recall, completion,
36 independent check responses and the full delayed-review flow. Physics adds all eighteen lesson
openings, fourteen model kinds, 54 check responses, keyboard playback and reduced-motion stopping.
Calculus adds all twelve lesson openings, keyboard graph controls and 36 check responses.
Chemistry adds all 48 teaching beats at three sizes, particle controls and another 36 check responses.
Its tablet spacing, atom contrast and visible reaction coefficients were repaired during screenshot review.
Tablet input visibility and longer learning-path containment were repaired during visual review.
[Calculus evidence](../library-expansion/calculus-course.md) records the sources and results.
Physics screenshots exposed cart-label overlap and inconsistent work-distance scaling; both were
repaired before publication. [Physics evidence](../library-expansion/physics-course.md) records the review.

Representative captures:

- [Illustrated paths](screens/catalogue-1440x900.png)
- [Statistics roadmap](screens/roadmap-probability-statistics-1440x900.png)
- [Python roadmap](screens/roadmap-python-for-data-analysis-1440x900.png)
- [Geometry roadmap](screens/roadmap-geometry-shape-and-space-1440x900.png)
- [Physics roadmap](screens/roadmap-physics-motion-and-forces-1440x900.png)
- [Physics force pairs on a phone](../library-expansion/screens/physics/pairs-of-forces-390.png)
- [Geometry net on a phone](../library-expansion/screens/geometry/box-net-390.png)
- [Python example on a phone](../library-expansion/screens/python-run-and-bind-390.png)
- [Python correction](../library-expansion/screens/python-correction-1440.png)
- [Unanswered question](screens/question-390x844.png)
- [Correct feedback](screens/correct-feedback-1440x900.png)
- [Correction](screens/incorrect-explanation-390x844.png)
- [Fresh recall](screens/review-390x844.png)
- [Saved completion](screens/completion-1440x900.png)
- [Reviewed original covers](screens/cover-icons-review.png)

Deliberate differences: Discere keeps its own name, original icons and companion; existing
notebook/tutor utilities remain; phones scroll longer questions within a reserved pane; progress
reflects Discere's authored lessons and evidence. No commercial learning or engagement parity is
claimed. Wider source-map curriculum coverage remains partial.

SQL now extends this flow into three query-construction projects. Learners write and run a SELECT,
inspect the resulting table and confirm it against three datasets. Passing earns the green frame
and original sound; mistakes explain the relevant issue and allow Continue or revision. Results
keep independent work distinct from hints, corrections and revealed solutions. See the
[project records and responsive captures](../sql-projects/README.md).

Python now also opens three programming projects with 22 tasks and actual isolated CPython,
NumPy and pandas execution. Supplied variables and tables accompany an editable program; passing
the displayed and two private datasets earns the same green frame and original sound. Corrections,
confirmed worked programs, draft conflicts and early Exam submission preserve server-owned
permissions. [Python project records](../python-projects/README.md) retain responsive task captures
and live read-only introductions/roadmaps. All owner records and preferences were unchanged after
the release restart.

## Home and You

George's two additional screenshots from 2 October guide the new Home, Courses and You navigation.
Home shows a prominent illustrated course with real progress, nearby lesson pedestals and a
saved Start/Resume action. Course selection survives reload; completed courses open their roadmap.
A personal daily goal and week replace the leaderboard. No bottom chat panel is present.

You shows a green weekly summary, All time / Week / Month / Year statistics, actual activity,
course progress and milestones. Accuracy uses the latest checked response for each question
each local day; the information control explains that corrections count. Recall is separate,
empty accounts have no invented accuracy, and transfer-only practice days remain counted.
[Home and You records](../home-redesign/README.md) retain implementation and live release evidence.
