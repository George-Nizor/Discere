# Figure wishlist: python-for-data-analysis

## lists-and-tuples, step lists-inside-lists

Shows: two lists a and b = a.copy(), each drawn as a box of slots, with arrows from the slots to the items. When an item is itself a list, the arrows from a and b end at the same inner box.

The learner can change: step through `b[0].append(3)` and watch the item appear inside the shared inner box, then choose between `b = a` (one outer box, two name tags) and `b = a.copy()` (two outer boxes, shared inner boxes).

Caption: "Step through the lines. The copy has its own outer box, but both outer boxes point at the same inner box."

The screen teaches without it, using two lockers and shared small boxes in words.

## ranges-and-randomness, step posts-at-both-ends

Shows: a number line from 0 to 12 metres with posts drawn as marks. Three rows stack under each other: np.arange(0, 12, 3), np.linspace(0, 12, 5) and np.linspace(0, 12, 5, endpoint=False), so the missing post at 12 and the shared gaps are visible at once.

The learner can change: the start, the stop, and either the step (for arange) or the number of points (for linspace), and tick or untick endpoint.

Caption: "Change the step or the count. arange never reaches the stop, and linspace does unless you turn the endpoint off."

The screens teach without it, using the python_execution figures and the arithmetic in words.

## labels-and-positions, step the-number-on-the-door

Shows: a row of three lockers with the number on each door (the label) and a small place number beneath each (the position, from 0). A second row shows the same lockers after they have been sorted into a new order, with the door numbers moving and the places staying put.

The learner can change: the order of the lockers, then ask for loc[20] and iloc[1] and see which locker each one picks.

Caption: "Reorder the lockers. The door numbers travel with the lockers and the places stay where they are."

The screen teaches without it, using the lockers in words and a table with the index 10, 20 and 30.

## filters-and-columns, step a-test-for-every-row

Shows: the four-order table with a narrow strip of True and False beside it, one cell per row, and the rows that pass drawn highlighted as the strip is laid over the table.

The learner can change: the limit in units >= n, and the operator between the two tests (& or |), and watch the strip and the kept rows update.

Caption: "Change the limit. Each row gets its own True or False, and only the True rows are kept."

The screens teach without it, using a stencil analogy in words and the two python_execution figures.

## text-and-transformations, step same-shop-different-text

Shows: the four tally entries 'Bay', ' bay', 'BAY ' and 'Hill' as rows of character boxes, with the leading space in ' bay', the capitals in 'BAY ' and the trailing space marked, so that the learner can see why the entries differ when they are compared character by character.

The learner can change: switch strip and lower on and off, and watch the character boxes change and the count of different entries drop from 4 to 2.

Caption: "Switch the cleaning steps on and off. Entries are the same shop once their characters match exactly."

The screen teaches without it, using the four spellings and the count of different shops in words.

## summaries-and-groups, step two-ways-to-be-typical

Shows: a number line from 0 to 20 thousand with the firm's four wages as dots at 2, 3, 4 and 19, a marker for the mean (7) and a marker for the median (3.5).

The learner can change: drag the largest wage along the line and watch the mean follow it while the median stays where it is.

Caption: "Drag the largest wage. The mean moves with it, and the median only moves when the order of the wages changes."

The screen teaches without it, using the firm's numbers in words and the two python_execution cases.

## combine-tables, step repeated-keys-multiply

Shows: four order rows on the left and an address book on the right, with a line from each order to each address row that shares its customer number. With the customer listed twice, eight lines are drawn.

The learner can change: remove the duplicate address row, or add a second one, and see the number of lines and the row count of the merged result change at once.

Caption: "Remove or add a duplicate address. Every order draws a line to every address with the same customer number."

The screen teaches without it, using four orders and two address lines in words and the two python_execution cases.

## reshape-a-report, step list-to-grid

Shows: the six-row list of shops and months beside an empty grid, with each row's figure shown moving into the cell where its shop row meets its month column.

The learner can change: swap which column becomes the rows and which becomes the headings, and add a second record for one pair to see the cell refuse a second value.

Caption: "Swap the rows and columns. Each record lands in exactly one cell, and a second record for the same pair has nowhere to go."

The screen teaches without it, using the python_execution cases and the two grids in words.
