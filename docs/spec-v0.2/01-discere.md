# Discere
## Visual-First Learning Workspace — Complete Prototype Build Specification

**Product name:** Discere — Latin for “to learn”  
**Repository:** `discere`  
**Version:** 0.2  
**Date:** 16 August 2026  
**Owner:** George  
**Intended implementer:** Luna coding model  
**Status:** Authoritative prototype specification  
**Supersedes:** `spec-v0.1-chatgpt-native.md` wherever the two conflict

---

# 0. Implementation mandate

Build a functioning, local-first learning application whose defining experience is:

> **One useful visual, one human-sounding explanation, one meaningful interaction, and one response from the learner.**

The application must feel like an illustrated tutor and practice environment. It must not feel like a generic chatbot wrapped in dashboards.

The prototype must include:

1. A desktop-first React learning interface.
2. A local TypeScript service that owns courses, state, prompts, attempts, progress, gamification, visual records, and exports.
3. SQLite persistence.
4. A host-adapter layer that can support a ChatGPT-native app/plugin when the target account exposes the required capabilities.
5. A fully usable companion mode when the ChatGPT-native host is unavailable.
6. A structured introductory course titled **Foundations of Electronics and Circuits**.
7. A custom-topic course generator workflow.
8. A server-enforced writing quality gate targeting recognisable AI-writing habits.
9. A visual pipeline supporting retrieved images, deterministic diagrams, interactive visuals, and generated illustrations.
10. Coach, Assisted, Direct, and Exam accountability modes.
11. Open-response quizzes, flashcards, essays, and digital-notepad submissions.
12. A concept map, missions, streaks, XP, mastery, challenges, and a visual workshop progression system.
13. No paid service requirement for the default build.
14. Clean startup and shutdown with no background processes left running.

Do not:

- build a standalone paid-API chatbot as the default architecture
- scrape, automate, or manipulate the ChatGPT website DOM
- claim generated material is verified when it has not been checked
- use generated raster images for exact circuit topology, equations, charts, or labelled technical diagrams when deterministic rendering is available
- allow the model to generate executable UI code at runtime
- ship placeholder buttons, fake analytics, fake generation, or empty settings
- bury the central lesson behind card grids, status panels, or decorative headings

When a host capability is missing, implement the specified fallback and record it in `docs/compatibility-report.md`.

---

# 1. Product thesis

Discere is a personal learning environment built around five ideas.

## 1.1 Learning should be visual by default

A learner should usually see the thing being discussed. Depending on the topic, that may be:

- a real photograph
- a labelled diagram
- a graph
- an equation rendered clearly
- a map or timeline
- an interactive simulation
- an argument map
- a generated conceptual illustration

A lesson without a visual is allowed only when a visual would add no genuine explanatory value. The system must record why no visual was used.

## 1.2 Generated prose needs editorial control

The tutor may use generative models for planning, drafting, questioning, feedback, and explanation. Final learner-facing prose must pass an executable writing gate before it is stored as course content or displayed as a committed lesson.

The gate must specifically detect and discourage:

- negative parallelisms such as “This is not X; it is Y”
- “not only X, but also Y” constructions
- forced groups of three
- repeated rhetorical symmetry
- generic praise
- inflated importance
- canned introductions and conclusions
- excessive headings and fragments
- vague corporate language
- excessive em dashes
- repeated transition words
- needless restatement of the prompt

The complete writing system is specified in `writing-system.md`.

## 1.3 Guidance should preserve agency

The default tutor should help the learner make progress without instantly exposing the answer. The learner can change mode or reveal the answer when genuinely needed. A small amount of friction discourages reflexive cheating while keeping the product humane.

## 1.4 Progress should reflect learning

The system must keep effort, assistance, accuracy, retention, and mastery separate. A learner may earn XP for showing up and making a real attempt while receiving little mastery evidence after revealing the answer.

## 1.5 Breadth comes from a shared activity language

The product should support many subjects through reusable activity types and curriculum records rather than a separate hard-coded application for every subject. Exact validators and specialised renderers can be added by domain.

---

# 2. Priority order

Luna must use the following order when scope or time forces a decision.

## P0 — The product-defining experience

1. Visual-first lesson screen.
2. Humanised text generation and validation.
3. Lesson, interaction, response, and feedback loop.
4. Reliable local persistence.
5. Clear distinction between generated, source-backed, and validated content.

## P1 — Learning structure

1. Accountability modes.
2. Question and assessment engine.
3. Concept graph and progression.
4. Gamification.
5. Electronics curriculum.
6. Custom-topic course creation.

## P2 — Useful extensions

1. Digital notepad and image assessment.
2. Flashcards and spaced review.
3. Voice/read-aloud.
4. NotebookLM export.
5. Additional subject adapters.

A P2 feature must never delay or weaken P0 quality.

---

# 3. Definition of success

The prototype is successful when George can complete this flow:

1. Start the local application with one documented command.
2. Open a clean home screen showing a daily mission and current course.
3. Enter **Foundations of Electronics and Circuits**.
4. Select a concept on the knowledge map.
5. See a meaningful visual occupying most of the lesson stage.
6. Read a concise explanation that passes the writing gate.
7. Manipulate, label, inspect, or answer something related to the visual.
8. Submit an open response.
9. Receive specific feedback without generic praise or immediate answer leakage.
10. Request one or more hints.
11. Reveal the answer through the Direct-mode flow when necessary.
12. Complete a transfer question.
13. See XP, mastery, and assistance recorded separately.
14. Return later and receive a spaced review mission.
15. create a small generated course for a topic outside electronics.
16. Export a source pack suitable for manual import into NotebookLM.
17. Stop the application cleanly.

The experience must remain usable without a ChatGPT-native plugin host. When the plugin host is available, the same core state and UI must be reused.

---

# 4. Product modes and host architecture

The learning core must not be tightly coupled to one model host.

## 4.1 Mode A — ChatGPT-native host

Use this mode when the target account can render the application, call MCP tools, send follow-up messages, upload images, and retain usable application state.

Responsibilities:

- ChatGPT provides tutoring, reasoning, vision, web research, and image generation available in the conversation.
- The local service owns authoritative application state.
- The embedded interface renders the same React components used by the standalone shell.
- MCP tools expose narrowly scoped application operations.

The implementation must begin with a compatibility spike. Do not assume the current personal account exposes every required host feature.

## 4.2 Mode B — ChatGPT companion

This is the required fallback and must be genuinely usable.

The application prepares a **Tutor Packet** containing:

- operation requested
- learner level and preferences
- relevant concept records
- selected source excerpts
- current visual brief or visual metadata
- current question and allowed hint level
- learner attempt
- required response schema
- writing contract version

The interface provides:

- `Copy tutor packet`
- `Open ChatGPT`
- `Paste structured response`
- `Validate and apply`

The user may paste the packet into ChatGPT and paste the structured response back into Discere. The application validates the response, runs the style gate, displays any violations, and refuses to commit malformed or unsafe state.

Companion mode is intentionally explicit. Do not implement hidden clipboard monitoring, DOM injection, automated message sending, or response scraping.

## 4.3 Mode C — Mock provider

A deterministic provider used for:

- local UI development
- automated tests
- example lessons
- onboarding without model access
- CI

It must return fixed, schema-valid lesson, question, feedback, and visual-brief objects.

## 4.4 Future providers

Define interfaces that could later support a paid OpenAI API, another hosted model, or a local model. Do not implement them in the prototype unless all earlier gates pass.

## 4.5 Provider contract

```ts
export interface TutorProvider {
  readonly id: string;
  readonly capabilities: TutorCapabilities;

  generateCoursePlan(input: CoursePlanRequest): Promise<TutorEnvelope<CoursePlanDraft>>;
  generateLesson(input: LessonRequest): Promise<TutorEnvelope<LessonDraft>>;
  generateQuestion(input: QuestionRequest): Promise<TutorEnvelope<QuestionDraft>>;
  assessAttempt(input: AssessmentRequest): Promise<TutorEnvelope<AssessmentDraft>>;
  generateHints(input: HintRequest): Promise<TutorEnvelope<HintDraft[]>>;
  generateFlashcards(input: FlashcardRequest): Promise<TutorEnvelope<FlashcardDraft[]>>;
  prepareVisualBrief(input: VisualBriefRequest): Promise<TutorEnvelope<VisualBriefDraft>>;
  reviewVisual(input: VisualReviewRequest): Promise<TutorEnvelope<VisualReviewDraft>>;
}
```

Provider output is always a draft. The application validates, lints, and commits it through domain services.

---

# 5. The core learning loop

Every ordinary lesson uses the following rhythm.

## 5.1 Orient

Show:

- the concept name
- one sentence explaining why it belongs here
- prerequisite status
- estimated session length

Do not begin with a long overview or learning-objective list.

## 5.2 Observe

Present a large visual. Ask a short noticing question when useful, for example:

- “What changes when the second resistor is added?”
- “Which path can current take?”
- “Where would you place the probes?”

The question should direct attention without turning every lesson into a guessing game.

## 5.3 Explain

Display 120–350 words for a normal concept beat. Longer topics should be broken into multiple beats.

The explanation should:

- refer directly to the visual
- introduce one main idea
- use the learner’s current vocabulary
- include a concrete example
- use equations only when they help
- avoid ceremonial introductions and summaries

## 5.4 Manipulate or inspect

Use one activity. Examples:

- change a voltage slider and watch current update
- click components to reveal their role
- drag labels onto a diagram
- arrange steps
- move a point on a graph
- trace a path
- identify the first wrong step

## 5.5 Respond

Ask one open question that requires recall, prediction, explanation, or calculation. Multiple choice may be used sparingly for diagnosis, never as the only assessment form.

## 5.6 Receive feedback

Feedback should identify:

1. what the answer demonstrates
2. the first important gap or error
3. the next useful action

These are content requirements, not a compulsory three-sentence rhetorical pattern. Combine or expand them naturally.

## 5.7 Consolidate

Record the attempt and update progression. Use a transfer question or delayed review when appropriate. Do not end every beat with a generated recap.

---

# 6. Session types

## 6.1 Quick mission

Duration: 3–7 minutes.

Contains:

- one review item
- one visual interaction
- one open response
