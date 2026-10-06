import {
  beat,
  numeric as q,
  choose as c,
  card,
  area,
  primitive,
  tangent,
  type TeachingLesson,
} from "./definition.js";
export const accumulationLessons: TeachingLesson[] = [
  {
    id: "area-with-a-sign",
    title: "When areas cancel",
    summary:
      "Distinguish signed accumulation from geometric area and reverse integral bounds correctly.",
    moduleId: "cal-accumulate",
    sourceIds: ["cal-integral"],
    beats: [
      beat(
        "Below the axis",
        "The definite integral counts regions below the horizontal axis negatively. The constant function −2 on [0, 3] has signed accumulation −6, although the geometric area is 6.",
        ["Negative region", area([-2], 0, 3)],
        ["Positive region", area([2], 0, 3)],
      ),
      beat(
        "Opposite contributions",
        "For f(x) = x on [−2, 2], equal triangular regions lie below and above the axis. They contribute −2 and +2, so the signed integral is zero.",
        ["Both regions", area([0, 1], -2, 2)],
        ["Positive half", area([0, 1], 0, 2)],
      ),
      beat(
        "Area ignores the sign",
        "Geometric area is nonnegative. Add the magnitudes of the pieces, or integrate the absolute value of the function. Cancellation belongs to signed accumulation, not total area.",
        ["Equal cancellation", area([0, 1], -2, 2)],
        ["Unequal regions", area([0, 1], -1, 3)],
      ),
      beat(
        "Reverse the bounds",
        "Reversing the order of the bounds changes the sign: the integral from b to a is the negative of the integral from a to b. The graph itself does not change.",
        ["Unit-width strip", area([3], 1, 2)],
        ["Two-unit strip", area([3], 1, 3)],
      ),
    ],
    questions: [
      q(
        "Find the signed integral of f(x) = −2 from x = 0 to x = 3.",
        -6,
        "The constant contribution is −2 × 3 = −6.",
        "Use a signed height for each strip.",
      ),
      q(
        "Find the signed integral of f(x) = x from −2 to 2.",
        0,
        "The triangular contributions are −2 and +2, so they cancel.",
        "Compare the symmetric regions across the horizontal axis.",
      ),
      c(
        "For f(x) = x on [−2, 2], which describes the total geometric area?",
        [
          "Add both triangular magnitudes to get four",
          "Cancel both regions to get zero",
          "Count only the positive triangle",
        ],
        0,
        "Each triangle has area 2. Total geometric area is 4 even though the signed integral is zero.",
        "Area counts both regions positively.",
      ),
      q(
        "The integral of f(x) from 1 to 3 is 6. What is its integral from 3 to 1?",
        -6,
        "Reversing the bounds negates the integral, giving −6.",
        "Changing direction reverses the sign of accumulation.",
      ),
      q(
        "Find the signed integral of f(x) = x from −1 to 3.",
        4,
        "The negative triangle contributes −1/2 and the positive triangle contributes 9/2, giving 4.",
        "Subtract the below-axis triangular area from the above-axis area.",
      ),
      c(
        "Can a zero definite integral guarantee the function is zero everywhere on the interval?",
        [
          "No: positive and negative contributions can cancel",
          "Yes: every strip must have zero height",
          "Yes: the derivative must also vanish",
        ],
        0,
        "A nonzero function such as x on a symmetric interval can have zero net integral.",
        "Net accumulation does not measure the magnitude of every contribution.",
      ),
    ],
    cards: [
      card(
        "Find the integral of the constant −3 from 1 to 5.",
        -12,
        "Signed height −3 times width 4 gives −12.",
      ),
      card(
        "Find the signed integral of f(x) = 2x from −1 to 2.",
        3,
        "An antiderivative is x², so the integral is 4 − 1 = 3.",
      ),
    ],
  },
  {
    id: "the-two-ideas-connect",
    title: "Rates and areas connect",
    summary:
      "Evaluate definite integrals with antiderivatives and differentiate accumulation functions.",
    moduleId: "cal-accumulate",
    sourceIds: ["cal-fundamental"],
    beats: [
      beat(
        "Subtract endpoint values",
        "If F′ = f and f is continuous on [a, b], the fundamental theorem gives the integral as F(b) − F(a). For f(x) = 2x on [1, 3], use F(x) = x² to obtain 9 − 1 = 8.",
        ["Accumulate the rate", area([0, 2], 1, 3)],
        ["An antiderivative", primitive([0, 2])],
      ),
      beat(
        "Integrate a sum",
        "For f(x) = 2x + 1, an antiderivative is x² + x. On [0, 2], its endpoint difference is 6. Each term contributes to the same accumulated total.",
        ["Rate to integrate", area([1, 2], 0, 2)],
        ["Its antiderivative", primitive([1, 2])],
      ),
      beat(
        "The constant cancels",
        "Choosing F(x) = x² + 4 gives the same endpoint difference as x². A definite integral is a number; the arbitrary antiderivative constant cancels when subtracting.",
        ["Constant zero", primitive([0, 2], 0)],
        ["Constant four", primitive([0, 2], 4)],
      ),
      beat(
        "Accumulation has a rate",
        "For continuous f, the function A(x) = ∫ from a to x of f(t) dt has derivative A′(x) = f(x). Its instantaneous growth rate is the height of the original rate function at the moving boundary.",
        ["A growing integral", area([1, 0, 1], 0, 2)],
        ["Rate at the boundary", tangent([1, 0, 1], 2)],
      ),
    ],
    questions: [
      q(
        "Evaluate the integral of 2x from 1 to 3.",
        8,
        "An antiderivative is x²; endpoint subtraction gives 9 − 1 = 8.",
        "Use an antiderivative and subtract its value at the lower bound.",
      ),
      q(
        "Evaluate the integral of 2x + 1 from 0 to 2.",
        6,
        "An antiderivative is x² + x, giving (4 + 2) − 0 = 6.",
        "Integrate each term before applying the bounds.",
      ),
      c(
        "Why does the arbitrary constant disappear when a definite integral is evaluated using F(b) − F(a)?",
        [
          "The same constant is subtracted from itself",
          "Every antiderivative has constant zero",
          "Constants have no function values",
        ],
        0,
        "Using F + C gives F(b) + C − F(a) − C, so the constants cancel.",
        "Both endpoints use the same antiderivative.",
      ),
      q(
        "Let A(x) be the integral from 0 to x of (t² + 1) dt. Find A′(2).",
        5,
        "The fundamental theorem gives A′(x) = x² + 1, so A′(2) = 5.",
        "The derivative of accumulation is the current rate.",
      ),
      q(
        "Evaluate the integral of 3x² from 1 to 2.",
        7,
        "An antiderivative is x³; 2³ − 1³ = 7.",
        "Evaluate the antiderivative at both endpoints.",
      ),
      c(
        "Which procedure correctly evaluates a continuous rate's definite integral?",
        [
          "Subtract endpoint values of an antiderivative",
          "Find area under the antiderivative instead",
          "Multiply the endpoint derivatives",
        ],
        0,
        "The theorem uses F(b) − F(a), where F′ = f.",
        "The graph being accumulated and the antiderivative play different roles.",
      ),
    ],
    cards: [
      card(
        "Evaluate the integral of 4x + 2 from 1 to 3.",
        20,
        "An antiderivative is 2x² + 2x; 24 − 4 = 20.",
      ),
      card(
        "A(x) is the integral from 1 to x of (3t + 2) dt. Find A′(4).",
        14,
        "A′(x) = 3x + 2, giving 14.",
      ),
    ],
  },
  {
    id: "from-rate-to-amount",
    title: "How much has changed?",
    summary: "Recover amounts from net rates while keeping track of starting values and direction.",
    moduleId: "cal-accumulate",
    sourceIds: ["cal-net", "cal-fundamental"],
    beats: [
      beat(
        "A changing inflow",
        "An inflow r(t) = 2t + 3 litres per minute adds 10 litres over the first two minutes. Integrating a rate multiplies its units by time. The result is an amount, not another rate.",
        ["First two minutes", area([3, 2], 0, 2)],
        ["First three minutes", area([3, 2], 0, 3)],
      ),
      beat(
        "Add the initial amount",
        "The integral of a net rate gives the change. To recover the final amount, add that change to the initial amount. An initial 7 litres plus a 10-litre change gives 17 litres.",
        ["Rate over two minutes", area([3, 2], 0, 2)],
        ["Rate over one minute", area([3, 2], 0, 1)],
      ),
      beat(
        "Return trips can cancel",
        "Integrating signed velocity gives displacement. Integrating speed gives distance. For v(t) = 2t − 2 on [0, 2], backward and forward displacements cancel, but total distance is 2 metres.",
        ["Whole trip", area([-2, 2], 0, 2)],
        ["After the turn", area([-2, 2], 1, 2)],
      ),
      beat(
        "Subtract outflow from inflow",
        "If inflow is 3t + 4 L/min and outflow is 2 L/min, the net rate is 3t + 2. Integrate the difference over the same time interval, then add any starting amount.",
        ["Net inflow", area([2, 3], 0, 2)],
        ["Inflow alone", area([4, 3], 0, 2)],
      ),
    ],
    questions: [
      q(
        "Water enters at r(t) = 2t + 3 litres per minute. How many litres enter from t = 0 to t = 2 minutes?",
        10,
        "Integrate the rate: [t² + 3t] from 0 to 2 gives 4 + 6 = 10 L.",
        "Accumulate the rate over the whole interval.",
      ),
      q(
        "A tank starts with 7 L. Its net rate is 2t + 3 L/min for 0 ≤ t ≤ 2. How many litres are present at t = 2?",
        17,
        "The net change is 10 L, so the final amount is 7 + 10 = 17 L.",
        "The integral gives the change, which must be added to the starting amount.",
      ),
      c(
        "For velocity v(t) = 2t − 2 m/s on [0, 2], which statement is true?",
        [
          "Displacement is zero and distance is two metres",
          "Both displacement and distance are zero",
          "Both equal two metres",
        ],
        0,
        "The negative and positive triangular displacements cancel; their magnitudes add to 2 m.",
        "Use velocity for signed change and its magnitude for distance.",
      ),
      q(
        "Inflow is 3t + 4 L/min and outflow is 2 L/min. Find the net change in litres from t = 0 to t = 2.",
        10,
        "Net rate is 3t + 2. Its integral is [1.5t² + 2t] from 0 to 2 = 10 L.",
        "Subtract the rates before integrating.",
      ),
      q(
        "Position starts at 5 m and velocity is v(t) = 3t − 2 m/s. Find position at t = 2 seconds in metres.",
        7,
        "Displacement is [1.5t² − 2t] from 0 to 2 = 2 m. Add the initial 5 m to obtain 7 m.",
        "Add signed displacement to initial position.",
      ),
      c(
        "A rate has units litres per minute and is integrated with respect to minutes. What are the resulting units?",
        [
          "An accumulated volume in L",
          "A change in flow rate, measured in L/min²",
          "A reciprocal flow rate, measured in min/L",
        ],
        0,
        "The time unit cancels, leaving an accumulated volume in litres.",
        "Multiply the rate units by the integration variable's units.",
      ),
    ],
    cards: [
      card(
        "A tank starts with 4 L and its net rate is t + 2 L/min. Find the amount after 2 minutes in litres.",
        10,
        "The change is [t²/2 + 2t] from 0 to 2 = 6 L. Adding 4 L gives 10 L.",
      ),
      card(
        "Velocity is v(t) = 4t − 3 m/s. Find signed displacement from 0 to 2 seconds in metres.",
        2,
        "The integral is [2t² − 3t] from 0 to 2 = 8 − 6 = 2 m.",
      ),
    ],
  },
];
