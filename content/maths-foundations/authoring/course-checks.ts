import type { CourseCheckDefinition, CourseCheckVisual } from "../../../packages/contracts/src/index.js";
const lessons = [
  "what-a-letter-stands-for",
  "keeping-the-balance",
  "undoing-in-the-right-order",
  "a-point-is-a-pair",
  "how-steep-is-it",
  "from-equation-to-line",
];
const sources = [
  "openstax-algebra-language",
  "openstax-algebra-equality",
  "openstax-algebra-solve",
  "openstax-algebra-coordinates",
  "openstax-algebra-slope",
  "openstax-algebra-line",
];
const concepts = [
  ["variable", "substitution"],
  ["balance", "inverse-operation"],
  ["inverse-operation", "balance"],
  ["coordinates"],
  ["gradient", "coordinates"],
  ["gradient", "intercept", "coordinates"],
];
const balance = (left: string, right: string): CourseCheckVisual => ({
  type: "balance",
  left,
  right,
});
const machine = (input: string, ...operations: string[]): CourseCheckVisual => ({
  type: "machine",
  input,
  operations,
  output: "?",
});
const points = (entries: Array<[number, number, string]>, connect = false): CourseCheckVisual => ({
  type: "coordinates",
  points: entries.map(([x, y, label]) => ({ x, y, label })),
  connect,
});
const table = (columns: string[], rows: string[][]): CourseCheckVisual => ({
  type: "table",
  columns,
  rows,
});
function numeric(
  id: string,
  lesson: number,
  prompt: string,
  visual: CourseCheckVisual,
  value: number,
  workedAnswer: string,
): CourseCheckDefinition["items"][number] {
  return {
    lessonId: lessons[lesson]!,
    visual,
    question: {
      id: "maths-check-" + id,
      conceptIds: concepts[lesson]!,
      sourceIds: [sources[lesson]!],
      prompt,
      responseType: "numeric",
      difficulty: 1,
      hints: [],
      answerAuthority: {
        kind: "numeric",
        value,
        unit: "",
        absoluteTolerance: 1e-9,
        relativeTolerance: 0,
        workedAnswer,
      },
    },
  };
}
function choice(
  id: string,
  lesson: number,
  prompt: string,
  visual: CourseCheckVisual,
  choices: string[],
  correct: number,
  reason: string,
) {
  const item = numeric(id, lesson, prompt, visual, 0, reason);
  const question: CourseCheckDefinition["items"][number]["question"] = {
    ...item.question,
    responseType: "short_text",
    choices: choices.map((label, i) => ({ id: String(i + 1), label })),
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [choices[correct]!],
      rejectedIdeas: [],
      exampleAnswer: reason,
    },
  };
  return { ...item, question };
}
export const mathsCourseChecks: CourseCheckDefinition[] = [
  {
    id: "starting-point",
    kind: "placement",
    title: "Find your starting point",
    description:
      "Six short problems across algebra and graphs. Answer without hints, then see which lessons will help.",
    requiredLessonIds: [],
    items: [
      numeric(
        "placement-value",
        0,
        "For x = -3, what is 2x + 7?",
        machine("x = -3", "× 2", "+ 7"),
        1,
        "Replace x with -3: 2 × (-3) + 7 = -6 + 7 = 1.",
      ),
      choice(
        "placement-balance",
        1,
        "Which change preserves the solutions of 3x + 5 = 20?",
        balance("3x + 5", "20"),
        [
          "Subtract 5 from the left side only",
          "Subtract 5 from both sides",
          "Divide the left side by 3 only",
        ],
        1,
        "Subtract 5 from both sides. Applying the same subtraction preserves equality, giving 3x = 15.",
      ),
      numeric(
        "placement-inverse",
        2,
        "Solve 4x - 3 = 17. What is x?",
        balance("4x - 3", "17"),
        5,
        "Add 3 to both sides to get 4x = 20, then divide both sides by 4: x = 5.",
      ),
      numeric(
        "placement-coordinate",
        3,
        "Point A is at (-4, 2). What is its x-coordinate?",
        points([[-4, 2, "A"]]),
        -4,
        "An ordered pair lists x first and y second. In (-4, 2), the x-coordinate is -4.",
      ),
      numeric(
        "placement-gradient",
        4,
        "What is the gradient of the straight line through A = (-2, -1) and B = (2, 7)?",
        points(
          [
            [-2, -1, "A"],
            [2, 7, "B"],
          ],
          true,
        ),
        2,
        "The rise is 7 - (-1) = 8 and the run is 2 - (-2) = 4. The gradient is 8/4 = 2.",
      ),
      numeric(
        "placement-intercept",
        5,
        "The equation is y = -2x + 6. At x = 0, what is y?",
        balance("y", "-2x + 6"),
        6,
        "At x = 0, y = -2 × 0 + 6 = 6. This is the vertical intercept.",
      ),
    ],
  },
  {
    id: "mixed-challenge",
    kind: "checkpoint",
    title: "Bring it together",
    description:
      "Eight new problems mix the ideas from this course. Your responses are saved one at a time; explanations appear after the last answer.",
    requiredLessonIds: lessons,
    items: [
      numeric(
        "final-gradient",
        4,
        "A straight line passes through A = (-3, 5) and B = (1, -3). What is its gradient?",
        points(
          [
            [-3, 5, "A"],
            [1, -3, "B"],
          ],
          true,
        ),
        -2,
        "The change in y is -3 - 5 = -8 and the change in x is 1 - (-3) = 4. The gradient is -8/4 = -2.",
      ),
      numeric(
        "final-value",
        0,
        "A machine doubles an input and subtracts 5. What is its output for an input of 8?",
        machine("8", "× 2", "- 5"),
        11,
        "The output is 2 × 8 - 5 = 16 - 5 = 11.",
      ),
      numeric(
        "final-inverse",
        2,
        "Solve 5x + 4 = -11. What is x?",
        balance("5x + 4", "-11"),
        -3,
        "Subtract 4 from both sides: 5x = -15. Divide by 5: x = -3. Checking gives -15 + 4 = -11.",
      ),
      choice(
        "final-balance",
        1,
        "A learner turns 2x + 6 = 18 into 2x = 18. Which repair preserves equality?",
        balance("2x + 6", "18"),
        [
          "Add 6 to the right side",
          "Divide the right side by 2",
          "Subtract 6 from the right side too",
        ],
        2,
        "Subtract 6 from the right side too. Removing 6 from both sides gives 2x = 12.",
      ),
      numeric(
        "final-coordinate",
        3,
        "Point P moves from (-2, 4) three units right and five units down. What is its new y-coordinate?",
        points([[-2, 4, "P"]]),
        -1,
        "Moving down changes y from 4 to 4 - 5 = -1. The new point is (1, -1).",
      ),
      numeric(
        "final-line",
        5,
        "The rule is y = 3x - 2. What is y when x = -2?",
        balance("y", "3x - 2"),
        -8,
        "Substitute x = -2: y = 3 × (-2) - 2 = -6 - 2 = -8.",
      ),
      numeric(
        "final-rate",
        4,
        "The table follows one straight-line rule. What is the change in y for each increase of 1 in x?",
        table(
          ["x", "y"],
          [
            ["1", "4"],
            ["3", "10"],
            ["5", "16"],
          ],
        ),
        3,
        "From x = 1 to x = 3, y increases by 6 while x increases by 2. The rate is 6/2 = 3 per unit of x.",
      ),
      choice(
        "final-equation",
        5,
        "Which equation matches every row of the table?",
        table(
          ["x", "y"],
          [
            ["0", "-3"],
            ["2", "1"],
            ["4", "5"],
          ],
        ),
        ["y = 2x - 3", "y = -3x + 2", "y = 2x + 3"],
        0,
        "y = 2x - 3. The intercept is -3 and y rises by 4 when x rises by 2, so the gradient is 2.",
      ),
    ],
  },
  {
    id: "later-transfer",
    kind: "transfer",
    title: "Use it a week later",
    description:
      "Six fresh applications check what you can still use after a gap. Choose an answer and your confidence before seeing the results.",
    requiredLessonIds: [],
    afterCheckId: "mixed-challenge",
    delayDays: 7,
    items: [
      numeric(
        "later-formula",
        0,
        "A hire service charges a fixed 9 credits plus 4 credits per hour. What does 3 hours cost? Enter the number of credits.",
        machine("3 hours", "× 4", "+ 9"),
        21,
        "The fixed charge is added once: 9 + 4 × 3 = 21 credits.",
      ),
      choice(
        "later-equality",
        1,
        "Three identical packs and 4 loose tokens weigh the same as 19 tokens. Which step isolates the three packs?",
        balance("3 packs + 4", "19 tokens"),
        [
          "Remove 4 tokens from both sides",
          "Remove 4 tokens from the left only",
          "Remove 19 tokens from both sides",
        ],
        0,
        "Remove 4 tokens from both sides. The three packs then balance 15 tokens, so each pack contains the weight of 5 tokens.",
      ),
      numeric(
        "later-budget",
        2,
        "An event charges 6 credits to enter and 3 credits per ride. You spend 24 credits. How many rides did you take?",
        balance("6 + 3r", "24"),
        6,
        "Remove the fixed charge: 24 - 6 = 18 credits. Divide by the cost per ride: 18/3 = 6 rides.",
      ),
      numeric(
        "later-map",
        3,
        "On a map, a marker starts at (3, -2). It moves 5 units west and 4 units north. What is its final x-coordinate?",
        points([[3, -2, "Start"]]),
        -2,
        "West decreases x: 3 - 5 = -2. North changes y, so the final point is (-2, 2).",
      ),
      numeric(
        "later-drain",
        4,
        "A tank empties at a constant rate. Using the table, what is the signed change in litres per minute?",
        table(
          ["Minutes", "Litres"],
          [
            ["2", "28"],
            ["6", "16"],
            ["10", "4"],
          ],
        ),
        -3,
        "The volume changes by 16 - 28 = -12 litres over 6 - 2 = 4 minutes. The signed rate is -12/4 = -3 litres per minute.",
      ),
      numeric(
        "later-start",
        5,
        "A machine adds 4 units of length per minute. After 3 minutes, the length is 19 units. What was the length at time zero?",
        table(
          ["Minutes", "Length"],
          [
            ["3", "19"],
            ["5", "27"],
            ["7", "35"],
          ],
        ),
        7,
        "Use length = 4 × time + starting length. Substituting gives 19 = 4 × 3 + starting length, so the starting length is 7 units.",
      ),
    ],
  },
];
