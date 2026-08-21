# Discere Reference Lesson Recovery Specification v2

Status: **implementation reference for Sol**  
Reference subject: **The Roman Empire**  
Reference viewport: **1440 × 900**  

## 1. Purpose

The current repository contains useful backend foundations, while the learner experience is still provisional. The present lesson flow mechanically expands one paragraph, one activity, and one question into explainer, visual, quiz, essay, review, and completion screens. This produces a complete route structure without a complete learning experience.

This specification resets the product around one carefully authored Roman Empire reference lesson. Build it well before extracting more generic components or expanding electronics.

The target outcome is simple:

> A learner should understand what they are looking at, know what to do next, learn something substantive, and enjoy moving through the lesson.

## 2. Keep these existing systems

Retain and reuse the following where their behaviour is sound:

- local Fastify and SQLite architecture
- learner-safe server payloads
- server-owned answer authority
- Coach, Assisted, Direct, and Exam permissions
- attempt and journey persistence
- answer-reveal friction
- transfer-recovery records
- essay draft persistence
- review session persistence
- deterministic visual boundaries
- prose-quality checks
- provider-neutral ChatGPT companion
- setup, build, tests, and smoke-test infrastructure

The learner interface may be replaced extensively. Preserve the current implementation through `/legacy` or a git tag until the recovery is approved.

## 3. Defects that must not survive

### Mechanically assembled lessons

A lesson must be authored as a sequence of ideas. Each stage needs a distinct instructional purpose and enough content to fulfil it.

### Fake choices

Different labels must produce different behaviour. `Continue` and `Try the question first` cannot call the same function.

### Incorrect interaction authority

Every interactive result must be derived from the actual before-and-after state. Never hard-code one prediction as universally correct while several variables can change.

### Placeholder controls

Do not display disabled editor buttons, empty tabs, non-functional icons, `coming soon` actions, or controls that imply unsupported behaviour.

### Participation recorded as correctness

Typing any text is not evidence of recall. Review evidence must distinguish correct, partly correct, revealed, and unassessed responses.

### Internal product language

Do not expose phrases such as:

- Interactive visual
- Learner-safe
- Source-backed card
- Spaced review
- Local-first learning
- Current mastery
- Recovery task
- Review scheduled
- Build the idea
- Check your understanding
- Return through review

Show the subject, the question, and the learner's action.

### Placeholder iconography

Replace Unicode symbols such as `⌂`, `▣`, `□`, `◇`, and `☆` with a consistent icon set. Use `lucide-react` or a comparable outline set with accessible names and tooltips.

### Visual completion without screenshots

No UI round is complete until desktop, tablet, and mobile screenshots have been compared with the committed references.

## 4. Reference files

The approved screen renders live in:

```text
docs/recovery-v2/reference/
```

Expected files:

```text
00-course-home.svg
01-opening-challenge.svg
02-augustus-explainer.svg
03-expansion-map.svg
04-understanding-check.svg
05-essay-studio.svg
06-review-card.svg
```

These files define composition, hierarchy, density, colour, icon placement, and copy economy. They are implementation references rather than loose inspiration.

## 5. Information economy

Every visible word must do work.

A screen may contain:

- one subject-facing title
- one short orientation line when useful
- the task, evidence, or explanation
- one primary action
- a limited set of utility actions

The interface must not name the same thing twice.

### One concept, one label

Bad:

```text
FLASH CARDS / SPACED REVIEW
Review
Roman Empire review card
```

Good:

```text
Why does Roman imperial history continue after 476 CE?
```

The card, progress, and rating controls already communicate review.

Bad:

```text
QUIZ / CHECK UNDERSTANDING
Check your understanding
Question 2 of 4
Which event...?
```

Good:

```text
2 / 4
Which event...?
```

Bad:

```text
ESSAY TOPIC / WRITE & SUBMIT
Essay topic
What mattered more...?
```

Good:

```text
What mattered more...?
```

### Do not repeat navigation context

The shell may show the course and lesson once. The page title describes the current idea.

```text
Shell: The Roman Empire / From Republic to Empire
Page: How Augustus changed Rome
```

Do not add another `Roman Empire`, `Lesson 2`, or `Explainer` heading in the body.

### Use icons for obvious utilities

Use icon buttons with tooltips for:

- read aloud
- sources
- tutor
- fullscreen
- notes
- settings

Do not place long utility labels beside every page title.

### Default copy limits

| Element | Default limit |
| --- | --- |
| Page title | 8 words |
| Orientation | 18 words |
| Primary button | 3 words |
| Secondary action | 5 words |
| Feedback body | 45 words |
| Explainer | 120–220 words |
| Highlight | 24 words |
| Review front | 18 words |
| Review back | 55 words |
| Essay instruction outside prompt | 30 words |

Longer text is allowed when the material requires it. It must be intentionally structured.

### Remove meta narration

Avoid:

- `In this lesson, you will learn...`
- `This interactive visual shows...`
- `Now it is time to test your understanding...`
- `Congratulations, you completed...`
- `The key takeaway is...`

Present the content itself.

### Do not repeat feedback

Bad:

```text
Correct!
You are correct.
Augustus is the correct answer.
```

Good:

```text
Augustus received exceptional powers in 27 BCE, the conventional start of imperial rule.
```

The check icon and green state already communicate correctness.

## 6. Visual language

### Palette

```css
--canvas: #ffffff;
--canvas-soft: #f7f9f7;
--ink: #121513;
--text: #3d443f;
--muted: #6d756f;
--line: #e3e8e4;
--green: #0b8f3c;
--green-dark: #087733;
--green-soft: #eaf7ee;
--black: #0a0c0b;
--error: #a83224;
```

Orange and beige from the legacy learner UI do not appear in the recovered flow.

### Typography

Use a modern sans-serif:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Target sizes at 1440 px:

- title: 36–46 px
- question: 30–38 px
- body: 17–19 px
- labels: 12–14 px
- buttons: 14–16 px

### Iconography

Recommended Lucide mappings:

| Action | Icon |
| --- | --- |
| Home | `Home` |
| Courses | `BookOpen` |
| Review | `RefreshCcw` or `Brain` |
| Notebook | `NotebookPen` |
| Settings | `Settings` |
| Read aloud | `Volume2` |
| Sources | `Library` |
| Tutor | `MessageCircleQuestion` |
| Fullscreen | `Maximize2` |
| Previous / next | `ChevronLeft` / `ChevronRight` |
| Correct | `Check` |
| Timeline | `Clock3` |
| Map | `Map` |
| Drag | `GripVertical` |

Icon-only controls need an accessible name, keyboard focus, tooltip, and at least a 40 × 40 px target.

### Pictures and diagrams

Prefer a useful image to an explanatory label.

- show Augustus rather than a card labelled `Historical figure`
- show territory rather than a paragraph describing extent
- show east/west division rather than a `Division` panel with bullets
- show evidence thumbnails beside the essay rather than internal source IDs

Visual order:

1. accurate interactive visual
2. accurate deterministic diagram
3. licensed museum, archive, or open-media image
4. reviewed generated illustration when no appropriate source exists

Generated images never define territory, chronology, circuit topology, equations, or exact labels.

### Border budget

One task surface may have one boundary. Its children are separated by whitespace.

Allowed borders:

- answer choices
- central review card
- editor
- true modal or drawer
- selected evidence item

Avoid cards inside cards, bordered labels, bordered statistics, and containers around two lines of text.

Ask during review:

> Can spacing replace this border?

If yes, remove it.

## 7. Shell

### Desktop rail

Width: 64–72 px. Icons only:

- Discere
- Home
- Courses
- Review
- Notebook
- Settings

The active destination uses green. The rail never expands during a lesson.

### Header

Height: 56–68 px. Contains:

- course
- lesson
- stage progress
- read, sources, and tutor icons where allowed

Do not show XP, streak, mastery, assurance level, model status, or server status during every stage.

### Footer

Height: 68–76 px. Contains:

- Back
- compact journey progress
- Next

Use `Next`, since the content and progress already communicate the destination.

### Mobile

Below 640 px:

- replace the rail with a compact top bar
- keep a sticky bottom action area
- move utilities into overflow
- prevent horizontal scrolling

## 8. Reference course

Course:

```text
The Roman Empire
```

Subtitle:

```text
Power, expansion, and division
```

Promise:

```text
See how Rome changed from Augustus to the western deposition in 476 CE.
```

The learner should be able to:

- order major turning points from Augustus to 476 CE
- explain how Augustus changed Roman government
- identify maximum territorial extent under Trajan
- describe systems used to govern a large empire
- explain the third-century crisis
- describe Diocletian's administrative response
- distinguish western collapse from eastern continuation
- support a historical claim with evidence

### Suggested visual sources

Store attribution and licence with every production visual.

- Augustus of Prima Porta: `https://commons.wikimedia.org/wiki/File:Augustus_of_Prima_Porta_(inv._2290).jpg`
- Roman Empire in 117 CE: `https://commons.wikimedia.org/wiki/File:Roman_Empire_117_AD.jpg`
- Roman roads: `https://commons.wikimedia.org/wiki/Roman_road`
- Four Tetrarchs: `https://commons.wikimedia.org/wiki/File:Venice_%E2%80%93_The_Tetrarchs_01.jpg`

The committed SVGs use simplified vector art for a self-contained composition reference. Production visuals require reviewed data or licensed assets.

## 9. Stage content

### 1 — Opening challenge

Reference: `01-opening-challenge.svg`

Title:

```text
Put these turning points in order
```

Orientation:

```text
Start with your best guess. You will revisit it at the end.
```

Visual tiles:

1. Augustus — 27 BCE
2. Largest extent — 117 CE
3. Empire divided — 395 CE
4. Western emperor removed — 476 CE

Behaviour:

- drag and keyboard ordering
- `Check order` compares the whole sequence
- no mastery is recorded from this pretest
- `Skip for now` continues without judgement
- the correct sequence appears after submission

### 2 — Augustus

Reference: `02-augustus-explainer.svg`

Title:

```text
How Augustus changed Rome
```

Orientation:

```text
A new political system emerged from decades of civil war.
```

Approved copy:

> In 27 BCE, Octavian received the title Augustus. Republican offices still existed, but Augustus controlled the army, major provinces, and the direction of government.
>
> His settlement reduced open competition among powerful commanders. It also concentrated authority in one ruler, creating the political structure later emperors inherited.

Highlight:

```text
Augustus kept republican forms while holding the powers that made him the dominant ruler.
```

Visual:

- large coin, bust, or Prima Porta sculpture
- timeline: 44 BCE, 27 BCE, 14 CE
- source attribution in a drawer

Do not display `Explainer`, `Key takeaway`, or another title above the copy.

### 3 — Expansion

Reference: `03-expansion-map.svg`

Title:

```text
How far did Rome spread?
```

Orientation:

```text
Move through time, then answer the prompt.
```

Map milestones:

- 27 BCE
- 117 CE
- 284 CE
- 476 CE

Prompt:

```text
What changed between 27 BCE and 117 CE?
```

Expected idea: Roman territory expanded substantially and reached its greatest extent under Trajan in 117 CE.

The map is the dominant object. Labels and legend stay sparse.

### 4 — Governing territory

Title:

```text
How did Rome govern so much territory?
```

Interactive systems diagram:

- provinces
- roads and sea routes
- army and frontiers
- taxation and administration
- local elites and cities

The learner traces two connections between Rome and a province. Avoid implying one uniform system governed every place identically.

### 5 — Crisis and reform

Title:

```text
Why did the third century become unstable?
```

Use a causal network rather than a forced list of three causes. Evidence may include imperial turnover, civil war, frontier pressure, disease, disrupted taxation, and breakaway states.

The learner builds two defensible causal chains. Follow with Diocletian's administrative response without presenting it as a simple permanent solution.

### 6 — East and west

Title:

```text
Why did east and west grow apart?
```

Use a map and timeline for 284, 330, and 395 CE. Include Constantinople and the Tetrarchs visual.

### 7 — Questions

Reference: `04-understanding-check.svg`

Do not display `Quiz` or `Check your understanding` as a heading.

Reference question:

```text
Why is 476 CE an incomplete date for the end of Rome?
```

Correct idea:

```text
It marks a western political change while Roman government continued in the east.
```

Feedback:

```text
476 CE is useful for the western court. The Eastern Roman Empire continued from Constantinople.
```

Also include one ordering item, one map-reading item, and one two-sentence free response.

### 8 — Essay

Reference: `05-essay-studio.svg`

Prompt:

```text
What mattered more to Rome's transformation: its size or its political conflicts?
```

Instruction:

```text
Make a claim. Use three pieces of evidence. Address one complication.
```

Required:

- large editor
- optional claim and outline tools
- evidence rail with image, date, and one-sentence evidence summary
- autosave
- word count
- readable rubric
- submission
- feedback tied to excerpts from the learner's writing

Do not display internal source IDs. Do not show disabled toolbar controls.

Evidence cards should cover Augustus, 117 CE, the third-century crisis, Tetrarchy, Constantinople, and 476 CE.

### 9 — Completion

Show only:

- three ideas demonstrated
- one idea scheduled for review
- independent and assisted evidence separately
- Continue course
- Home

No confetti, statistics wall, or congratulatory paragraph.

### Later review

Reference: `06-review-card.svg`

Do not use `Flash Cards`, `Spaced Review`, or `Review` as the main heading.

Front:

```text
Why does Roman imperial history continue after 476 CE?
```

Back:

```text
The western emperor was removed in 476 CE, while Roman imperial government continued from Constantinople in the east.
```

Rules:

- non-empty text does not automatically count as correct
- correctness and confidence are separate
- reveal without a correct attempt is assisted evidence
- ratings change scheduling; they do not override correctness
- `Easy` cannot turn a revealed or incorrect answer into independent mastery

## 10. Sol implementation gates

Sol must not implement the whole product in one pass.

### Gate 0 — Audit

- run current validation
- identify reusable backend contracts
- list learner-facing code to replace
- preserve the current version through `/legacy` or a tag

### Gate 1 — Static first half

Implement only:

- shell
- course home
- opening challenge
- Augustus explainer
- expansion map

Fixture data is acceptable.

Commit screenshots at:

- 1440 × 900
- 1024 × 768
- 390 × 844

Create `docs/recovery-v2/visual-comparison.md`, documenting deviations and defects. Stop for George's approval.

### Gate 2 — Functional first half

After visual approval:

- connect routing and persistence
- make ordering and map interaction functional
- add source drawer
- add accessibility equivalents
- preserve refresh and browser navigation

Stop for approval.

### Gate 3 — Assessment

Add one-question screens, selection, ordering, free response, mode-governed assistance, and specific feedback. Stop for approval.

### Gate 4 — Essay

Add evidence, drafts, rubric, submission, and revision. Stop for approval.

### Gate 5 — Review

Add authorised review with real correctness assessment. Do not reuse the current non-empty-text logic. Stop for approval.

### Gate 6 — Generalise

Only after the Roman reference lesson is accepted:

- extract reusable stage components
- adapt electronics
- add courses
- expand agent work

## 11. Hard visual rejection criteria

Reject a screen when any are true:

- repeated headings name the same task
- stage type is a large title
- internal product terminology is visible
- Unicode placeholder icons remain
- borders merely group adjacent text
- multiple primary actions compete
- text dominates where a visual could teach the idea
- the main task begins below the fold at 1440 × 900
- mobile requires horizontal scrolling
- the visual is decorative or factually misleading
- the page resembles an admin dashboard
- a visible control is non-functional

## 12. Acceptance criteria

The reference implementation is accepted when:

1. The first five screens closely match the SVG composition.
2. Every visible control works.
3. Course, lesson, and stage names are not repeated.
4. The ordering challenge works with mouse and keyboard.
5. The Augustus stage teaches a substantive relationship.
6. The expansion map uses controlled accurate data.
7. Source and licence information are available without dominating the page.
8. Refresh restores the current stage.
9. Back and forward work.
10. Questions support free response as well as selections.
11. Feedback is specific and contains no automatic praise.
12. Essay evidence is readable and visual.
13. Review correctness is separate from confidence.
14. Answer authority remains server-side.
15. Tutoring modes remain server-enforced.
16. The writing gate runs on generated learner content.
17. Desktop, tablet, and mobile screenshots are committed.
18. Playwright covers the approved first-half journey.
19. `pnpm check`, `pnpm build`, and smoke tests pass.
20. George approves the renders before generalisation.

## 13. Final instruction

Build the reference lesson as a product designer and educator would, then extract engineering abstractions to support it. Do not begin with generic stages and pour thin content into them. The authored learner experience is the source of truth.
