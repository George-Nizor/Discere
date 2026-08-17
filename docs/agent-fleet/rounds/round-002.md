# Round 002 — Interactive Story v1 migration

Date: 2026-08-17
Coordinator baseline: `e2c4c3f`
Integrated implementation baseline: `1b76f77`

## Scope

Implement the approved Interactive Story redesign as separate routed learner screens, preserve the former experience behind `/legacy`, and finish one complete end-to-end round with review, essay, persistence, accessibility-sensitive QA, and runtime evidence.

## Integration order

1. Journey contracts and SQLite progress persistence.
2. Shared routed shell and temporary legacy route.
3. Explainer and deterministic interactive visual stages.
4. Quiz/accountability and transfer recovery stage.
5. Essay studio persistence, autosave, and submission gate.
6. Authorised review session, reveal, rating, and scheduling.
7. Course home, review home, completion, and quality fixture.
8. Smoke expansion, documentation, visual-QA attempt, and stop.

## Outcome

- Root now opens on a course home instead of dropping a learner into the circuit.
- The functional first lesson now has six distinct screens: explainer, interactive visual, quiz, essay, review, and completion.
- Journey progress, essay drafts/submission, and review scheduling persist in SQLite.
- Review answer backs remain behind an explicit server reveal boundary.
- `/legacy` preserves the previous long-form circuit/notebook/tutor flow.
- `/qa/roman?stage=0..4` provides five deterministic standalone visual-QA screens.
- Expanded smoke tests pass the redesigned route, contract, persistence, essay, review, and safety checks.
- Production build and all package/component/server tests pass.
- Browser screenshot capture is documented but blocked in this host by missing Chromium system libraries.

## Dependency map

```text
Journey contracts ──> routed shell ──> explainer/visual ──> quiz/transfer
       │                    │                 │               │
       └──────────────> essay persistence ──> review session ──> completion

All learner stages ──> quality fixture and expanded full-stack smoke test
```

## Operating note

Persistent role worktrees were used under `/tmp/discere-fleet-v1`; the Coordinator integrated them sequentially into `main`. No other repository was changed.
