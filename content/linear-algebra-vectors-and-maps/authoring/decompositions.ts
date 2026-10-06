import {
  lesson,
  t,
  num,
  choice,
  recall,
  p,
  projection,
  length,
  dot,
  eigen,
  svd,
} from "./definition.js";
const m = "lin-decompositions-module",
  a = [
    [2, 1],
    [1, 2],
  ];
export const decompositionLessons = [
  lesson(
    "build-an-orthonormal-basis",
    "Build an orthonormal basis",
    "Subtract projections and normalise the remaining independent directions.",
    m,
    ["lin-orthogonal", "lin-projection"],
    [
      t(
        "Remove the shared direction",
        "Gram–Schmidt subtracts the projection onto an earlier direction. The residual is perpendicular to that direction and keeps the span when the original vectors are independent.",
        projection([1, 0], [1, 1]),
        projection([1, 0], [1, 0]),
        num(
          "Subtract the projection of v = (1, 0) onto u = (1, 1). What is the residual's y coordinate?",
          -0.5,
          "The projection is (0.5, 0.5), so the residual is (0.5, −0.5).",
          "Subtract the projected second coordinate from v's second coordinate.",
          { op: "residual", v: [1, 0], direction: [1, 1], index: 1 },
        ),
      ),
      t(
        "Set the first length",
        "Normalise the first nonzero direction. Dividing (1, 1) by its length gives each unit coordinate 1/√2.",
        length([1, 1]),
        length([1, -1]),
        num(
          "Normalise (1, 1). Give its first coordinate as a decimal.",
          0.7071067811865475,
          "The length is √2, so the first unit coordinate is 1/√2 ≈ 0.707107.",
          "Divide the first coordinate by the square root of two.",
          { op: "normalize", v: [1, 1], index: 0 },
        ),
      ),
      t(
        "Check orthogonality",
        "After removing the projection, normalise the residual. These steps produce perpendicular unit vectors; their dot product is zero.",
        dot([1, 1], [1, -1]),
        dot([1, 1], [1, 0]),
        num(
          "Find (1, 1) · (1, −1) before normalising the two directions.",
          0,
          "The products 1 and −1 cancel. Normalising both nonzero directions keeps their dot product zero.",
          "Add the two matching-coordinate products.",
          p(dot([1, 1], [1, -1])),
        ),
      ),
      t(
        "Stop at a redundant vector",
        "A dependent input produces a zero residual after its earlier components are removed. You cannot normalise it to create an additional basis direction.",
        projection([2, 2], [1, 1]),
        projection([2, 1], [1, 1]),
        choice(
          "For u = (1, 1) and v = (2, 2), can the Gram–Schmidt residual create a second unit basis vector?",
          ["Yes", "No"],
          1,
          "The projection equals v, so its residual is zero and cannot be normalised.",
          "Check whether v is already a multiple of u.",
        ),
      ),
    ],
    [
      num(
        "Subtract the projection of (3, 1) onto (1, 0). Give the residual's y coordinate.",
        1,
        "The projection is (3, 0), leaving residual (0, 1).",
        "Remove only the horizontal component.",
        { op: "residual", v: [3, 1], direction: [1, 0], index: 1 },
      ),
      num(
        "Normalise (−3, 4). Give the second coordinate.",
        0.8,
        "The length is 5, giving second coordinate 4/5 = 0.8.",
        "Divide by the positive length.",
        { op: "normalize", v: [-3, 4], index: 1 },
      ),
    ],
    [
      recall(
        "Subtract the projection of (2, 3) onto (0, 1). Give the residual's x coordinate.",
        2,
        "The projection is (0, 3), so the residual is (2, 0).",
        { op: "residual", v: [2, 3], direction: [0, 1], index: 0 },
      ),
      recall(
        "Normalise (1, −1). Give its second coordinate as a decimal.",
        -0.7071067811865475,
        "Divide by √2, giving −1/√2 ≈ −0.707107.",
        { op: "normalize", v: [1, -1], index: 1 },
      ),
    ],
  ),
  lesson(
    "eigenvectors-and-eigenvalues",
    "Eigenvectors and eigenvalues",
    "Find nonzero directions that a square map changes only by a scalar.",
    m,
    ["lin-eigen"],
    [
      t(
        "Keep one line",
        "An eigenvector is nonzero and satisfies A v = λv. Its output stays on the same line, and λ is its eigenvalue.",
        eigen(a, [1, 1]),
        eigen(a, [1, 0]),
        num(
          "For A = [(2, 1); (1, 2)] and v = (1, 1), find λ in A v = λv.",
          3,
          "A v = (3, 3) = 3(1, 1), so λ = 3.",
          "Multiply A by v, then compare corresponding coordinates.",
          p(eigen(a, [1, 1])),
        ),
      ),
      t(
        "Find another direction",
        "The same matrix can have different eigenvalues on different eigenvector directions. The direction matters.",
        eigen(a, [1, -1]),
        eigen(a, [1, 1]),
        num(
          "For A = [(2, 1); (1, 2)] and v = (1, −1), find λ.",
          1,
          "A v = (1, −1), so this direction has eigenvalue 1.",
          "Compare A v with the original signed vector.",
          p(eigen(a, [1, -1])),
        ),
      ),
      t(
        "Allow a reversal",
        "A negative eigenvalue reverses the direction along the eigenvector's line. Eigenvalues need not be positive.",
        eigen(
          [
            [-2, 0],
            [0, 3],
          ],
          [1, 0],
        ),
        eigen(
          [
            [-2, 0],
            [0, 3],
          ],
          [0, 1],
        ),
        num(
          "For A = [(−2, 0); (0, 3)] and v = (1, 0), find λ.",
          -2,
          "The output is (−2, 0) = −2v.",
          "Retain the output's sign.",
          p(
            eigen(
              [
                [-2, 0],
                [0, 3],
              ],
              [1, 0],
            ),
          ),
        ),
      ),
      t(
        "Reject a changed line",
        "The vector (1, 0) is sent to (2, 1) by this matrix. That output is not a scalar multiple of the input, so the candidate is not an eigenvector.",
        eigen(a, [1, 0]),
        eigen(a, [1, 1]),
        choice(
          "Is (1, 0) an eigenvector of A = [(2, 1); (1, 2)]?",
          ["Yes", "No"],
          1,
          "A scalar multiple of (1, 0) has second coordinate zero; the actual output's second coordinate is one.",
          "Check both coordinates of A v.",
        ),
      ),
    ],
    [
      num(
        "For A = [(4, 0); (0, 2)] and v = (0, 1), find λ.",
        2,
        "The output is (0, 2) = 2v.",
        "The input selects the second column.",
        p(
          eigen(
            [
              [4, 0],
              [0, 2],
            ],
            [0, 1],
          ),
        ),
      ),
      choice(
        "A nonzero v satisfies A v = 0. Is v an eigenvector?",
        ["Yes, with eigenvalue 0", "No"],
        0,
        "The equation is A v = 0v. A zero eigenvalue is allowed; the eigenvector itself must be nonzero.",
        "Distinguish a zero eigenvalue from a zero candidate vector.",
      ),
    ],
    [
      recall(
        "For A = [(3, 1); (0, 2)] and v = (1, 0), find λ.",
        3,
        "The first column is (3, 0) = 3v.",
        p(
          eigen(
            [
              [3, 1],
              [0, 2],
            ],
            [1, 0],
          ),
        ),
      ),
      recall(
        "For A = [(0, 0); (0, 4)] and v = (1, 0), find λ.",
        0,
        "The output is zero, so A v = 0v and λ = 0.",
        p(
          eigen(
            [
              [0, 0],
              [0, 4],
            ],
            [1, 0],
          ),
        ),
      ),
    ],
  ),
  lesson(
    "diagonalise-a-map",
    "Diagonalise a map",
    "Use an eigenvector basis to separate a square map into independent scalings.",
    m,
    ["lin-diagonal", "lin-eigen"],
    [
      t(
        "Use eigenvector coordinates",
        "If the columns of P are independent eigenvectors, A = P D P⁻¹. D contains their eigenvalues in the same column order.",
        eigen(a, [1, 1]),
        eigen(a, [1, -1]),
        num(
          "The first column of P is (1, 1) for A = [(2, 1); (1, 2)]. What is the first diagonal entry of D?",
          3,
          "This column has eigenvalue 3, so D's first diagonal entry is 3.",
          "Match the diagonal position to its eigenvector column.",
          p(eigen(a, [1, 1])),
        ),
      ),
      t(
        "Repeat a scaling",
        "For an eigenvector with eigenvalue λ, applying A twice multiplies the vector by λ². Diagonalisation makes higher powers simpler too.",
        eigen(a, [1, 1]),
        eigen(a, [1, -1]),
        num(
          "For A = [(2, 1); (1, 2)] and v = (1, 1), what scalar multiplies v in A²v?",
          9,
          "The eigenvalue is 3, so applying the map twice gives 3²v = 9v.",
          "Square the eigenvalue, rather than doubling it.",
          { op: "eigen_power", matrix: a, vector: [1, 1], power: 2 },
        ),
      ),
      t(
        "Require enough directions",
        "A square real matrix can be diagonalised over the reals only when it has a basis of real eigenvectors. A repeated eigenvalue alone does not guarantee enough independent directions.",
        eigen(
          [
            [1, 1],
            [0, 1],
          ],
          [1, 0],
        ),
        eigen(
          [
            [1, 1],
            [0, 1],
          ],
          [0, 1],
        ),
        choice(
          "A two-by-two real matrix has only one independent real eigenvector direction. Can it be diagonalised over the reals?",
          ["Yes", "No"],
          1,
          "It needs two independent eigenvectors to form an invertible basis matrix P.",
          "Count how many independent directions a plane basis needs.",
        ),
      ),
      t(
        "Match the order",
        "Reordering P's eigenvector columns also reorders D's matching eigenvalues. Keep each direction paired with its own scale.",
        eigen(a, [1, -1]),
        eigen(a, [1, 1]),
        num(
          "Now the first column of P is (1, −1) for A = [(2, 1); (1, 2)]. What is the first diagonal entry of D?",
          1,
          "This direction has eigenvalue 1, so the first diagonal entry must be 1.",
          "Find the eigenvalue belonging to this first column.",
          p(eigen(a, [1, -1])),
        ),
      ),
    ],
    [
      num(
        "For A = [(2, 0); (0, −1)] and v = (1, 0), what scalar multiplies v in A³v?",
        8,
        "The eigenvalue is 2, so three applications multiply by 2³ = 8.",
        "Raise the eigenvalue to the third power.",
        {
          op: "eigen_power",
          matrix: [
            [2, 0],
            [0, -1],
          ],
          vector: [1, 0],
          power: 3,
        },
      ),
      choice(
        "In A = P D P⁻¹, why must P be invertible?",
        [
          "Its columns must form a basis",
          "Its columns must all be zero",
          "Its determinant must be negative",
        ],
        0,
        "P converts between coordinate systems; independent spanning columns make that conversion reversible.",
        "Check the basis requirement on its columns.",
      ),
    ],
    [
      recall(
        "For A = [(3, 0); (0, 2)] and v = (0, 1), what scalar multiplies v in A³v?",
        8,
        "The eigenvalue is 2, so the scale after three applications is 2³ = 8.",
        {
          op: "eigen_power",
          matrix: [
            [3, 0],
            [0, 2],
          ],
          vector: [0, 1],
          power: 3,
        },
      ),
      recall(
        "Let P = [(1, 1); (1, −1)] and D = [(4, 0); (0, 2)]. Find entry (1, 1) of P D P⁻¹.",
        3,
        "The inverse is P/2. Multiplication gives [(3, 1); (1, 3)], with first entry 3.",
        {
          op: "diagonal_reconstruct",
          basis: [
            [1, 1],
            [1, -1],
          ],
          values: [4, 2],
          row: 0,
          column: 0,
        },
      ),
    ],
  ),
  lesson(
    "singular-value-decomposition",
    "Singular value decomposition",
    "Separate a rectangular map into orthogonal coordinate changes and nonnegative stretches.",
    m,
    ["lin-svd", "lin-orthogonal"],
    [
      t(
        "Read nonnegative stretches",
        "The singular value decomposition is A = U Σ Vᵀ. Singular values are nonnegative stretch factors, even when A reverses a direction.",
        svd([
          [3, 0],
          [0, -2],
        ]),
        svd([
          [3, 0],
          [0, 2],
        ]),
        num(
          "Find the largest singular value of A = [(3, 0); (0, −2)].",
          3,
          "The two stretch magnitudes are 3 and 2, so the largest singular value is 3.",
          "Use magnitudes for diagonal stretch factors.",
          p(
            svd([
              [3, 0],
              [0, -2],
            ]),
            0,
          ),
        ),
      ),
      t(
        "Keep a rectangular middle",
        "Every real rectangular matrix has an SVD. In the full form for an m-by-n matrix, U is m-by-m, Σ is m-by-n, and Vᵀ is n-by-n.",
        svd([
          [3, 0, 0],
          [0, 4, 0],
        ]),
        svd([
          [3, 0],
          [0, 4],
          [0, 0],
        ]),
        choice(
          "For a 2 × 3 matrix A, what is the shape of Σ in the full SVD?",
          ["2 × 3", "2 × 2", "3 × 3"],
          0,
          "The middle factor has the same rectangular shape as A.",
          "Match Σ's shape to A's input and output dimensions.",
        ),
      ),
      t(
        "Notice a missing stretch",
        "The number of positive singular values equals the rank. A rank-one two-by-two map has one positive singular value and one zero singular value.",
        svd([
          [1, 2],
          [2, 4],
        ]),
        svd([
          [1, 0],
          [0, 2],
        ]),
        num(
          "Find the smaller singular value of A = [(1, 2); (2, 4)].",
          0,
          "The matrix has rank one, so its second singular value is zero.",
          "Check the dependence of its columns.",
          p(
            svd([
              [1, 2],
              [2, 4],
            ]),
            1,
          ),
        ),
      ),
      t(
        "Separate the jobs",
        "U and V are orthogonal: they preserve lengths while changing axes by rotations or reflections. Σ performs the stretching. Use the phase controls after feedback to follow these jobs separately.",
        svd([
          [2, 1],
          [0, 1],
        ]),
        svd([
          [1, 2],
          [2, 4],
        ]),
        choice(
          "Which SVD factor performs the nonnegative stretching?",
          ["U", "Σ", "Vᵀ"],
          1,
          "The diagonal entries of Σ are the stretch factors; the orthogonal factors preserve lengths.",
          "Separate orthogonal changes of axes from diagonal scaling.",
        ),
      ),
    ],
    [
      num(
        "Find the largest singular value of A = [(0, 5); (2, 0); (0, 0)].",
        5,
        "The column directions are perpendicular with lengths 2 and 5; the largest stretch is 5.",
        "Measure the lengths of the two orthogonal columns.",
        p(
          svd([
            [0, 5],
            [2, 0],
            [0, 0],
          ]),
          0,
        ),
      ),
      num(
        "Find the smaller singular value of A = [(1, 0, 0); (0, 2, 0)].",
        1,
        "The two nonzero stretch factors are 2 and 1; the smaller is 1.",
        "Read the nonnegative coordinate stretches.",
        p(
          svd([
            [1, 0, 0],
            [0, 2, 0],
          ]),
          1,
        ),
      ),
    ],
    [
      recall(
        "Find the largest singular value of A = [(4, 0); (0, −6)].",
        6,
        "The singular values are the magnitudes 6 and 4.",
        p(
          svd([
            [4, 0],
            [0, -6],
          ]),
          0,
        ),
      ),
      recall(
        "Find the smaller singular value of A = [(0, 0); (3, 0); (0, 4)].",
        3,
        "The perpendicular column lengths are 3 and 4; the smaller singular value is 3.",
        p(
          svd([
            [0, 0],
            [3, 0],
            [0, 4],
          ]),
          1,
        ),
      ),
    ],
  ),
];
