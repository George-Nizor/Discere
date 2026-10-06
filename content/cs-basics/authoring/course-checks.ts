import { authors, statements, table, program } from "../../_authoring/course-checks.js";
const {
  numeric: n,
  choice: c,
  sets,
} = authors("cs-basics", [
  {
    id: "steps-a-machine-could-follow",
    conceptIds: ["algorithm", "sequence"],
    sourceIds: ["python-assignments"],
  },
  {
    id: "choosing-between-paths",
    conceptIds: ["conditional-branch", "algorithm"],
    sourceIds: ["python-control", "python-assignments"],
  },
  {
    id: "doing-it-again",
    conceptIds: ["loop", "conditional-branch"],
    sourceIds: ["python-control", "python-assignments"],
  },
  {
    id: "looking-things-up",
    conceptIds: ["linear-search", "growth"],
    sourceIds: ["openstax-cs-search"],
  },
  {
    id: "halving-the-problem",
    conceptIds: ["binary-search", "linear-search"],
    sourceIds: ["openstax-cs-search"],
  },
  {
    id: "when-the-input-grows",
    conceptIds: ["growth", "binary-search", "linear-search"],
    sourceIds: ["openstax-cs-search"],
  },
]);
export const csCourseChecks = sets(
  [
    n(
      0,
      "What is x after the last assignment?",
      program("x = 6\nx = x + 4\nx = x * 3"),
      30,
      "The assignments store 6, then 10, then 30. Multiplication uses the value stored by the preceding line.",
    ),
    n(
      1,
      "Which value is stored in x when this program ends?",
      program("x = 12\nif x < 12:\n    x = x - 5\nelse:\n    x = x + 3"),
      15,
      "12 < 12 is false. Only the else branch runs, storing 12 + 3 = 15.",
    ),
    n(
      2,
      "After all five iterations, what is x?",
      program("x = 1\nfor i in range(5):\n    x = x + 3"),
      16,
      "range(5) produces five iterations. Starting from 1 and adding 3 five times gives 16.",
    ),
    n(
      3,
      "Linear search starts at the left and stops at its first match. How many value checks find 8?",
      statements("List and target", ["Values: [14, 6, 2, 19, 8, 11]", "Target: 8"]),
      5,
      "It inspects 14, 6, 2, 19 and then 8. The target has index 4, but finding it takes 5 value checks.",
    ),
    n(
      4,
      "Using the lower middle each time, how many value checks does binary search need to find 31?",
      statements("Sorted list", ["Values: [2, 5, 9, 14, 18, 24, 31, 40]", "Target: 31"]),
      3,
      "The inspected values are 14, then 24, then 31. After each mismatch, the sorted order rules out the lower half.",
    ),
    n(
      5,
      "For 63 already-sorted items with direct access, what is the worst-case number of binary-search value checks?",
      table(
        ["Search", "Items"],
        [
          ["Linear", "63"],
          ["Binary, lower middle", "63"],
        ],
      ),
      6,
      "At most 6 value checks are needed: floor(log₂ 63) + 1 = 6. Sorting and access costs are excluded by the question.",
    ),
  ],
  [
    n(
      2,
      "How many times is the while condition tested, including the final false test?",
      program("x = 11\nwhile x > 2:\n    x = x - 3"),
      4,
      "The condition is tested at x = 11, 8, 5 and 2. The first three tests run the body; the fourth is false.",
    ),
    n(
      0,
      "The first value is overwritten. What is the final x?",
      program("x = 13\nx = 4\nx = x * 5\nx = x - 6"),
      14,
      "The second line replaces 13 with 4. The remaining assignments store 20 and then 14.",
    ),
    c(
      5,
      "One lookup is needed. Count all the measured comparisons shown. Which plan uses fewer?",
      table(
        ["Plan", "Preparation", "Lookup"],
        [
          ["Linear search", "0", "20"],
          ["Sort then binary search", "50", "5"],
        ],
      ),
      ["Sort then binary search: 5 total", "Linear search: 20 total", "Both use 20 total"],
      1,
      "Linear search uses 0 + 20 = 20 comparisons. Sorting then searching uses 50 + 5 = 55; the small lookup count excludes its preparation.",
    ),
    c(
      1,
      "This rule should double x when its starting value is at least 10. Which replacement fixes the comparison?",
      program("x = 10\nif x > 10:\n    x = x * 2\nelse:\n    x = x - 1"),
      ["x < 10", "x == 10", "x >= 10"],
      2,
      "x >= 10 includes the boundary and every larger value. Equality alone would fail for values above 10.",
    ),
    n(
      3,
      "How many value checks does a full linear search need to establish that 9 is absent?",
      statements("Unsorted values", ["Values: [4, 17, 3, 12, 21, 7]", "Target: 9"]),
      6,
      "None of the six entries is 9. With no ordering shortcut, the search must check all six.",
    ),
    n(
      4,
      "Use the lower middle and stop when the candidate interval is empty. How many checks establish that 20 is absent?",
      statements("Sorted values", ["Values: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28]", "Target: 20"]),
      4,
      "The search checks 13, 22, 16 and 19. No candidates remain between 19 and 22, so it reports absence after four checks.",
    ),
  ],
  [
    n(
      0,
      "A packing routine changes the number of available slots. What value remains?",
      program("slots = 3\nslots = slots * 4\nslots = slots - 2"),
      10,
      "The routine expands 3 slots to 12 and then reserves 2, leaving 10.",
    ),
    n(
      3,
      "A catalogue is stored in the order shown. Starting at the left, how many entries must linear search inspect to find 23?",
      statements("Catalogue identifiers", [
        "[31, 8, 4, 16, 2, 49, 10, 7, 23, 9, 12, 35, 6]",
        "Stop on the first matching identifier.",
      ]),
      9,
      "23 is the ninth entry, at zero-based index 8. The search inspects nine entries.",
    ),
    n(
      1,
      "A delivery routine uses this boundary rule. What charge does it calculate?",
      program(
        "units = 4\ncharge = 7\nif units <= 4:\n    charge = charge\nelse:\n    charge = charge + 3",
      ),
      7,
      "4 <= 4 is true, so the first branch keeps charge at 7. The else branch does not run.",
    ),
    n(
      5,
      "An index contains 256 sorted records. With direct access and the lower-middle rule, what is the maximum number of binary-search value checks?",
      table(
        ["Property", "Given"],
        [
          ["Sorted records", "256"],
          ["Middle access", "direct"],
        ],
      ),
      9,
      "The bound is floor(log₂ 256) + 1 = 9 value checks. The longest route can include a final one-record interval.",
    ),
    n(
      2,
      "Orders are shipped in groups of five while at least five remain. How many are left after this routine?",
      program("orders = 14\nwhile orders >= 5:\n    orders = orders - 5"),
      4,
      "Two iterations change 14 to 9 and then 4. At 4, the condition is false and shipping stops.",
    ),
    c(
      4,
      "Can the usual binary-search discard rule safely find identifiers in this order?",
      statements("Unsorted identifiers", [
        "[18, 3, 29, 7, 21, 12]",
        "Use a middle value to decide which half to discard.",
      ]),
      [
        "Yes, because every identifier is different.",
        "No; the values must be sorted using the comparison order.",
        "Yes, if the middle value is odd.",
      ],
      1,
      "Distinct values do not guarantee that discarded positions are too small or too large. Sorting by the same comparison order supplies that guarantee.",
    ),
  ],
  [
    "Six problems about instructions and searches. Trace each case, then see which lessons will help.",
    "Combine sequencing, boundary checks and search costs. Results appear after all six responses.",
    "Apply code and search ideas to new routines after a week. No program is run for you during the check.",
  ],
);
