# Discere Interactive Story UI/UX Specification v1

Status: **Approved direction; implementation-ready**  
Approved: 17 August 2026  
Primary visual direction: **Interactive Story**  
Palette: **white, black, and green**  
Supersedes the visual-direction section of `docs/learning-experience-redesign-draft.md`.

## 1. Authoritative interpretation of the approved mockup

The approved image is a **comparison board showing five separate learner screens**. It is not a single dashboard.

The product must render these as separate routed stages:

1. Explainer
2. Interactive visual
3. Quiz or understanding check
4. Essay studio
5. Flashcards and spaced review

Only one stage is dominant at a time. A learner moves through a lesson as a sequence of screens. Shared navigation, lesson progress, and lightweight account status remain consistent between screens.

Do not place the explainer, map, quiz, essay editor, notebook, ChatGPT handoff, sources, and review cards in one long page. That structure is the main problem this redesign is intended to fix.

## 2. Product outcome

Discere should feel like an authored interactive course. The learner should always know:

- the question or idea being learned
- the action expected on the current screen
- what changed after their action
- how to continue

The experience should have the active learning rhythm associated with Brilliant while retaining Discere's broader subject range, open responses, essay work, source provenance, accountability modes, notebook support, and ChatGPT companion.

The overall rhythm is:

```text
Encounter a question
        ↓
Make an attempt or prediction
        ↓
Inspect a useful visual
        ↓
Receive a concise explanation and specific feedback
        ↓
Apply the idea in a changed case
        ↓
Explain or write in the learner's own words
        ↓
Return later through spaced review
```

The research basis and learning rationale remain in `docs/learning-experience-redesign-draft.md`. This document defines the approved product behaviour and presentation.

## 3. Design goals

### 3.1 Focus

Each screen has one dominant task. Secondary tools remain available through small actions, drawers, or dedicated screens.

### 3.2 Visual meaning

Maps, timelines, diagrams, graphs, artefacts, passages, simulations, and illustrations must carry instructional meaning. Decorative imagery cannot replace an explanation or assessment.

### 3.3 Natural prose

Explanations, questions, feedback, essay prompts, and flashcards must pass the Discere writing pipeline. Learner-facing copy should avoid:

- negative parallelisms such as “It is not X; it is Y”
- “not only … but also” constructions
- forced groups of three
- canned praise
- ceremonial introductions and conclusions
- excessive headings
- decorative em dashes
- repeated sentence patterns
- vague claims that are absent from the source map

### 3.4 Mature restraint

The UI may use progression, XP, streaks, mastery, and review scheduling. These indicators should support continuity without turning every interaction into a reward animation.

### 3.5 Broad subject support

The shell must support history, engineering, mathematics, physics, English, philosophy, biology, computing, and other domains. Subject-specific learning happens through trusted stage and activity types.

## 4. Explicit non-goals

This redesign does not require:

- a video-first course model
- a social feed
- a public leaderboard
- a large currency economy
- arbitrary model-generated React components
- decorative 3D scenes
- nested dashboard cards
- simultaneous display of every learning tool
- automated OpenAI API calls

The existing local-first and provider-neutral architecture remains authoritative.

# 5. Visual system

## 5.1 Palette

Use a restrained white, black, and green system.

Recommended tokens:

```css
--canvas: #ffffff;
--canvas-subtle: #f8faf8;
--ink: #101311;
--ink-soft: #3f4641;
--muted: #6f7772;
--line: #e1e6e2;
--line-strong: #c8d0ca;
--green: #0b8f3c;
--green-hover: #087733;
--green-soft: #e9f6ed;
--green-pale: #f4fbf6;
--black-surface: #0b0d0c;
--error: #a83224;
--warning: #946200;
--focus: #29a85a;
```

Rules:

- White is the primary canvas.
- Black carries navigation, typography, and strong contrast.
- Green marks the active state, progress, confirmation, and primary action.
- Pale green may indicate correct feedback or a selected learning state.
- Grey is limited to supporting text, inactive controls, and hairlines.
- Red appears only for genuine errors or destructive actions.
- Do not introduce unrelated accent colours for variety.

## 5.2 Typography

Use a clean sans-serif throughout the learning UI.

Preferred stack:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
```

A system-only fallback is acceptable when Inter is not bundled.

Type guidance:

- Page title: 36–52 px desktop, 30–38 px narrow screen
- Stage label: 12–13 px, uppercase, green, modest letter spacing
- Primary body: 17–19 px, line height 1.55–1.7
- Question text: 22–30 px
- Supporting labels: 13–14 px
- Flashcard prompt: 28–38 px
- Essay editor: 17–19 px

Avoid oversized display typography that pushes the learning task below the fold.

## 5.3 Spacing

Use an 8 px base scale:

```text
4, 8, 12, 16, 24, 32, 48, 64, 80
```

Generous whitespace should separate regions. Borders should not be used to compensate for weak spacing.

## 5.4 Border budget

The approved direction deliberately reduces nested bordered UI.

Rules:

1. A dominant task surface may have one perimeter border.
2. Child content inside that surface should be separated by whitespace, typography, or one hairline.
3. Never place a bordered card inside another bordered card unless the child is a genuinely independent interactive object.
4. Answer choices may use a single outline because the outline communicates selection and clickability.
5. Feedback should generally use a pale background and icon rather than another box inside the answer box.
6. Sidebars and bottom navigation use edge separation, not floating containers.
7. Do not wrap headings in title cards.
8. Do not create a panel merely to hold a label and one value.

A useful code-review question is: **Could this border be replaced by spacing?** If yes, replace it.

## 5.5 Corners and shadows

- Standard radius: 6–10 px
- Buttons: 6–8 px
- Answer choices: 6–8 px
- Large visual canvas: 0–8 px depending on subject
- Flashcard: up to 12 px

Shadows are rare.

Allowed uses:

- the central flashcard
- a modal or drawer that must sit above the current task
- a floating status message

Do not apply shadows to every section.

## 5.6 Icons

Use a consistent thin-line icon set. Icons should support text labels rather than replace unfamiliar actions.

Do not use emoji as product icons.

## 5.7 Motion

Motion should explain state changes:

- map or diagram changes may interpolate between valid states
- answer feedback may fade or slide a short distance
- lesson progress may animate to the next stage
- flashcards may use a restrained flip or crossfade

Default duration: 140–240 ms.

Respect `prefers-reduced-motion`. The reduced-motion experience must remain complete.

# 6. Shared application shell

## 6.1 Desktop shell

The desktop shell contains:

- a 56–68 px black left rail
- a lightweight stage header or progress line
- the active stage canvas
- a 64–76 px black bottom lesson navigator

### Left rail

The rail contains:

- Discere mark
- Home
- Courses
- Review
- Notebook or saved work
- Settings/profile at the bottom

Only one destination is active. Icons are white or muted grey; the active destination uses green.

The rail must not expand by default. Tooltips or accessible labels provide names.

### Stage header

The header contains only what is needed for orientation:

- course title or short breadcrumb
- stage type
- stage progress, for example `3 / 12`
- optional close or exit action during assessment

XP, streak, and mastery may appear on the course home. They should not occupy the main stage header during every task.

### Bottom lesson navigator

The bottom bar contains:

- previous stage label on the left
- a simple stage-progress track in the centre
- next stage label on the right

The learner may return to completed stages. Forward movement follows stage completion rules.

The navigator stays visually quiet until the learner reaches the decision point at the end of the current stage.

## 6.2 Tablet shell

- Left rail may collapse to a top-left menu button.
- Bottom navigator remains.
- Visual and text can use a 55/45 split or stack according to available width.

## 6.3 Mobile shell

- No permanent left rail.
- Use a compact top bar with back, course title, and progress.
- Use a sticky bottom action area for the primary action.
- Lesson-stage progress appears as a thin line or compact dots.
- Content stacks into one column.
- Essay evidence and sources open as full-height sheets.

# 7. Navigation and routing

Use real routes so refresh, browser navigation, deep linking, and progress restoration behave predictably.

Recommended routes:

```text
/
/courses
/courses/:courseId
/courses/:courseId/lessons/:lessonId
/courses/:courseId/lessons/:lessonId/stages/:stageId
/courses/:courseId/lessons/:lessonId/essay/:essayId
/review
/review/session/:sessionId
/notebook
/settings
```

The lesson overview route may redirect to the first incomplete stage.

## 7.1 Stage completion

A stage is one of:

- `available`
- `active`
- `completed`
- `skipped_optional`
- `locked`

The learner can revisit completed stages without earning duplicate mastery evidence unless the stage explicitly creates a fresh assessment attempt.

## 7.2 Persistence

Persist:

- active course and lesson
- active stage
- stage completion
- formative responses
- assessment attempts
- essay drafts
- review session state
- assistance usage
- visual interaction state when pedagogically useful

A browser refresh must restore the current stage without exposing hidden answer data.

# 8. Standard lesson journey

A lesson is a sequence of stages. A typical lesson should use 5–9 stages rather than forcing every stage type into every lesson.

Suggested sequence:

```text
1. Hook or prediction
2. Concise explainer
3. Interactive visual
4. Understanding check
5. Second explainer or worked example
6. Transfer task
7. Short teach-back or essay bridge
8. Completion summary
9. Scheduled review, delivered later
```

Essay work can be part of a lesson, an end-of-unit task, or an optional deep-study branch.

Flashcards normally belong to the review system. A lesson completion screen may preview the concepts that will return later.

# 9. Screen specifications

## 9.1 Explainer screen

### Purpose

Introduce one relationship or answer one concrete question.

### Desktop layout

Use a two-column composition when a visual is useful:

```text
Left: 38–44% explanation
Right: 56–62% visual or source
```

Use a centred single column when the subject is primarily textual.

### Required elements

- stage label
- progress
- direct title
- one-sentence orientation
- explanation, usually 150–350 words
- one useful visual, source excerpt, or worked example
- one primary action
- optional low-emphasis secondary action such as `Try the question first`
- read-aloud control

### Content structure

Use short paragraphs. Definitions should appear next to the relevant word through a tooltip, popover, or glossary drawer.

A single takeaway may use pale green background without a surrounding border. It should state a concrete relationship rather than repeat the explanation.

### Roman Empire example

Title: `The rise of the Roman Empire`

The explanation introduces Augustus, the transition from the late Republic, and the early imperial settlement. A small timeline or map remains visible beside the text.

Primary action: `Continue`

Secondary action: `Try a question first`

### Behaviour

The secondary action may jump to a linked formative question. Returning from that question restores the explainer position.

## 9.2 Interactive visual screen

### Purpose

Let the learner observe or manipulate the relationship being taught.

### Layout

The visual occupies most of the screen. Supporting text remains limited.

Recommended desktop structure:

```text
Header: title, small legend, fullscreen action
Main: visual canvas
Footer within content: timeline, sliders, filters, or direct controls
Feedback strip: appears after an action when needed
```

### Roman Empire example

An interactive map shows Roman territory at selected milestones. A timeline lets the learner move between:

- Roman Republic context
- 27 BCE
- 117 CE
- third-century crisis
- Diocletian and Constantine
- 395 CE
- 476 CE

The map may animate territorial changes. The learner can select a year and answer a prompt such as:

`What changed between 27 BCE and 117 CE?`

### Requirements

- Visual state and labels must remain factually controlled.
- A textual list must provide equivalent information for keyboard and screen-reader users.
- Retrieved imagery must retain source and licence metadata.
- Exact technical content uses deterministic SVG, canvas, or simulation data.
- Generated imagery cannot define factual boundaries, measurements, labels, or topology.
- A full-screen mode may enlarge the canvas without changing the learning state.

## 9.3 Quiz screen

### Purpose

Check understanding without crowding the learner with an entire test form.

### Layout

Use one question per screen.

Recommended width: 680–820 px.

Elements:

- compact question progress
- question text
- answer interaction
- submission action when the response type requires it
- specific feedback
- next question action

### Supported response types

- multiple choice
- multi-select
- free text
- numeric with units
- sequence ordering
- classification
- diagram or map selection
- short explanation
- matching

Multiple choice should not become the default merely because it is easy to render.

### Answer-choice styling

Choices use one outline and generous vertical spacing. The selected choice receives a green border or pale green fill. Correct feedback uses an icon and text as well as colour.

Do not wrap the entire question in a card and then wrap each answer in another card.

### Feedback

Formative feedback appears after submission and contains:

- what the response got right
- the first important issue, when present
- a concise explanation tied to the lesson
- the next action

Avoid generic praise.

### Mode behaviour

- Coach: incremental hints; final answer protected
- Assisted: stronger hints or partial structure
- Direct: answer and worked explanation available; evidence remains assisted
- Exam: no hints, sources, external tutor, or immediate feedback until submission rules permit it

### Roman Empire example

Question:

`Which event best marks the conventional transition from Republic to Empire?`

A later free-response item asks:

`Why is 476 CE an incomplete date for the end of Roman imperial government?`

## 9.4 Essay studio

### Purpose

Support planning, evidence use, drafting, submission, and revision without turning the page into a generic document editor.

### Desktop layout

Use a wide writing canvas.

Recommended structure:

```text
Top: prompt and success criteria
Main left: editor, around 65–72%
Main right: evidence and outline drawer, around 28–35%
Bottom: autosave status, save draft, submit
```

The evidence panel may collapse. On mobile it becomes a full-height sheet.

### Required capabilities

- prompt
- expected length or scope
- success criteria
- optional claim builder
- optional outline builder
- evidence/source drawer
- plain rich-text editor
- word count
- local autosave
- explicit submit action
- rubric preview
- revision feedback after submission

### Minimal editor toolbar

Include only features that support learning:

- bold
- italic
- bullets
- numbered list
- quote or evidence citation
- link when allowed

Avoid a large office-suite toolbar.

### Feedback model

Feedback is organised by rubric dimension:

- claim or thesis
- evidence
- reasoning
- factual accuracy
- clarity

Each judgement should cite the learner's own passage. The system identifies the strongest revision opportunity and the first unsupported or inaccurate claim.

Low-confidence automated evaluation must be labelled provisional.

### Roman Empire example

Prompt:

`To what extent did Rome's roads and administration contribute to the stability and success of the empire?`

Alternative argument prompt:

`Which mattered more to the empire's transformation: territorial scale or repeated political conflict?`

## 9.5 Flashcard and spaced-review screen

### Purpose

Retrieve knowledge after time has passed and update the learner's retained mastery.

### Layout

Use one item at a time.

Elements:

- due-session progress
- concept or course label
- central prompt
- reveal action
- response-quality choices after reveal
- optional concise correction
- next card

The central card may use a restrained shadow. The surrounding page should remain visually flat.

### Recall rule

The answer stays hidden until the learner attempts recall or deliberately reveals it. The interface should encourage a spoken, typed, or mental answer according to card type.

### Rating labels

Use clear terms:

- `Again`
- `Hard`
- `Good`
- `Easy`

Show short meanings in accessible help text.

### Review item types

The review queue may contain:

- standard front/back cards
- free recall
- timeline ordering
- image or map recognition
- comparison
- short causal explanation
- formula reconstruction
- diagram labelling
- changed numerical example

### Roman Empire examples

- `When did Augustus begin ruling as the first Roman emperor?`
- `What was significant about 117 CE?`
- `Put Augustus, Trajan, Diocletian, Constantinople, and the western deposition in order.`
- `Why does Roman imperial history continue after 476 CE?`

## 9.6 Lesson completion screen

### Purpose

Close the lesson, show what was learned, and establish the next useful action.

Elements:

- concise completion statement
- concepts encountered
- independent and assisted evidence shown separately
- one identified area for later review
- XP earned, with low visual priority
- next lesson
- optional essay or project
- review due date preview

Avoid confetti by default. A restrained progress animation is sufficient.

# 10. Course home and review home

## 10.1 Course home

The course home prioritises:

1. Continue learning
2. Review due
3. Explore course

The current lesson and next action occupy the primary area. The concept map is available below or through `Explore course`.

Mastery should be shown by concept. It must distinguish current success from retained performance after delay.

## 10.2 Review home

Show:

- due item count
- estimated session length
- courses contributing items
- remembered, difficult, and forgotten trends
- start review action

Do not expose answer backs in the due-card list.

# 11. Content and stage contracts

The current `LessonResponse` is built around one Ohm's-law activity. The redesign requires a generic journey contract.

Recommended conceptual model:

```ts
type LessonStageType =
  | "hook"
  | "explainer"
  | "interactive_visual"
  | "worked_example"
  | "quiz"
  | "transfer"
  | "teach_back"
  | "essay_bridge"
  | "completion";

interface LessonJourney {
  id: string;
  courseId: string;
  lessonId: string;
  title: string;
  stageOrder: string[];
  estimatedMinutes: number;
  conceptIds: string[];
  assuranceLevel: "curated" | "source_backed" | "generated" | "exploratory";
}

interface BaseLearnerStage {
  id: string;
  type: LessonStageType;
  title: string;
  conceptIds: string[];
  sourceIds: string[];
  optional: boolean;
  completionPolicy: "view" | "interaction" | "submission" | "assessment";
}

interface ExplainerStage extends BaseLearnerStage {
  type: "explainer" | "worked_example";
  body: RichLearningText;
  visual?: LearnerVisualReference;
  takeaway?: string;
  embeddedCheckId?: string;
}

interface InteractiveVisualStage extends BaseLearnerStage {
  type: "hook" | "interactive_visual";
  activity: LearnerSafeActivity;
  prompt?: string;
}

interface QuizStage extends BaseLearnerStage {
  type: "quiz" | "transfer" | "teach_back";
  assessmentSessionId: string;
  questionCount: number;
}

interface EssayBridgeStage extends BaseLearnerStage {
  type: "essay_bridge";
  essayId: string;
  promptPreview: string;
}
```

The exact schemas should use Zod in `packages/contracts`.

## 11.1 Answer boundary

Learner stage payloads must never contain:

- answer keys
- rubric authority that reveals the response
- hidden flashcard backs
- worked solutions before authorised reveal
- tutor-only source notes

The server owns answer authority and reveal permission.

## 11.2 Rich learning text

Rich text should use a constrained structured format. Do not accept arbitrary HTML from a model.

Recommended blocks:

- paragraph
- heading, limited to two levels inside a stage
- definition
- equation
- list
- quotation
- source excerpt
- callout

Every generated text field passes through `@discere/writing-engine` before storage or display.

# 12. Visual and image rules

Choose the visual class in this order:

1. interactive deterministic visual when manipulation teaches the relationship
2. deterministic static diagram or graph
3. retrieved real image, artefact, map, or source excerpt
4. reviewed generated illustration when the required visual cannot be sourced or rendered deterministically

Every visual record includes:

- learning purpose
- visual class
- source or renderer
- licence when applicable
- factual labels
- alt text
- assurance state
- review state

Generated images should usually avoid embedded text. Labels, legends, arrows, and equations should be rendered as HTML or SVG overlays.

# 13. ChatGPT companion placement

The ChatGPT companion remains available, but it should not occupy a full section in every stage.

Placement:

- a small `Ask tutor` action in the stage utility menu
- a drawer or dedicated tutor route
- unavailable in Exam mode

The companion receives the active stage context rather than the entire raw course bundle.

Coach and Assisted answer boundaries remain server-enforced. Direct mode remains assisted evidence.

Notebook-image review belongs inside the notebook or submitted-work flow, not inside the main explainer screen.

# 14. Notebook placement

The notebook is a tool, not a permanent lesson section.

Access options:

- persistent icon in the left rail
- `Open notebook` utility action on suitable stages
- automatic prompt during calculations, diagrams, and essay planning

When opened on desktop, it may appear as a side sheet or focused full screen. On mobile, use a full-screen route.

Saved notebook state remains associated with course, lesson, and stage.

# 15. Gamification placement

Use gamification to reinforce practice and return behaviour.

Allowed:

- compact XP total on home/profile
- streak on home/review
- concept mastery
- lesson completion
- workshop or collection progression later
- achievements tied to learning behaviour

Avoid:

- lives that prevent learning
- punishment for wrong answers
- large coin balances on every stage
- random reward popups
- artificial leaderboards in the personal prototype
- animations that interrupt feedback

# 16. Responsive behaviour

## 16.1 Breakpoints

Suggested breakpoints:

```text
Mobile: below 640 px
Tablet: 640–1023 px
Desktop: 1024 px and above
Wide: 1440 px and above
```

## 16.2 Explainer

- Desktop: text and visual beside each other
- Tablet: narrower split or stacked according to visual needs
- Mobile: title, visual, explanation, action

## 16.3 Interactive visual

- Preserve the largest possible canvas.
- Move legends into a collapsible row on mobile.
- Use bottom-sheet controls where sliders or filters would otherwise crowd the visual.

## 16.4 Quiz

- Keep choices full width.
- Sticky bottom submit action is permitted.
- Feedback appears inline after submission.

## 16.5 Essay

- Editor becomes full width.
- Evidence and rubric use sheets.
- Autosave status remains visible.

## 16.6 Review

- Central card fills most of the width.
- Rating buttons remain reachable without horizontal scrolling.

# 17. Accessibility requirements

The implementation must meet these requirements:

- WCAG 2.2 AA contrast targets
- visible keyboard focus
- full keyboard access to stage navigation and activity controls
- no information conveyed by colour alone
- text alternatives for every visual
- equivalent list or table for maps, charts, and timelines
- accessible names for icon-only navigation
- logical heading order
- minimum 44 px touch targets for primary controls
- no hover-only teaching content
- reduced-motion support
- screen-reader announcements for submitted answers and changing feedback
- error messages attached to the relevant field
- essay autosave that does not move focus
- flashcard reveal that announces the newly visible answer

# 18. Migration from the current interface

The current app uses one `App.tsx` page that renders most systems sequentially. Migration should happen in controlled slices.

## Phase 0 — Preserve and measure

- Keep the current experience behind a temporary `legacy` route or feature flag.
- Capture baseline tests.
- Do not remove current server guardrails.

## Phase 1 — Journey contracts and router

- Add generic learner-safe journey and stage contracts.
- Add lesson/stage routes.
- Add stage progress persistence.
- Adapt the current Ohm's-law content into the new journey format.

## Phase 2 — Shared shell and design tokens

- Implement the black rail, white canvas, green accent, compact header, and black lesson navigator.
- Replace the current beige and orange theme.
- Establish responsive layout and accessibility primitives.

## Phase 3 — Explainer and interactive visual

- Move the current explanation into its own stage.
- Move the circuit explorer into its own stage.
- Keep prediction-first behaviour.

## Phase 4 — Quiz and transfer

- Render the existing assessment through the new single-question quiz surface.
- Preserve hints, reveal friction, immutable attempts, and transfer recovery.

## Phase 5 — Essay studio

- Add essay contracts, local drafts, rubric display, submission flow, and provider-neutral review.
- Use Roman Empire sample content for visual QA if helpful, while retaining electronics as the first functional course.

## Phase 6 — Review session

- Connect the fleet's deterministic review domain to persistence, authorised answer reveal, and the new review UI.
- Support mixed review item types.

## Phase 7 — Remove legacy composition

- Remove the long-page route after the new journey passes functional, visual, and accessibility acceptance criteria.

# 19. Engineering rules

- Keep core learning behaviour outside React components.
- Keep answer authority on the server.
- Use Zod contracts for learner-safe stage payloads.
- Do not let a model produce executable UI code.
- Reuse current assessment, progression, writing, visual, tutor, and notebook packages through adapters.
- Add migrations for persisted stage, essay, and review state.
- Keep loopback-only defaults.
- Keep the no-paid-model-API boundary.
- Avoid a large state-management dependency unless the existing React Query and local component state cannot represent the flow cleanly.
- Prefer CSS variables and small layout primitives over a generic component-library visual identity.

# 20. Test requirements

## 20.1 Contract tests

- learner stage payloads omit answers
- stage unions reject unsupported activity types
- hidden review backs remain server-side
- essay rubrics do not leak model answers

## 20.2 Unit tests

- stage completion rules
- stage ordering
- route restoration
- assistance classification
- review scheduling
- essay autosave reducer or service

## 20.3 Component tests

- explainer renders one dominant task
- quiz keyboard interaction
- feedback announcements
- Exam mode restrictions
- flashcard reveal and rating
- essay autosave and evidence drawer
- notebook opening from a suitable stage

## 20.4 Browser tests

Add Playwright coverage for:

- course to lesson to stage navigation
- refresh restoration
- prediction → visual result → explanation
- quiz answer → feedback → next stage
- Coach hint and Direct answer behaviour
- Exam restrictions
- essay draft persistence
- review answer reveal
- mobile navigation
- reduced-motion mode

## 20.5 Visual regression

Capture approved reference screens at:

- 1440 × 900
- 1024 × 768
- 390 × 844

Review for:

- nested borders
- duplicated headings
- excessive containers
- weak primary-action hierarchy
- low contrast
- accidental horizontal scrolling
- large empty title regions

# 21. Acceptance criteria

The redesign is acceptable when all of the following are true:

1. Explainer, visual, quiz, essay, and review are separate screens.
2. A normal stage shows one dominant task without the current long stack of tools.
3. The palette is recognisably white, black, and green.
4. The beige and orange visual identity is removed from the approved flow.
5. Nested bordered containers are rare and justified.
6. The app shell is consistent across learning stages.
7. Stage progress survives refresh.
8. Browser back and forward work.
9. Current Ohm's-law prediction and assessment behaviour survives migration.
10. Coach, Assisted, Direct, and Exam permissions remain server-enforced.
11. Learner payloads do not expose answers.
12. Explanations pass the writing-quality gate.
13. The primary visual stays close to the explanation or task it supports.
14. Formative feedback is specific and immediate.
15. Quiz questions appear one at a time.
16. Free response remains supported.
17. The essay editor autosaves and keeps evidence available without crowding the editor.
18. Review cards reveal answers only through an authorised review state.
19. Mobile screens remain usable without desktop-sized sidebars or horizontal scrolling.
20. Keyboard and screen-reader alternatives exist for interactive visuals.
21. `pnpm check`, `pnpm build`, and the smoke suite pass.
22. New browser tests cover the core journey.
23. `README.md` explains how to run and navigate the redesigned prototype.
24. `docs/implementation-status.md` records the final migrated boundary.

# 22. Roman Empire visual QA scenario

Use the Roman Empire mockup as a design-validation scenario even if the first production content remains electronics.

The QA scenario should include:

- an explainer about Augustus and the early empire
- an interactive territorial map and timeline
- one multiple-choice question
- one short free-response question about 476 CE
- an essay prompt with evidence drawer
- a small spaced-review session

This scenario tests whether the design generalises beyond circuits and calculations.

# 23. Final implementation principle

Discere should feel like a guided sequence of meaningful learner actions. The interface should disappear behind the lesson. Whitespace, typography, a useful visual, and one clear action should do most of the work.
