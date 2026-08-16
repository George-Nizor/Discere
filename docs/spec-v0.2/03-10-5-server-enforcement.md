## 10.5 Server enforcement

The local service owns the active mode and allowed content. Hidden answers must not be returned to the client before permission is granted.

Do not rely on hidden CSS, collapsed DOM, prompt instructions alone, or client-side booleans.

## 10.6 Assistance record

Every event records:

```ts
interface AssistanceEvent {
  attemptId: string;
  type: "hint" | "source_open" | "answer_reveal" | "worked_example" | "mode_change";
  level?: number;
  occurredAt: string;
  context: Record<string, unknown>;
}
```

This record influences mastery evidence but never removes earned XP for genuine work.

---

# 11. Interactive activity engine

The activity engine gives the application a Brilliant-like feeling of manipulating ideas.

## 11.1 Safety rule

The model may generate validated activity data. It may not generate arbitrary React, JavaScript, HTML, CSS, SQL, shell commands, or executable plugins at runtime.

## 11.2 Supported activity types for the prototype

1. `hotspot_inspect`
2. `drag_label`
3. `sequence_order`
4. `slider_explorer`
5. `graph_point_move`
6. `path_trace`
7. `circuit_parameter_explorer`
8. `circuit_probe_placement`
9. `step_error_find`
10. `argument_map`
11. `timeline_place`
12. `image_compare`
13. `short_response`
14. `numeric_response`
15. `digital_notepad`

Implement the first nine for the electronics prototype. The remaining types may render from generic components.

## 11.3 Activity schema

```ts
interface LearningActivity {
  id: string;
  type: ActivityType;
  version: 1;
  conceptIds: string[];
  prompt: string;
  visualId?: string;
  configuration: Record<string, unknown>;
  expectedResponse: ExpectedResponse;
  validation: ValidationSpec;
  hints: HintPackage[];
  accessibility: AccessibilitySpec;
  telemetry: {
    recordInteractions: boolean;
    meaningfulActions: string[];
  };
}
```

Each renderer must use a strict Zod schema specific to its activity type.

## 11.4 Example: Ohm’s law explorer

```json
{
  "type": "circuit_parameter_explorer",
  "conceptIds": ["voltage", "resistance", "current", "ohms-law"],
  "prompt": "Set the resistor to 100 Ω. What happens to current when voltage rises from 3 V to 9 V?",
  "configuration": {
    "topology": "single_resistor_dc",
    "voltage": {"min": 0, "max": 12, "step": 0.5, "initial": 3},
    "resistance": {"min": 10, "max": 1000, "step": 10, "initial": 100},
    "showEquation": false,
    "showCurrentMeter": true
  },
  "validation": {
    "kind": "relationship",
    "acceptedClaims": ["current triples", "current rises from 0.03 A to 0.09 A"]
  }
}
```

## 11.5 Activity authoring

Generated activities enter `draft` state. They require:

- schema validation
- bounds validation
- deterministic answer validation where applicable
- style lint on all text
- visual-reference check
- manual review before becoming part of the curated course

---

# 12. Questions, quizzes, and assessment

## 12.1 Question package

```ts
interface QuestionPackage {
  id: string;
  conceptIds: string[];
  sourceIds: string[];
  prompt: string;
  responseType: ResponseType;
  visualId?: string;
  difficulty: number;          // 1-5
  answerAuthority: AnswerAuthority;
  answerKey: AnswerKey;
  rubric?: Rubric;
  hints: HintPackage[];
  commonErrors: CommonError[];
  transferVariant?: TransferVariant;
  assurance: AssuranceLevel;
  writingGate: WritingGateResult;
}
```

The answer key is stored server-side and omitted from learner-facing results.

## 12.2 Response types

- multiple choice
- multiple select
- short text
- numeric with units
- equation or expression
- ordered steps
- diagram label
- code response
- paragraph
- essay
- digital-notepad image
- practical evidence image

The prototype must fully implement short text, numeric with units, paragraph, diagram label, and digital notepad. Multiple choice is included but cannot make up more than 35% of the seed question bank.

## 12.3 Deterministic validation

Use deterministic validators for:

- numeric values and tolerance
- units and conversions
- Ohm’s law
- series resistance
- parallel resistance for supported cases
- power calculations
- basic circuit continuity
- label positions
- ordered steps

When deterministic and model assessments disagree, show the deterministic result as authoritative for the checked part and ask the tutor to explain the discrepancy.

## 12.4 Model assessment

Use a rubric for explanation quality, reasoning, evidence, and clarity. The model must cite specific learner wording or a specific step. It must provide a confidence level.

Assessment schema:

```ts
interface Assessment {
  attemptId: string;
  correctness: "correct" | "partly_correct" | "incorrect" | "ungradable";
  score?: number;
  confidence: number;
  evidence: EvidenceReference[];
  firstMeaningfulIssue?: string;
  feedback: string;
  nextAction: NextAction;
  deterministicChecks: CheckResult[];
  requiresHumanReview: boolean;
}
```

## 12.5 Feedback rules

- Begin with the substance, not praise.
- Identify the first meaningful error rather than listing every flaw.
- Do not reveal later solution steps in Coach mode.
- Explain why a correction matters.
- Ask for a revised answer when revision would teach more than explanation.
- Use a complete worked solution after Direct reveal or final grading.
- Never use a fixed compliment-criticism-encouragement sandwich.

## 12.6 Essays

Essay mode stores:

- prompt
- source pack
- planning notes
- draft versions
- rubric
- feedback history
- final response

Default rubric dimensions are selected by the task. Do not force a three-part rubric. Possible dimensions include thesis, interpretation, evidence, reasoning, structure, accuracy, style, counterargument, and source handling.

The grader quotes short spans from the learner’s essay and links each comment to the relevant rubric dimension.

---

# 13. Digital notepad and visual assessment

## 13.1 Canvas features

- pen
- eraser
- undo and redo
- lasso selection
- text labels
- straight line
- arrow
- basic shapes
- grid and dot-grid backgrounds
- image underlay
- zoom and pan
- page add, duplicate, and delete
- autosave
- export PNG and SVG

Use Pointer Events to support mouse, touch, and stylus. Preserve vector strokes and timestamps.

## 13.2 Submission flow

1. Learner submits selected pages.
2. Application renders a high-resolution image.
3. In ChatGPT-native mode, the image is exposed to the model through supported host mechanisms.
4. In companion mode, the image is exported beside the Tutor Packet.
5. The tutor returns a transcription and uncertain regions.
6. Learner confirms ambiguous symbols.
7. Deterministic validators check recognised calculations.
8. Tutor comments on the first meaningful reasoning error.

## 13.3 Ambiguity

The system must never silently guess ambiguous handwritten symbols that change the answer. It should show cropped uncertain regions and ask the learner to confirm them.

## 13.4 Image submissions

Support photos of:

- breadboards
- handwritten calculations
- worksheets
- book pages the learner is permitted to use
- diagrams
- physical projects

Store original, derived preview, metadata, assessment, and deletion state.

---

# 14. Gamification and progression

Gamification supports learning behaviour. It must not obscure weak understanding.

## 14.1 Separate measures

### XP

Measures meaningful effort and consistency.

Award for:

- completing a concept beat
- submitting a genuine attempt
- revising an answer
- completing a due review
- finishing a challenge
- explaining a concept accurately

Do not award XP for opening screens, repeatedly clicking hints, or farming trivial questions.

### Mastery

Measures demonstrated understanding. It uses:

- accuracy
- difficulty
- assistance used
- delayed recall
- transfer performance
- confidence calibration

### Retention

Estimates how likely the learner is to recall the concept later. It drives review scheduling.

## 14.2 Knowledge map states

- `locked`
- `available`
- `exploring`
- `practised`
- `retained`
- `mastered`

A concept may be practised but not retained. The map should make this distinction visible without turning into a spreadsheet.

## 14.3 Daily mission

Generate one daily mission from:

- due reviews
- current course goal
- weak concepts
- an unfinished lesson
- an optional curiosity activity

A mission should usually take 5–15 minutes. The learner may replace it once without penalty.

## 14.4 Streak

A day counts after one meaningful action:

- complete a lesson beat
- complete at least three due reviews
- submit a challenge attempt
- spend at least five active minutes in a practical activity

Passive reading alone does not count.

Allow earned recovery charges. Missing a day should not destroy months of motivation.

## 14.5 Workshop progression

The home screen contains a visual workshop. Subject progress adds useful objects:

- electronics adds a bench, multimeter, oscilloscope, components, and prototypes
- mathematics adds measuring instruments, drawing tools, and graph surfaces
- physics adds experimental apparatus
- philosophy adds annotated books and argument boards
- computing adds terminals, logic analysers, and servers

Unlocks are visual records of sustained work. They must not block learning content.

For the prototype, implement the electronics workshop in simple layered SVG. Avoid building a 3D game.

## 14.6 Achievements

Achievements reward behaviours linked to learning, for example:

- solve five questions without hints
- return after forgetting and answer correctly
- correct your own explanation
- identify an incorrect assumption
- complete a transfer question after revealing an answer
- finish a practical build and explain it
- maintain calibrated confidence across ten attempts

Do not create achievements for meaningless click counts.

## 14.7 Challenges

Each module ends with a challenge that combines concepts. Passing unlocks the next module, but the learner can override the gate in settings.

## 14.8 Lives and punishment

Do not implement lives, energy limits, paid recovery, or lockouts after errors. Wrong answers are evidence used to teach.

## 14.9 Optional competition

Social leagues are out of scope for the single-user prototype. The progress view may compare the current week with the learner’s own recent baseline.

---

# 15. Mastery model

## 15.1 Attempt evidence

```ts
interface MasteryEvidence {
  conceptId: string;
  attemptId: string;
  correctness: number;       // 0-1
  difficulty: number;        // 1-5
  assistancePenalty: number; // 0-1
  delayDays: number;
  transfer: boolean;
  confidenceError: number;
  occurredAt: string;
}
```

## 15.2 Assistance weighting

Suggested defaults:

| Condition | Mastery evidence multiplier |
|---|---:|
| Correct, no assistance | 1.00 |
| Correct after level-1 hint | 0.90 |
| Correct after level-2 hint | 0.78 |
| Correct after partial step | 0.55 |
| Correct after worked analogy | 0.40 |
| Answer revealed | 0.05 |
| Transfer correct after reveal | additional 0.45 |

These are initial tuning values, not universal truths. Store them in configuration.

## 15.3 Mastery calculation

Use a transparent weighted evidence model for the prototype. Do not pretend it is psychometrically validated.

Requirements:

- recent evidence matters more
- delayed correct answers increase retention confidence
- repeated identical questions have diminishing value
- one accidental wrong answer does not erase mastery
- revealing an answer does not count as independent correctness

Expose the calculation in developer documentation and provide a reset/recompute command.

---

# 16. Flashcards and spaced review

Use FSRS or a well-maintained compatible implementation.

## 16.1 Card rules

Cards must:

- test one retrievable idea
- be answerable without hidden context
- avoid vague prompts
- use images when recognition or spatial knowledge matters
- link to a concept and source
- include accepted variants
- store common misconceptions
