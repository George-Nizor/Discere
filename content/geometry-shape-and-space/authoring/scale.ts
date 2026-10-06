import { similar, right, beat, numeric, choose, card, type TeachingLesson } from "./definition.js";
export const scaleLessons: TeachingLesson[] = [
  {
    id: "same-shape-new-size",
    title: "Same shape, new size",
    summary: "Match corresponding lengths and apply one scale factor to every dimension.",
    moduleId: "geo-scale",
    sourceIds: ["geo-similar"],
    beats: [
      beat(
        "One multiplier",
        "Similar figures have equal corresponding angles and one common ratio between corresponding lengths. A scale factor of 3 changes a width of 2 to 6. The height must use that same factor.",
        ["Scale factor 3", similar(2, 3, 3)],
        ["Scale factor 2", similar(2, 3, 2)],
      ),
      beat(
        "Match corresponding sides",
        "The 3-unit height of the original rectangle becomes 9 under scale factor 3. Match height with height and width with width; mixing those pairs can give the wrong scale factor.",
        ["Scale factor 3", similar(2, 3, 3)],
        ["Scale factor 1", similar(2, 3, 1)],
      ),
      beat(
        "Stretching is different",
        "Applying the same factor to every length preserves the shape. Doubling only the width of a rectangle changes its proportions. Similarity requires all corresponding lengths to share one factor.",
        ["Every length × 2", similar(3, 2, 2)],
        ["Every length × 1", similar(3, 2, 1)],
      ),
      beat(
        "A smaller copy",
        "A positive scale factor below 1 produces a smaller copy. With factor 0.5, each length is halved. The direction of the comparison matters: going from the small copy back to the original uses factor 2.",
        ["Every length × 0.5", similar(5, 4, 0.5)],
        ["Every length × 2", similar(5, 4, 2)],
      ),
    ],
    questions: [
      numeric(
        "A 2-unit width is enlarged by scale factor 3. What is the new width?",
        6,
        "2 × 3 = 6 units.",
        [
          "A scale factor multiplies a length.",
          "Apply it to the corresponding width.",
          "Calculate 2 × 3.",
        ],
      ),
      numeric(
        "A similar enlargement uses scale factor 3. An original height is 3 units. What is the new height?",
        9,
        "Every length uses the same factor: 3 × 3 = 9 units.",
        [
          "The height uses the same multiplier as the width.",
          "Multiply the original height by the scale factor.",
          "Calculate 3 × 3.",
        ],
      ),
      choose(
        "Which change guarantees a similar copy of a rectangle?",
        [
          "Double its width only",
          "Double every side length",
          "Add 2 units to its width and height",
        ],
        1,
        "Multiplying every length by the same positive factor preserves angles and proportions.",
        "Similarity uses a common ratio, not a common added amount.",
      ),
      numeric(
        "A 5-unit width is reduced by scale factor 0.5. What is the new width?",
        2.5,
        "5 × 0.5 = 2.5 units.",
        [
          "A factor below one makes a smaller copy.",
          "Multiplying by one-half halves the width.",
          "Split the original width into two equal lengths.",
        ],
      ),
      numeric(
        "On a scale drawing, 1 cm represents 200 cm. A wall is drawn 3 cm long. Find its real length in metres.",
        6,
        "3 × 200 = 600 cm; dividing by 100 gives 6 m.",
        [
          "First use the drawing-to-real scale factor.",
          "Then convert centimetres to metres.",
          "Calculate (3 × 200)/100.",
        ],
      ),
      choose(
        "Two rectangles have equal areas. What can you conclude about similarity?",
        [
          "They must be similar",
          "Area alone does not determine whether they are similar",
          "They must have equal widths",
        ],
        1,
        "Different width-to-height ratios can produce the same area. Similarity requires matching proportions.",
        "Area gives a product, not the ratio of dimensions.",
      ),
    ],
    cards: [
      card(
        "A similar copy changes a 4 cm side to 14 cm. What is its length scale factor?",
        3.5,
        "New length divided by original length gives 14/4 = 3.5.",
      ),
      card(
        "A model uses scale factor 0.25 from the original. What length represents an original 18 cm side, in centimetres?",
        4.5,
        "18 × 0.25 = 4.5 cm.",
      ),
    ],
  },
  {
    id: "when-area-scales",
    title: "When area scales",
    summary: "Distinguish a length scale factor from the resulting area factor.",
    moduleId: "geo-scale",
    sourceIds: ["geo-similar", "geo-area"],
    beats: [
      beat(
        "Two dimensions change",
        "A 3 by 2 rectangle has area 6. Doubling both lengths makes a 6 by 4 rectangle with area 24. The multiplier appears once in the width and once in the height, producing an area factor of four.",
        ["Lengths × 2", similar(3, 2, 2)],
        ["Lengths × 1", similar(3, 2, 1)],
      ),
      beat(
        "Multiply the multiplier",
        "Tripling every length produces an area factor of 3 × 3 = 9. The original area of 6 becomes 54. This squared factor applies to any similar plane figures.",
        ["Lengths × 3", similar(3, 2, 3)],
        ["Lengths × 2", similar(3, 2, 2)],
      ),
      beat(
        "Use an area you already know",
        "You can scale area without finding every new side. If an original area is 14 and every length is multiplied by 4, multiply 14 by 4². The area grows by sixteen times.",
        ["Lengths × 4", similar(7, 2, 4)],
        ["Lengths × 2", similar(7, 2, 2)],
      ),
      beat(
        "One dimension is not two",
        "Doubling only width gives twice the rectangle's area, while doubling width and height gives four times its area. Check which dimensions actually change before applying the square rule.",
        ["Both lengths × 2", similar(5, 3, 2)],
        ["Both lengths × 1", similar(5, 3, 1)],
      ),
    ],
    questions: [
      numeric(
        "A 3 cm by 2 cm rectangle has both lengths doubled. Find the new area in square centimetres.",
        24,
        "The new rectangle is 6 by 4: 6 × 4 = 24 cm².",
        [
          "Scale both dimensions before finding area.",
          "Doubling each dimension multiplies area by four.",
          "Calculate (3 × 2) × (2 × 2).",
        ],
      ),
      numeric(
        "A shape has area 6 cm². Every length is tripled in a similar copy. Find the new area in square centimetres.",
        54,
        "The area factor is 3² = 9; 6 × 9 = 54 cm².",
        [
          "Area changes in two dimensions.",
          "Square the length scale factor.",
          "Calculate 6 × 3 × 3.",
        ],
      ),
      numeric(
        "A shape has area 14 m². Every length is multiplied by 4 in a similar copy. Find the new area in square metres.",
        224,
        "The area factor is 4² = 16; 14 × 16 = 224 m².",
        [
          "Use the area factor, not just the length factor.",
          "Multiply the original area by the square of four.",
          "Calculate 14 × 4 × 4.",
        ],
      ),
      choose(
        "Only a rectangle's width doubles; its height stays fixed. What is its area factor?",
        ["2", "4", "8"],
        0,
        "Only one factor in width × height doubles, so the area doubles.",
        "Track which dimensions change.",
      ),
      numeric(
        "A similar copy has 9 times the original area. What positive length scale factor was used?",
        3,
        "The positive factor whose square is 9 is 3.",
        [
          "The area factor is the length factor squared.",
          "Reverse squaring with a positive square root.",
          "Find the positive number that multiplies by itself to make 9.",
        ],
      ),
      numeric(
        "A figure has area 20 cm². A similar copy halves every length. Find the copy's area in square centimetres.",
        5,
        "The area factor is 0.5² = 0.25; 20 × 0.25 = 5 cm².",
        [
          "Halving both dimensions gives a quarter of the area.",
          "Multiply the area by one-half twice.",
          "Calculate 20/2/2.",
        ],
      ),
    ],
    cards: [
      card(
        "A similar enlargement multiplies every length by 5. What is the area multiplier?",
        25,
        "The area multiplier is 5² = 25.",
      ),
      card(
        "A shape has area 36 m². Every length is reduced to one-third in a similar copy. Find its area in square metres.",
        4,
        "36 × (1/3)² = 36/9 = 4 m².",
      ),
    ],
  },
  {
    id: "right-triangle-distances",
    title: "Right-triangle distances",
    summary:
      "Find a missing side using squared lengths and identify when the Pythagorean theorem applies.",
    moduleId: "geo-scale",
    sourceIds: ["geo-angles"],
    beats: [
      beat(
        "A shortcut across",
        "For a right triangle, the squares of the two perpendicular legs add to the square of the hypotenuse. With legs 5 and 12, the sum is 25 + 144 = 169. The side length is the positive square root, 13.",
        ["Legs 5 and 12", right(5, 12)],
        ["Legs 9 and 12", right(9, 12)],
      ),
      beat(
        "Find the hypotenuse",
        "The hypotenuse is opposite the right angle and is the longest side. The theorem is a² + b² = c² when c is the hypotenuse. Relabelling or rotating a triangle does not change that relationship.",
        ["Legs 5 and 12", right(5, 12)],
        ["Legs 12 and 5", right(12, 5)],
      ),
      beat(
        "Square, add, then root",
        "With legs 6 and 8, calculate 6² + 8² = 100. That is the square of the hypotenuse, not its length. The final square root gives 10. Adding the legs instead measures a bent path.",
        ["Legs 6 and 8", right(6, 8)],
        ["Legs 8 and 15", right(8, 15)],
      ),
      beat(
        "Work backwards",
        "If the hypotenuse and one leg are known, subtract the known leg's square from the hypotenuse's square. Then take the positive square root. Squared lengths must stay on the correct sides of the equation.",
        ["Legs 8 and 15", right(8, 15)],
        ["Legs 7 and 24", right(7, 24)],
      ),
    ],
    questions: [
      numeric(
        "A right triangle has legs 5 m and 12 m. Find its hypotenuse in metres.",
        13,
        "5² + 12² = 169; √169 = 13 m.",
        [
          "Use the two sides meeting at the right angle.",
          "Square and add the leg lengths.",
          "Take the positive square root of 5² + 12².",
        ],
      ),
      choose(
        "Which side is the hypotenuse of a right triangle?",
        [
          "The side opposite the right angle",
          "Either side touching the right angle",
          "Always the horizontal side",
        ],
        0,
        "The hypotenuse lies opposite the right angle, regardless of the triangle's orientation.",
        "Locate the right-angle marker first.",
      ),
      numeric(
        "A right triangle has legs 6 cm and 8 cm. Find its hypotenuse in centimetres.",
        10,
        "6² + 8² = 100; √100 = 10 cm.",
        [
          "The squares of the legs add to the square of the hypotenuse.",
          "Find the sum of 6² and 8².",
          "Take the positive square root of that sum.",
        ],
      ),
      choose(
        "The hypotenuse is c and one leg is a. Which expression gives the other leg's length?",
        ["√(c² − a²)", "c − a", "√(c² + a²)"],
        0,
        "From a² + b² = c², rearrange to b² = c² − a² and take the positive root.",
        "Isolate the square of the missing leg.",
      ),
      numeric(
        "A right triangle has hypotenuse 25 cm and one leg 7 cm. Find the other leg in centimetres.",
        24,
        "The missing leg is √(25² − 7²) = √576 = 24 cm.",
        [
          "The longest side is already known.",
          "Subtract the known leg's square from the hypotenuse's square.",
          "Take the positive square root of 25² − 7².",
        ],
      ),
      numeric(
        "A right triangle has perpendicular legs 9 m and 12 m. Find its hypotenuse in metres.",
        15,
        "√(9² + 12²) = √225 = 15 m.",
        [
          "Use squared lengths before finding the side length.",
          "Add the squares of both legs.",
          "Take the positive square root of 9² + 12².",
        ],
      ),
    ],
    cards: [
      card(
        "A right triangle has legs 20 cm and 21 cm. Find its hypotenuse in centimetres.",
        29,
        "√(20² + 21²) = √841 = 29 cm.",
      ),
      card(
        "A right triangle has hypotenuse 13 m and one leg 5 m. Find the other leg in metres.",
        12,
        "√(13² − 5²) = √144 = 12 m.",
      ),
    ],
  },
];
