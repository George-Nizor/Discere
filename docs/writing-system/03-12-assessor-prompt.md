# 12. Assessor prompt

Store this in `prompts/assessor.md`.

```text
Assess the learner's submitted answer using the supplied question, answer
authority, deterministic checks, rubric, active learning mode, and assistance
history.

Anchor every judgement in the learner's actual words, selected labels, shown
working, or deterministic result. Identify the first meaningful error or gap.
Give the smallest next action that would improve understanding.

In Coach and Assisted modes, do not reveal the final answer or later solution
steps beyond the permitted hint level. In Direct mode after reveal, provide a
complete explanation. In Exam mode, return grading only after submission.

Do not begin with generic praise. Do not use a compliment-criticism-compliment
structure. Do not list every possible issue when one correction should come
first. Follow the Discere writing contract.

Return the requested assessment schema and confidence. Do not include hidden
chain-of-thought.
```

---

# 13. Examples

These examples define the desired direction. They are not templates to repeat.

## 13.1 Negative parallelism

Rejected:

> Voltage is not just the force behind current; it is the driving energy that powers the entire circuit.

Accepted:

> Voltage is the potential difference between two points. In the diagram, the battery creates that difference across the resistor.

## 13.2 Forced three-part list

Rejected:

> This experiment builds confidence, strengthens intuition, and unlocks deeper understanding.

Accepted:

> Change the resistor value and watch the current meter. The result makes the inverse relationship easier to see.

## 13.3 Canned introduction

Rejected:

> In today’s rapidly evolving technological landscape, understanding circuits is more important than ever.

Accepted:

> A circuit needs a complete path. Break the path at the switch and current stops.

## 13.4 Generic praise

Rejected:

> Great job! You’re absolutely on the right track. Your answer shows a fantastic understanding of current.

Accepted:

> Your answer correctly treats current as the same at both points in this series circuit. The remaining issue is the unit: 0.02 A is 20 mA.

## 13.5 Unnecessary recap

Rejected:

> To sum up, resistors resist current, voltage drives current, and current flows through the circuit. Understanding these three ideas is crucial for mastering electronics.

Accepted:

> With 5 V across 250 Ω, the current is 0.02 A, or 20 mA.

## 13.6 Excessive heading structure

Rejected:

```text
### What is resistance?
Resistance opposes current.

### Why does resistance matter?
It controls current.

### How can you use resistance?
Choose a resistor.
```

Accepted:

> Resistance describes how strongly a component limits current. In the explorer, doubling resistance from 100 Ω to 200 Ω halves the current when voltage stays fixed.

## 13.7 Legitimate factual three

Accepted without warning when declared as a closed set:

> A transistor has three terminals: base, collector, and emitter.

The statement describes the named transistor type’s actual terminal set. It is not a rhetorical flourish.

## 13.8 Direct correction

Accepted:

> The band is brown, not red, so the first digit is 1.

This is a concise factual correction. It should not be treated as the unwanted “not X; it is Y” rhetorical pattern.

---

# 14. Semantic preservation

## 14.1 Protected item extraction

Before editing, extract:

- every number
- every unit
- every equation or code expression
- every citation key
- every URL
- every proper noun marked by the plan
- every required technical term
- every uncertainty marker
- every answer token and forbidden-answer token

## 14.2 Deterministic comparisons

After editing:

- compare normalised number and unit multisets
- compare citation and URL sets exactly
- compare equations after whitespace normalisation
- verify required terms remain
- verify no forbidden answer token was introduced

## 14.3 Claim coverage

The content plan assigns IDs to claims. The draft maps spans to claim IDs. After editing, the provider returns an updated map. The application checks that each required claim remains represented.

For curated content, a reviewer must confirm any claim whose mapping changed substantially.

## 14.4 Style versus correctness

When a style repair would risk changing technical meaning, preserve the original sentence and raise `needs_review`. Correctness takes priority over stylistic purity.

---

# 15. User preference adaptation

## 15.1 Stored preferences

```ts
interface UserWritingPreferences {
  preferredLength: "brief" | "standard" | "detailed";
  formality: "casual" | "neutral" | "formal";
  useHeadings: "rare" | "moderate";
  useAnalogies: "rare" | "when_helpful" | "frequent";
  explainTerminologyImmediately: boolean;
  preferredExamples: string[];
  dislikedPhrases: string[];
}
```

The system must not permit a preference to disable factual accuracy, source handling, answer boundaries, or core hard rules without an explicit developer setting.

## 15.2 Feedback learning

Aggregate feedback counts by rule and content type. Show a settings summary, for example:

- You often mark long introductions as unnecessary.
- You prefer equations shown after the verbal explanation.
- You rarely use analogies.

Do not make claims from fewer than five relevant feedback events.

---

# 16. Evaluation corpus

## 16.1 Fixture categories

Create hand-written positive and negative fixtures for every rule.

Each fixture stores:

```ts
interface LintFixture {
  id: string;
  ruleId: StyleRuleId;
  text: string;
  expected: "match" | "no_match";
  contentType: ContentType;
  context?: Partial<LintContext>;
  notes: string;
}
```

## 16.2 Generation evaluation set

At least 100 requests, including:

- short explanations
- long explanations
- hints at each level
- correct-answer feedback
- wrong-answer feedback
- essay comments
- flashcards
- course descriptions
- visual captions
- mission text

Include adversarial prompts that encourage grandiose prose or a three-part structure.

## 16.3 Human review form

For each generated pair, ask:

1. Which version sounds more like a competent human tutor?
2. Which is clearer?
3. Did the edit change any fact?
4. Does either version contain an irritating pattern?
5. Would you keep the edited version as course material?

Use random ordering and hide which version is edited.

## 16.4 Targets

- 100% recall on explicit hard-rule fixtures
- at least 95% precision on hard-rule fixtures
- triad warning precision above 75% after allowlists
- zero answer leakage in mode-specific evaluation
- zero changed numbers, units, equations, or citations in accepted edits
- edited output preferred in at least 80% of reviewed pairs

---

# 17. Authoring and developer tools

Provide a local Writing Lab route available in development mode.

It includes:

- text input
- content type
- active writing profile
- optional question/answer context
- highlighted violations
- metrics
- targeted edit packet preview
- pasted editor response validation
- before/after diff
- preservation report
- accept exception control with reason
- save as fixture

The Writing Lab must never expose hidden answers from real learner attempts to an unauthorised client.

---

# 18. Acceptance criteria

- [ ] The default system prompt includes the core contract.
- [ ] Negative parallelism variants are tested and rejected.
- [ ] Short factual corrections using “not” remain allowed.
- [ ] Forced triads produce useful warnings without rejecting every factual three-item set.
- [ ] Repeated triads become an error.
- [ ] Canned openings and generic praise are detected.
- [ ] Heading, bold, em dash, repetition, and transition metrics work.
- [ ] Answer leakage receives question and mode context.
- [ ] Protected spans are handled correctly.
- [ ] Targeted edits preserve numbers, units, equations, citations, claims, and answer boundaries.
- [ ] Every committed seed lesson passes the gate.
- [ ] The Writing Lab supports inspection and fixture creation.
- [ ] User feedback is stored and can be exported.
- [ ] Evaluation results are documented in `evaluation-report.md`.
