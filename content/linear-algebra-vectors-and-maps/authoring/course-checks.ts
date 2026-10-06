import type {
  CourseCheckDefinition,
  LinearAlgebraModel as Model,
} from "../../../packages/contracts/src/index.js";
import { linearLessons } from "./lessons.js";
import {
  num,
  p,
  scale,
  add,
  dot,
  length,
  transpose,
  apply,
  multiply,
  inverse,
  system,
  span,
  determinant,
  projection,
  fit,
  eigen,
  svd,
  type Probe,
} from "./definition.js";
type Problem = { prompt: string; model: Model; value: number; worked: string; probe: Probe };
const q = (
  prompt: string,
  model: Model,
  value: number,
  worked: string,
  select?: number | [number, number] | Probe,
): Problem => ({
  prompt,
  model,
  value,
  worked,
  probe:
    select !== undefined && typeof select === "object" && !Array.isArray(select)
      ? select
      : p(model, select as number | [number, number] | undefined),
});
const sets: Problem[][] = [
  [
    q(
      "Give the y coordinate of v = (−2, 7).",
      scale([-2, 7], 1),
      7,
      "The second coordinate is 7.",
      1,
    ),
    q(
      "Find the x coordinate of (4, −1) + (−2, 5).",
      add([4, -1], [-2, 5]),
      2,
      "The first entries add to 4 − 2 = 2.",
      0,
    ),
    q("Find (3, −2) · (1, 4).", dot([3, -2], [1, 4]), -5, "The products add to 3 − 8 = −5."),
    q(
      "Normalise (6, 8). Give its y coordinate.",
      length([6, 8]),
      0.8,
      "The length is 10, giving y = 8/10 = 0.8.",
      { op: "normalize", v: [6, 8], index: 1 },
    ),
    q(
      "Find entry (2, 1) of Aᵀ, counting from 1.",
      transpose([
        [2, 5, -1],
        [4, 0, 3],
      ]),
      5,
      "This is the original entry (1, 2), which is 5.",
      [1, 0],
    ),
    q(
      "Find the first coordinate of A v.",
      apply(
        [
          [2, -1],
          [1, 3],
        ],
        [3, 1],
      ),
      5,
      "The first row gives 2 × 3 − 1 = 5.",
      0,
    ),
    q(
      "Find entry (1, 2) of A B, counting from 1.",
      multiply(
        [
          [1, 3],
          [2, 0],
        ],
        [
          [2, 1],
          [0, 4],
        ],
      ),
      13,
      "The first row and second column give 1 + 12 = 13.",
      [0, 1],
    ),
    q(
      "Find entry (1, 1) of A⁻¹, counting from 1.",
      inverse([
        [2, 1],
        [0, 1],
      ]),
      0.5,
      "The inverse is [(0.5, −0.5); (0, 1)].",
      [0, 0],
    ),
    q(
      "Solve A x = b. Give x₂.",
      system(
        [
          [1, 1],
          [1, -1],
        ],
        [8, 2],
      ),
      3,
      "Adding the equations gives x₁ = 5, and the first then gives x₂ = 3.",
      1,
    ),
    q(
      "How many free variables are in this consistent system?",
      system([[1, 1, 1]], [6]),
      2,
      "Three variable columns minus one pivot leaves two free variables.",
      { op: "nullity", matrix: [[1, 1, 1]] },
    ),
    q(
      "Find the dimension of the span of the given vectors.",
      span([
        [3, 1],
        [6, 2],
      ]),
      1,
      "The second vector is twice the first, so they span one line.",
    ),
    q(
      "Write b as c₁(1, 0) + c₂(1, 2). Give c₁.",
      system(
        [
          [1, 1],
          [0, 2],
        ],
        [5, 6],
      ),
      2,
      "The second coordinate fixes c₂ = 3; then c₁ = 5 − 3 = 2.",
      0,
    ),
    q(
      "Find the nullity of A.",
      system(
        [
          [1, 2, 3],
          [0, 1, 1],
        ],
        [0, 0],
      ),
      1,
      "The two rows give two pivots. Three columns minus rank two gives nullity one.",
      {
        op: "nullity",
        matrix: [
          [1, 2, 3],
          [0, 1, 1],
        ],
      },
    ),
    q(
      "Find det(A).",
      determinant([
        [4, 1],
        [2, 3],
      ]),
      10,
      "The determinant is 4 × 3 − 1 × 2 = 10.",
    ),
    q(
      "Project v onto the given direction. Give the x coordinate.",
      projection([5, 1], [1, 1]),
      3,
      "The coefficient is 6/2 = 3, giving projection (3, 3).",
      0,
    ),
    q(
      "Fit one constant by least squares to b. Give the fitted constant.",
      fit([[1], [1], [1]], [2, 6, 10]),
      6,
      "The mean is 18/3 = 6.",
      { op: "least_squares", matrix: [[1], [1], [1]], rhs: [2, 6, 10], index: 0 },
    ),
    q(
      "Subtract the projection of v onto the given direction. Give the residual's y coordinate.",
      projection([4, 3], [1, 0]),
      3,
      "The projection is (4, 0), leaving residual (0, 3).",
      { op: "residual", v: [4, 3], direction: [1, 0], index: 1 },
    ),
    q(
      "For the given nonzero v, find λ in A v = λv.",
      eigen(
        [
          [5, 0],
          [0, 2],
        ],
        [1, 0],
      ),
      5,
      "A v = (5, 0) = 5v.",
    ),
    q(
      "What scalar multiplies v in A²v?",
      eigen(
        [
          [-2, 0],
          [0, 3],
        ],
        [1, 0],
      ),
      4,
      "The eigenvalue is −2, so two applications multiply by (−2)² = 4.",
      {
        op: "eigen_power",
        matrix: [
          [-2, 0],
          [0, 3],
        ],
        vector: [1, 0],
        power: 2,
      },
    ),
    q(
      "Find the largest singular value of A.",
      svd([
        [0, 2, 0],
        [5, 0, 0],
      ]),
      5,
      "The two row directions are perpendicular with lengths 2 and 5.",
      0,
    ),
  ],
  [
    q(
      "Give the x coordinate of v = (5, −6).",
      scale([5, -6], 1),
      5,
      "The first coordinate is 5.",
      0,
    ),
    q(
      "Find the y coordinate of −2(3, −2).",
      scale([3, -2], -2),
      4,
      "The second coordinate becomes (−2)(−2) = 4.",
      1,
    ),
    q(
      "Find the length of (9, 12).",
      length([9, 12]),
      15,
      "The sum of squares is 81 + 144 = 225, giving length 15.",
    ),
    q("Find (3, 2) · (−2, 3).", dot([3, 2], [-2, 3]), 0, "The products −6 and 6 cancel."),
    q(
      "Find entry (1, 3) of Aᵀ, counting from 1.",
      transpose([
        [1, 7],
        [2, 4],
        [3, 5],
      ]),
      3,
      "This is the original entry (3, 1), which is 3.",
      [0, 2],
    ),
    q(
      "Find the second coordinate of A v.",
      apply(
        [
          [1, 4],
          [2, -1],
        ],
        [-1, 2],
      ),
      -4,
      "The second row gives 2 × (−1) − 2 = −4.",
      1,
    ),
    q(
      "Find entry (2, 2) of A B, counting from 1.",
      multiply(
        [
          [2, 0],
          [1, 1],
        ],
        [
          [1, 3],
          [4, 2],
        ],
      ),
      5,
      "The second row-column dot product is 3 + 2 = 5.",
      [1, 1],
    ),
    q(
      "Find entry (2, 1) of A⁻¹, counting from 1.",
      inverse([
        [1, 0],
        [3, 2],
      ]),
      -1.5,
      "The inverse is [(1, 0); (−1.5, 0.5)].",
      [1, 0],
    ),
    q(
      "Solve A x = b. Give x₁.",
      system(
        [
          [2, 1],
          [1, -1],
        ],
        [11, 1],
      ),
      4,
      "Adding the equations gives 3x₁ = 12, hence x₁ = 4.",
      0,
    ),
    q(
      "How many free variables are in this system?",
      system(
        [
          [1, 2, 0],
          [0, 0, 1],
        ],
        [7, 2],
      ),
      1,
      "There are three variable columns and two pivots, so one variable is free.",
      {
        op: "nullity",
        matrix: [
          [1, 2, 0],
          [0, 0, 1],
        ],
      },
    ),
    q(
      "Find the dimension of the span of the given vectors.",
      span([
        [1, 3],
        [2, -1],
      ]),
      2,
      "These vectors are independent, so they span the plane.",
    ),
    q(
      "Write b as c₁(1, 1) + c₂(1, −1). Give c₂.",
      system(
        [
          [1, 1],
          [1, -1],
        ],
        [8, 2],
      ),
      3,
      "Subtracting the second coordinate equation from the first gives 2c₂ = 6.",
      1,
    ),
    q(
      "Find the rank of A.",
      system(
        [
          [1, 0, 2],
          [0, 1, 3],
          [0, 0, 0],
        ],
        [0, 0, 0],
      ),
      2,
      "The first two columns have pivots; the last row is zero.",
      {
        op: "rank",
        matrix: [
          [1, 0, 2],
          [0, 1, 3],
          [0, 0, 0],
        ],
      },
    ),
    q(
      "Find the signed determinant of A.",
      determinant([
        [-1, 0, 0],
        [0, 2, 0],
        [0, 0, 5],
      ]),
      -10,
      "The diagonal entries multiply to (−1) × 2 × 5 = −10.",
    ),
    q(
      "Project v onto the given direction. Give the y coordinate.",
      projection([3, 7], [0, 2]),
      7,
      "The direction spans the y axis, so the projection is (0, 7).",
      1,
    ),
    q(
      "The columns of A encode y ≈ c + sx. Fit b by least squares and give s.",
      fit(
        [
          [1, 0],
          [1, 1],
          [1, 2],
        ],
        [1, 4, 7],
      ),
      3,
      "The data lie exactly on y = 1 + 3x.",
      {
        op: "least_squares",
        matrix: [
          [1, 0],
          [1, 1],
          [1, 2],
        ],
        rhs: [1, 4, 7],
        index: 1,
      },
    ),
    q(
      "Normalise (8, 6). Give the first coordinate.",
      length([8, 6]),
      0.8,
      "The length is 10, so the first unit coordinate is 8/10 = 0.8.",
      { op: "normalize", v: [8, 6], index: 0 },
    ),
    q(
      "For the given nonzero v, find λ in A v = λv.",
      eigen(
        [
          [4, 1],
          [1, 4],
        ],
        [1, -1],
      ),
      3,
      "The output is (3, −3) = 3v.",
    ),
    q(
      "Using the given matrices A and B, find entry (1, 2) of A B A⁻¹.",
      multiply(
        [
          [1, 1],
          [1, -1],
        ],
        [
          [5, 0],
          [0, 1],
        ],
      ),
      2,
      "A⁻¹ = A/2. The conjugated map is [(3, 2); (2, 3)], giving entry 2.",
      {
        op: "diagonal_reconstruct",
        basis: [
          [1, 1],
          [1, -1],
        ],
        values: [5, 1],
        row: 0,
        column: 1,
      },
    ),
    q(
      "Find the smaller singular value of A.",
      svd([
        [6, 0],
        [0, 2],
        [0, 0],
      ]),
      2,
      "The perpendicular column lengths are 6 and 2; the smaller stretch is 2.",
      1,
    ),
  ],
  [
    q(
      "Give the y coordinate of v = (−7, 4).",
      scale([-7, 4], 1),
      4,
      "The second coordinate is 4.",
      1,
    ),
    q(
      "Find the y coordinate of (−3, 5) + (6, −2).",
      add([-3, 5], [6, -2]),
      3,
      "The second entries add to 5 − 2 = 3.",
      1,
    ),
    q("Find (−1, 4) · (3, 2).", dot([-1, 4], [3, 2]), 5, "The dot product is −3 + 8 = 5."),
    q(
      "Normalise (12, −5). Give its y coordinate as a decimal.",
      length([12, -5]),
      -0.38461538461538464,
      "The length is 13, so y = −5/13 ≈ −0.384615.",
      { op: "normalize", v: [12, -5], index: 1 },
    ),
    q(
      "Find entry (3, 2) of Aᵀ, counting from 1.",
      transpose([
        [0, 2, 4],
        [1, 3, 5],
      ]),
      5,
      "This is the original entry (2, 3), which is 5.",
      [2, 1],
    ),
    q(
      "Find the second coordinate of A v.",
      apply(
        [
          [3, 1],
          [-2, 2],
        ],
        [2, -1],
      ),
      -6,
      "The second row gives −2 × 2 + 2 × (−1) = −6.",
      1,
    ),
    q(
      "Find entry (1, 2) of A B, counting from 1.",
      multiply(
        [
          [1, -1],
          [2, 1],
        ],
        [
          [3, 2],
          [1, 4],
        ],
      ),
      -2,
      "The first row and second column give 2 − 4 = −2.",
      [0, 1],
    ),
    q(
      "Find entry (2, 1) of A⁻¹, counting from 1.",
      inverse([
        [2, 0],
        [1, 1],
      ]),
      -0.5,
      "The inverse is [(0.5, 0); (−0.5, 1)].",
      [1, 0],
    ),
    q(
      "Solve A x = b. Give x₂.",
      system(
        [
          [1, 2],
          [2, -1],
        ],
        [7, 4],
      ),
      2,
      "The equations give x₁ = 3 and x₂ = 2, which satisfy both original rows.",
      1,
    ),
    q(
      "How many free variables are in this consistent system?",
      system([[2, 3, 1]], [6]),
      2,
      "There are three variable columns and one pivot, leaving two free variables.",
      { op: "nullity", matrix: [[2, 3, 1]] },
    ),
    q(
      "Find the dimension of the span of the given vectors.",
      span([
        [2, 4],
        [-1, -2],
      ]),
      1,
      "The second vector is −0.5 times the first, so the span is a line.",
    ),
    q(
      "Write b as c₁(2, 1) + c₂(1, 1). Give c₁.",
      system(
        [
          [2, 1],
          [1, 1],
        ],
        [9, 5],
      ),
      4,
      "Subtracting the second coordinate equation from the first gives c₁ = 4.",
      0,
    ),
    q(
      "Find the nullity of A.",
      system(
        [
          [1, 2, 0],
          [0, 0, 0],
          [2, 4, 0],
        ],
        [0, 0, 0],
      ),
      2,
      "The rank is one and there are three columns, so nullity is two.",
      {
        op: "nullity",
        matrix: [
          [1, 2, 0],
          [0, 0, 0],
          [2, 4, 0],
        ],
      },
    ),
    q(
      "By what positive factor does A change area?",
      determinant([
        [0, 3],
        [2, 0],
      ]),
      6,
      "The determinant is −6, so the positive area factor is 6.",
      {
        op: "absolute_determinant",
        matrix: [
          [0, 3],
          [2, 0],
        ],
      },
    ),
    q(
      "Project v onto the given direction. Give the y coordinate.",
      projection([7, -1], [1, 1]),
      3,
      "The coefficient is (7 − 1)/2 = 3, giving projection (3, 3).",
      1,
    ),
    q(
      "Fit one constant by least squares to b. Give the fitted constant.",
      fit([[1], [1], [1]], [1, 7, 13]),
      7,
      "The mean is 21/3 = 7.",
      { op: "least_squares", matrix: [[1], [1], [1]], rhs: [1, 7, 13], index: 0 },
    ),
    q(
      "Subtract the projection of v onto the given direction. Give the residual's x coordinate.",
      projection([1, 5], [1, 1]),
      -2,
      "The projection is (3, 3), so the residual is (−2, 2).",
      { op: "residual", v: [1, 5], direction: [1, 1], index: 0 },
    ),
    q(
      "For the given nonzero v, find λ in A v = λv.",
      eigen(
        [
          [3, 2],
          [2, 3],
        ],
        [1, 1],
      ),
      5,
      "The output is (5, 5) = 5v.",
    ),
    q(
      "What scalar multiplies v in A³v?",
      eigen(
        [
          [1, 0],
          [0, -3],
        ],
        [0, 1],
      ),
      -27,
      "The eigenvalue is −3, so three applications give (−3)³ = −27.",
      {
        op: "eigen_power",
        matrix: [
          [1, 0],
          [0, -3],
        ],
        vector: [0, 1],
        power: 3,
      },
    ),
    q(
      "Find the smaller singular value of A.",
      svd([
        [2, 0, 0],
        [0, 7, 0],
      ]),
      2,
      "The coordinate stretch factors are 7 and 2; the smaller is 2.",
      1,
    ),
  ],
];
const ids = ["starting-point", "mixed-challenge", "later-applications"],
  kinds = ["placement", "checkpoint", "transfer"] as const,
  titles = ["Find your starting point", "Put the ideas together", "Use it after a break"];
if (sets.some((set) => set.length !== linearLessons.length))
  throw Error("Cover every lesson in each check.");
export const linearChecks: CourseCheckDefinition[] = sets.map((problems, set) => ({
  id: ids[set]!,
  kind: kinds[set]!,
  title: titles[set]!,
  description: "Twenty fresh problems across vectors, maps, systems and decompositions.",
  requiredLessonIds: set ? linearLessons.map((l) => l.id) : [],
  ...(set === 2 ? { afterCheckId: ids[1]!, delayDays: 7 } : {}),
  items: problems.map((problem, i) => {
    const lesson = linearLessons[i]!,
      question = num(problem.prompt, problem.value, problem.worked, [], problem.probe);
    return {
      lessonId: lesson.id,
      visual: { type: "linear_algebra" as const, model: problem.model },
      question: {
        prompt: question.prompt,
        responseType: "numeric" as const,
        difficulty: question.difficulty,
        hints: [],
        answerAuthority: question.answerAuthority,
        id: "lin-check-" + ids[set] + "-" + lesson.id,
        conceptIds: ["lin-" + lesson.id],
        sourceIds: lesson.sourceIds,
      },
    };
  }),
}));
