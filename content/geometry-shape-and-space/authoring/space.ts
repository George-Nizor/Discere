import { distance, prism, beat, numeric, choose, card, type TeachingLesson } from "./definition.js";
export const spaceLessons: TeachingLesson[] = [
  {
    id: "distance-on-a-grid",
    title: "Distance on a grid",
    summary:
      "Use coordinate differences as right-triangle legs and distinguish direct distance from a grid path.",
    moduleId: "geo-space",
    sourceIds: ["geo-distance", "geo-angles"],
    beats: [
      beat(
        "Read the separation",
        "The points A(1, 2) and B(4, 6) differ by 3 horizontally and 4 vertically. Coordinate differences measure separation; the coordinates themselves measure position relative to the origin.",
        ["A(1,2) to B(4,6)", distance(1, 2, 4, 6)],
        ["A(2,1) to B(5,5)", distance(2, 1, 5, 5)],
      ),
      beat(
        "Two perpendicular legs",
        "Moving horizontally and then vertically makes a right-angle path. Its two lengths can form the legs of a right triangle. The straight segment between the points is the hypotenuse.",
        ["A(1,2) to B(4,6)", distance(1, 2, 4, 6)],
        ["Reverse the trip", distance(4, 6, 1, 2)],
      ),
      beat(
        "Take the straight route",
        "The direct distance uses the square root of the sum of squared coordinate differences. Here √(3² + 4²) = 5. The horizontal-then-vertical route is 7 units long, so it is a different measurement.",
        ["Separations 3 and 4", distance(1, 2, 4, 6)],
        ["Separations 6 and 8", distance(-2, -2, 4, 6)],
      ),
      beat(
        "Move both endpoints",
        "Adding the same coordinate change to both points translates the segment. Both coordinate differences remain the same, so its length remains the same. Changing position does not necessarily change distance.",
        ["A(1,2) to B(4,6)", distance(1, 2, 4, 6)],
        ["Translate by (2,1)", distance(3, 3, 6, 7)],
      ),
    ],
    questions: [
      numeric(
        "Points A(1, 2) and B(4, 6) are how many units apart horizontally?",
        3,
        "The horizontal difference is |4 − 1| = 3 units.",
        [
          "Horizontal position is the first coordinate.",
          "Subtract the two x coordinates.",
          "Find the absolute value of 4 − 1.",
        ],
      ),
      numeric(
        "Points A(1, 2) and B(4, 6) are how many units apart vertically?",
        4,
        "The vertical difference is |6 − 2| = 4 units.",
        [
          "Vertical position is the second coordinate.",
          "Subtract the two y coordinates.",
          "Find the absolute value of 6 − 2.",
        ],
      ),
      numeric(
        "Find the straight-line distance from A(1, 2) to B(4, 6), in grid units.",
        5,
        "The separations are 3 and 4; √(3² + 4²) = 5 units.",
        [
          "Use the horizontal and vertical differences as legs.",
          "Add the squares of the differences.",
          "Calculate √((4 − 1)² + (6 − 2)²).",
        ],
      ),
      choose(
        "Both endpoints of a segment move 2 units right and 1 unit up. What happens to its length?",
        ["It increases by 3 units", "It stays the same", "It doubles"],
        1,
        "The same translation leaves both coordinate differences unchanged, so the length is unchanged.",
        "Compare the differences between the endpoints before and after moving.",
      ),
      numeric(
        "Find the straight-line distance from (−3, 1) to (5, 7), in grid units.",
        10,
        "The differences are 8 and 6; √(8² + 6²) = 10 units.",
        [
          "Subtract corresponding coordinates.",
          "The x difference crosses from negative to positive.",
          "Calculate √((5 − (−3))² + (7 − 1)²).",
        ],
      ),
      numeric(
        "Find the straight-line distance from (−3, −4) to (2, 8), in grid units.",
        13,
        "The differences are 5 and 12; √(5² + 12²) = 13 units.",
        [
          "Use coordinate differences, not their sum.",
          "Square the horizontal and vertical separations.",
          "Calculate √((2 − (−3))² + (8 − (−4))²).",
        ],
      ),
    ],
    cards: [
      card(
        "Find the direct distance between (−2, 3) and (10, 8), in grid units.",
        13,
        "The separations are 12 and 5, so √(12² + 5²) = 13.",
      ),
      card(
        "Find the direct distance between (0, 1) and (8, 7), in grid units.",
        10,
        "The separations are 8 and 6, so √(8² + 6²) = 10.",
      ),
    ],
  },
  {
    id: "filling-space",
    title: "Filling space",
    summary: "Count volume in cubic units and predict how it changes when dimensions change.",
    moduleId: "geo-space",
    sourceIds: ["geo-solids", "geo-similar"],
    beats: [
      beat(
        "Layers of cubes",
        "A rectangular box 4 units long and 3 units wide has room for 12 unit cubes in one layer. Two layers fill a height of 2, giving 24 cubic units. Volume counts space inside.",
        ["4 × 3 × 2 box", prism(4, 3, 2)],
        ["4 × 3 × 5 box", prism(4, 3, 5)],
      ),
      beat(
        "Add more layers",
        "Keeping the base 4 by 3 while increasing height to 5 gives five layers of 12. Multiplying length, width and height counts the cubes once. The order of these three factors does not matter.",
        ["Height 5", prism(4, 3, 5)],
        ["Height 2", prism(4, 3, 2)],
      ),
      beat(
        "Three dimensions",
        "Volume uses cubic units because each unit cube has length, width and height. Square units measure a surface. A box's capacity and the area of its walls answer different questions.",
        ["4 × 3 × 2 box", prism(4, 3, 2)],
        ["4 × 2 × 3 box", prism(4, 2, 3)],
      ),
      beat(
        "Scale all three lengths",
        "Doubling all three edges of a cube multiplies volume by 2 × 2 × 2 = 8. A cube of side 3 has volume 27; a cube of side 6 has volume 216. Doubling only height would double volume instead.",
        ["Side 3 cube", prism(3, 3, 3)],
        ["Side 6 cube", prism(6, 6, 6)],
      ),
    ],
    questions: [
      numeric(
        "A rectangular box has inside dimensions 4 cm by 3 cm by 2 cm. Find its volume in cubic centimetres.",
        24,
        "Each layer holds 4 × 3 = 12 unit cubes; two layers give 24 cm³.",
        [
          "Find the number of unit cubes in one layer.",
          "Multiply by the number of layers.",
          "Calculate 4 × 3 × 2.",
        ],
      ),
      numeric(
        "A box has inside dimensions 4 cm by 3 cm by 5 cm. Find its volume in cubic centimetres.",
        60,
        "4 × 3 × 5 = 60 cm³.",
        [
          "Use the base area and height.",
          "The 4 by 3 base is repeated through five layers.",
          "Calculate 4 × 3 × 5.",
        ],
      ),
      choose(
        "Which unit measures how much space is inside a box?",
        ["Centimetres", "Square centimetres", "Cubic centimetres"],
        2,
        "Volume counts three-dimensional unit cubes, so it uses cubic centimetres.",
        "Count the independent dimensions needed to fill the box.",
      ),
      numeric(
        "A cube's side length increases from 3 cm to 6 cm. Find the larger cube's volume in cubic centimetres.",
        216,
        "The larger cube has volume 6 × 6 × 6 = 216 cm³.",
        [
          "A cube has three equal edge dimensions.",
          "Use the larger side length three times.",
          "Calculate 6³.",
        ],
      ),
      numeric(
        "A storage box has inside dimensions 8 m by 5 m by 4 m. Find its volume in cubic metres.",
        160,
        "8 × 5 × 4 = 160 m³.",
        ["First find the base area.", "Multiply that area by the height.", "Calculate 8 × 5 × 4."],
      ),
      numeric(
        "A rectangular box has volume 120 cm³, length 6 cm and width 4 cm. Find its height in centimetres.",
        5,
        "Its base area is 6 × 4 = 24 cm²; height = 120/24 = 5 cm.",
        [
          "Divide volume by the area of one layer.",
          "Find the base area from length and width.",
          "Calculate 120/(6 × 4).",
        ],
      ),
    ],
    cards: [
      card(
        "A box has inside dimensions 7 cm by 3 cm by 2 cm. Find its volume in cubic centimetres.",
        42,
        "7 × 3 × 2 = 42 cm³.",
      ),
      card(
        "Every length of a similar solid is multiplied by 3. What is the volume multiplier?",
        27,
        "Three dimensions each contribute a factor of 3: 3³ = 27.",
      ),
    ],
  },
  {
    id: "unfolding-surface-area",
    title: "Unfolding surface area",
    summary: "Unfold a box to calculate covering area, including the effect of a missing lid.",
    moduleId: "geo-space",
    sourceIds: ["geo-solids", "geo-similar"],
    beats: [
      beat(
        "Unfold the box",
        "A closed rectangular box has six faces. Unfold it to see three pairs: top and base, front and back, left and right. Each pair has equal area, even when its rectangle is turned in the net.",
        ["5 × 3 × 2 box", prism(5, 3, 2)],
        ["4 × 4 × 4 cube", prism(4, 4, 4)],
      ),
      beat(
        "Count every face once",
        "For a 5 by 3 by 2 box, the face areas are 15, 10 and 6, each appearing twice. The total surface area is 2 × (15 + 10 + 6) = 62 square units. Volume would multiply all three lengths instead.",
        ["5 × 3 × 2 box", prism(5, 3, 2)],
        ["5 × 3 × 4 box", prism(5, 3, 4)],
      ),
      beat(
        "Leave the lid off",
        "An open-top box omits one face. If the top of the 5 by 3 by 2 box is the 5 by 3 rectangle, subtract its area of 15 from the closed total of 62. The required covering area is 47.",
        ["Closed box for comparison", prism(5, 3, 2)],
        ["A taller closed box", prism(5, 3, 4)],
      ),
      beat(
        "Surface or capacity?",
        "Surface area counts square units across the faces; volume counts cubic units inside. In a similar enlargement, doubling every length multiplies each face area by four and volume by eight.",
        ["Side 2 cube", prism(2, 2, 2)],
        ["Side 4 cube", prism(4, 4, 4)],
      ),
    ],
    questions: [
      numeric(
        "How many rectangular faces does a closed rectangular box have?",
        6,
        "There are three opposite pairs of faces: 2 + 2 + 2 = 6.",
        [
          "Pair the top with the base.",
          "Also pair front with back and left with right.",
          "Count two faces in each of three pairs.",
        ],
      ),
      numeric(
        "A closed box measures 5 cm by 3 cm by 2 cm. Find its total surface area in square centimetres.",
        62,
        "2 × (5 × 3 + 5 × 2 + 3 × 2) = 2 × 31 = 62 cm².",
        [
          "Find the areas of the three differently sized faces.",
          "Each has an equal opposite face.",
          "Calculate 2 × (5 × 3 + 5 × 2 + 3 × 2).",
        ],
      ),
      numeric(
        "A 5 cm by 3 cm by 2 cm box has no lid. The missing top is 5 cm by 3 cm. Find its covering area in square centimetres.",
        47,
        "Closed area 62 minus the missing top area 15 gives 47 cm².",
        [
          "Begin with the area of all six faces.",
          "Remove only the top face.",
          "Calculate 2 × (5 × 3 + 5 × 2 + 3 × 2) − 5 × 3.",
        ],
      ),
      choose(
        "Every length of a box doubles. What happens to surface area and volume?",
        [
          "Both double",
          "Surface area multiplies by 4 and volume by 8",
          "Surface area multiplies by 8 and volume by 4",
        ],
        1,
        "Face areas contain two length factors; volume contains three. Their multipliers are 2² and 2³.",
        "Count the dimensions in each measurement.",
      ),
      numeric(
        "A closed cube has side length 4 cm. Find its surface area in square centimetres.",
        96,
        "Six faces each have area 4² = 16; 6 × 16 = 96 cm².",
        ["A cube has six equal square faces.", "Find one face's area.", "Calculate 6 × 4²."],
      ),
      numeric(
        "A closed box has surface area 62 cm². A similar box doubles every length. Find its surface area in square centimetres.",
        248,
        "The area multiplier is 2² = 4; 62 × 4 = 248 cm².",
        [
          "Each face grows in two dimensions.",
          "Square the length factor.",
          "Calculate 62 × 2 × 2.",
        ],
      ),
    ],
    cards: [
      card(
        "A closed rectangular box measures 6 cm by 2 cm by 3 cm. Find its surface area in square centimetres.",
        72,
        "2 × (6 × 2 + 6 × 3 + 2 × 3) = 72 cm².",
      ),
      card(
        "A closed cube has side length 5 m. Find its surface area in square metres.",
        150,
        "Six faces of area 5² give 6 × 25 = 150 m².",
      ),
    ],
  },
];
