# Figures wished for: Linear Algebra lessons 6 to 20

Lessons 1 to 5 are drawn (their wishlist entries are removed). The wishlist's drag and button interactions became fixed views switched with the case buttons.

Every screen teaches without these. The lessons use `linear_algebra_explorer` (scaled_vector, vector_sum, vector_length,
dot_product, matrix), and nothing in the app was changed for the entries below.

## Lesson 6: linear-transformations

### a-machine-for-points
- **Shows:** a sheet of graph paper with a grid of dots, and the same grid after the machine has moved every dot. The input point and its output are joined by a thin arrow.
- **Learner changes:** the four numbers of the matrix, and the input point, by dragging it.
- **Caption:** "Drag the point and watch where the machine sends it. The whole grid moves with it."

### two-points-tell-everything
- **Shows:** the unit square on the grid, with the arrows from the start to (1, 0) and (0, 1) drawn in two colours, and the image of that square after the map.
- **Learner changes:** the two output arrows, by dragging their tips.
- **Caption:** "The two arrows land on the columns of the matrix, and the rest of the grid follows them."

## Lesson 7: compose-matrix-maps

### which-matrix-runs-first
- **Shows:** the unit square pushed through machine B and then through machine A, as a sequence of three pictures, with a button that swaps the order.
- **Learner changes:** which matrix goes first, with a button.
- **Caption:** "Swap the order and the square ends up somewhere else."

## Lesson 8: identity-and-inverses

### when-there-is-no-inverse
- **Shows:** the plane squashed onto a line by a matrix whose ad − bc is 0, with two different input points that land on the same output marked.
- **Learner changes:** the matrix entries, with the squashing appearing as ad − bc reaches 0.
- **Caption:** "Two inputs land on one output, so nothing can send it back."

## Lesson 9: solve-by-row-reduction

### clearing-below-the-first-entry
- **Shows:** an augmented matrix with each row operation as a button, and the matrix updating after each press with the changed row highlighted.
- **Learner changes:** which operation to apply and the multiplier.
- **Caption:** "Press an operation and watch the row change. The solution never moves."

## Lesson 10: one-none-or-many-solutions

### equations-as-lines
- **Shows:** two straight lines on a grid, one for each equation, with the point where they meet marked when they do.
- **Learner changes:** the right-hand side of the second equation, and a multiplier on its left side.
- **Caption:** "Slide the second line. It crosses the first, runs beside it, or lies on top of it."

## Lesson 11: spans-and-subspaces

### one-button
- **Shows:** a floor of square tiles with the robot on its starting tile and the tiles it can reach after each press of one button picked out, so they line up along a line through the start.
- **Learner changes:** how many times the button is pressed, forwards or backwards, with a slider.
- **Caption:** "Press the button and the robot steps along one line. Nothing off that line can be reached."

### a-second-button
- **Shows:** the same floor with two buttons, and the tiles reachable by mixing them lit up. A second button along the first leaves the lit tiles on a line, and a different one lights the whole floor.
- **Learner changes:** the second button's vector, by dragging its tip, and the number of presses of each.
- **Caption:** "Drag the second button. While it points along the first, the lit tiles stay on a line."

## Lesson 12: basis-and-dimension

### one-recipe-for-each-place
- **Shows:** a target tile with every recipe of presses that reaches it, listed beside the floor. Two buttons give one recipe, and three buttons give a row of recipes.
- **Learner changes:** which buttons are on the remote, by switching each on or off.
- **Caption:** "Switch the diagonal button on and the tile gains a second recipe, then a third."

## Lesson 13: rank-and-null-space

### inputs-that-vanish
- **Shows:** the sum machine as a plane of inputs with the line of inputs that give 0 drawn in, and the output shown beside any chosen input.
- **Learner changes:** the input point, by dragging it, with the output updating.
- **Caption:** "Drag the point onto the line and the output drops to 0."

## Lesson 14: determinants-and-volume

### a-tile-that-leans-over
- **Shows:** the unit square becoming a parallelogram, drawn inside the enclosing rectangle with the four kinds of leftover piece shaded and their areas labelled.
- **Learner changes:** the four entries of the matrix.
- **Caption:** "The big rectangle minus the shaded pieces leaves the parallelogram, and the leftover is ad − bc."

## Lesson 15: project-onto-a-direction

### dropping-onto-a-slanted-line
- **Shows:** a line through the origin, a point v, its landing place on the line and the residual drawn with a right-angle mark.
- **Learner changes:** the point v and the direction of the line, by dragging them.
- **Caption:** "Drag the point and the landing place follows. The residual always meets the line at a right angle."

## Lesson 16: fit-with-least-squares

### a-line-through-three-points
- **Shows:** the seedling's three measured heights as dots at weeks 0, 1 and 2, a straight line through them, and a vertical segment from each dot to the line with a square drawn on it. The total area of the squares is written beside the picture.
- **Learner changes:** the line's starting height and slope, by dragging two handles, and a button that jumps to the least-squares line.
- **Caption:** "Drag the line until the squares are as small as you can make them. The button shows where they are smallest."

## Lesson 17: build-an-orthonormal-basis

### straightening-the-second-arrow
- **Shows:** two crooked arrows u and v from the same start. Three buttons in order draw e₁ (u shrunk to length 1), the shadow of v on e₁, and the leftover arrow standing at a right angle, then the leftover shrunk to length 1 as e₂. A right-angle mark appears at the end.
- **Learner changes:** the tips of u and v, by dragging them, and which move is shown, by pressing the buttons.
- **Caption:** "Press the moves in order. The second arrow ends up square to the first and of length 1."

## Lesson 18: eigenvectors-and-eigenvalues

### arrows-that-keep-their-line
- **Shows:** a ring of arrows from the centre and, beside it, the same ring after a matrix has acted. Each arrow is joined to its output by a thin line, and any arrow whose output lies on its own line is drawn in a bright colour with its stretch factor written on it.
- **Learner changes:** the four entries of the matrix.
- **Caption:** "Change the matrix. The arrows that stay on their line light up, with the number they are stretched by."

## Lesson 19: diagonalise-a-map

### split-scale-and-add
- **Shows:** an arrow split into two parts along the two eigenvector lines, each part stretched by its own eigenvalue, and the stretched parts added tip to tail to give the output arrow.
- **Learner changes:** the arrow, by dragging its tip, with the two counts and the output updating.
- **Caption:** "Drag the arrow. Each part is scaled on its own line, and the two scaled parts add up to the output."

## Lesson 20: singular-value-decomposition

### circle-to-oval
- **Shows:** a circle of length-1 arrows on the left and the oval they become on the right, with the long and short half-widths of the oval labelled. Buttons step through Vᵀ, Σ and U, so the circle turns, stretches into an oval, and turns again.
- **Learner changes:** the matrix entries, and which step is shown.
- **Caption:** "Step through the three factors. The two half-widths of the oval are the singular values."
