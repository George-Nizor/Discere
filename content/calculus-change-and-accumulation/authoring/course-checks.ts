import type {
  CourseCheckDefinition,
  CalculusModel,
} from "../../../packages/contracts/src/index.js";
import { calculusLessons } from "./lessons.js";
import { limit, secant, tangent, primitive, area } from "./definition.js";
type Problem = [string, CalculusModel, number, string];
const sets: Problem[][] = [
  [
    [
      "Find the limit of (x² − 1)/(x − 1) as x approaches 1.",
      limit([1, 1], 1, true),
      2,
      "Away from 1, simplify to x + 1; the limit is 2.",
    ],
    [
      "For x ≠ 2, f(x) = 3x + 7. Which value of f(2) makes f continuous?",
      limit([7, 3], 2, true),
      13,
      "The surrounding line approaches 3 × 2 + 7 = 13.",
    ],
    [
      "For f(x) = x², find the average rate from 0 to 2.",
      secant([0, 0, 1], 0, 2),
      2,
      "The average rate is (4 − 0)/(2 − 0) = 2.",
    ],
    [
      "For f(x) = 4x³ − x, find f′(1).",
      tangent([0, -1, 0, 4], 1),
      11,
      "f′(x) = 12x² − 1, giving 11 at 1.",
    ],
    [
      "For f(x) = (2x + 3)², find f′(1).",
      tangent([9, 12, 4], 1),
      20,
      "The chain rule gives 4(2x + 3), or 20 at 1.",
    ],
    [
      "Position is s(t) = 2t³ metres. Find acceleration at t = 1 second in m/s².",
      tangent([0, 0, 0, 2], 1),
      12,
      "The first derivative is 6t² and the second is 12t, giving 12.",
    ],
    [
      "Find the maximum value of f(x) = 4x − x² on [0, 3].",
      tangent([0, 4, -1], 2),
      4,
      "The critical point at 2 has value 4. Endpoint values 0 and 3 are smaller.",
    ],
    [
      "Let F′(x) = 4x and F(0) = −2. Find F(2).",
      primitive([0, 4], -2),
      6,
      "F(x) = 2x² − 2, giving 6 at 2.",
    ],
    [
      "Use two left-endpoint rectangles for f(x) = 2x on [0, 4]. Find the sum.",
      area([0, 2], 0, 4, "rectangles", 2, "left"),
      8,
      "Width is 2 and heights are 0 and 4, giving 8.",
    ],
    [
      "Find the signed integral of the constant −4 from 0 to 3.",
      area([-4], 0, 3),
      -12,
      "Signed height −4 times width 3 gives −12.",
    ],
    [
      "Evaluate the integral of 6x² from 0 to 2.",
      area([0, 0, 6], 0, 2),
      16,
      "An antiderivative is 2x³, giving 16 at the upper bound and zero at the lower.",
    ],
    [
      "A tank starts with 9 L and its net rate is 2t L/min. Find the amount at t = 3 minutes in litres.",
      area([0, 2], 0, 3),
      18,
      "The accumulated change is [t²] from 0 to 3 = 9 L. Add the initial 9 L.",
    ],
  ],
  [
    [
      "Find the limit of (x² − 4)/(x + 2) as x approaches −2.",
      limit([-2, 1], -2, true),
      -4,
      "Away from −2 the quotient is x − 2, which approaches −4.",
    ],
    [
      "For x ≠ −2, f(x) = 2x + 6. Which value of f(−2) gives continuity?",
      limit([6, 2], -2, true),
      2,
      "The nearby values approach 2(−2) + 6 = 2.",
    ],
    [
      "For f(x) = x², find the average rate from 1 to 2.",
      secant([0, 0, 1], 1),
      3,
      "The average rate is (4 − 1)/(2 − 1) = 3.",
    ],
    [
      "For f(x) = 3x³ + 4x², find f′(2).",
      tangent([0, 0, 4, 3], 2),
      52,
      "f′(x) = 9x² + 8x, giving 36 + 16 = 52.",
    ],
    [
      "For f(x) = (3x − 2)², find f′(2).",
      tangent([4, -12, 9], 2),
      24,
      "f′(x) = 6(3x − 2), giving 24.",
    ],
    [
      "Position is s(t) = 3t³ − t metres. Find acceleration at t = 2 seconds in m/s².",
      tangent([0, -1, 0, 3], 2),
      36,
      "The second derivative is 18t, giving 36.",
    ],
    [
      "Find the maximum value of f(x) = 12x − x² on [0, 6].",
      tangent([0, 12, -1], 6),
      36,
      "The derivative vanishes at the endpoint 6, where the value is 36. The function increases up to that point.",
    ],
    [
      "Let F′(x) = 3x² − 1 and F(0) = 4. Find F(2).",
      primitive([-1, 0, 3], 4),
      10,
      "F(x) = x³ − x + 4, giving 8 − 2 + 4 = 10.",
    ],
    [
      "Use three right-endpoint rectangles for f(x) = x on [0, 3]. Find the sum.",
      area([0, 1], 0, 3, "rectangles", 3, "right"),
      6,
      "Width is 1 and heights are 1, 2, 3, giving 6.",
    ],
    [
      "Find the signed integral of f(x) = 2x from −2 to 1.",
      area([0, 2], -2, 1),
      -3,
      "An antiderivative is x². Subtract: 1 − 4 = −3.",
    ],
    [
      "A(x) is the integral from 0 to x of (2t² + 3) dt. Find A′(3).",
      area([3, 0, 2], 0, 3),
      21,
      "The fundamental theorem gives A′(x) = 2x² + 3, so A′(3) = 21.",
    ],
    [
      "A tank starts with 6 L. Inflow is t + 4 L/min and outflow is 1 L/min. Find its amount at t = 2 minutes in litres.",
      area([3, 1], 0, 2),
      14,
      "The net rate is t + 3, whose integral over two minutes is 8 L. Add the initial 6 L.",
    ],
  ],
  [
    [
      "Find the limit of (x² − 9)/(x + 3) as x approaches −3.",
      limit([-3, 1], -3, true),
      -6,
      "For nearby allowed inputs the expression is x − 3, giving limit −6.",
    ],
    [
      "For x ≠ 1, f(x) = 4x + 1. Which assigned value f(1) makes the function continuous?",
      limit([1, 4], 1, true),
      5,
      "The surrounding expression approaches 4 + 1 = 5.",
    ],
    [
      "For f(x) = 2x², find the average rate from 2 to 3.",
      secant([0, 0, 2], 2),
      10,
      "The output change is 18 − 8 over input change 1, giving 10.",
    ],
    [
      "For f(x) = 2x⁴ − 3x, find f′(1).",
      tangent([0, -3, 0, 0, 2], 1),
      5,
      "f′(x) = 8x³ − 3, giving 5.",
    ],
    [
      "For f(x) = (1 − 2x)³, find f′(0).",
      tangent([1, -6, 12, -8], 0),
      -6,
      "f′(x) = −6(1 − 2x)², giving −6.",
    ],
    [
      "Position is s(t) = 2t² + 5t metres. Find velocity at t = 3 seconds in m/s.",
      tangent([0, 5, 2], 3),
      17,
      "Velocity is 4t + 5, giving 17.",
    ],
    [
      "Find the maximum value of f(x) = 6x − x² on [0, 2].",
      tangent([0, 6, -1], 2),
      8,
      "The derivative is positive throughout the interval's interior. The largest value occurs at 2: 12 − 4 = 8.",
    ],
    [
      "Let F′(x) = 2x + 1 and F(0) = −3. Find F(2).",
      primitive([1, 2], -3),
      3,
      "F(x) = x² + x − 3, giving 3.",
    ],
    [
      "Use two midpoint rectangles for f(x) = x² on [0, 2]. Find the sum.",
      area([0, 0, 1], 0, 2, "rectangles", 2, "midpoint"),
      2.5,
      "Width is 1 and sampled heights are 0.25 and 2.25, giving 2.5.",
    ],
    [
      "Find the signed integral of f(x) = x − 1 from 0 to 3.",
      area([-1, 1], 0, 3),
      1.5,
      "An antiderivative is x²/2 − x. Its endpoint difference is 4.5 − 3 = 1.5.",
    ],
    [
      "Evaluate the integral of 3x² + 2 from 0 to 2.",
      area([2, 0, 3], 0, 2),
      12,
      "An antiderivative is x³ + 2x, giving 8 + 4 = 12.",
    ],
    [
      "A cart starts at 4 m. Its velocity is v(t) = 2t − 3 m/s. Find its position at t = 2 seconds in metres.",
      area([-3, 2], 0, 2),
      2,
      "Displacement is [t² − 3t] from 0 to 2 = −2 m. Add the initial position to obtain 2 m.",
    ],
  ],
];
const ids = ["starting-point", "mixed-challenge", "later-applications"];
const kinds = ["placement", "checkpoint", "transfer"] as const;
const titles = ["Find your starting point", "Put the ideas together", "Use it after a break"];
export const calculusChecks: CourseCheckDefinition[] = sets.map((problems, set) => ({
  id: ids[set]!,
  kind: kinds[set]!,
  title: titles[set]!,
  description: "Twelve fresh problems across limits, rates and accumulation.",
  requiredLessonIds: set ? calculusLessons.map((l) => l.id) : [],
  ...(set === 2 ? { afterCheckId: ids[1]!, delayDays: 7 } : {}),
  items: problems.map(([prompt, model, value, workedAnswer], i) => {
    const lesson = calculusLessons[i]!;
    return {
      lessonId: lesson.id,
      visual: { type: "calculus" as const, model },
      question: {
        id: "cal-check-" + ids[set] + "-" + lesson.id,
        conceptIds: ["cal-" + lesson.id],
        sourceIds: lesson.sourceIds,
        prompt,
        responseType: "numeric" as const,
        difficulty: 1,
        hints: [],
        answerAuthority: {
          kind: "numeric" as const,
          value,
          unit: "",
          absoluteTolerance: 1e-6,
          relativeTolerance: 0,
          workedAnswer,
        },
      },
    };
  }),
}));
