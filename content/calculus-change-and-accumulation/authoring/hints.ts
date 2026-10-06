export const calculusHints: Record<string, Array<[string, string]>> = {
  "approaching-a-value": [
    ["This line is continuous at the target input.", "Insert the target input into x + 3."],
    [
      "Write the numerator as (x − 3)(x + 3).",
      "Cancel the common factor for allowed nearby inputs, then approach the excluded input.",
    ],
    [
      "Write the numerator as (x − 4)(x + 4).",
      "Approach the excluded input in the remaining linear expression.",
    ],
    [
      "Factor the numerator as (x − 5)(x + 5).",
      "Use the simplified line only for the nearby inputs.",
    ],
  ],
  "two-sides-and-continuity": [
    [
      "Use the branch whose condition is x < 0.",
      "Read the level on that branch as you move toward the boundary.",
    ],
    [
      "Use the branch whose condition is x ≥ 0.",
      "Read the level followed by inputs just above the boundary.",
    ],
    [
      "Continuity requires the assigned value to equal the surrounding limit.",
      "Substitute the excluded input into the surrounding linear expression.",
    ],
    [
      "The surrounding linear function has a well-defined limit.",
      "Evaluate that linear expression at the excluded input.",
    ],
  ],
  "from-secant-to-tangent": [
    [
      "Compute both endpoint heights by squaring.",
      "Subtract those heights and divide by the difference between the inputs.",
    ],
    [
      "The formula separates a constant part and a shrinking part.",
      "Remove the term that tends to zero and retain the constant part.",
    ],
    [
      "The derivative formula already describes the instantaneous rate.",
      "Evaluate that formula at the requested input.",
    ],
    [
      "Square each endpoint to find its height.",
      "Divide the difference of heights by the difference of inputs.",
    ],
  ],
  "rules-for-rates": [
    [
      "For x cubed the derivative is three times x squared.",
      "Square the requested input, then multiply by the derivative coefficient.",
    ],
    [
      "The derivative of the squared term is linear; the constant drops out.",
      "Evaluate that linear derivative at the requested input.",
    ],
    [
      "Differentiate the squared term while retaining its coefficient.",
      "Substitute the input into the resulting linear derivative.",
    ],
    [
      "Differentiate the cubic and linear terms separately.",
      "Evaluate both derivative terms at the requested input and combine them.",
    ],
  ],
  "a-rate-inside-a-rate": [
    [
      "The derivative is the outer square's rate multiplied by the slope of the inner line.",
      "Evaluate the inner expression, then multiply by both rate factors.",
    ],
    [
      "The derivative of the inner expression is negative.",
      "Multiply twice the inner expression by its signed rate.",
    ],
    [
      "The derivative of a cube is three times the square of its input.",
      "Square the inner value before multiplying by both rate factors.",
    ],
    [
      "The outer rate is three times the square of the inner expression.",
      "Multiply by the derivative of the inner line after evaluating its squared value.",
    ],
  ],
  "position-velocity-acceleration": [
    [
      "Differentiate each position term with respect to time.",
      "Substitute the requested time into the velocity expression.",
    ],
    [
      "Differentiate the cubic once to obtain velocity.",
      "Differentiate that velocity again before evaluating the time.",
    ],
    [
      "The derivative of the squared time is linear in time.",
      "Evaluate this instantaneous rate at the requested time.",
    ],
    [
      "The velocity is quadratic minus a linear term.",
      "Differentiate both velocity terms and substitute the requested time.",
    ],
  ],
  "when-a-curve-turns": [
    [
      "The derivative is a constant minus a linear term.",
      "Set that expression equal to zero and isolate the input.",
    ],
    [
      "The requested quantity is height, not the input coordinate.",
      "Substitute the given peak input into the original quadratic.",
    ],
    [
      "Compare both endpoint heights with the interior critical point's height.",
      "The squared function's stationary point is a minimum.",
    ],
    [
      "Solve for the zero of the derivative, keeping only points in the interval.",
      "Evaluate the original function at that point and both endpoints; select the largest.",
    ],
  ],
  "undoing-a-derivative": [
    [
      "Substitute zero into x squared plus the constant.",
      "Match the remaining constant to the supplied initial value.",
    ],
    [
      "The antiderivative of the given rate is a cubic plus a constant.",
      "Use the zero initial value to fix the constant, then evaluate the cubic.",
    ],
    [
      "The antiderivative is a cubic plus a linear term and a constant.",
      "Use the initial value to fix the constant before evaluating the requested input.",
    ],
    [
      "The antiderivative of the linear rate is quadratic plus a linear term and a constant.",
      "Use the starting value for the constant, then evaluate all terms at the requested input.",
    ],
  ],
  "rectangles-that-refine": [
    [
      "Divide the full interval length by the rectangle count.",
      "Use each strip's left edge for its height, then add width times height.",
    ],
    [
      "The strip width is the interval length divided by the count.",
      "Use the right edges as inputs, then multiply their summed heights by the width.",
    ],
    [
      "Locate the centre of each equal-width strip.",
      "Evaluate the function at those centres and multiply their summed heights by strip width.",
    ],
    [
      "Take the right edge of each strip, then square that input.",
      "Add the resulting heights after multiplying by their common width.",
    ],
  ],
  "area-with-a-sign": [
    [
      "The interval width is upper bound minus lower bound.",
      "Multiply this positive width by the signed constant height.",
    ],
    [
      "One triangular contribution is negative and the other is positive.",
      "Their magnitudes agree by symmetry; combine them with signs.",
    ],
    [
      "The original and reversed integrals sum to zero.",
      "Take the additive inverse of the given integral.",
    ],
    [
      "Split the interval at the zero crossing.",
      "Compute the two triangular magnitudes, then combine with their signs.",
    ],
  ],
  "the-two-ideas-connect": [
    [
      "The squared function is an antiderivative of the given linear rate.",
      "Subtract its lower-endpoint value from its upper-endpoint value.",
    ],
    [
      "An antiderivative contains a squared term and a linear term.",
      "Evaluate that antiderivative at both bounds and subtract in upper-minus-lower order.",
    ],
    [
      "The moving upper bound is the input of the original integrand.",
      "Evaluate that integrand at the requested boundary.",
    ],
    [
      "The given quadratic's antiderivative is a cubic.",
      "Evaluate the cubic at both bounds and subtract.",
    ],
  ],
  "from-rate-to-amount": [
    [
      "An antiderivative of the inflow is a quadratic plus a linear term.",
      "Evaluate its endpoint difference over the requested time interval.",
    ],
    [
      "First evaluate the integral of the net inflow over the interval.",
      "Add this change to the starting volume.",
    ],
    [
      "The net rate equals inflow minus outflow at each time.",
      "Integrate the net linear rate and evaluate its endpoint difference.",
    ],
    [
      "Integrate velocity to get signed displacement over the interval.",
      "Add displacement to the initial position.",
    ],
  ],
};
