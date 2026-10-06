// Final hint steps show a concrete method while withholding the assessed final response.
export const numericLastHints: Record<string, string> = {
  "rows-and-keys-2": "Follow customer_id in the order table; orders 101 and 102 belong to Ada.",
  "rows-and-keys-4": "Add Elm to Ada, Ben, Cy and Dee; count the resulting people.",
  "rows-and-keys-5": "Evaluate 3 × 2; each customer contributes two order rows.",
  "select-and-name-1": "The SELECT list is id, amount. Count each listed column once.",
  "select-and-name-3": "Evaluate 80 × 2; AS would only name the result column.",
  "select-and-name-4": "Evaluate 20 + 10; multiplication is not part of this expression.",
  "select-and-name-5": "Evaluate 15 × 3, keeping the alias separate from the value.",
  "filter-the-rows-1": "Inspect orders 101, 103 and 104; each passes the inclusive threshold.",
  "filter-the-rows-2":
    "Orders 101 and 103 pass both conditions; the other known large order is pending.",
  "filter-the-rows-4": "The Book rows are 102 and 105; the Lamp rows are 104 and 106.",
  "filter-the-rows-5":
    "The known amounts are 80, 20, 80, 40 and 20. Keep only strict interior values.",
  "sort-and-limit-2": "Among the tied maximum amounts, choose the smaller order id.",
  "sort-and-limit-3": "Evaluate 80 + 80 + 40 after selecting the three largest known amounts.",
  "sort-and-limit-5":
    "Use the smaller of the eligible-row count and the limit; LIMIT adds no rows.",
  "distinct-results-1":
    "Collect the set of customer ids before counting it: repeated references do not add new members.",
  "distinct-results-3": "The known amount set is 20, 40 and 80; count those distinct members.",
  "distinct-results-4":
    "List each customer's statuses separately, then count different full pairs.",
  "distinct-results-5": "The remaining values are North, South and NULL; count these result rows.",
  "aggregate-known-values-1":
    "Order 106 has no known amount; inspect the amounts on all the other orders.",
  "aggregate-known-values-2": "Evaluate 240 ÷ 5; NULL is outside this denominator.",
  "aggregate-known-values-3":
    "The pending amounts are a known value on order 104 and NULL on order 106; only the known value participates.",
  "aggregate-known-values-5": "Evaluate (10 + 30) ÷ 2; the missing observation is excluded.",
  "group-and-filter-groups-1": "The groups are Book, Desk and Lamp; each gets a result row.",
  "group-and-filter-groups-2":
    "In the Lamp group, order 104 has an amount and order 106 has NULL. Count only the known cell.",
  "group-and-filter-groups-4": "Evaluate 80 + 80 for the eligible Desk orders.",
  "group-and-filter-groups-5":
    "The totals are Book 40, Desk 160 and Lamp 40; test each with >= 40.",
  "join-matching-rows-1":
    "Ada, Ben and Cy each have two matches; Dee contributes none to an inner join.",
  "join-matching-rows-3": "Evaluate 4 × 6 for every possible customer-order pair.",
  "join-matching-rows-5": "Evaluate 2 + 0 + 1; each matching order contributes a row.",
  "preserve-the-left-table-1": "Add Dee's preserved unmatched row to the six order matches.",
  "preserve-the-left-table-2":
    "Dee's order id is NULL; COUNT(o.id) counts only non-NULL matched keys.",
  "preserve-the-left-table-5":
    "Add Ada's two paid matches, Ben's paid match, Cy's paid match and Dee's preserved row.",
  "preserve-the-left-table-6":
    "Inspect order 106's missing amount and the NULL fields in Dee's unmatched row.",
  "preserve-either-side-2":
    "Add the six matching pairs and the two unmatched rows from opposite sides.",
  "preserve-either-side-4":
    "The unmatched order ids are 104, 106 and 107; count the records rather than their customer references.",
  "preserve-either-side-5":
    "Keep every id from A, then add the id from B that is not already represented.",
  "ask-a-query-inside-a-query-1": "The threshold is 240 ÷ 5; test each known amount against it.",
  "ask-a-query-inside-a-query-2": "North's customer ids are 1 and 3; each contributes two orders.",
  "ask-a-query-inside-a-query-4":
    "Each known amount equals its item's mean. Test whether equality satisfies a strict > comparison.",
  "ask-a-query-inside-a-query-5":
    "Mark each customer whose order count is positive, then count marked customers once.",
  "combine-result-sets-2":
    "Take four paid ids and three large ids, then remove the two repeated ids.",
  "combine-result-sets-3":
    "The two selections contribute four and three rows. Their labels make even repeated ids distinct.",
  "combine-result-sets-4":
    "Compare the increasing unique ids and choose the third position after deduplication.",
  "combine-result-sets-5": "Evaluate 3 + 2; UNION ALL retains the overlapping id's occurrences.",
  "rank-with-ties-2": "Ordinary rank equals one plus the number of rows whose amount is greater.",
  "rank-with-ties-3": "Dense rank equals one plus the number of distinct greater amount values.",
  "rank-with-ties-5": "Count the two rows with 90, then add one for the next row's ordinary rank.",
  "partition-the-window-1":
    "Order 103 starts customer 2's id-ordered partition; numbering restarts there.",
  "partition-the-window-2": "Evaluate 80 + 20 + 80 + 20 for the paid partition.",
  "partition-the-window-3":
    "Distribute five records across three buckets with larger buckets first and size differences at most one.",
  "partition-the-window-5":
    "Distribute seven records across three buckets, giving the first bucket the extra record.",
  "running-totals-and-neighbours-1": "Evaluate 80 + 20 + 80; later ids are outside this frame.",
  "running-totals-and-neighbours-3":
    "Read the amount on order 103; it precedes 104 in the specified order.",
  "running-totals-and-neighbours-4":
    "Read the amount on order 104; it follows 103 in the specified order.",
  "running-totals-and-neighbours-5":
    "Add the known values 10 and 30; the NULL cell contributes no known value.",
};
