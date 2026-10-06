import type { LinearAlgebraModel as Model } from "../../../packages/contracts/src/index.js";
type Probe = { op: string; [key: string]: unknown };
export function numericLadder(first: string | string[], probe: Probe): string[] {
  const provided = Array.isArray(first) ? first : [first];
  if (!provided.length) return [];
  const m = probe["model"] as Model | undefined;
  let steps: [string, string] = [
    "Identify the requested coordinate or entry before calculating.",
    "Keep the signs and check the result in the original data.",
  ];
  if (probe.op === "model" && m) {
    switch (m.kind) {
      case "scaled_vector":
        steps =
          m.scale === 1
            ? [
                "Coordinates are ordered as (x, y); read the position the question names.",
                "Report just that signed entry. The other entry belongs to the other coordinate.",
              ]
            : [
                "Multiply every vector coordinate by the same scalar.",
                "Keep the coordinate’s sign when applying the scalar; a negative scalar reverses it.",
              ];
        break;
      case "vector_sum":
        steps = [
          "Combine entries in the same coordinate position.",
          "Combine only the requested position; do not mix horizontal and vertical entries.",
        ];
        break;
      case "dot_product":
        steps = [
          "The dot product is the sum of matching-coordinate products.",
          "Include both signed products in the sum. The output is one scalar, not a vector.",
        ];
        break;
      case "vector_length":
        steps = [
          "Square each coordinate, add those squares, then take the nonnegative square root.",
          "Use the nonnegative square root. Summing the original signed coordinates does not give length.",
        ];
        break;
      case "projection":
        steps = [
          "First find the coefficient (v · d)/(d · d).",
          "Multiply the requested coordinate of d by that coefficient. The line does not require a unit direction.",
        ];
        break;
      case "system":
        steps = [
          "Carry out row operations on the augmented matrix, including the right side.",
          "After isolating one variable, substitute it into another equation and check both original rows.",
        ];
        break;
      case "span":
        steps = [
          "Put the vectors into matrix columns and count pivots to find the span's dimension.",
          "For two plane vectors, test whether one is a multiple of the other; otherwise they give two independent directions.",
        ];
        break;
      case "eigen":
        steps = [
          "Multiply A by the candidate vector to obtain A v.",
          "Divide an output coordinate by its corresponding nonzero input coordinate, then check the same factor in every coordinate.",
        ];
        break;
      case "svd":
        steps = [
          "Singular values are the nonnegative square roots of eigenvalues of AᵀA; sort them from largest to smallest.",
          "For perpendicular rows or columns, use their stretch lengths. A missing independent stretch gives a zero singular value.",
        ];
        break;
      case "least_squares":
        steps = [
          "Use AᵀA x = Aᵀb to obtain the least-squares coefficients.",
          "Solve those normal equations for the requested coefficient.",
        ];
        break;
      case "matrix":
        switch (m.operation) {
          case "transpose": {
            const at = probe["select"] as [number, number];
            steps = [
              "Transposition exchanges the row and column indices.",
              "Locate the original entry in row " + (at[1] + 1) + ", column " + (at[0] + 1) + ".",
            ];
            break;
          }
          case "apply":
            steps = [
              "Multiply each row entry by the corresponding input entry, then add.",
              "Compute only the requested row’s dot product; each other row belongs to a different output coordinate.",
            ];
            break;
          case "multiply": {
            steps = [
              "Pair the requested row of A with the requested column of B.",
              "Keep the row and column in the stated order. Multiply matching positions and add; do not multiply entries in place.",
            ];
            break;
          }
          case "determinant":
            steps =
              m.matrix.length === 2
                ? [
                    "For [(a, b); (c, d)], use ad − bc.",
                    "Subtract the off-diagonal product from the main-diagonal product, keeping all signs.",
                  ]
                : [
                    "For a diagonal matrix, the determinant is the product of the diagonal entries.",
                    "Keep the sign of each diagonal factor when multiplying.",
                  ];
            break;
          case "inverse":
            steps = [
              "Augment A by the identity and reduce the left side to I; the right side becomes A⁻¹.",
              "For a two-by-two A, divide [(d, −b); (−c, a)] by ad − bc and read the requested entry.",
            ];
            break;
        }
        break;
    }
  } else
    switch (probe.op) {
      case "shape":
        steps = [
          "A matrix shape is row count followed by column count.",
          probe["transpose"]
            ? "Transposition swaps those two counts; inspect the dimension the question requests."
            : "Count entries across a row for columns, or down a column for rows.",
        ];
        break;
      case "normalize":
        steps = [
          "Compute the vector's positive length using the square root of the sum of squared entries.",
          "Divide the requested signed coordinate by that length. Use a decimal for an irrational result.",
        ];
        break;
      case "row_operation":
        steps = [
          "A row operation changes every target-row entry using the same source-row multiple.",
          "Subtract the stated factor times the source entry from the target entry in the requested position.",
        ];
        break;
      case "rank":
        steps = [
          "Row-reduce the coefficient matrix without adding an extra right-hand column.",
          "Count the pivot positions, ignoring redundant zero rows.",
        ];
        break;
      case "nullity":
        steps = [
          "Use nullity = number of columns − rank.",
          "Find rank by counting coefficient pivots; the right side is not a variable column.",
        ];
        break;
      case "absolute_determinant":
        steps = [
          "Compute the signed determinant first.",
          "Area or volume scale is its absolute value, so report a nonnegative factor.",
        ];
        break;
      case "product_determinant":
        steps = [
          "Use det(A B) = det(A) det(B).",
          "Calculate each determinant separately, then multiply the signed results.",
        ];
        break;
      case "residual":
        steps = [
          "Compute the projection ((v · d)/(d · d))d.",
          "Subtract that projection from v and read the requested residual coordinate.",
        ];
        break;
      case "least_squares":
        steps = [
          "For a constant, average the measurements. For a line, solve AᵀA x = Aᵀb.",
          "Read the requested fitted coefficient; verify that Aᵀ(b − A x) is zero.",
        ];
        break;
      case "least_squares_residual_sum":
        steps = [
          "Subtract the fitted output from each measurement.",
          "Add those residual entries with their signs; do not square them for this question.",
        ];
        break;
      case "least_squares_sse":
        steps = [
          "Subtract the fitted output to obtain each residual.",
          "Square each residual separately and add those nonnegative costs.",
        ];
        break;
      case "eigen_power":
        steps = [
          "First determine λ from A v = λv for the given nonzero vector.",
          "Raise λ to the stated power; applying the map repeatedly multiplies the scales.",
        ];
        break;
      case "diagonal_reconstruct":
        steps = [
          "Compute the basis matrix's inverse and keep the eigenvalues in their stated order.",
          "Multiply P D P⁻¹ in that order, then read the requested row and column.",
        ];
        break;
    }
  return [...provided, ...steps].slice(0, 3);
}
