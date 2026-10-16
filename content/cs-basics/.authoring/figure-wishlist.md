# Figures the cs-basics story lessons would use

Each screen below teaches without its figure. The existing `program_trace` and `search_array` diagrams carry the other screens.

## steps-a-machine-could-follow, step `a-named-box`

Shows: a row of labelled boxes, with x drawn as a box holding a value, and an arrow carrying the value into the box when a line runs.
The learner can change: the line being run, stepping through `x = 3` and then `x = x + 2`, so the old value visibly leaves the box.
Caption: "The box named x holds one value. Storing a new value replaces the old one."

## when-the-input-grows, step `folding-paper`

Shows: a sheet folded in half in turn, with the stack drawn edge-on and the layer count printed beside it (1, 2, 4, 8 and so on up to ten folds).
The learner can change: the number of folds, and the layer count updates.
Caption: "Each fold lays the stack over itself, so the layers double."

## when-the-input-grows, step `one-more-doubles`

Shows: a chart of comparisons against list length for linear and binary search, with the list length doubling along the bottom.
The learner can change: the list length, and the two counts update, so linear search climbs steeply while binary search rises by one at each doubling.
Caption: "Doubling the list doubles linear search's comparisons and adds one to binary search's."

Drawn so far (part 1): a-rule-that-asks-first, one-action-repeated, one-reply-many-numbers and why-the-order-matters are now svg figures. `a-named-box` is left as it is: the program_trace there shows the box and the replaced value, and the text tells the learner to run it. Part 2 will handle when-the-input-grows.
