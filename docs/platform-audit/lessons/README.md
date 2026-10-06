# Lesson experience audit

Date: 2026-10-06, 13:22–14:10 AEDT. Auditor: Claude (audit only, no code changed).

## Scope and method

The audit covers the lesson player in all 18 courses listed by `GET /api/courses`. For each course it opened the first lesson and the middle lesson and went through every stage: the four explainer steps, two skills-check quizzes, the "Recall it later" review and the completion screen. That is 36 lessons and about 280 question screens.

On every question screen the audit:

- submitted a wrong answer, then asked for a hint where one was offered;
- tried the correct answer, taken from the bundle's `answerAuthority`.

It also covered the following:

- **Lesson tools:** the header tools (read-aloud, sound, Working, Calculator and Tutor), the tutor (mock provider) and the calculator.
- **Diagrams:** every control on the third lesson of each course (cases, sliders, play, step and reset).
- **Input:** keyboard navigation.
- **Screen sizes:** 1440×900, 1024×768 and 390×844.
- **Other screens:** the course page, the course check (placement), the SQL project and the Python project.

Separately, the grading engine was run offline against every numeric answer in every active bundle.

**Caveats**

- The lead was rebuilding the lesson toolbar, notebook and calculator during the audit. At 13:24 the header was icon-only with two speaker icons. By 13:28 it was "Read aloud · Sound · Working · Calculator · Tutor" with a split-screen workbench. Findings carry the time they were seen.
- Concurrent edits restarted the dev server several times. That produced 502s and, once, a missing migration. Those runs were repeated. The only console errors seen were 502s from those restarts. No React or page errors appeared in any lesson.

Severity: **blocker** stops learning or makes the lesson untrustworthy. **Major** badly hurts the experience across many lessons. **Minor** is a local defect. **Polish** is fit and finish.

## Findings ranked by severity

| ID | Sev | Finding | Scope | Seen |
|---|---|---|---|---|
| B1 | blocker | Every step's authored explanation is stripped before it reaches the learner. A step shows a title and a question, with no introduction or instructions | All 18 listed courses (≈37 000 words) | 13:24 |
| B2 | blocker | Typing the unit shown in the Unit box (°, £, £m, L☉, M☉, °/day, "million years", …) is rejected as unreadable, so the correct answer cannot be entered | 61 questions: astronomy, economics, engineering, psychology | 13:35 |
| B3 | blocker | One wrong answer reveals the worked answer and locks the input. The hint ladder is never offered in lessons | Every question-led step and quiz, all courses | 13:27 |
| M1 | major | Diagrams display the answer before the learner answers | maths, astronomy, geometry, chemistry, SQL, +21 label hits | 13:24–13:58 |
| M2 | major | Text hierarchy is inverted: a 26 px bold step title (often jargon) sits above a 17 px regular question. Quiz, review and check use three other scales | All explainer steps | 13:24 |
| M3 | major | Steps open pre-scrolled, with the title and question hidden under the header, and the footer covers the answer box | Content-heavy steps at 1440, 1024 and 390 | 13:41 |
| M4 | major | Any failed background refetch replaces the whole lesson with a dead-end "This lesson is unavailable" screen. It has no retry, header or exit | All lessons | 13:38, 13:41 |
| M5 | major | Wrong-answer feedback never says "wrong": it reads "Here's the idea." in amber and does not mark the correct choice. Celebrations fire on wrong answers | All courses | 13:28 |
| M6 | major | Free-text keyword grader false negatives. With B3, a learner who is right is marked wrong permanently | 174 free-text questions | 13:45 |
| M7 | major | Unexplained controls on first screens: "Explore x / Explore y" sliders, a "Try x" slider beside a multiple-choice question, logic "p: True" toggles, "Example/Compare" chips | maths, logic, linear algebra, others | 13:28–14:01 |
| M8 | major | At 390 px the workbench sheet covers the question, clips the diagram and floats "Check answer" over the diagram. The header drops course and lesson names | Lesson shell | 13:33 |
| M9 | major | White-on-white text: the balance diagram's right-hand side ("18") is invisible in the dark theme. Other unmapped light fills are at risk | maths balance; 12 colours in 6 diagram files | 13:31 |
| m1 | minor | Two identical speaker icons (13:24). Now labelled, but they go icon-only below 1440 or when the bench is open. Read-aloud reads only the prompt, never the choices, and the review adds a third "Read the card" | Shell | 13:24 / 13:31 |
| m2 | minor | Working: typed working is not autosaved and is lost on reload. The placeholder "I = V / R" (from electronics) appears in every course. Esc does not close the bench. Tutor has two close buttons | Workbench (new) | 13:31–13:40 |
| m3 | minor | Calculator (new) works, but "Use in answer" needs the answer box clicked first, inserts the last good result while the display shows an error, and is offered in English and philosophy | Workbench (new) | 14:05 |
| m4 | minor | The completion screen celebrates 0/6 with a star and confetti. Every lesson's completion heading is "Ready for the next idea". "Correct without hints" is shown though no hint was ever offered | All lessons | 13:29 |
| m5 | minor | The review stage is titled "Recall it later" but runs immediately. Its prompt is set at 32 px, and the free-text box is 250 px wide | All lessons | 13:29 |
| m6 | minor | Numeric jargon in non-numeric courses: "Value / Number or fraction", "Read given values" in English and philosophy. Disclosure labels differ ("Read given values", "Read dimensions", "Read the outcomes", "Input data") | Cross-course | 13:50 |
| m7 | minor | Linear-algebra plot is tiny (≈160 px), with v1/v2 labels overlapping and axes ±8 for vectors of length 2–4 | linear algebra | 13:52 |
| m8 | minor | Accessibility: choices are toggle buttons rather than a radio group, so arrow keys do nothing. Slider names include the value ("Input x 0", "Both rolls at most3"). Header XP ring and combo pill are unlabelled | Shell | 13:43 |
| m9 | minor | Explainer prompts skip `InlineRichText`, while quiz prompts use it. Code in Python and SQL prompts is not monospace | Shell | 13:30 |
| m10 | minor | Equivalent compound units are rejected: "16000 N·m" for 16 kN·m gives a unit mismatch | engineering | 14:08 |
| p1 | polish | Answer input sits off-centre in a centred column (545–768 px at 1440; left-aligned at 1024) | Shell | 13:24 |
| p2 | polish | The leave-lesson ✕ (x 28–68) overlaps the breadcrumb link (from x 65) | Shell | 13:24 |
| p3 | polish | English content mismatch: the prompt quotes "And every fair…" but the diagram drops "And" | english L1 | 13:50 |
| p4 | polish | Course page: the lesson pop-over covers the next two path nodes; "Use it a week later" shows no status | Course page | 13:33 |

Counts: **3 blocker, 9 major, 10 minor, 4 polish**.

---

## Finding detail

### B1 — Authored explanations never reach the learner (no lesson introduction)

- **Screen:** `/courses/maths-foundations/lessons/what-a-letter-stands-for` (any lesson). Screenshot `01-maths-first-screen-1440.png`.
- **Steps:** open the first lesson of Maths Foundations.
- **What happened:** the screen shows "STEP 1 OF 4", a big bold "One letter, one value", the question "For x = 2, what is x + 5?", a number machine and an input. The bundle authors a paragraph for this step: "The machine adds 5 to the value you choose for x. Move the input and follow it through the arrow. A letter lets us describe the same calculation…". It never appears. It only surfaces after answering, folded under "Explore the idea".
- **Expected:** a short framing of what the lesson is about and how to use the diagram before the first question. The heading should then read as the name of an idea, not a riddle.
- **Cause:** `apps/server/src/content.ts:74-79` (`learnerSteps`). For any step with a question in a non-archived course, `blocks` is filtered down to headings only. Every step in all 18 listed courses has a question, so 100% of step prose is withheld. That is 900 steps and roughly 37 000 words: maths 986, philosophy 3 506, english 3 228, psychology 3 071, economics 2 961, and so on.
- **Shell fix:** decide deliberately how much prose a question-led step shows before the question. At minimum, show a lesson intro beat and the step's first sentence or instruction. This is a server projection change plus `StoryStageView`; no content rewrite is needed.

### B2 — Typing the unit you are shown fails

- **Screen:** `/courses/astronomy-sky-to-cosmos/lessons/turning-sky`, step 1 (`03-astronomy-degree-unit-rejected.png`). Also `/courses/economics-markets-and-strategy/lessons/consumer-and-producer-surplus`, which shows the £ placeholder (`04-economics-pound-unit-placeholder.png`).
- **Steps:** type 52 in Value and ° in Unit (the placeholder shows °), then Check.
- **What happened:** "Enter a number in °." Retyping the correct answer with the unit gets the same message. Only clearing the Unit box works, and nothing says so.
- **Offline check against every active bundle** (`assessNumericAnswer("<value> <unit>")`):

  | Unit | Questions failing |
  |---|---|
  | `£` | 26 |
  | `°` | 13 |
  | `L☉` | 4 |
  | `£m` | 3 |
  | `× 10⁶ mm⁴` | 3 |
  | `billion years` | 3 |
  | `million years` | 2 |
  | `M☉` | 1 |
  | `°/day` | 1 |
  | `problem sets` | 1 |

  That is 61 questions in all. Bare numbers pass everywhere.
- **Location:**
  - the numeric parser in `packages/assessment-engine/src` (non-ASCII and multi-word units are unreadable);
  - `apps/web/src/journey/quiz/answer-draft.ts:34-35`, which joins value and unit with a space;
  - `apps/web/src/journey/quiz/AnswerInput.tsx`, which shows the unit box with `expectedUnit` as its placeholder.
- **Shell fix:** either accept the declared unit and its common spellings ("deg", "pounds", "GBP"), or show the unit as a fixed suffix instead of a free field.

### B3 — One strike reveals the answer; hints are unreachable

- **Screen:** any lesson step or skills check (`02-one-strike-reveal-maths.png`).
- **Steps:** enter any wrong answer and press Check answer.
- **What happened:** "Here's the idea." The worked answer is shown immediately, the input becomes read-only and only Continue remains. "Ask for a hint" never appears, even though each question has 2–3 authored hints. The walker saw this on every one of about 250 wrong answers across all 18 courses. Answers the grader cannot read (B2) are the exception: they keep the input open and do show hints.
- **Expected:** at least one retry with a hint before the reveal, which is what `hintCount` and the hint ladder exist for.
- **Location:**
  - `apps/web/src/journey/quiz-shared/use-attempt.ts:84-87` fetches lesson feedback after every graded attempt;
  - the `StoryStageView.tsx` `CheckStep` hint condition `!attempt.lessonFeedback`;
  - `LessonQuestion.tsx`, where `readOnly={attempt.lessonFeedback !== null}`;
  - `use-attempt.ts:140`, where `ready` becomes true on `reviewRequired`.
- **Shell fix:** a single attempt policy (try → hint → retry → reveal) in `use-attempt`, shared by steps and quizzes.

### M1 — The diagram gives the answer away

| Example | Screenshot | What shows |
|---|---|---|
| Maths L1 step 1 | `01-…` | The number machine shows output **7** for "For x = 2, what is x + 5?" |
| Maths L1 steps 3–4 (`bindAnswer`) | — | The balance and machine act as a live checker: slide until "=" turns green |
| Astronomy turning-sky step 1 | `03-…` | The "Read given values" cards show "Celestial pole altitude **52°**", which is the asked value |
| Geometry measuring-turns steps 2–3 | `09-…` | The case chips read "**112°** on a line" and "**220°** around" |
| Chemistry what-makes-an-element step 3 | `10-…` | The atom panel lists "**7 electrons**" for "how many electrons?" |
| SQL rows-and-keys step 4; join-matching-rows step 1 | `08-…`, `06-…` | The query result shows `customer_count 5` and "6 rows" for "how many rows?" |

A bundle scan found 21 more step diagrams whose labels contain the numeric answer, in astronomy, biology, calculus, economics, engineering, English, physics and psychology. Some are coincidences.

Location: per-diagram components in `apps/web/src/journey/activities/*Diagram.tsx` and `LearningDiagram.tsx` (NumberMachine around line 90; `showResults` is honoured by some diagrams only).

Shell fix: a contract that every diagram masks the asked quantity until `answered`. The placement check already does this well: its diagram shows "?" (`27-course-check-1440.png`).

### M2 — The step title is louder than the question

- **Measured:** `.story-title` is 26 px at weight 720. `.step-question` is 17 px at weight 450 and is an `h2`.
- **Other stage types:** the skills-check question is a 22 px bold `h1` (`23-skills-check-hierarchy.png`). The review prompt is about 32 px (`21-review-card-hierarchy.png`). The placement check uses a bold `h1` question.
- **The titles themselves:** many are cryptic labels, such as "One letter, one value", "Pairs and sets", "Near, not at" and "Follow one line". They read as noise because the explanation they head is stripped (B1).
- **Location:** `StoryStageView.tsx` (`h1.story-title` around line 338; `h2.step-question` in `CheckStep`); `styles/brilliant.css`.
- **Shell fix:** make the question the primary heading in every stage type, demote the step title to an eyebrow, and use one type scale.

### M3 — Steps open scrolled, hiding the question

- **Screen:** `/courses/engineering-structures-and-machines/lessons/supported-beam` at 1440×900 (`05-question-hidden-under-header-1440.png`). Also SQL (`06-…`) and probability at 1024 (`07-prescrolled-1024.png`).
- **Measured:** `main.stage-canvas` has `scrollTop` 159. The title is at −31 px and the question at 18 px, under the 64 px header. The Value box is half under the fixed footer. After a wrong answer at 390 and 1024, the title and question scroll fully off-screen (`17-wrong-answer-390.png`).
- **Cause:**
  - `StoryStageView.tsx:22-30` and `:296-315`: `bringIntoView` uses `block: "center"` on the whole step `<li>`, which pushes the top of any step taller than the canvas off-screen. That applies to every Continue in production.
  - The "skip first paint" guard is defeated by StrictMode's double effect in dev.
  - `CheckStep` also scrolls the form into view on each result (`:75`).
- **Shell fix:** scroll to the step's top (`block: "start"` with header offset), and reserve footer height in the canvas padding.

### M4 — A transient error ends the lesson

- **Screen:** `18-dead-end-error-screen.png`. During two dev-server restarts, a lesson in progress was replaced by "This lesson is unavailable — The request failed with status 502". The screen had no header, no retry, no way back to the course, and the learner's step position was lost. One step also rendered blank under confetti (`33-blank-step-during-restart.png`).
- **Location:** `LessonJourneyScreen.tsx` (`if (journey.error || !journey.data)`). A failed refetch after `invalidateQueries` in `complete()` replaces data that had already loaded. `ui/Feedback.tsx` `ErrorScreen` offers no action.
- **Shell fix:** keep stale data on refetch errors, show an inline retry, and always render the stage header with its exit.

### M5 — Wrong-answer feedback is unclear and celebratory

- **Unclear verdict:** after a wrong answer the footer shows the mascot and an amber "Here's the idea.". Nothing says the answer was wrong. The chosen choice gets an amber border and the correct choice is not highlighted (`19-quest-toast-on-wrong-answer.png`).
- **Celebrations on failure:**
  - The same wrong answer fired a "QUEST COMPLETE · XP hunter" toast and confetti over the question.
  - The review shows "Not quite. Here's the explanation." in success green (`20-review-not-quite-in-green.png`).
  - Completion after 0/6 still shows a gold star, a tick, confetti and "Lesson XP 62" (`22-completion-celebrates-zero-correct.png`).
- **Location:** `journey/quiz-shared/QuestionFeedback.tsx`, `AnswerInput.tsx` (no `choice-card-correct` reveal on a wrong answer), `game/` quest toasts, `review/Flashcard.tsx`, and `stages/CompletionStageView.tsx` (`lessonStars`, `Celebration`).

### M6 — Free-text grading rejects right answers

- **Maths L1 quiz 2** asks "In x + x, do the two letters represent the same value or different values?". Its accepted ideas are `same` and `value`.
  - Marked **wrong:** "They are the same", "Same." and "Both letters stand for one number".
  - Marked **right:** "the value is the same".
- **Effect:** because of B3, the first such answer is final.
- **Location:** `packages/assessment-engine/src/text.ts` (coverage ≥ 0.6 of literal phrase matches) and the authored `acceptedIdeas` for 174 free-text questions.

### M7 — Controls with no stated purpose

- Maths "how-steep-is-it" and "a-point-is-a-pair" have "Explore x = 0 / Explore y = 0" sliders that move a dot unrelated to the question.
- In maths "keeping-the-balance", the "Try x =" slider sits beside a multiple-choice question about the first move (`11-…`).
- Logic L1 shows a "p: True" toggle and a p True/False table beside "Which sentence makes a claim?" (`25-logic-unexplained-controls.png`).
- Linear algebra shows "Example / Compare" chips.
- Every one of these was explained in the stripped step prose (B1).

### M8 — The phone layout breaks with the new workbench

- **Screen:** 390×844 with the Calculator open (`15-calculator-sheet-covers-question-390.png`).
- **What happened:** the bottom sheet takes about 60% of the height. The diagram is clipped to three grid rows and "Check answer" floats over it.
- **Header without the bench** (`14-lesson-390.png`): course and lesson titles are gone. Five icon-only tools wrap to a second row, and only `title` attributes explain them.
- **At 1024** (`16-calculator-1024.png`): the lesson title truncates to "A point is a p…" and the tab icons render at about 6 px.

### M9 — Invisible text in diagrams (dark theme)

- **Screen:** `/courses/maths-foundations/lessons/keeping-the-balance` (`11-balance-white-on-white-and-working.png`). The right pan of the balance is a blank white box; its "18" is white-on-white.
- **Cause:**
  - `brilliant.css:976` forces every `.learning-diagram text` to `var(--ink)`.
  - The dark remap at `:1427-1437` only lists `#f1f4f2 #f1f4f1 #f4f6f4 #f7f9f7 #f1f4f3 #e4f5e9 #e8f5ec`.
  - `EquationBalance` uses `#f1f3f1` for the right pan and `#edf1ed` for the fulcrum (`LearningDiagram.tsx` around line 205).
- **Other light fills with no remap:**

  | File | Colours |
  |---|---|
  | `AstronomyDiagram.tsx` | `#dfe8ff #e8e6e1 #e9e6dc #fbf8ee #ffe6c2 #fff6e0` |
  | `ChemistryDiagram.tsx` | `#e5edff #e7eef6` |
  | `EngineeringDiagram.tsx` | `#dfe7ef` |
  | `LearningDiagram.tsx` | `#e4e9e5` |
  | `PsychologyDiagram.tsx` | `#d9fffb` |

- **Shell fix:** diagrams take colours from tokens, not hex literals remapped by attribute selector.

### m1 — Read-aloud and sound controls

- **At 13:24:** two identical speaker icons sat top right. "Read the question" (`Volume2`) and the sound toggle (`Volume2`/`VolumeX`) were positioned with magic margins (`brilliant.css:655-660, 1607-1643`), and neither had a visible label (`01-…`).
- **By 13:28 (lead's rebuild):** they read "Read aloud" and "Sound", which fixes the reported confusion.
- **Remaining:**
  - Below 1440, or with the bench open, they fall back to a waveform icon and a speaker icon.
  - "Read aloud" speaks only `question.prompt`. It does not read the step title, the choices or the diagram, so a multiple-choice question is read without its options.
  - The review card has its own "Read the card", making three audio controls on one screen (`21-…`).
- **Location:** `LessonJourneyScreen.tsx` (`ReadAloudButton text=`), `ui/ReadAloud.tsx`, `study/LessonSoundToggle.tsx`.

### m2 — Working panel (new, replaces the separate notebook route)

- **Fixed:** the notebook no longer leaves the lesson. "Working" opens a 490 px split panel beside the lesson.
- **Typed working is not autosaved.** After typing, the panel showed "Unsaved changes" and a reload lost the text (`30-working-unsaved.png`).
- **Wrong placeholder:** the typed-working placeholder is "Set the problem out in steps. I = V / R / I = 5 / 100" in every course, including maths.
- **Esc** does not close the bench.
- **Tutor tab:** it has its own ✕ beside the bench's ✕ (`13-tutor-double-close.png`). The mock tutor reply in a logic lesson was about Ohm's law, which is fixture text but worth replacing.
- **Location:** `apps/web/src/workbench/Workbench.tsx`, `notebook/*`, `tutor/TutorPanel.tsx`.

### m3 — Calculator (new)

These evaluate correctly (`12-…`, `31-…`):

| Input | Result |
|---|---|
| `2+3*4` | 14 |
| `sin(30)` | 0.5 |
| `2^10` | 1024 |
| `5!` | 120 |
| `(1+2` | "Expected ')'" |
| `1/0` | "Division by zero." |

Problems:

- "Use in answer" without first clicking the answer box says "Click the lesson's answer box once, then press Use in answer again."
- After an error, "Use in answer" inserted the previous result (120) while the display showed the erroring expression.
- The calculator is offered in English, philosophy and logic.

Location: `workbench/Calculator.tsx` around line 152 and `workbench/answer-target.ts`.

### m4–m10, p1–p4

The table above gives enough detail to act on them. Locations:

| Finding | Location |
|---|---|
| m4 | `CompletionStageView.tsx` (the heading is `stage.title`, the same in every bundle) |
| m5 | `ReviewStageView.tsx`, `review/Flashcard.tsx` |
| m6 | `AnswerInput.tsx` (label "Value", placeholder "Number or fraction"); the disclosure labels in each `*Diagram.tsx` |
| m7 | `activities/LinearAlgebraDiagram.tsx` |
| m8 | `AnswerInput.tsx` (`aria-pressed` buttons in a `fieldset`); the slider `Control` labels; `StageHeader.tsx` (`ComboMeter`, `HudXp`) |
| m9 | `StoryStageView.tsx` `CheckStep` renders `{question.prompt}` raw |
| m10 | the assessment-engine unit table |
| p1 | `.numeric-answer` |
| p2 | `brilliant.css:630-638` |
| p3 | `english-reading-writing-and-rhetoric/bundle.json` (clause-anatomy) |
| p4 | `home/CourseRoadmap.tsx` |

## Course coverage

All 18 courses: astronomy, biology, calculus, chemistry, CS, economics, engineering, English, geometry, linear algebra, logic, maths, philosophy, physics, probability, psychology, Python and SQL.

- **Lessons:** the first and middle lesson of each course were walked to completion, apart from the four first-lesson walks noted below. That covers explainer, quiz, review and completion stages, with wrong answers and the correct answer.
- **Errors:** no console or page errors other than 502s from server restarts.
- **Lessons that could not be completed as a learner would:**
  - Astronomy and economics needed the unit box cleared (B2).
  - Maths L1, economics L1, CS L1 and engineering L1 were interrupted by restarts and re-run.
- **Course checks, SQL project and Python project** opened and started cleanly at all three sizes, with no overflow (`27-`, `28-`). They are visually the most coherent screens in the product and are a good model for the lesson shell.
- **Philosophy** (`32-philosophy-good-example.png`) is the strongest lesson diagram: a passage, a "highlight indicator words" toggle and a map view, all explained by labels.

## Foundation: shell fixes and course-content fixes

**A shared fix in the lesson shell would solve:**

1. **Teach before asking (B1, M2, M7).** A lesson intro beat, plus step prose shown before or alongside the question. The question becomes the primary heading in every stage type, with one type scale.
2. **One attempt policy (B3, M5).** Try, then hint, then retry, then reveal, in `use-attempt` for steps, quizzes and reviews. There should be an explicit wrong verdict, the correct choice should be marked, and no celebration on wrong answers.
3. **Answer input (B2, m6, p1).** The unit is a fixed suffix or tolerant field. Labels and placeholders depend on the subject, and the input is centred.
4. **Diagram contract (M1, M9).** The asked quantity is masked until answered, colours come from theme tokens, and "Read given values" is one consistent, explained disclosure.
5. **Scroll and layout (M3, M8).** The top of each step is pinned under the header, the footer height is reserved, and a responsive workbench never covers the question at 390 px.
6. **Resilience (M4).** Stale data survives refetch errors, failures show an inline retry, and the header and exit are always present.
7. **Tools (m1–m3).** Read-aloud reads the title, question and choices. There is one audio control per screen. Working autosaves, Esc closes the bench, there is a single close button, and the calculator only appears where it is useful.

**Fixes needed per course, in the content:**

- Answers baked into diagram labels and computed panels: geometry case chips; chemistry atom counts; SQL result tables; the astronomy "given values"; the 21 label hits.
- Step titles that need rewriting as plain statements of the idea once the prose is visible.
- `acceptedIdeas` that are too literal for the keyword grader (M6).
- Unit strings outside the parser's vocabulary (B2), if the engine is not widened.
- Linear-algebra plot scale and labels (m7).
- English quotation mismatch (p3).
- Subject-specific placeholders: Working's "I = V / R" and the mock tutor's fixture text.
