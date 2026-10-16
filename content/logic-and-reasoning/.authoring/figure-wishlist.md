# Figure wishlist: logic-and-reasoning

Figures the story lessons would use if the course had them. Every screen listed here teaches without its figure. The course has one diagram type, `truth_table`, which shows one formula at a time over the four rows of p and q. Lessons covered so far: `what-logic-operates-on`, `if-then-claims`, `converse-and-contrapositive`, `knights-and-knaves`, `building-a-truth-table`.

Drawn as static svg_figure pictures (no dragging or switches): what-logic-operates-on, if-then-claims, converse-and-contrapositive, knights-and-knaves and building-a-truth-table. Left out from the original wishes: the three-column comparison with ¬q → ¬p in converse-and-contrapositive, because the contrapositive is not met until the screen after it (the drawn figure compares p → q with q → p for the first row only); the sorting trays, the "Look inside" switch and the sentence picker, which need interaction that figures do not have (cases and fixed pictures stand in for them).

## finding-the-conclusion

### what-the-speaker-is-after

- Shows: a short remark such as "You should take an umbrella, because the forecast says rain" split into its two clauses on separate cards, with any indicator word in the remark highlighted.
- Learner changes: drags the clauses between two trays, "What the speaker wants me to accept" and "What is offered to help", and flips the order of the clauses in the sentence to see that the trays do not change.
- Caption: "Sort the clauses by the job each does. Swap their order in the sentence and see which tray each belongs in."

## valid-but-untrue

### testing-a-pattern

- Shows: the four rows of p and q with one column per premise and one for the conclusion. A row where every premise is true is shaded, and a shaded row whose conclusion is false is marked as a bad row.
- Learner changes: which pattern is tested, chosen from a short list such as "p ∧ q; therefore q" and "p; therefore p ∧ q".
- Caption: "Pick a pattern. Shaded rows have every premise true, and a red mark shows a counterexample."
- Note: the existing `truth_table` shows one formula at a time, so the premises and the conclusion cannot be compared side by side.

### valid-and-true

- Shows: two switches, "The link holds" and "The premises are true", feeding a lamp labelled "Sound" that lights only when both are on. Each combination of the two switches is named underneath: sound, valid but unsound, or invalid.
- Learner changes: each switch.
- Caption: "Soundness needs both checks. Turn each switch on and off and watch the lamp."

## naming-the-fallacies

### which-way-a-rule-runs

- Shows: an arrow from "It rains" to "The street is wet" with two travellers: one moving along the arrow, marked safe, and one moving back against it, marked "needs more than the rule".
- Learner changes: the starting point (rain, no rain, wet street, dry street) and the direction of travel. The figure says whether the step is valid and names the pattern.
- Caption: "Choose where you start and which way you go. Only some steps along the rule are safe."

### two-slips-side-by-side

- Shows: the street cleaner's row (p false, q true) lit up against three patterns, "p → q; q; therefore p", "p → q; ¬p; therefore ¬q" and "p → q; ¬q; therefore ¬p", with each premise and conclusion showing true or false in that row.
- Learner changes: the row, using the four rows of p and q.
- Caption: "Choose a row. A pattern fails in a row where both premises are true and the conclusion is false."
