import {
  lesson,
  t,
  num,
  choice,
  recall,
  p,
  transpose,
  apply,
  multiply,
  inverse,
  system,
  add,
} from "./definition.js";
const m = "lin-maps-module",
  a = [
    [1, 4, -2],
    [3, 0, 5],
  ];
export const mapLessons = [
  lesson(
    "matrix-shape-and-transpose",
    "Matrix shape and transpose",
    "Read rows and columns, transpose entries and check input dimensions.",
    m,
    ["lin-product", "lin-equations"],
    [
      t(
        "Read the shape",
        "A matrix's shape gives its row count followed by its column count. This example has two rows and three columns.",
        transpose(a),
        transpose([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
        num(
          "How many rows does A have in Example?",
          2,
          "There are two horizontal rows.",
          "Count the horizontal rows.",
          { op: "shape", matrix: a, axis: 0 },
        ),
      ),
      t(
        "Count the input coordinates",
        "A matrix with three columns multiplies a vector with three entries. The output has one entry for each matrix row.",
        apply(a, [1, 0, 0]),
        apply(
          [
            [1, 2],
            [3, 4],
            [5, 6],
          ],
          [1, 0],
        ),
        num(
          "How many entries must v have for A v in Example?",
          3,
          "A has three columns, so the input must have three entries.",
          "Match the input length to the column count.",
          { op: "shape", matrix: a, axis: 1 },
        ),
      ),
      t(
        "Swap row and column",
        "Transposition moves entry (i, j) to position (j, i). It changes a two-by-three matrix into a three-by-two matrix.",
        transpose(a),
        transpose([
          [1, 3],
          [4, 0],
          [-2, 5],
        ]),
        num(
          "For A in Example, what is entry (3, 2) of Aᵀ? Count from 1.",
          5,
          "Entry (3, 2) of Aᵀ is entry (2, 3) of A, which is 5.",
          "Swap the two coordinate indices.",
          p(transpose(a), [2, 1]),
        ),
      ),
      t(
        "Transpose the shape",
        "Transposing swaps the shape's dimensions. Doing it twice returns the original entries and shape.",
        transpose(a),
        transpose([
          [1, 3],
          [4, 0],
          [-2, 5],
        ]),
        num(
          "How many columns does Aᵀ have for Example?",
          2,
          "The original has two rows, so its transpose has two columns.",
          "Rows of A become columns of Aᵀ.",
          { op: "shape", matrix: a, transpose: true, axis: 1 },
        ),
      ),
    ],
    [
      num(
        "Transpose [(2, −1); (7, 3); (4, 0)]. Find entry (2, 1), counting from 1.",
        -1,
        "This is the original entry (1, 2), which is −1.",
        "Exchange row and column indices.",
        p(
          transpose([
            [2, -1],
            [7, 3],
            [4, 0],
          ]),
          [1, 0],
        ),
      ),
      num(
        "A has three rows and two columns. How many columns does Aᵀ have?",
        3,
        "The transpose's column count is the original row count: 3.",
        "Swap the two shape dimensions.",
        {
          op: "shape",
          matrix: [
            [1, 0],
            [0, 1],
            [1, 1],
          ],
          transpose: true,
          axis: 1,
        },
      ),
    ],
    [
      recall(
        "Transpose [(3, 6, 9); (2, 5, 8)]. Find entry (2, 1), counting from 1.",
        6,
        "The requested entry is the original entry (1, 2), which is 6.",
        p(
          transpose([
            [3, 6, 9],
            [2, 5, 8],
          ]),
          [1, 0],
        ),
      ),
      recall(
        "How many rows are in [(1, 0); (0, 1); (2, 3)]?",
        3,
        "There are three horizontal rows.",
        {
          op: "shape",
          matrix: [
            [1, 0],
            [0, 1],
            [2, 3],
          ],
          axis: 0,
        },
      ),
    ],
  ),
  lesson(
    "linear-transformations",
    "Linear transformations",
    "Apply a matrix and distinguish linear maps from translations.",
    m,
    ["lin-transform", "lin-equations"],
    [
      t(
        "Weight the columns",
        "The entries of v weight the columns of A. Equivalently, each output entry is the dot product of one matrix row with v.",
        apply(
          [
            [2, 1],
            [0, 1],
          ],
          [1, 2],
        ),
        apply(
          [
            [2, 1],
            [0, 1],
          ],
          [2, 1],
        ),
        num(
          "In Example, what is the first coordinate of A v?",
          4,
          "The first row gives 2 × 1 + 1 × 2 = 4.",
          "Use the first matrix row and both input entries.",
          p(
            apply(
              [
                [2, 1],
                [0, 1],
              ],
              [1, 2],
            ),
            0,
          ),
        ),
      ),
      t(
        "Read a basis image",
        "Multiplying by (1, 0) selects the first column. The columns tell us where the coordinate directions go.",
        apply(
          [
            [1, -2],
            [3, 1],
          ],
          [1, 0],
        ),
        apply(
          [
            [1, -2],
            [3, 1],
          ],
          [0, 1],
        ),
        num(
          "In Example, what is the second coordinate of A(1, 0)?",
          3,
          "The first column is (1, 3), so the second coordinate is 3.",
          "Select the first column.",
          p(
            apply(
              [
                [1, -2],
                [3, 1],
              ],
              [1, 0],
            ),
            1,
          ),
        ),
      ),
      t(
        "Preserve addition and scaling",
        "A linear map preserves sums and scalar multiples: T(u + v) = T(u) + T(v), and T(cu) = cT(u). Every matrix map has these properties.",
        apply(
          [
            [2, 0],
            [0, 3],
          ],
          [1, 1],
        ),
        apply(
          [
            [2, 0],
            [0, 3],
          ],
          [2, 2],
        ),
        choice(
          "For a linear T, which expression always equals T(u + v)?",
          ["T(u) + T(v)", "T(u) · T(v)", "T(u) + v"],
          0,
          "Preserving vector addition is one of the defining requirements of linearity.",
          "Apply the map to both vectors.",
        ),
      ),
      t(
        "Test the origin",
        "The translation S(v) = v + (1, 0) sends the origin to (1, 0), so it is not linear. Sending zero to zero is necessary for linearity, but is not sufficient by itself.",
        add([0, 0], [1, 0]),
        add([1, 1], [1, 0]),
        choice(
          "Is S(v) = v + (1, 0) a linear transformation?",
          ["Yes", "No"],
          1,
          "S(0) is nonzero, which a linear map cannot produce.",
          "Check the output at the zero input.",
        ),
      ),
    ],
    [
      num(
        "For A = [(1, 2); (−1, 3)], find the first coordinate of A(2, 1).",
        4,
        "The first row gives 1 × 2 + 2 × 1 = 4.",
        "Use a row-column dot product.",
        p(
          apply(
            [
              [1, 2],
              [-1, 3],
            ],
            [2, 1],
          ),
          0,
        ),
      ),
      num(
        "For A = [(3, 0); (0, −2)], find the second coordinate of A(−1, 4).",
        -8,
        "The second row gives 0 × (−1) − 2 × 4 = −8.",
        "Keep the negative coefficient.",
        p(
          apply(
            [
              [3, 0],
              [0, -2],
            ],
            [-1, 4],
          ),
          1,
        ),
      ),
    ],
    [
      recall(
        "For A = [(2, 3); (1, 0)], find the first coordinate of A(1, 2).",
        8,
        "The first coordinate is 2 + 6 = 8.",
        p(
          apply(
            [
              [2, 3],
              [1, 0],
            ],
            [1, 2],
          ),
          0,
        ),
      ),
      recall(
        "For A = [(1, 4); (2, −1)], find the first coordinate of A(0, 1).",
        4,
        "The input selects the second column, whose first entry is 4.",
        p(
          apply(
            [
              [1, 4],
              [2, -1],
            ],
            [0, 1],
          ),
          0,
        ),
      ),
    ],
  ),
  lesson(
    "compose-matrix-maps",
    "Compose matrix maps",
    "Multiply compatible matrices and keep the order of composition.",
    m,
    ["lin-product"],
    [
      t(
        "Use a row and a column",
        "Each product entry combines a row of A with a column of B. For the top-right entry, use the first row of A and second column of B.",
        multiply(
          [
            [1, 2],
            [0, 1],
          ],
          [
            [2, 0],
            [0, 3],
          ],
        ),
        multiply(
          [
            [2, 0],
            [0, 3],
          ],
          [
            [1, 2],
            [0, 1],
          ],
        ),
        num(
          "In Example, find entry (1, 2) of A B, counting from 1.",
          6,
          "The dot product is 1 × 0 + 2 × 3 = 6.",
          "Match the first row with the second column.",
          p(
            multiply(
              [
                [1, 2],
                [0, 1],
              ],
              [
                [2, 0],
                [0, 3],
              ],
            ),
            [0, 1],
          ),
        ),
      ),
      t(
        "Reverse the order",
        "Matrix multiplication generally depends on order. Switching the maps can change the output even when both products exist.",
        multiply(
          [
            [2, 0],
            [0, 3],
          ],
          [
            [1, 2],
            [0, 1],
          ],
        ),
        multiply(
          [
            [1, 2],
            [0, 1],
          ],
          [
            [2, 0],
            [0, 3],
          ],
        ),
        num(
          "For Example's reversed product, find entry (1, 2), counting from 1.",
          4,
          "The first row (2, 0) and second column (2, 1) give 4.",
          "Recompute the row-column pair in its new order.",
          p(
            multiply(
              [
                [2, 0],
                [0, 3],
              ],
              [
                [1, 2],
                [0, 1],
              ],
            ),
            [0, 1],
          ),
        ),
      ),
      t(
        "Match the inner dimensions",
        "A two-by-three matrix can multiply a three-by-two matrix. The matching inner dimensions disappear; the result has two rows and two columns.",
        multiply(
          [
            [1, 2, 0],
            [0, 1, 3],
          ],
          [
            [1, 0],
            [0, 1],
            [2, 1],
          ],
        ),
        multiply(
          [
            [1, 0],
            [0, 1],
          ],
          [
            [1, 2, 0],
            [0, 1, 3],
          ],
        ),
        choice(
          "A is 2 × 3 and B is 3 × 2. What is the shape of A B?",
          ["2 × 2", "3 × 3", "2 × 3"],
          0,
          "The inner dimensions match. The result keeps A's row count and B's column count.",
          "Retain the two outer dimensions.",
        ),
      ),
      t(
        "Read the composition",
        "In A B v, B acts on v first. A then acts on that intermediate output.",
        multiply(
          [
            [1, 2],
            [0, 1],
          ],
          [
            [2, 0],
            [0, 3],
          ],
        ),
        multiply(
          [
            [2, 0],
            [0, 3],
          ],
          [
            [1, 2],
            [0, 1],
          ],
        ),
        choice(
          "Which map acts first in A B v?",
          ["A", "B"],
          1,
          "A(Bv) applies B to v before applying A.",
          "Read the expression from the input outward.",
        ),
      ),
    ],
    [
      num(
        "For A = [(2, 1); (1, 0)] and B = [(1, 3); (2, 4)], find entry (2, 1) of A B.",
        1,
        "Row (1, 0) dotted with column (1, 2) gives 1.",
        "Use A's second row and B's first column.",
        p(
          multiply(
            [
              [2, 1],
              [1, 0],
            ],
            [
              [1, 3],
              [2, 4],
            ],
          ),
          [1, 0],
        ),
      ),
      choice(
        "Which identity is valid for compatible matrices?",
        ["(A B)ᵀ = Bᵀ Aᵀ", "(A B)ᵀ = Aᵀ Bᵀ"],
        0,
        "Transposing a product reverses the factors' order.",
        "Transposition exchanges the roles of rows and columns.",
      ),
    ],
    [
      recall(
        "For A = [(1, 1); (2, 0)] and B = [(3, 1); (0, 2)], find entry (1, 2) of A B.",
        3,
        "The first row-column dot product for that entry is 1 + 2 = 3.",
        p(
          multiply(
            [
              [1, 1],
              [2, 0],
            ],
            [
              [3, 1],
              [0, 2],
            ],
          ),
          [0, 1],
        ),
      ),
      recall(
        "For A = [(0, 1); (1, 0)] and B = [(2, 3); (4, 5)], find entry (1, 2) of A B.",
        5,
        "The first row of A selects B's second row, giving entry 5.",
        p(
          multiply(
            [
              [0, 1],
              [1, 0],
            ],
            [
              [2, 3],
              [4, 5],
            ],
          ),
          [0, 1],
        ),
      ),
    ],
  ),
  lesson(
    "identity-and-inverses",
    "Identity and inverses",
    "Undo an invertible square map and recognise when an inverse cannot exist.",
    m,
    ["lin-inverse", "lin-row"],
    [
      t(
        "Leave a vector unchanged",
        "The identity matrix has ones on its diagonal and zeros elsewhere. It leaves every vector unchanged and is its own inverse.",
        inverse([
          [1, 0],
          [0, 1],
        ]),
        inverse([
          [2, 0],
          [0, 3],
        ]),
        num(
          "Find entry (1, 1) of the inverse of Example's identity matrix.",
          1,
          "The identity is its own inverse, so the entry is 1.",
          "The inverse must leave every vector unchanged too.",
          p(
            inverse([
              [1, 0],
              [0, 1],
            ]),
            [0, 0],
          ),
        ),
      ),
      t(
        "Undo the whole map",
        "An inverse must undo all parts of the map. For a square invertible A, both A⁻¹A and AA⁻¹ equal I.",
        inverse([
          [2, 1],
          [1, 1],
        ]),
        inverse([
          [1, 2],
          [0, 1],
        ]),
        num(
          "In Example, find entry (2, 2) of A⁻¹.",
          2,
          "The inverse is [(1, −1); (−1, 2)]. Multiplying it by A gives I.",
          "For a two-by-two inverse, swap the diagonal entries and negate the off-diagonal entries, then divide by the determinant.",
          p(
            inverse([
              [2, 1],
              [1, 1],
            ]),
            [1, 1],
          ),
        ),
      ),
      t(
        "Notice lost information",
        "The columns (1, 2) and (2, 4) lie on one line. This square map collapses different inputs to the same output and has no inverse.",
        inverse([
          [1, 2],
          [2, 4],
        ]),
        inverse([
          [1, 2],
          [2, 3],
        ]),
        choice(
          "Does Example's A = [(1, 2); (2, 4)] have an inverse?",
          ["Yes", "No"],
          1,
          "Its columns are dependent and its determinant is zero.",
          "Check whether the second column is a multiple of the first.",
        ),
      ),
      t(
        "Recover an input",
        "If A is invertible, A v = b has the unique solution v = A⁻¹b. You can check the recovered input by applying A again.",
        system(
          [
            [1, 1],
            [0, 2],
          ],
          [1, -2],
        ),
        system(
          [
            [1, 1],
            [0, 2],
          ],
          [3, 2],
        ),
        num(
          "In Example's A v = b, what is the first coordinate of v?",
          2,
          "The second equation gives v₂ = −1. The first gives v₁ − 1 = 1, hence v₁ = 2.",
          "Solve the second row before the first.",
          p(
            system(
              [
                [1, 1],
                [0, 2],
              ],
              [1, -2],
            ),
            0,
          ),
        ),
      ),
    ],
    [
      num(
        "For A = [(1, 2); (0, 1)], find entry (1, 2) of A⁻¹.",
        -2,
        "The inverse subtracts the shear: [(1, −2); (0, 1)].",
        "Find the off-diagonal value that makes AA⁻¹ equal I.",
        p(
          inverse([
            [1, 2],
            [0, 1],
          ]),
          [0, 1],
        ),
      ),
      num(
        "For A = [(3, 0); (0, −2)], find entry (2, 2) of A⁻¹.",
        -0.5,
        "Undo multiplication by −2 with multiplication by −1/2.",
        "Invert the nonzero diagonal scale.",
        p(
          inverse([
            [3, 0],
            [0, -2],
          ]),
          [1, 1],
        ),
      ),
    ],
    [
      recall(
        "For A = [(2, 0); (0, 4)], find entry (1, 1) of A⁻¹.",
        0.5,
        "The inverse scale on the first coordinate is 1/2.",
        p(
          inverse([
            [2, 0],
            [0, 4],
          ]),
          [0, 0],
        ),
      ),
      recall(
        "For A = [(1, 3); (0, 1)], find entry (1, 2) of A⁻¹.",
        -3,
        "Subtracting three times the second coordinate undoes the original shear.",
        p(
          inverse([
            [1, 3],
            [0, 1],
          ]),
          [0, 1],
        ),
      ),
    ],
  ),
];
