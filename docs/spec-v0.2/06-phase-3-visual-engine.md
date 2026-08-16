## Phase 3 — Visual engine

Deliver:

- Visual Brief storage
- SVG renderer
- circuit renderer
- graph/equation rendering
- image retrieval adapter
- provenance drawer
- generated-image registration and review

Gate:

- required electronics visuals exist
- exact diagrams pass fixtures
- every visual has alt text and status

## Phase 4 — Learning and accountability loop

Deliver:

- sessions
- activities
- questions
- attempts
- hints
- reveal state machine
- assessment
- deterministic validators

Gate:

- full Coach and Direct flow works
- hidden answers are absent from client responses
- transfer question follows reveal

## Phase 5 — Gamification and review

Deliver:

- XP
- mastery
- streak
- missions
- workshop SVG progression
- achievements
- flashcards and FSRS

Gate:

- XP and mastery differ appropriately after assisted attempts
- due reviews enter daily missions
- no click-farming exploit in tested flows

## Phase 6 — Electronics content

Deliver:

- full seed quantity from section 18.4
- source records
- reviewed content
- module challenges
- final practical mission

Gate:

- content validation script passes
- all curated lesson text passes writing gate
- all visuals reviewed
- deterministic question fixtures pass

## Phase 7 — Provider integration

Deliver based on compatibility result:

- ChatGPT-native MCP adapter where supported
- complete companion mode regardless
- Tutor Packet validation
- image handoff fallback

Gate:

- user can complete one generated lesson using the available provider path
- no paid model API is required

## Phase 8 — Notebook and exports

Deliver:

- digital notepad
- image assessment packet
- user data export
- NotebookLM pack
- deletion flow

Gate:

- page survives restart
- exported ZIP opens and contains attribution
- deletion removes all selected local data

## Phase 9 — Custom-topic proof

Deliver:

- custom course plan flow
- assurance display
- one non-electronics example course
- at least three generic activity types demonstrated

Gate:

- generated plan validates
- first lesson uses a relevant visual
- text passes the writing gate
- generated status is visible

---

# 31. Acceptance criteria

The prototype is not complete until every applicable item passes.

## Product experience

- [ ] The lesson view is visual-first.
- [ ] Every curated lesson beat has a meaningful visual or documented exemption.
- [ ] Explanations are concise and tied to the visual.
- [ ] A learner can complete the full core loop.
- [ ] The interface avoids container and dashboard clutter.

## Writing

- [ ] Negative parallelism hard rules are enforced.
- [ ] Forced-triad warnings are implemented.
- [ ] Common canned AI phrases are detected.
- [ ] Final committed seed content has zero hard violations.
- [ ] Style editing preserves facts, values, units, citations, and answer boundaries.
- [ ] User style feedback is stored and inspectable.

## Visuals

- [ ] Visual Briefs are mandatory.
- [ ] Exact diagrams are deterministic.
- [ ] Retrieved images retain attribution.
- [ ] Generated images are marked illustrative and reviewed.
- [ ] Labels are rendered as overlays when precision matters.
- [ ] Required electronics visuals exist.

## Learning controls

- [ ] Coach, Assisted, Direct, and Exam modes work.
- [ ] Answer reveal is server enforced.
- [ ] Accessibility can remove hold friction.
- [ ] Hints and reveals are recorded.
- [ ] Transfer follows answer reveal.

## Assessment

- [ ] Open text answers work.
- [ ] Numeric answers with units work.
- [ ] Deterministic electronics checks work.
- [ ] Digital-notepad submission works.
- [ ] Feedback identifies evidence and the first meaningful issue.

## Gamification

- [ ] XP and mastery are distinct.
- [ ] Daily missions use real learning needs.
- [ ] Streak requires meaningful activity.
- [ ] Recovery exists.
- [ ] Workshop progression renders.
- [ ] No lives or punitive lockouts exist.

## Architecture

- [ ] Core works without a ChatGPT-native host.
- [ ] Companion mode is usable.
- [ ] Host-specific code is isolated.
- [ ] No paid model API is required.
- [ ] No ChatGPT DOM automation exists.
- [ ] Startup and shutdown are clean.
- [ ] Data export and deletion work.

## Quality

- [ ] Unit, integration, and UI tests pass.
- [ ] Content validation script passes.
- [ ] Compatibility report is accurate.
- [ ] Deviations are documented.
- [ ] README contains exact setup and use instructions.

---

# 32. Required final deliverables from Luna

1. Working repository.
2. Exact Windows setup instructions, with Linux/macOS notes where simple.
3. `pnpm dev`, `pnpm start`, `pnpm stop`, `pnpm test`, and `pnpm validate-content` commands.
4. SQLite migrations and seed content.
5. Complete electronics course at the required prototype quantity.
6. Humanised writing engine and test corpus.
7. Visual system and reviewed seed visuals.
8. Accountability, assessment, gamification, and notebook features.
9. Companion mode.
10. ChatGPT-native adapter when the compatibility spike supports it.
11. Compatibility report.
12. Evaluation report.
13. Requirement-by-requirement completion table.
14. List of deviations, unresolved host limitations, and known defects.
15. No untracked manual setup steps.

---

# 33. Luna decision rules

When the specification leaves a minor implementation choice open:

1. choose the smallest maintainable option
2. preserve the visual-first lesson experience
3. protect writing quality and factual integrity
4. preserve local-first operation
5. prefer deterministic behaviour over model improvisation
6. keep host-specific code behind adapters
7. document the decision

Do not weaken a requirement silently. When a requirement is blocked, implement the closest honest fallback and record the limitation.
