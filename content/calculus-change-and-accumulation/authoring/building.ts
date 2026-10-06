import {
  beat,
  numeric as q,
  choose as c,
  card,
  tangent,
  primitive,
  area,
  type TeachingLesson,
} from "./definition.js";
export const buildingLessons: TeachingLesson[] = [
  {
    id: "when-a-curve-turns",
    title: "Where does the curve turn?",
    summary:
      "Use slope signs to identify local extrema and check endpoints for an absolute maximum.",
    moduleId: "cal-build",
    sourceIds: ["cal-extrema", "cal-rules"],
    beats: [
      beat(
        "A flat candidate",
        "The curve f(x) = 6x − x² has derivative 6 − 2x. Its derivative is zero at x = 3, which makes that point a candidate for a turning point.",
        ["At the peak", tangent([0, 6, -1], 3)],
        ["Before the peak", tangent([0, 6, -1], 1)],
      ),
      beat(
        "Signs tell the story",
        "For 6x − x², the slope is positive before 3 and negative after 3. Rising then falling identifies a local maximum. The graph's height there is 9.",
        ["Rising", tangent([0, 6, -1], 2)],
        ["Falling", tangent([0, 6, -1], 4)],
      ),
      beat(
        "Flat does not always turn",
        "The derivative of x³ is zero at 0, but the function keeps increasing through 0. A stationary point need not be a local maximum or minimum; inspect the slope on both sides.",
        ["Flat without turning", tangent([0, 0, 0, 1], 0)],
        ["Flat at a minimum", tangent([0, 0, 1], 0)],
      ),
      beat(
        "Include the endpoints",
        "On a closed interval, compare endpoint values with values at interior critical points. For f(x) = x² on [−1, 2], the maximum is 4 at the right endpoint, while the stationary point is a minimum.",
        ["Right endpoint", tangent([0, 0, 1], 2)],
        ["Interior minimum", tangent([0, 0, 1], 0)],
      ),
    ],
    questions: [
      q(
        "For f(x) = 6x − x², at which x is f′(x) zero?",
        3,
        "Solve 6 − 2x = 0 to obtain x = 3.",
        "Differentiate and solve for a zero slope.",
      ),
      q(
        "For f(x) = 6x − x², what is the height at its local maximum x = 3?",
        9,
        "f(3) = 18 − 9 = 9.",
        "Evaluate the original function at the turning point.",
      ),
      c(
        "For f(x) = x³, the derivative at 0 is zero. What happens there?",
        [
          "The curve keeps increasing through a flat point",
          "The curve reaches a local maximum",
          "The curve reaches a local minimum",
        ],
        0,
        "The slope is positive on both sides of 0, so there is no turn.",
        "Inspect neighbouring slopes, not just the zero slope.",
      ),
      q(
        "Find the maximum value of f(x) = x² on [−1, 2].",
        4,
        "Compare f(−1) = 1, f(0) = 0 and f(2) = 4. The maximum is 4.",
        "Check endpoints as well as the interior stationary point.",
      ),
      q(
        "Find the maximum value of f(x) = 8x − x² on [0, 6].",
        16,
        "The interior critical point is x = 4, giving 16. Endpoint values are 0 and 12.",
        "Find the stationary point, then compare all candidate values.",
      ),
      c(
        "For a differentiable function, why is f′(a) = 0 alone insufficient to prove a local extremum?",
        [
          "The function may keep increasing through a",
          "The derivative must equal the function value",
          "A horizontal tangent always marks a discontinuity",
        ],
        0,
        "A flat tangent can occur without a direction change, as for a cubic at zero.",
        "Use neighbouring behaviour to classify a candidate.",
      ),
    ],
    cards: [
      card(
        "For f(x) = 10x − x², at which x is the derivative zero?",
        5,
        "10 − 2x = 0 gives x = 5.",
      ),
      card(
        "Find the maximum value of f(x) = x² on [−3, 1].",
        9,
        "The values at −3, 0 and 1 are 9, 0 and 1. The maximum is 9.",
      ),
    ],
  },
  {
    id: "undoing-a-derivative",
    title: "Undo a rate of change",
    summary: "Recover a family of antiderivatives and use an initial value to fix the constant.",
    moduleId: "cal-build",
    sourceIds: ["cal-antiderivative"],
    beats: [
      beat(
        "A family of answers",
        "An antiderivative F has F′ = f. If f(x) = 2x, then x², x² + 3 and x² − 2 all work. Their differences are constants, which disappear under differentiation.",
        ["One member", primitive([0, 2], 0)],
        ["Shifted member", primitive([0, 2], 3)],
      ),
      beat(
        "Restore the power",
        "For a polynomial term axⁿ, an antiderivative is a xⁿ⁺¹/(n + 1). This rule applies when n ≠ −1; the reciprocal 1/x needs a logarithm, beyond this course's polynomial models.",
        ["Rate 3x²", primitive([0, 0, 3], 0)],
        ["Rate 6x²", primitive([0, 0, 6], 0)],
      ),
      beat(
        "Use the starting value",
        "If F′(x) = 2x and F(0) = 4, then F(x) = x² + C and the initial value gives C = 4. Without such a condition the constant remains undetermined.",
        ["Starts at four", primitive([0, 2], 4)],
        ["Starts at zero", primitive([0, 2], 0)],
      ),
      beat(
        "Check by differentiating",
        "Recovering a function from a rate can be checked directly: differentiate the proposed answer. If F′(x) = 3x² + 2 and F(0) = 1, then F(x) = x³ + 2x + 1.",
        ["Given rate", primitive([2, 0, 3], 1)],
        ["Different starting value", primitive([2, 0, 3], -1)],
      ),
    ],
    questions: [
      q(
        "An antiderivative of 2x has the form x² + C. If F(0) = 3, what is C?",
        3,
        "At zero, x² + C equals C, so C = 3.",
        "Substitute the initial input into the proposed antiderivative.",
      ),
      q(
        "Let F′(x) = 3x² and F(0) = 0. Find F(2).",
        8,
        "The antiderivative is x³ + C. The initial value gives C = 0, so F(2) = 8.",
        "Raise the exponent and divide by the new exponent.",
      ),
      c(
        "Which describes all antiderivatives of 2x on the real line?",
        ["x² + C, where C is any constant", "Only x²", "2x + C"],
        0,
        "Every vertical shift of x² has derivative 2x.",
        "A derivative cannot reveal a vertical shift.",
      ),
      q(
        "Let F′(x) = 3x² + 2 and F(0) = 1. Find F(2).",
        13,
        "F(x) = x³ + 2x + 1, hence F(2) = 8 + 4 + 1 = 13.",
        "Integrate each term and then use the initial value.",
      ),
      q(
        "Let F′(x) = 4x + 3 and F(0) = 2. Find F(3).",
        29,
        "F(x) = 2x² + 3x + 2, giving 18 + 9 + 2 = 29.",
        "The constant rate term becomes a linear term.",
      ),
      c(
        "What does an indefinite integral represent?",
        [
          "A family of antiderivatives with an arbitrary constant",
          "Always one numerical area",
          "A definite integral with fixed bounds",
        ],
        0,
        "An indefinite integral has no fixed endpoint bounds and includes an arbitrary constant.",
        "Distinguish recovering a function from evaluating a bounded accumulation.",
      ),
    ],
    cards: [
      card("Let F′(x) = 6x and F(0) = 2. Find F(2).", 14, "F(x) = 3x² + 2, so F(2) = 14."),
      card("Let F′(x) = 2x + 5 and F(0) = −1. Find F(3).", 23, "F(x) = x² + 5x − 1, giving 23."),
    ],
  },
  {
    id: "rectangles-that-refine",
    title: "Build an area from strips",
    summary: "Approximate an integral with equal-width rectangles and compare sampling choices.",
    moduleId: "cal-build",
    sourceIds: ["cal-rectangles"],
    beats: [
      beat(
        "Width times height",
        "A rectangle contributes its width times its sampled function value. For f(x) = x on [0, 4], two left-endpoint rectangles have width 2 and heights 0 and 2, giving a sum of 4.",
        ["Left endpoints", area([0, 1], 0, 4, "rectangles", 2, "left")],
        ["Right endpoints", area([0, 1], 0, 4, "rectangles", 2, "right")],
      ),
      beat(
        "Which edge do you use?",
        "For an increasing function, left-endpoint rectangles lie below the curve and right-endpoint rectangles above it. With the same partition, these sums bracket the integral.",
        ["Four from the left", area([0, 1], 0, 4, "rectangles", 4, "left")],
        ["Four from the right", area([0, 1], 0, 4, "rectangles", 4, "right")],
      ),
      beat(
        "Make the strips narrower",
        "For a continuous function on a fixed closed interval, refining equal-width partitions makes these sums converge to the integral. More rectangles are smaller steps toward a limit, not a new rate function.",
        ["Coarse approximation", area([0, 0, 1], 0, 2, "rectangles", 2, "left")],
        ["Finer approximation", area([0, 0, 1], 0, 2, "rectangles", 8, "left")],
      ),
      beat(
        "Sample the middle",
        "Midpoint rectangles use the function at each strip's centre. For the linear function f(x) = x on [0, 4], two midpoint rectangles exactly balance the omitted and excess triangular pieces.",
        ["Two midpoints", area([0, 1], 0, 4, "rectangles", 2, "midpoint")],
        ["Two left edges", area([0, 1], 0, 4, "rectangles", 2, "left")],
      ),
    ],
    questions: [
      q(
        "Approximate ∫ from 0 to 4 of x dx with two equal-width left-endpoint rectangles. Find their sum.",
        4,
        "Each width is 2; the sampled heights are 0 and 2. Sum = 2(0 + 2) = 4.",
        "Identify each rectangle's width before choosing its height.",
      ),
      q(
        "Use four right-endpoint rectangles for f(x) = x on [0, 4]. Find their sum.",
        10,
        "Width is 1 and heights are 1, 2, 3 and 4, giving 10.",
        "Right endpoints are at the far edge of each strip.",
      ),
      c(
        "For a continuous increasing function, which statement holds for left-endpoint sums on a fixed partition?",
        [
          "They are at most the integral",
          "They are always larger than the integral",
          "They always equal the integral",
        ],
        0,
        "Each left sample is no greater than the function elsewhere in its strip.",
        "Compare the curve with the rectangle within each strip.",
      ),
      q(
        "Use two midpoint rectangles for f(x) = x on [0, 4]. Find their sum.",
        8,
        "Width is 2 and midpoint heights are 1 and 3, so the sum is 2(1 + 3) = 8.",
        "Sample at the centre of each equal-width strip.",
      ),
      q(
        "Use two right-endpoint rectangles for f(x) = x² on [0, 2]. Find their sum.",
        5,
        "Width is 1 and heights are 1² and 2², so the sum is 5.",
        "Square each right endpoint before adding the rectangle areas.",
      ),
      c(
        "What happens to equal-width left sums for a continuous function as the number of rectangles tends to infinity?",
        [
          "They converge to the definite integral",
          "They become the derivative at the midpoint",
          "They always become zero",
        ],
        0,
        "The limiting accumulation is the definite integral.",
        "The interval stays fixed while each strip narrows.",
      ),
    ],
    cards: [
      card(
        "Use three left-endpoint rectangles for f(x) = x on [0, 6]. Find their sum.",
        12,
        "Width is 2 and heights are 0, 2, 4. The sum is 12.",
      ),
      card(
        "Use three midpoint rectangles for f(x) = 2x on [0, 3]. Find their sum.",
        9,
        "Width is 1 and midpoint heights are 1, 3, 5, giving 9.",
      ),
    ],
  },
];
