/** Further hints narrow the method without supplying the assessed result. */
export const numericHints: Record<string, Record<number, [string, string]>> = {
  "run-and-bind": {
    1: [
      "total is assigned before price changes.",
      "Evaluate 5 * 4 once; the later assignment affects only price.",
    ],
    2: [
      "Start with the initial value, then apply every update.",
      "Write 1 + 4 + 4 + 4 and calculate it.",
    ],
    5: ["The multiplication uses one unit cost for every unit.", "Calculate 6 * 7."],
    6: ["Update x before you use it to calculate y.", "Evaluate (3 + 2) * 4."],
  },
  "numbers-and-types": {
    1: [
      "The quotation marks disappear through conversion.",
      "Add the whole numbers represented by '14' and '6'.",
    ],
    2: [
      "The quotient lies between two negative integers.",
      "Choose the lower integer around -13 / 5.",
    ],
    5: [
      "Remove the largest multiple of 6 that does not exceed 19.",
      "Calculate 19 - (19 // 6) * 6.",
    ],
    6: ["This is exponentiation, not 3 * 4.", "Write four factors of 3 and multiply."],
  },
  "strings-and-slices": {
    1: [
      "The start is included and the stop excluded.",
      "Count positions beginning at 2 and ending just before 5.",
    ],
    3: [
      "The escape stands for a line break inside the string.",
      "Count a, the newline, and b as individual characters.",
    ],
    5: ["strip removes the outside spaces only.", "Count the letters between the spaces."],
    6: [
      "An omitted stop means the end of the string.",
      "Start three positions before the end and count forward.",
    ],
  },
  "lists-and-tuples": {
    1: [
      "b and a name the same object.",
      "Start with the original list length and add one appended item.",
    ],
    4: [
      "Select the items before summing them.",
      "Take the values at indices 1 and 2 and add them.",
    ],
    5: ["b has a separate outer list.", "The append changes b; count a's original items."],
    6: [
      "The original sequence contains two items.",
      "Repeat that two-item block three times and count.",
    ],
  },
  "keys-and-sets": {
    1: [
      "The key a is already present.",
      "Count distinct key names before and after the value replacement.",
    ],
    4: [
      "A candidate must occur in both sets.",
      "Test each member of the left set for membership in the right, then count matches.",
    ],
    5: ["A set stores each distinct member once.", "Cross out repeat occurrences before counting."],
    6: ["The requested key is b, not a.", "If b is absent, use the second argument to get."],
  },
  "conditions-and-loops": {
    1: [
      "Check units >= 10 before checking units >= 5.",
      "For 7 units, follow the first true condition to its assigned fee.",
    ],
    2: [
      "Start at 2 and keep adding the step of 2.",
      "List the generated values smaller than 9 and add them.",
    ],
    5: [
      "Check x < 10 before each addition.",
      "Write the sequence starting at 2; stop after the first value that fails the condition.",
    ],
    6: [
      "Write 5 and 3 in binary using the same width.",
      "Align the binary operands and keep only their shared set bits.",
    ],
  },
  "functions-and-imports": {
    1: ["The parameter x receives the argument 7.", "Apply the function's multiplication by 3."],
    2: [
      "Keyword names determine which value reaches each parameter.",
      "Multiply the supplied units by the supplied rate.",
    ],
    5: [
      "No rate argument was passed.",
      "Multiply the units by the default rate in the definition.",
    ],
    6: [
      "A square root reverses squaring for a nonnegative result.",
      "Find the whole number whose product with itself is 144.",
    ],
  },
  "errors-and-resources": {
    1: [
      "The input contains valid integer digits.",
      "Use the converted value because no exception is raised.",
    ],
    2: [
      "Mark each input as a successful or failed conversion.",
      "Add only the values from the successful conversions.",
    ],
    5: [
      "int cannot parse a decimal-point string as an integer string.",
      "Check each entry and count only conversion failures.",
    ],
    6: [
      "Ignore a line whose stripped content is empty.",
      "Convert the remaining two lines and add their values.",
    ],
  },
  "arrays-and-shape": {
    1: ["Multiply every array element, then reduce by addition.", "Calculate 3 * 2 + 5 * 2."],
    2: [
      "There are three rows, each containing four elements.",
      "Multiply the two dimension sizes.",
    ],
    5: [
      "The reshape must retain eighteen elements.",
      "Divide the total element count by three rows.",
    ],
    6: [
      "Each entry in the shape tuple describes one axis.",
      "Count entries in the shape tuple, without multiplying them.",
    ],
  },
  "array-calculations": {
    1: [
      "Broadcast the scalar addition to every position.",
      "Calculate (1 + 2) + (3 + 2) + (5 + 2).",
    ],
    2: [
      "axis=0 reduces values at the same column position.",
      "Add the top-left and bottom-left values.",
    ],
    5: [
      "axis=1 reduces each row separately.",
      "Take the second row's sum and divide by its number of columns.",
    ],
    6: [
      "The slice b points into a's storage.",
      "The write to b[1] changes the same element selected by a[1].",
    ],
  },
  "ranges-and-randomness": {
    1: [
      "Start with 3 and add 3 until the next value would reach the stop.",
      "Count the generated values strictly smaller than 15.",
    ],
    2: ["The endpoint setting was not changed.", "Use the supplied stop as the final endpoint."],
    5: [
      "The lower bound is included, and 9 is excluded.",
      "Count the integers beginning with 4 and stopping before 9.",
    ],
    6: [
      "Six endpoint-inclusive samples create five intervals.",
      "Divide the span 15 - 0 by the number of intervals.",
    ],
  },
  "read-and-inspect": {
    1: ["The header becomes column names.", "Count the data lines after the header."],
    2: ["shape puts the row count first.", "Read the second entry of the supplied shape."],
    5: [
      "There are enough rows to satisfy the requested preview.",
      "head takes the requested initial number of rows.",
    ],
    6: [
      "The returned preview is a separate selection.",
      "No statement replaces or edits df itself.",
    ],
  },
  "labels-and-positions": {
    1: [
      "Pair each label with the value at the same position.",
      "Find label 20 and read its associated value.",
    ],
    2: [
      "The sorted label slice includes both boundaries.",
      "Count the labels from 20 through 40 inclusive.",
    ],
    5: [
      "The positional slice excludes position 4.",
      "Count integer positions starting at 1 and stopping before 4.",
    ],
    6: [
      "The displayed Series order is b followed by a.",
      "Read the value paired with label a, not the first displayed value.",
    ],
  },
  "filters-and-columns": {
    1: [
      "Test >= 4 on each value separately.",
      "Count true comparisons, including a value equal to 4.",
    ],
    2: [
      "First identify Bay rows.",
      "Among those rows, count only the ones with units greater than 3.",
    ],
    5: ["Revenue is calculated for each row before summing.", "Calculate 2 * 7 + 3 * 5."],
    6: [
      "A scalar column assignment repeats the value for every row.",
      "Add five identical fees of 3.",
    ],
  },
  "missing-values": {
    1: [
      "Only the missing markers count here.",
      "Count the None entries and leave 0 as a known observation.",
    ],
    2: [
      "The missing entry does not enter the sum or denominator.",
      "Add the two known values and divide by two.",
    ],
    5: ["After filling, all three positions are known values.", "Calculate (3 + 0 + 9) / 3."],
    6: [
      "count includes every nonmissing position.",
      "Cross out the missing markers and count the remaining entries.",
    ],
  },
  "text-and-transformations": {
    1: [
      "Case conversion changes letters without adding characters.",
      "Remove surrounding whitespace and count the remaining letters.",
    ],
    2: [
      "Every source row contributes one cell to each split column.",
      "Multiply the number of source strings by two columns.",
    ],
    5: [
      "Each separator divides adjacent parts.",
      "Write the strings between commas and count the parts.",
    ],
    6: [
      "axis=1 means both operands come from the same row.",
      "Add the row's a value to its b value.",
    ],
  },
  "dates-and-units": {
    1: ["%d is day and %m is month.", "Read the middle field as the month number."],
    2: [
      "Both an impossible calendar day and unrecognisable text fail parsing.",
      "Count entries that cannot become dates under the given format.",
    ],
    5: ["Both offsets use the same unit.", "Subtract the earlier epoch offset from the later one."],
    6: [
      "The times of day are equal.",
      "Count elapsed midnight-to-midnight intervals between the two dates.",
    ],
  },
  "summaries-and-groups": {
    1: ["All four observations are known.", "Add the values and divide their sum by four."],
    2: ["The Hill row belongs to a different group.", "Add the two values attached to Bay."],
    5: [
      "There are an even number of observations.",
      "Average the second and third values in the sorted list.",
    ],
    6: [
      "Repeated shop names collapse to one distinct value.",
      "List each different name once, then count.",
    ],
  },
  "combine-tables": {
    1: ["No row-removal operation is requested.", "Add the row counts of both inputs."],
    2: [
      "Every left key has at most one matching right row.",
      "Count all left rows, including the unmatched key.",
    ],
    5: [
      "Each of the left occurrences matches every right occurrence.",
      "Multiply the number of left and right occurrences of this key.",
    ],
    6: [
      "Each left occurrence of a matching key produces one row here.",
      "Cross out the left key absent from the right, then count the remaining occurrences.",
    ],
  },
  "reshape-a-report": {
    1: [
      "Labels are not measurement cells.",
      "Multiply the number of shops by the number of month columns.",
    ],
    2: ["Both records map to the same output cell.", "Apply sum to their two unit values."],
    5: [
      "Each original row supplies three selected measurements.",
      "Multiply the original row count by the number of melted value columns.",
    ],
    6: ["The rule is mean instead of sum.", "Add the two values, then divide by their count."],
  },
  "audit-a-sales-report": {
    1: [
      "The first occurrence of each ID is kept unflagged.",
      "Count only the later repeated occurrence.",
    ],
    2: [
      "The paid flag defines which rows belong in the population.",
      "Count true flags and exclude false flags.",
    ],
    5: [
      "The unknown-price row has no known revenue contribution.",
      "Calculate 2 * 7 + 3 * 5; retain the missing-price caveat.",
    ],
    6: ["The third row now has a confirmed price.", "Calculate 2 * 7 + 3 * 5 + 4 * 6."],
  },
};
