import { lesson, t, num, choice, recall, p, system, span, add } from "./definition.js";
const m = "lin-systems-module",
  a = [
    [1, 1],
    [2, -1],
  ],
  b = [5, 1];
export const systemLessons = [
  lesson(
    "solve-by-row-reduction",
    "Solve by row reduction",
    "Use equivalent row operations to solve A x = b and check the result.",
    m,
    ["lin-row", "lin-equations"],
    [
      t(
        "Keep both sides together",
        "The augmented matrix places the right side beside the coefficients. Swapping equations, scaling a row by a nonzero number, or adding a multiple of another row preserves the solution set.",
        system(a, b),
        system(
          [
            [2, -1],
            [1, 1],
          ],
          [1, 5],
        ),
        num(
          "In Example's system, what is x₁?",
          2,
          "The equations are x₁ + x₂ = 5 and 2x₁ − x₂ = 1. Adding them gives 3x₁ = 6, so x₁ = 2.",
          "Add the equations to eliminate x₂.",
          p(system(a, b), 0),
        ),
      ),
      t(
        "Eliminate a variable",
        "Subtract twice the first equation from the second. Apply this operation to every entry, including the right side.",
        system(a, b),
        system(
          [
            [1, 1],
            [0, -3],
          ],
          [5, -9],
        ),
        num(
          "Starting from Example, perform R₂ ← R₂ − 2R₁. What is the new right side of row 2?",
          -9,
          "The new right side is 1 − 2 × 5 = −9.",
          "Apply the same subtraction to the right-hand entries.",
          {
            op: "row_operation",
            matrix: [
              [1, 1, 5],
              [2, -1, 1],
            ],
            target: 1,
            source: 0,
            factor: 2,
            index: 2,
          },
        ),
      ),
      t(
        "Make a pivot equal one",
        "After elimination, the second equation is −3x₂ = −9. Divide both sides by −3 to read the value of x₂.",
        system(
          [
            [1, 1],
            [0, -3],
          ],
          [5, -9],
        ),
        system(
          [
            [1, 1],
            [0, 1],
          ],
          [5, 3],
        ),
        num(
          "In Example's reduced system, what is x₂?",
          3,
          "Dividing −3x₂ = −9 by −3 gives x₂ = 3.",
          "Divide the right side by the coefficient.",
          p(
            system(
              [
                [1, 1],
                [0, -3],
              ],
              [5, -9],
            ),
            1,
          ),
        ),
      ),
      t(
        "Swap when needed",
        "A zero in the first pivot position may require swapping rows. It does not by itself mean the matrix is singular.",
        system(
          [
            [0, 1],
            [1, 1],
          ],
          [4, 6],
        ),
        system(
          [
            [1, 1],
            [0, 1],
          ],
          [6, 4],
        ),
        num(
          "For Example, find x₁.",
          2,
          "The first equation gives x₂ = 4. Then x₁ + 4 = 6, so x₁ = 2.",
          "Use the equation that already isolates x₂.",
          p(
            system(
              [
                [0, 1],
                [1, 1],
              ],
              [4, 6],
            ),
            0,
          ),
        ),
      ),
    ],
    [
      num(
        "Solve x₁ + x₂ = 5, x₂ + x₃ = 4, x₃ = 1. Give x₁.",
        2,
        "Read x₃ = 1, then x₂ = 3, then x₁ = 2.",
        "Work backward from the last equation.",
        p(
          system(
            [
              [1, 1, 0],
              [0, 1, 1],
              [0, 0, 1],
            ],
            [5, 4, 1],
          ),
          0,
        ),
      ),
      num(
        "Solve 2x₁ + x₂ = 8 and x₁ − x₂ = 1. Give x₂.",
        2,
        "The equations give x₁ = 3 and x₂ = 2; both original equations check.",
        "Add the equations to eliminate x₂.",
        p(
          system(
            [
              [2, 1],
              [1, -1],
            ],
            [8, 1],
          ),
          1,
        ),
      ),
    ],
    [
      recall(
        "Solve x₁ + x₂ = 9 and x₁ − x₂ = 3. Give x₁.",
        6,
        "Adding gives 2x₁ = 12, hence x₁ = 6.",
        p(
          system(
            [
              [1, 1],
              [1, -1],
            ],
            [9, 3],
          ),
          0,
        ),
      ),
      recall(
        "Solve 2x₁ = 10 and x₁ + x₂ = 8. Give x₂.",
        3,
        "The first equation gives x₁ = 5, so x₂ = 8 − 5 = 3.",
        p(
          system(
            [
              [2, 0],
              [1, 1],
            ],
            [10, 8],
          ),
          1,
        ),
      ),
    ],
  ),
  lesson(
    "one-none-or-many-solutions",
    "One, none or many solutions",
    "Classify systems using contradictions, pivots and free variables.",
    m,
    ["lin-row", "lin-solutions"],
    [
      t(
        "Read a unique solution",
        "A consistent system with a pivot in every variable column has one solution. Here the equations specify both coordinates directly.",
        system(
          [
            [1, 0],
            [0, 1],
          ],
          [2, 3],
        ),
        system(
          [
            [1, 1],
            [2, 2],
          ],
          [3, 6],
        ),
        choice(
          "How many solutions does Example have?",
          ["One solution", "No solution", "Infinitely many solutions"],
          0,
          "Every variable is fixed: x₁ = 2 and x₂ = 3.",
          "Check whether both variable columns have pivots.",
        ),
      ),
      t(
        "Find a contradiction",
        "An equation that reduces to 0 = 1 cannot be satisfied. A contradiction makes the entire system inconsistent.",
        system(
          [
            [1, 1],
            [2, 2],
          ],
          [3, 7],
        ),
        system(
          [
            [1, 1],
            [2, 2],
          ],
          [3, 6],
        ),
        choice(
          "How many solutions does Example's system have?",
          ["One solution", "No solution", "Infinitely many solutions"],
          1,
          "Subtracting twice the first equation from the second gives 0 = 1.",
          "Compare the second equation with twice the first.",
        ),
      ),
      t(
        "Leave a free variable",
        "When one equation is redundant, a variable may remain free. A consistent real system with a free variable has infinitely many solutions.",
        system(
          [
            [1, 1],
            [2, 2],
          ],
          [3, 6],
        ),
        system(
          [
            [1, 1],
            [2, 2],
          ],
          [3, 7],
        ),
        choice(
          "How many solutions does Example's dependent system have?",
          ["One solution", "No solution", "Infinitely many solutions"],
          2,
          "Both equations describe x₁ + x₂ = 3. Choosing x₂ freely determines x₁.",
          "Check whether the second equation adds a new restriction.",
        ),
      ),
      t(
        "Count free variables",
        "The number of free variables equals the number of variable columns minus the rank. The right-hand column does not represent another variable.",
        system(
          [
            [1, 0, 1],
            [0, 1, 2],
          ],
          [3, 4],
        ),
        system(
          [
            [1, 0, 1],
            [0, 0, 0],
          ],
          [3, 0],
        ),
        num(
          "How many free variables are in Example's consistent system?",
          1,
          "There are three variable columns and two pivots, leaving one free variable.",
          "Subtract pivot count from variable count.",
          {
            op: "nullity",
            matrix: [
              [1, 0, 1],
              [0, 1, 2],
            ],
          },
        ),
      ),
    ],
    [
      choice(
        "Does every homogeneous system A x = 0 include the zero vector as a solution?",
        ["Yes", "No"],
        0,
        "Multiplying any matrix by the zero vector gives zero.",
        "Substitute zero for every variable.",
      ),
      num(
        "How many free variables remain in x₁ + 2x₂ + 3x₃ = 0?",
        2,
        "One independent equation restricts three variables, leaving two free variables.",
        "Count three variables and one pivot.",
        { op: "nullity", matrix: [[1, 2, 3]] },
      ),
    ],
    [
      recall(
        "For A = [(1, 2, 0); (0, 0, 1)], how many free variables are in A x = 0?",
        1,
        "The rank is two and there are three columns, so one variable is free.",
        {
          op: "nullity",
          matrix: [
            [1, 2, 0],
            [0, 0, 1],
          ],
        },
      ),
      recall(
        "How many free variables are in 2x₁ + 4x₂ = 0?",
        1,
        "One pivot among two variable columns leaves one free variable.",
        { op: "nullity", matrix: [[2, 4]] },
      ),
    ],
  ),
  lesson(
    "spans-and-subspaces",
    "Spans and subspaces",
    "Describe all linear combinations and test the conditions for a subspace.",
    m,
    ["lin-span", "lin-subspaces"],
    [
      t(
        "Follow one line",
        "Multiples of one nonzero vector fill a line through the origin. Adding another vector on that same line does not enlarge the span.",
        span([
          [1, 2],
          [2, 4],
        ]),
        span([
          [1, 2],
          [2, 3],
        ]),
        num(
          "What is the dimension of the span of (1, 2) and (2, 4)?",
          1,
          "The second vector is twice the first, so their span is a line of dimension one.",
          "Check whether one vector is a scalar multiple.",
          p(
            span([
              [1, 2],
              [2, 4],
            ]),
          ),
        ),
      ),
      t(
        "Reach the plane",
        "Two independent plane vectors span the entire plane. Their linear combinations can move in two independent directions.",
        span([
          [1, 0],
          [1, 1],
        ]),
        span([
          [1, 0],
          [2, 0],
        ]),
        num(
          "What is the dimension of the span of (1, 0) and (1, 1)?",
          2,
          "They are not scalar multiples, so they span a two-dimensional plane.",
          "Compare their directions.",
          p(
            span([
              [1, 0],
              [1, 1],
            ]),
          ),
        ),
      ),
      t(
        "Keep zero and closure",
        "A subspace contains zero and stays inside itself under addition and scalar multiplication. A line y = 2x through the origin satisfies these conditions.",
        span([[1, 2]]),
        span([[0, 0]]),
        choice(
          "Is the set {(x, y): y = 2x} a subspace of the plane?",
          ["Yes", "No"],
          0,
          "It is the span of (1, 2); adding or scaling its vectors stays on that line.",
          "Write each point as a multiple of one vector.",
        ),
      ),
      t(
        "Check an offset",
        "The line y = 2x + 1 excludes the origin. This offset prevents it from being a subspace.",
        add([0, 0], [0, 1]),
        add([1, 2], [0, 1]),
        choice(
          "Is the set {(x, y): y = 2x + 1} a subspace of the plane?",
          ["Yes", "No"],
          1,
          "The zero vector does not satisfy y = 2x + 1.",
          "Test the point (0, 0).",
        ),
      ),
    ],
    [
      num(
        "Find the dimension of the span of (2, 1) and (−4, −2).",
        1,
        "The second vector is −2 times the first, so they span one line.",
        "Look for a scalar multiple.",
        p(
          span([
            [2, 1],
            [-4, -2],
          ]),
        ),
      ),
      num(
        "Write (5, 3) = c₁(1, 0) + c₂(1, 1). Find c₁.",
        2,
        "The second coordinate gives c₂ = 3; the first then gives c₁ = 2.",
        "Solve the second coordinate equation first.",
        p(
          system(
            [
              [1, 1],
              [0, 1],
            ],
            [5, 3],
          ),
          0,
        ),
      ),
    ],
    [
      recall(
        "Find the dimension of the span of (1, 1) and (1, −1).",
        2,
        "The vectors are independent, so they span the plane.",
        p(
          span([
            [1, 1],
            [1, -1],
          ]),
        ),
      ),
      recall(
        "Write (7, 3) = c₁(2, 0) + c₂(1, 1). Find c₁.",
        2,
        "The second coordinate fixes c₂ = 3, leaving 2c₁ = 4.",
        p(
          system(
            [
              [2, 1],
              [0, 1],
            ],
            [7, 3],
          ),
          0,
        ),
      ),
    ],
  ),
  lesson(
    "basis-and-dimension",
    "Basis and dimension",
    "Find a spanning independent set and use its vectors as coordinates.",
    m,
    ["lin-basis", "lin-coordinates", "lin-independence"],
    [
      t(
        "Remove redundancy",
        "A basis spans a space and is linearly independent. In the plane, the two standard coordinate vectors form a basis.",
        span([
          [1, 0],
          [0, 1],
        ]),
        span([
          [1, 0],
          [0, 0],
        ]),
        num(
          "How many vectors are in a basis for the whole plane?",
          2,
          "The plane has dimension two, so every basis of it has two vectors.",
          "Count independent coordinate directions.",
          p(
            span([
              [1, 0],
              [0, 1],
            ]),
          ),
        ),
      ),
      t(
        "Spanning is not enough",
        "The vectors (1, 0), (0, 1) and (1, 1) span the plane, but the third is the sum of the first two. A basis cannot contain that redundancy.",
        span([
          [1, 0],
          [0, 1],
          [1, 1],
        ]),
        span([
          [1, 0],
          [0, 1],
        ]),
        choice(
          "Do all three listed vectors form a basis for the plane?",
          ["Yes", "No"],
          1,
          "They are dependent because the third is the sum of the other two.",
          "Check whether one vector can be built from the others.",
        ),
      ),
      t(
        "Change the coordinates",
        "Coordinates depend on the chosen basis. For the ordered basis ((1, 1), (1, −1)), coordinates (3, 1) describe the usual vector (4, 2).",
        system(
          [
            [1, 1],
            [1, -1],
          ],
          [4, 2],
        ),
        system(
          [
            [1, 0],
            [0, 1],
          ],
          [4, 2],
        ),
        num(
          "Write (4, 2) = c₁(1, 1) + c₂(1, −1). Find c₁.",
          3,
          "The equations are c₁ + c₂ = 4 and c₁ − c₂ = 2. Adding gives c₁ = 3.",
          "Add the two coordinate equations.",
          p(
            system(
              [
                [1, 1],
                [1, -1],
              ],
              [4, 2],
            ),
            0,
          ),
        ),
      ),
      t(
        "Exclude zero from a basis",
        "A set containing the zero vector is dependent: multiplying that vector by a nonzero coefficient still gives zero. It cannot be a basis.",
        span([
          [1, 0],
          [0, 0],
        ]),
        span([
          [1, 0],
          [0, 1],
        ]),
        choice(
          "Do (1, 0) and (0, 0) form a basis for the plane?",
          ["Yes", "No"],
          1,
          "They span only one line, and the zero vector makes the set dependent.",
          "Check both independence and the size of the span.",
        ),
      ),
    ],
    [
      num(
        "What is the dimension of the span of (2, 1) and (1, 2)?",
        2,
        "Their determinant is 4 − 1 = 3, so the two vectors are independent.",
        "Try to express one as a scalar multiple of the other.",
        p(
          span([
            [2, 1],
            [1, 2],
          ]),
        ),
      ),
      num(
        "Write (7, 3) = c₁(1, 1) + c₂(2, 0). Find c₂.",
        2,
        "The second coordinate gives c₁ = 3; then 3 + 2c₂ = 7 gives c₂ = 2.",
        "Use the second coordinate to determine c₁.",
        p(
          system(
            [
              [1, 2],
              [1, 0],
            ],
            [7, 3],
          ),
          1,
        ),
      ),
    ],
    [
      recall(
        "Find the dimension of the span of (2, 0) and (0, 3).",
        2,
        "These two nonzero coordinate directions are independent.",
        p(
          span([
            [2, 0],
            [0, 3],
          ]),
        ),
      ),
      recall(
        "Write (6, 2) = c₁(1, 0) + c₂(1, 1). Find c₁.",
        4,
        "The second coordinate gives c₂ = 2, so c₁ = 6 − 2 = 4.",
        p(
          system(
            [
              [1, 1],
              [0, 1],
            ],
            [6, 2],
          ),
          0,
        ),
      ),
    ],
  ),
];
