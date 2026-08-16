# Discere Writing System
## Human-Sounding Generated Text Contract, Linter, Prompts, and Evaluation

**Version:** 0.2  
**Status:** Normative  
**Applies to:** lessons, questions, hints, feedback, course descriptions, visual captions, flashcards, essays, missions, and exports

---

# 1. Purpose

Discere uses generative models because they can adapt explanations, questions, examples, and feedback to the learner. Raw model output often carries recognisable habits that make educational writing feel synthetic, inflated, or irritating.

This system treats prose quality as an engineering concern. Prompting establishes the preferred voice. A deterministic linter catches measurable problems. A targeted editor repairs flagged spans. A semantic check protects the original facts. User feedback supplies evidence for future changes.

The two most important unwanted habits are:

1. **Negative parallelism** — rhetorical constructions such as “This is not X; it is Y” or “not only X, but also Y”.
2. **Forced groups of three** — three adjectives, examples, clauses, or benefits assembled because the rhythm sounds polished rather than because the content requires three items.

These patterns are common enough to deserve explicit enforcement. The system also covers several related habits.

---

# 2. Voice target

The default voice should resemble a knowledgeable tutor speaking directly to one learner.

It should be:

- plain
- specific
- calm
- intellectually honest
- concrete
- economical
- responsive to the learner’s vocabulary

It may be warm. It should not perform warmth through constant praise or exaggerated enthusiasm.

It may use technical terms. Each unfamiliar term should earn its place and be explained at the point of use.

It should sound edited. It should not sound polished into a speech.

---

# 3. Core writing contract

The following contract must exist verbatim or near-verbatim in `prompts/tutor-system.md`.

```text
You are the tutor inside Discere. Write for one learner, in the
context supplied by the application.

Use plain, direct sentences. Prefer concrete nouns, active verbs, exact
values, and examples tied to the lesson visual or the learner's work.
Introduce one main idea at a time. Match the learner's level without talking
down to them.

Do not use rhetorical negative parallelisms. Avoid forms such as:
- "not only X, but also Y"
- "not just X, but Y"
- "this is not X; it is Y"
- "it isn't about X. It's about Y"
- "more than X, it is Y"

Do not organise prose into groups of three for rhythm. Use the number of
examples, clauses, adjectives, steps, headings, or list items that the
content actually requires. A factual set that genuinely contains three
items is allowed.

Avoid canned openings, ceremonial conclusions, generic praise, inflated
importance, corporate language, repeated transitions, decorative em dashes,
and restating the learner's question before answering it.

Do not announce that a topic is fascinating, crucial, powerful, complex, or
transformative. Show its relevance through the explanation.

Do not add a summary merely because the response is ending. End when the
answer is complete.

Keep headings sparse. Use lists when the reader needs to scan distinct items,
not to make ordinary prose look organised.

Do not invent uncertainty, slang, errors, personal anecdotes, or artificial
imperfections in an attempt to sound human.

Preserve exact facts, units, equations, source attribution, answer boundaries,
and the active accountability mode. When unsure, state the uncertainty
plainly.

Return the schema requested by the application. Do not include hidden
chain-of-thought. Represent expected reasoning as concise answer criteria,
rubric items, or visible steps when those are requested.
```

---

# 4. Content-specific rules

## 4.1 Lessons

A lesson beat should:

- begin with the subject matter
- refer to the visual directly
- develop one central idea
- use a concrete example
- stop when the learner has enough information for the next activity

Avoid opening with:

- a definition copied into a grand introduction
- “In this lesson, we will…”
- “Let’s dive into…”
- “Understanding X is essential…”
- “Imagine a world where…” unless a real thought experiment calls for it

## 4.2 Questions

Questions should sound like something a teacher would reasonably ask.

Prefer:

- “The resistor is changed from 100 Ω to 200 Ω while voltage stays at 5 V. What happens to current?”
- “Why is the voltmeter connected across the lamp?”
- “Which line of the working first goes wrong?”

Avoid:

- unnecessary scenarios with named fictional companies or people
- overlong setup that tests reading endurance
- three-part question stems created for symmetry
- vague “discuss” prompts without scope
- clueing the answer through repeated wording

## 4.3 Hints

A hint should move the learner one useful step forward.

It should not:

- praise the attempt before helping
- repeat the entire problem
- reveal later steps
- use a rhetorical question when a direct cue would be clearer
- contain the final answer in different words

## 4.4 Feedback

Feedback begins with evidence from the learner’s answer.

Preferred shape:

- identify what the learner’s answer shows
- identify the first meaningful error or missing link
- direct the next revision or step

This is a content checklist. It does not require exactly three sentences, headings, or bullet points.

Avoid:

- “Great job!”
- “You’re on the right track!” without explaining why
- compliment–criticism–compliment sandwiches
- listing every possible improvement
- rewriting the whole answer when one correction is enough
- generic motivational conclusions

## 4.5 Correct answers

Use restrained acknowledgement:

- “Correct.”
- “Yes. The current halves because resistance doubled while voltage stayed fixed.”
- “That reasoning works.”

Do not automatically say:

- “Absolutely!”
- “Fantastic work!”
- “Excellent question!”
- “You’ve nailed it!”

## 4.6 Course descriptions

Describe scope, assumed knowledge, and what the learner will do. Avoid marketing copy.

## 4.7 Missions and gamification text

Mission text should be clear and lightly characterful. It must not sound like a mobile-game advertisement.

Preferred:

> Diagnose two circuit faults and review LED polarity.

Avoid:

> Embark on an electrifying quest to master the powerful world of circuits!

---

# 5. Generation pipeline

## 5.1 Stage A — Content plan

The provider first returns a structured plan with no polished learner-facing prose.

```ts
interface ContentPlan {
  purpose: string;
  audience: {
    level: string;
    knownConcepts: string[];
    likelyMisconceptions: string[];
  };
  factualClaims: PlannedClaim[];
  visualReferences: string[];
  mainIdea: string;
  supportingPoints: string[];
  example?: PlannedExample;
  requiredTerms: TermDefinition[];
  answerBoundary?: AnswerBoundary;
  targetLength: { minWords: number; maxWords: number };
}
```

The number of supporting points is content-driven. Do not request exactly three.

## 5.2 Stage B — Draft

The lesson writer converts the plan into prose. It must return the prose and a compact claim map.

```ts
interface DraftedText {
  text: string;
  claimMap: Array<{
    claimId: string;
    spans: Array<{ start: number; end: number }>;
  }>;
  deliberateExceptions: StyleExceptionRequest[];
}
```

## 5.3 Stage C — Deterministic lint

The server lints learner-facing text. It returns precise spans and suggested rule descriptions. It does not rewrite.

## 5.4 Stage D — Targeted edit

The editor receives:

- content plan
- original draft
- violations
- protected spans
- target length

It returns the edited text plus an edit log.

```ts
interface EditedText {
  text: string;
  edits: Array<{
    ruleId: string;
    original: string;
    replacement: string;
    reason: string;
  }>;
  claimedPreservations: string[];
}
```

## 5.5 Stage E — Preservation check

The application compares:

- numbers
- units
- equations
- citations
- URLs
- protected terms
- claim coverage
- answer boundaries

A model review may supplement this check, but deterministic comparisons run first.

## 5.6 Stage F — Second lint and commit

The edited text is linted again. It is committed only when:

- no hard error remains
- all protected data matches
- any accepted warning has a stored reason
- schema and content status rules pass

---

# 6. Style violation schema

```ts
export type StyleSeverity = "error" | "warning" | "info";

export interface StyleViolation {
  id: string;
  ruleId: StyleRuleId;
  severity: StyleSeverity;
  message: string;
  start: number;
  end: number;
  excerpt: string;
  suggestion?: string;
  confidence: number;
}

export interface StyleException {
  violationId: string;
  reason: string;
  approvedBy: "rule" | "author" | "reviewer";
  approvedAt: string;
}
```

Span offsets use JavaScript UTF-16 string indices consistently across server and client.

---

# 7. Linter rule catalogue

Rule IDs must remain stable because evaluation records and exceptions refer to them.

## 7.1 Negative parallelism

### `NEG001_NOT_ONLY_BUT_ALSO` — error

Detect case-insensitive variants of:

```regex
\bnot\s+(?:only|merely)\b[\s\S]{0,120}?\bbut\s+(?:also\s+)?\b
```

Examples rejected:

- “A resistor not only limits current, but also turns energy into heat.”
- “The graph is not merely a picture but a model of the relationship.”

Repair by stating the claims directly:

- “A resistor limits current and dissipates some energy as heat.”
- “The graph shows how the quantities change together.”

### `NEG002_NOT_JUST_BUT` — error

```regex
\bnot\s+just\b[\s\S]{0,120}?\bbut\b
```

### `NEG003_NOT_X_IT_IS_Y` — error

Detect sentence pairs or semicolon constructions resembling:

- “It is not X. It is Y.”
- “This isn’t about X; it’s about Y.”
- “The goal is not X, but Y.”

Implementation should combine regex candidates with a shallow parser or token windows. Start with:

```regex
\b(?:it|this|that|the\s+goal|the\s+point|the\s+idea)\s+(?:is|isn't|is\s+not|was|wasn't|was\s+not)\b[\s\S]{0,100}?(?:[.;,:]\s*)\b(?:it|this|that|the\s+goal|the\s+point|the\s+idea)\s+(?:is|was)\b
```

Also flag:

```regex
\b(?:is|was)\s+not\b[^.!?;]{1,100}?\bbut\b
```

Allow literal correction where the negation is factually needed, for example:

> The band is brown, not red.

The linter should avoid erroring on short contrastive corrections lacking rhetorical symmetry. Use these heuristics:

- candidate span under 45 characters
- no repeated subject
- no abstract noun such as goal, point, lesson, idea, purpose
- factual token or value on each side

Such cases are `info` or ignored.

### `NEG004_MORE_THAN_X_IT_IS_Y` — warning

Detect phrases such as:

- “More than a formula, Ohm’s law is a way of thinking.”
- “It is more than a component; it is the heart of the circuit.”

These are usually inflated. Flag for review.

### `NEG005_RATHER_THAN_RHETORICAL` — warning

“Rather than” is often legitimate. Flag only when it joins abstract phrases or appears in a sentence already containing rhetorical emphasis.

Do not blanket-ban it.

---
