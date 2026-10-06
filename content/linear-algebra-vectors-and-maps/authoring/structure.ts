import {
  lesson,
  t,
  num,
  choice,
  recall,
  p,
  system,
  apply,
  determinant,
  multiply,
  projection,
  dot,
  fit,
} from "./definition.js";
const m = "lin-structure-module",
  r = [
    [1, 2, 0],
    [0, 0, 1],
  ];
export const structureLessons = [
  lesson(
    "rank-and-null-space",
    "Rank and null space",
    "Connect pivot columns, column space and the inputs a matrix sends to zero.",
    m,
    ["lin-rank", "lin-basis"],
    [
      t(
        "Count independent outputs",
        "The rank equals the dimension of the column space. Row reduction finds it by counting pivots in the coefficient columns.",
        system(r, [0, 0]),
        system(
          [
            [1, 2, 3],
            [2, 4, 6],
          ],
          [0, 0],
        ),
        num(
          "What is the rank of A in Example?",
          2,
          "There is a pivot in the first and third columns, giving rank two.",
          "Count pivot columns after row reduction.",
          { op: "rank", matrix: r },
        ),
      ),
      t(
        "Count hidden input directions",
        "For a matrix with n columns, rank + nullity = n. The null space consists of all inputs that A sends to zero.",
        system(r, [0, 0]),
        system(
          [
            [1, 2, 3],
            [2, 4, 6],
          ],
          [0, 0],
        ),
        num(
          "What is the nullity of A in Example?",
          1,
          "A has three columns and rank two, so nullity is 3 − 2 = 1.",
          "Subtract rank from the number of input coordinates.",
          { op: "nullity", matrix: r },
        ),
      ),
      t(
        "Test a null vector",
        "An input belongs to the null space if multiplying it by A gives the zero vector. Such directions disappear from the output.",
        apply(r, [-2, 1, 0]),
        apply(r, [1, 0, 0]),
        num(
          "In Example, find the first coordinate of A(−2, 1, 0).",
          0,
          "The first row gives −2 + 2 = 0; the second output is also zero.",
          "Use the first row's three coefficients.",
          p(apply(r, [-2, 1, 0]), 0),
        ),
      ),
      t(
        "Keep the original columns",
        "Pivot positions identify a basis for the column space using the original matrix's columns. Row operations may change those column vectors, so keep the originals.",
        system(
          [
            [1, 2, 1],
            [2, 4, 0],
          ],
          [0, 0],
        ),
        system(
          [
            [1, 2, 0],
            [2, 4, 0],
          ],
          [0, 0],
        ),
        choice(
          "Which pair from Example's original A is a basis for its column space?",
          ["Columns 1 and 3", "Columns 1 and 2"],
          0,
          "Column 2 is twice column 1, while columns 1 and 3 are independent.",
          "Find the dependent column before choosing the pair.",
        ),
      ),
    ],
    [
      num(
        "Find the rank of [(1, 0, 0); (0, 2, 0); (0, 0, 3)].",
        3,
        "All three diagonal entries are nonzero, so there are three pivots.",
        "Count the independent diagonal columns.",
        {
          op: "rank",
          matrix: [
            [1, 0, 0],
            [0, 2, 0],
            [0, 0, 3],
          ],
        },
      ),
      num(
        "Find the nullity of [(1, 2, 3); (2, 4, 6)].",
        2,
        "The second row is redundant; rank is one and there are three columns, so nullity is two.",
        "Use rank + nullity = column count.",
        {
          op: "nullity",
          matrix: [
            [1, 2, 3],
            [2, 4, 6],
          ],
        },
      ),
    ],
    [
      recall(
        "Find the rank of [(1, 2); (3, 6)].",
        1,
        "The second row is three times the first, so rank is one.",
        {
          op: "rank",
          matrix: [
            [1, 2],
            [3, 6],
          ],
        },
      ),
      recall(
        "Find the nullity of [(1, 0, 1); (0, 1, 1); (0, 0, 0)].",
        1,
        "Three columns minus two pivots gives nullity one.",
        {
          op: "nullity",
          matrix: [
            [1, 0, 1],
            [0, 1, 1],
            [0, 0, 0],
          ],
        },
      ),
    ],
  ),
  lesson(
    "determinants-and-volume",
    "Determinants and volume",
    "Read signed area and volume factors and use zero determinant to detect collapse.",
    m,
    ["lin-determinant", "lin-inverse"],
    [
      t(
        "Measure an area factor",
        "For a two-by-two matrix [(a, b); (c, d)], the determinant is ad − bc. Its absolute value gives the factor by which the map changes area.",
        determinant([
          [2, 1],
          [1, 3],
        ]),
        determinant([
          [1, 3],
          [2, 1],
        ]),
        num(
          "Find det(A) for Example.",
          5,
          "The determinant is 2 × 3 − 1 × 1 = 5.",
          "Multiply the diagonal pairs and subtract.",
          p(
            determinant([
              [2, 1],
              [1, 3],
            ]),
          ),
        ),
      ),
      t(
        "Track orientation",
        "Swapping two rows reverses the determinant's sign. A negative determinant reverses orientation while its absolute value still scales area.",
        determinant([
          [1, 3],
          [2, 1],
        ]),
        determinant([
          [2, 1],
          [1, 3],
        ]),
        num(
          "Find the signed determinant of Example's row-swapped matrix.",
          -5,
          "The determinant is 1 × 1 − 3 × 2 = −5.",
          "Use the two diagonal products in their new positions.",
          p(
            determinant([
              [1, 3],
              [2, 1],
            ]),
          ),
        ),
      ),
      t(
        "Detect a collapse",
        "A square matrix is invertible exactly when its determinant is nonzero. Dependent columns collapse area or volume and give determinant zero.",
        determinant([
          [1, 2],
          [2, 4],
        ]),
        determinant([
          [1, 2],
          [2, 3],
        ]),
        num(
          "Find det(A) for Example's dependent columns.",
          0,
          "The diagonal products are both 4, so their difference is zero.",
          "Compare the two products.",
          p(
            determinant([
              [1, 2],
              [2, 4],
            ]),
          ),
        ),
      ),
      t(
        "Move into three dimensions",
        "For a three-dimensional map, the absolute determinant scales volume. A diagonal map scales its coordinate directions independently.",
        determinant([
          [2, 0, 0],
          [0, 3, 0],
          [0, 0, 4],
        ]),
        determinant([
          [2, 0, 0],
          [0, 3, 0],
          [0, 0, -4],
        ]),
        num(
          "Find det(A) for Example's diagonal three-by-three matrix.",
          24,
          "Multiply the diagonal scales: 2 × 3 × 4 = 24.",
          "For a diagonal matrix, multiply the diagonal entries.",
          p(
            determinant([
              [2, 0, 0],
              [0, 3, 0],
              [0, 0, 4],
            ]),
          ),
        ),
      ),
    ],
    [
      num(
        "For A = [(−2, 0); (0, 3)], by what positive factor does area change?",
        6,
        "The determinant is −6. Its absolute value is the area factor 6.",
        "Take the absolute value of the determinant.",
        {
          op: "absolute_determinant",
          matrix: [
            [-2, 0],
            [0, 3],
          ],
        },
      ),
      num(
        "Let A = [(2, 0); (0, 3)] and B = [(1, 1); (0, 2)]. Find det(A B).",
        12,
        "The determinants are 6 and 2; det(A B) = 6 × 2 = 12.",
        "Multiply the two determinant factors.",
        {
          op: "product_determinant",
          matrix: [
            [2, 0],
            [0, 3],
          ],
          second: [
            [1, 1],
            [0, 2],
          ],
        },
      ),
    ],
    [
      recall(
        "Find det([(3, 2); (1, 4)]).",
        10,
        "The determinant is 12 − 2 = 10.",
        p(
          determinant([
            [3, 2],
            [1, 4],
          ]),
        ),
      ),
      recall(
        "For A = [(−1, 0); (0, 5)], by what positive factor does area change?",
        5,
        "The determinant is −5, whose absolute value is 5.",
        {
          op: "absolute_determinant",
          matrix: [
            [-1, 0],
            [0, 5],
          ],
        },
      ),
    ],
  ),
  lesson(
    "project-onto-a-direction",
    "Project onto a direction",
    "Find the closest vector on a line and a perpendicular residual.",
    m,
    ["lin-projection", "lin-dot"],
    [
      t(
        "Find the closest point on a line",
        "The projection of v onto a nonzero direction d is ((v · d)/(d · d))d. The projected point lies on the line spanned by d.",
        projection([4, 2], [1, 1]),
        projection([4, 2], [1, 0]),
        num(
          "Project (4, 2) onto the line spanned by (1, 1). Give the x coordinate.",
          3,
          "The coefficient is (4 + 2)/(1 + 1) = 3, so the projection is (3, 3).",
          "Use the dot-product ratio, then scale the direction.",
          p(projection([4, 2], [1, 1]), 0),
        ),
      ),
      t(
        "Keep the same line",
        "Rescaling a nonzero direction vector does not change the projection line or projected point.",
        projection([3, 4], [2, 0]),
        projection([3, 4], [1, 0]),
        num(
          "Project (3, 4) onto the line spanned by (2, 0). Give the x coordinate.",
          3,
          "The line is the x axis, so the projection keeps x = 3 and sets y = 0.",
          "Identify the line, rather than treating the direction as a unit vector.",
          p(projection([3, 4], [2, 0]), 0),
        ),
      ),
      t(
        "Measure what remains",
        "Subtract the projection from v to get the residual. It is perpendicular to the direction used for the projection.",
        projection([4, 2], [1, 1]),
        projection([4, 2], [1, -1]),
        num(
          "For v = (4, 2) and projection (3, 3), what is the residual's y coordinate?",
          -1,
          "The residual is v − projection = (1, −1).",
          "Subtract the second coordinates.",
          { op: "residual", v: [4, 2], direction: [1, 1], index: 1 },
        ),
      ),
      t(
        "Handle perpendicular input",
        "If v is already perpendicular to the line, its projection is zero. The closest point on that line is the origin.",
        projection([2, -2], [1, 1]),
        projection([2, -2], [1, -1]),
        num(
          "Project (2, −2) onto the line spanned by (1, 1). Give the x coordinate.",
          0,
          "Their dot product is zero, so the projection coefficient is zero.",
          "Compute the numerator of the projection coefficient.",
          p(projection([2, -2], [1, 1]), 0),
        ),
      ),
    ],
    [
      num(
        "Project (2, 5) onto the line spanned by (0, 1). Give the y coordinate.",
        5,
        "The line is the y axis, so the projection is (0, 5).",
        "Keep the component along that coordinate axis.",
        p(projection([2, 5], [0, 1]), 1),
      ),
      num(
        "Project (−2, 4) onto the line spanned by (1, 1). Give the x coordinate.",
        1,
        "The coefficient is (−2 + 4)/2 = 1, giving projection (1, 1).",
        "Divide the dot product by the direction's squared length.",
        p(projection([-2, 4], [1, 1]), 0),
      ),
    ],
    [
      recall(
        "Project (6, 2) onto the line spanned by (1, 1). Give the x coordinate.",
        4,
        "The coefficient is 8/2 = 4, giving projection (4, 4).",
        p(projection([6, 2], [1, 1]), 0),
      ),
      recall(
        "Project (5, 3) onto the x axis. What is the residual's y coordinate?",
        3,
        "The projection is (5, 0), so the residual is (0, 3).",
        { op: "residual", v: [5, 3], direction: [1, 0], index: 1 },
      ),
    ],
  ),
  lesson(
    "fit-with-least-squares",
    "Fit with least squares",
    "Fit inconsistent measurements by minimising squared residuals.",
    m,
    ["lin-fit", "lin-projection"],
    [
      t(
        "Fit a noisy constant",
        "One constant cannot exactly equal measurements 2, 4 and 9 at once. The least-squares constant is their mean, which minimises the sum of squared differences.",
        fit([[1], [1], [1]], [2, 4, 9]),
        fit([[1], [1], [1]], [1, 5, 9]),
        num(
          "Fit one constant to measurements 2, 4 and 9 by least squares. What constant minimises squared error?",
          5,
          "The mean is (2 + 4 + 9)/3 = 5.",
          "For a constant fit, average the measurements.",
          { op: "least_squares", matrix: [[1], [1], [1]], rhs: [2, 4, 9], index: 0 },
        ),
      ),
      t(
        "Read the perpendicular residual",
        "Least squares makes the residual b − A x perpendicular to every column of A. For a constant fit, this means the residual entries sum to zero.",
        fit([[1], [1], [1]], [2, 4, 9]),
        fit([[1], [1], [1]], [3, 6, 12]),
        num(
          "For measurements (2, 4, 9) fitted by constant 5, what is the sum of residuals b − A x?",
          0,
          "The residuals are −3, −1 and 4, whose sum is zero.",
          "Subtract the fitted constant from each measurement, then add.",
          { op: "least_squares_residual_sum", matrix: [[1], [1], [1]], rhs: [2, 4, 9] },
        ),
      ),
      t(
        "Fit a line",
        "For y ≈ c + sx, put a column of ones beside the x values. The fitting coefficients minimise squared error; full column rank makes those coefficients unique.",
        fit(
          [
            [1, 0],
            [1, 1],
            [1, 2],
          ],
          [1, 2, 2],
        ),
        fit(
          [
            [1, 0],
            [1, 1],
            [1, 2],
          ],
          [2, 5, 8],
        ),
        num(
          "Fit y ≈ c + sx to (0, 1), (1, 2), (2, 2) by least squares. Find s.",
          0.5,
          "The normal equations are 3c + 3s = 5 and 3c + 5s = 6. Subtracting gives 2s = 1, so s = 0.5.",
          "Solve AᵀA x = Aᵀb for the intercept and slope.",
          {
            op: "least_squares",
            matrix: [
              [1, 0],
              [1, 1],
              [1, 2],
            ],
            rhs: [1, 2, 2],
            index: 1,
          },
        ),
      ),
      t(
        "Square the residuals",
        "Squared error adds squares, so negative and positive residuals cannot cancel each other's cost. This differs from adding the residuals themselves.",
        fit([[1], [1], [1]], [2, 4, 9]),
        fit([[1], [1], [1]], [1, 5, 9]),
        num(
          "For measurements (2, 4, 9) fitted by constant 5, what is the sum of squared residuals?",
          26,
          "The sum is (−3)² + (−1)² + 4² = 9 + 1 + 16 = 26.",
          "Square each residual before adding.",
          { op: "least_squares_sse", matrix: [[1], [1], [1]], rhs: [2, 4, 9] },
        ),
      ),
    ],
    [
      num(
        "Fit one constant by least squares to measurements 1, 5 and 9.",
        5,
        "Their mean is 15/3 = 5.",
        "Use the mean for the constant fit.",
        { op: "least_squares", matrix: [[1], [1], [1]], rhs: [1, 5, 9], index: 0 },
      ),
      num(
        "Fit y = c + sx to (0, 2), (1, 5), (2, 8). Find s.",
        3,
        "The points lie exactly on y = 2 + 3x, so the least-squares slope is 3.",
        "Compare equal increments in x and y.",
        {
          op: "least_squares",
          matrix: [
            [1, 0],
            [1, 1],
            [1, 2],
          ],
          rhs: [2, 5, 8],
          index: 1,
        },
      ),
    ],
    [
      recall(
        "Fit one constant by least squares to measurements 3, 6 and 12.",
        7,
        "The mean is 21/3 = 7.",
        { op: "least_squares", matrix: [[1], [1], [1]], rhs: [3, 6, 12], index: 0 },
      ),
      recall(
        "Fit y = c + sx to (0, 1), (1, 3), (2, 5). Find s.",
        2,
        "The points lie on y = 1 + 2x, giving slope 2.",
        {
          op: "least_squares",
          matrix: [
            [1, 0],
            [1, 1],
            [1, 2],
          ],
          rhs: [1, 3, 5],
          index: 1,
        },
      ),
    ],
  ),
];
