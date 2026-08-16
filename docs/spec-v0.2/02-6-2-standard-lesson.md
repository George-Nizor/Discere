## 6.2 Standard lesson

Duration: 10–20 minutes.

Contains two to five concept beats based on actual content. Do not force three beats.

## 6.3 Practice set

Duration: user-selected.

Draws from weak, due, and recently learned concepts. It should mix response types.

## 6.4 Challenge

An end-of-unit applied task combining several concepts. Examples:

- diagnose a faulty circuit
- design a simple LED circuit
- explain an argument from a passage
- analyse a data chart
- write and revise a short response

## 6.5 Exam

A timed or untimed unassisted assessment. Hints and source access are unavailable until submission or explicit termination.

## 6.6 Exploration

An open, low-stakes conversation or activity. Results may contribute XP but should provide little or no formal mastery evidence unless followed by assessment.

---

# 7. Interface and visual design

## 7.1 Design character

The application should feel like a modern illustrated field notebook and personal workshop.

Use:

- a light theme by default
- generous whitespace
- crisp black or near-black typography
- a warm neutral canvas
- one restrained accent colour per subject
- clear diagrams
- subtle texture only where it does not reduce legibility
- motion that explains state changes

Avoid:

- dark default themes
- card grids filling every view
- nested rounded containers
- dashboard clutter
- decorative status chips
- gradient-heavy “AI product” styling
- glowing or pulsing assistant avatars
- headings that merely repeat the visible context
- icons without labels where meaning is unclear

## 7.2 Desktop lesson layout

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ Discere     Circuits / Series circuits        XP 1,240   12-day streak│
├───────────────────────────────────────────────┬───────────────────────────┤
│                                               │                           │
│                                               │  Explanation              │
│              VISUAL STAGE                     │                           │
│       image / SVG / interactive canvas        │  Concise prose tied       │
│                                               │  directly to the visual   │
│                                               │                           │
│                                               │  [Read aloud] [Sources]    │
├───────────────────────────────────────────────┴───────────────────────────┤
│ Prompt or activity                                                      │
│ [learner response / controls / canvas]                                  │
│                                                    [Hint] [Submit]        │
└───────────────────────────────────────────────────────────────────────────┘
```

The visual stage should usually occupy 55–70% of the primary viewport. The explanation panel may collapse after the learner begins practice.

## 7.3 Mobile and narrow screens

Use a vertical flow:

1. visual
2. explanation
3. activity
4. response controls

Do not reduce the visual to a thumbnail beside long text.

## 7.4 Main views

### Workshop

The home screen contains:

- Continue current lesson
- Today’s mission
- Due reviews
- current streak and recovery status
- a visual workshop showing subject progress
- recent courses

### Knowledge map

A navigable concept graph showing prerequisites and mastery states.

### Lesson

The core visual-first view.

### Practice

Mixed practice queue with filters for topic, difficulty, response type, and assistance mode.

### Challenge

Applied tasks and unit gates.

### Notebook

Saved notes, digital pages, diagrams, attempts, and teacher feedback.

### Library

Courses, sources, saved visuals, generated lesson packs, and imports.

### Progress

Mastery, retention, assistance use, and study history. Avoid vanity-only charts.

### Settings

Writing preferences, accountability defaults, accessibility, read-aloud, data export, and provider configuration.

## 7.5 Interaction rules

- There should be one obvious primary action at a time.
- Enter submits short answers when safe; Shift+Enter adds a line.
- The learner can zoom every image or diagram.
- Every visual has accessible alt text.
- Tooltips must not contain essential instructions.
- Keyboard navigation must cover all core actions.
- Motion respects `prefers-reduced-motion`.
- Loading states describe the operation in plain language.

---

# 8. Humanised writing system

`writing-system.md` is normative. This section summarises the application contract.

## 8.1 Content pipeline

Learner-facing generated prose passes through these stages:

```text
structured content plan
        ↓
first draft
        ↓
deterministic style lint
        ↓
targeted edit of flagged spans
        ↓
semantic and factual preservation check
        ↓
second deterministic lint
        ↓
commit or reject
```

Do not repeatedly rewrite the entire response. Targeted edits reduce factual drift.

## 8.2 Commit gate

Generated prose cannot be committed when it contains an error-level style rule, malformed citations, prohibited answer leakage, or a schema violation.

The commit endpoint returns:

```ts
interface WritingGateResult {
  accepted: boolean;
  score: number;              // 0-100, diagnostic only
  errors: StyleViolation[];
  warnings: StyleViolation[];
  metrics: {
    wordCount: number;
    sentenceCount: number;
    headingCount: number;
    listCount: number;
    emDashCount: number;
    negativeParallelismCount: number;
    triadWarningCount: number;
    cannedPhraseCount: number;
    repeatedTransitionCount: number;
  };
}
```

Passing is based on rule outcomes, not the overall score alone.

## 8.3 Hard failures

Reject committed course prose containing:

- `not only ... but also ...`
- `not just ... but ...`
- `it is not X; it is Y` or close variants used rhetorically
- invented citations
- unsupported claims marked as verified
- answer leakage when the active mode forbids it
- more than two em dashes in 300 words
- banned canned openings
- repeated generic praise
- placeholder text

## 8.4 Warning-level review

Flag:

- exactly three short parallel clauses
- exactly three decorative adjectives
- exactly three examples introduced without a factual reason
- repeated sentence openings
- more than one heading per 180 words
- repeated use of “Additionally”, “Moreover”, or “Furthermore”
- generic conclusions
- dense nominalisations
- overuse of bold text
- unexplained jargon
- restating the learner’s question before answering it

A warning may be accepted when the content genuinely requires the structure. The reason must be stored for curated course material.

## 8.5 User feedback

Every explanation and assessment response offers discreet feedback actions:

- Sounds generated
- Too formal
- Too long
- Too vague
- Repeats itself
- Gave away the answer
- Good as written

Store the selected span where possible. Use feedback to update user-level style preferences and the evaluation corpus. Do not silently fine-tune or train on private data.

## 8.6 Tone

The default tutor is calm, direct, and interested in the subject. It does not perform enthusiasm. It may say “Correct” or identify a strong idea, but it must avoid routine praise such as “Great question”, “Fantastic work”, or “You’re absolutely right” unless the context genuinely warrants it.

---

# 9. Visual content system

`visual-system.md` is normative.

## 9.1 Visual classes

Every visual is one of:

1. **Reference image** — a real image retrieved from a trusted or openly licensed source.
2. **Verified diagram** — deterministic SVG, canvas, equation, graph, circuit, timeline, or map.
3. **Interactive visual** — a parameterised simulation or manipulative.
4. **Generated illustration** — a model-generated scene used for conceptual or unavailable imagery.
5. **Learner submission** — uploaded photo, screenshot, scan, or digital-notepad page.

## 9.2 Selection order

For each lesson, choose in this order:

1. interactive visual when manipulation directly teaches the idea
2. deterministic diagram when exact relationships matter
3. retrieved real image when a real object, artwork, place, organism, experiment, or historical source is useful
4. generated illustration when the required scene cannot reasonably be found or when a custom analogy materially helps
5. no visual only when documented as unnecessary

Generated illustrations are not the default replacement for research.

## 9.3 Visual brief

No generated or deterministic visual may be created without a structured brief:

```ts
interface VisualBrief {
  id: string;
  conceptIds: string[];
  learningPurpose: string;
  visualClass: VisualClass;
  learnerLevel: string;
  factsToShow: string[];
  requiredObjects: VisualObject[];
  requiredLabels: string[];
  spatialRelationships: SpatialRelationship[];
  valuesAndUnits: ValueLabel[];
  interaction?: InteractionSpec;
  forbiddenElements: string[];
  styleDirection: string;
  sourceIds: string[];
  verificationChecks: VerificationCheck[];
  altTextDraft: string;
}
```

## 9.4 Generated illustration rules

Generated images must:

- serve one defined learning purpose
- avoid embedded text where exact wording matters
- use overlay labels rendered by the application
- avoid decorative scientific or technical objects not requested
- avoid implying scale when scale is unknown
- retain the original visual brief and generation request
- be marked `Illustrative` until reviewed

## 9.5 Visual review

A visual review compares the asset against every verification check. Review states:

- `unreviewed`
- `automatically_reviewed`
- `human_reviewed`
- `rejected`

The learner-facing UI uses:

- **Verified diagram** for deterministic assets with passing checks
- **Source image** for attributed retrieved media
- **Illustrative image** for reviewed generated media
- **Unreviewed** only in authoring mode, never in a structured public lesson

## 9.6 Initial required electronics visuals

The seed course must include at least:

- interactive charge-flow analogy
- circuit symbols reference sheet
- verified series circuit diagram
- verified parallel circuit diagram
- interactive Ohm’s law explorer
- resistor colour-band visual
- breadboard row and rail diagram
- retrieved breadboard photograph with attribution
- multimeter voltage-placement diagram
- multimeter current-placement diagram
- LED polarity diagram
- simple fault-finding challenge diagram

At least four must be interactive, four deterministic, and one retrieved photograph.

---

# 10. Accountability and tutoring modes

## 10.1 Coach mode

Default mode.

The tutor:

- asks for an initial attempt when reasonable
- gives the smallest useful hint
- identifies the learner’s current step
- avoids revealing the final answer until the reveal flow is completed
- may provide a worked analogous example

## 10.2 Assisted mode

The tutor can provide progressively stronger help. The learner chooses hint depth or requests another hint.

Hint levels:

1. orient attention
2. identify the relevant concept
3. suggest the next operation
4. show a partial step
5. show an analogous worked example

The exact answer remains hidden unless Direct mode or the reveal flow is used.

## 10.3 Direct mode

The tutor may answer directly after modest friction.

Default reveal flow:

1. learner submits an attempt or selects `I cannot start`
2. learner chooses a reason
3. learner holds the reveal control for 1.5 seconds
4. answer and explanation are displayed
5. a transfer question appears after the learner closes the answer

The hold duration is configurable from 0 to 5 seconds. Accessibility settings can remove hold interactions.

## 10.4 Exam mode

- no hints
- no source viewer
- no answer reveal
- no tutor explanation during the active attempt
- learner may end the exam early
- grading occurs after submission
