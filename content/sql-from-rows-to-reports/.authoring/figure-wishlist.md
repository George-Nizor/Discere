# Figure wishlist: sql-from-rows-to-reports

Figures the story lessons would use if the course had them. Each screen listed here teaches without its figure, using the existing `relational_query` diagram (a query, its result and the input tables) or no figure at all. Lessons covered so far: `rows-and-keys`, `select-and-name`, `filter-the-rows`, `sort-and-limit`, `distinct-results`.

## rows-and-keys

### one-line-for-each-cup

- Shows: the café notebook page on the left, one handwritten line per cup, and the same lines laid out as a grid on the right, with the columns labelled day, customer and price. A line and its row are highlighted together.
- Learner changes: which line or row to highlight, and whether the page is read one cup at a time or one customer at a time.
- Caption: "Each line in the notebook becomes one row of the table, and each fact becomes a column."

### a-table-of-orders

- Shows: the customers table and the orders table side by side, with an arrow from each order's customer_id to the customer row it points at. Two arrows land on the same customer.
- Learner changes: which customer to select. Their row and every order pointing at it light up.
- Caption: "Select a customer to see which orders point at them. The order id never repeats, and customer_id can."

## filter-the-rows

### a-test-for-each-row

- Shows: a number line of amounts with the shop's orders marked on it, and a movable boundary that can be set to "greater than" or "at least". Orders on the line change colour with the choice.
- Learner changes: the boundary value and whether the line itself counts.
- Caption: "Move the boundary and switch between 'more than' and 'at least'. The orders sitting exactly on the line are the ones that change."

### on-the-line

- Shows: the same number line with two boundaries and a shaded band between them, with a switch for whether each end counts.
- Learner changes: both boundaries and the two end switches.
- Caption: "Switch each end on or off. BETWEEN counts both ends."

## sort-and-limit

### keeping-the-first-few

- Shows: the five race times as cards, first in sign-up order and then sorted, with a movable line under the first n cards.
- Learner changes: the sort direction and the number of cards kept.
- Caption: "Sort the times, then move the line. LIMIT keeps the cards above it."

### when-two-rows-tie

- Shows: a sorted list in which two orders share an amount, with a switch that adds the id as a second sort column and shows the tied rows settling into a fixed order.
- Learner changes: whether the tie-breaker is on, and whether it runs low to high or high to low.
- Caption: "Turn the tie-breaker on and the two orders worth the same stop swapping places."

## distinct-results

### different-things-once

- Shows: the bakery till log as a row of entries, with each repeat crossed off as the list is read from left to right, and the surviving entries gathered underneath.
- Learner changes: the speed of the read, and whether the crossing off is shown step by step or all at once.
- Caption: "Read the till log from the left. Every entry that has appeared before is crossed off, and what remains is each kind once."

### the-whole-row

- Shows: result rows as small cards with two fields, and a switch to compare on one field or on both. Cards that match on the chosen fields stack together.
- Learner changes: which fields are compared.
- Caption: "Choose which columns to compare. Rows stack only when they match on every chosen column."

## Part 2: aggregate-known-values to preserve-either-side

These lessons use the existing `relational_query` diagram throughout, with small tables of their own (a pupil survey, pupils and clubs, guests and badges). Each screen teaches without the figures below.

## group-and-filter-groups

### a-pile-for-each-status

- Shows: the six orders as slips sliding into one pile per status, with a running total growing on each pile. The grouped result row appears beside each pile.
- Learner changes: the column to group by (status, item, customer, day), and a switch to deal only the paid slips.
- Caption: "Choose what to group by and watch the slips fall into piles. Each pile becomes one row of the report."

## join-matching-rows

### numbers-that-point

- Shows: the pupils list and the clubs list side by side, with an arrow from each pupil's club number to the club row it names. Two arrows land on Chess.
- Learner changes: which pupil or club to select. The matching row and every row pointing at it light up.
- Caption: "Select a pupil to follow their club number. Select a club to see every pupil who points at it."

## preserve-the-left-table

### a-blank-that-means-no-match

- Shows: the clubs and pupils joined, with each result row tinted by where its blanks came from: a matched row with an unknown value, and a kept row with no match.
- Learner changes: inner or left join, and which column the NULL test looks at.
- Caption: "Switch between the two joins. A blank from no match and a blank from an unknown value look the same, but they come from different places."

## preserve-either-side

### keeping-both-sides

- Shows: the reply list and the badge list as two columns of names, with lines between matching names. Unmatched names sit at the edge, and a switch chooses which edges the join keeps.
- Learner changes: inner, left, right or full join.
- Caption: "Switch the join and watch which unmatched names stay in the combined list."

## Part 3: ask-a-query-inside-a-query to running-totals-and-neighbours

These lessons use the existing `relational_query` diagram throughout, with small tables of their own (a club membership list, diving scores, a mark sheet, a money jar, a water meter). Each screen teaches without the figures below.

## ask-a-query-inside-a-query

### the-average-comes-first

- Shows: the order amounts as a column of bars with a movable line. The inside query runs first and draws the line at the average, 48, and the outer query then colours each bar above or below it.
- Learner changes: the aggregate used for the line (average, smallest, largest) and whether equal bars count as above.
- Caption: "The inside query runs first and sets the line. The outer query then compares every order with it."

### an-answer-for-each-row

- Shows: the orders grouped under their customers, with a line at each customer's own average. A highlighted order is compared with the line of its own group, and the inside query is shown being run again as the highlight moves.
- Learner changes: which order is highlighted, and whether the line is the overall average or the group's own.
- Caption: "Step through the orders. The inside query is worked out again for each one, using that order's own customer."

## combine-result-sets

### one-list-under-another

- Shows: the chess list and the drama list as two columns of names, sliding together into one column. A name that has already appeared is crossed out when UNION is chosen, and kept when UNION ALL is chosen.
- Learner changes: UNION or UNION ALL, and whether a club label column is added to each list.
- Caption: "Switch between UNION and UNION ALL and watch what happens to Cy and Di."

## rank-with-ties

### sharing-a-place

- Shows: the four divers as a podium of scores with the position beside each, under a switch for ROW_NUMBER, RANK and DENSE_RANK. The positions change as the switch moves, and the gap after the tie is marked.
- Learner changes: the numbering function, and whether the name is added as a tie-breaker.
- Caption: "Switch the numbering and watch where the three divers on 9 and the diver on 7 land."

## partition-the-window

### a-window-for-each-group

- Shows: the orders as rows coloured by customer, with a bracket round each group. The group total is written beside every row of the group, and a second view merges each bracket into one row for GROUP BY.
- Learner changes: the column that partitions the rows (customer, status, none) and whether the rows are kept or merged.
- Caption: "Choose what to partition by. Each bracket is a window, and every row in it shows the same total."

## running-totals-and-neighbours

### adding-up-as-you-go

- Shows: the jar's deposits as a column of rows, with a highlighted current row and a shaded band over the rows in its frame. The running total is written beside the current row as the band grows.
- Learner changes: the current row, and the frame (rows so far, the whole window, or one row either side).
- Caption: "Move the current row down the jar. The shaded rows are the frame, and the total beside it is their sum."
