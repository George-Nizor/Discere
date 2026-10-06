import {
  angle,
  triangleAngles,
  rect,
  beat,
  numeric,
  choose,
  card,
  type TeachingLesson,
} from "./definition.js";
export const angleLessons: TeachingLesson[] = [
  {
    id: "measuring-turns",
    title: "Measuring turns",
    summary: "Use quarter, half and full turns to find an unknown angle.",
    moduleId: "geo-measure",
    sourceIds: ["geo-angles"],
    beats: [
      beat(
        "A corner is a turn",
        "A right angle is a quarter-turn: 90°. The marked ray has used 35° of that turn. The remaining part fills the same corner. Compare the 35° and 60° cases; increasing one part must shrink the other.",
        ["35° of a corner", angle(35, 90)],
        ["60° of a corner", angle(60, 90)],
      ),
      beat(
        "Along a straight line",
        "A half-turn measures 180°. Adjacent angles on a straight line fill that half-turn, so their measures add to 180°. The unknown angle beside 68° is found by subtraction.",
        ["68° on a line", angle(68)],
        ["112° on a line", angle(112)],
      ),
      beat(
        "All the way around",
        "A full turn measures 360°. If a pointer turns 140° from its starting direction, it still needs the difference between 360° and 140° to complete one full turn in that direction.",
        ["140° around", angle(140, 360)],
        ["220° around", angle(220, 360)],
      ),
      beat(
        "Size of the turn",
        "Angle measures describe rotation, not the length of a ray. The two parts of a straight turn must total 180° even if the drawing is enlarged. An unknown part beside 125° is less than a right angle.",
        ["125° on a line", angle(125)],
        ["55° on a line", angle(55)],
      ),
    ],
    questions: [
      numeric(
        "A 90° corner contains a 35° angle. How many degrees remain?",
        55,
        "The corner is 90° in total: 90 − 35 = 55°.",
        [
          "Identify the total turn of the corner.",
          "Subtract the known part from the total.",
          "Calculate 90 − 35.",
        ],
      ),
      numeric(
        "Two adjacent angles form a straight line. One is 68°. What is the other, in degrees?",
        112,
        "A straight turn is 180°: 180 − 68 = 112°.",
        [
          "A straight line represents a half-turn.",
          "The adjacent angles add to 180°.",
          "Calculate 180 − 68.",
        ],
      ),
      numeric(
        "After turning 140°, how many more degrees complete a 360° turn in the same direction?",
        220,
        "A complete turn is 360°: 360 − 140 = 220°.",
        [
          "Use a full turn as the total.",
          "Find the turn that has not yet been made.",
          "Calculate 360 − 140.",
        ],
      ),
      choose(
        "The rays of an angle are drawn twice as long, without changing direction. What happens to its degree measure?",
        ["It doubles", "It stays the same", "It is halved"],
        1,
        "The degree measure depends on the directions of the rays, so extending them leaves the angle unchanged.",
        "Separate the length of a ray from its direction.",
      ),
      numeric(
        "A right angle is split into 27° and another angle. Find the other angle in degrees.",
        63,
        "The parts sum to 90°: 90 − 27 = 63°.",
        ["A right angle is the whole.", "Subtract the part already given.", "Calculate 90 − 27."],
      ),
      choose(
        "Which pair can form a straight angle?",
        ["42° and 48°", "72° and 108°", "95° and 95°"],
        1,
        "72° + 108° = 180°, the measure of a straight angle.",
        "Add each pair and compare with a half-turn.",
      ),
    ],
    cards: [
      card(
        "One of two adjacent angles on a straight line is 137°. Find the other in degrees.",
        43,
        "180 − 137 = 43°.",
      ),
      card(
        "A pointer has turned 235°. How many more degrees complete a full turn?",
        125,
        "360 − 235 = 125°.",
      ),
    ],
  },
  {
    id: "angles-in-triangles",
    title: "Angles in triangles",
    summary: "Find a missing triangle angle and test whether angle measures are possible.",
    moduleId: "geo-measure",
    sourceIds: ["geo-angles"],
    beats: [
      beat(
        "Three corners, one total",
        "In a flat Euclidean plane, the interior angles of a triangle add to 180°. Changing the triangle's shape changes the individual angles, while their sum stays fixed.",
        ["48° and 67°", triangleAngles(48, 67)],
        ["35° and 80°", triangleAngles(35, 80)],
      ),
      beat(
        "Use the right angle",
        "A right triangle already uses 90° at one corner. Its other two angles must share the remaining 90°. The side across from the right angle is called the hypotenuse.",
        ["90° and 32°", triangleAngles(90, 32)],
        ["90° and 58°", triangleAngles(90, 58)],
      ),
      beat(
        "Equal corners",
        "If two angles of a triangle are equal, subtract the third angle from 180° and split the remainder into two equal parts. For a third angle of 44°, each of the equal angles is 68°.",
        ["68° and 68°", triangleAngles(68, 68)],
        ["52° and 52°", triangleAngles(52, 52)],
      ),
      beat(
        "Check a proposed triangle",
        "Two right angles already use the entire 180° total. That would leave no positive third angle, so a nondegenerate triangle cannot have two right angles. Test a set of angles before drawing it.",
        ["90° and 55°", triangleAngles(90, 55)],
        ["80° and 70°", triangleAngles(80, 70)],
      ),
    ],
    questions: [
      numeric(
        "A triangle has angles 48° and 67°. What is its third angle in degrees?",
        65,
        "180 − 48 − 67 = 65°.",
        [
          "All three interior angles share one fixed total.",
          "Add the two given angles.",
          "Subtract 48 + 67 from 180.",
        ],
      ),
      numeric(
        "A right triangle has another angle of 32°. Find its third angle in degrees.",
        58,
        "180 − 90 − 32 = 58°.",
        [
          "The right angle uses half of the triangle's total.",
          "The two acute angles add to 90°.",
          "Calculate 90 − 32.",
        ],
      ),
      numeric(
        "A triangle has two equal angles and a third angle of 44°. Find one equal angle in degrees.",
        68,
        "The equal angles share 180 − 44 = 136°; each is 136/2 = 68°.",
        [
          "Remove the unequal angle from the total.",
          "Split what remains equally between two angles.",
          "Calculate (180 − 44)/2.",
        ],
      ),
      choose(
        "Can a nondegenerate triangle in a flat plane have two right angles?",
        [
          "Yes, if its sides are long enough",
          "No, that leaves no positive third angle",
          "Yes, if its third angle is 90°",
        ],
        1,
        "Two right angles use 180°, leaving 0° for the third; that cannot form a nondegenerate triangle.",
        "Use the sum of the interior angles.",
      ),
      numeric(
        "A triangular sign has angles 39° and 86°. Find its third angle in degrees.",
        55,
        "180 − 39 − 86 = 55°.",
        [
          "Treat all three angles as parts of 180°.",
          "Find the total of the two given angles.",
          "Calculate 180 − (39 + 86).",
        ],
      ),
      choose(
        "Which set can be the interior angles of a triangle?",
        ["40°, 60°, 80°", "60°, 70°, 80°", "90°, 90°, 10°"],
        0,
        "40° + 60° + 80° = 180° and all three measures are positive.",
        "Check both the total and whether every angle is positive.",
      ),
    ],
    cards: [
      card(
        "A triangle has angles 57° and 74°. Find the third angle in degrees.",
        49,
        "180 − 57 − 74 = 49°.",
      ),
      card(
        "An isosceles triangle has a 34° angle between its equal sides. Find each other angle in degrees.",
        73,
        "The other angles are equal: (180 − 34)/2 = 73°.",
      ),
    ],
  },
  {
    id: "boundary-and-area",
    title: "Boundary and area",
    summary: "Distinguish distance around a shape from the surface it covers.",
    moduleId: "geo-measure",
    sourceIds: ["geo-area"],
    beats: [
      beat(
        "Fence or floor?",
        "Perimeter counts the boundary length. Area counts how many unit squares cover the inside. A rectangle can share another rectangle's perimeter without sharing its area. Compare the two rectangles and turn on unit squares.",
        ["6 × 4 rectangle", rect(6, 4)],
        ["8 × 2 rectangle", rect(8, 2)],
      ),
      beat(
        "Walk every edge",
        "The opposite sides of a rectangle have equal lengths. A 6 by 4 rectangle has boundary 6 + 4 + 6 + 4, so its perimeter is 20 length units. Count all four edges.",
        ["6 × 4 rectangle", rect(6, 4)],
        ["7 × 3 rectangle", rect(7, 3)],
      ),
      beat(
        "Cover the inside",
        "A 6 by 4 rectangle contains four rows of six unit squares. Its area is 24 square units. Multiplying length by width counts every unit square once.",
        ["6 × 4 rectangle", rect(6, 4)],
        ["8 × 2 rectangle", rect(8, 2)],
      ),
      beat(
        "A different rectangle",
        "A 7 by 3 rectangle has the same perimeter as the 6 by 4 rectangle, but area 21 rather than 24 square units. A fixed amount of fencing does not determine a unique area.",
        ["7 × 3 rectangle", rect(7, 3)],
        ["6 × 4 rectangle", rect(6, 4)],
      ),
    ],
    questions: [
      choose(
        "The rectangles are 6 × 4 and 8 × 2. Which statement is true?",
        [
          "They have the same perimeter but different areas",
          "They have the same area but different perimeters",
          "They have equal areas and equal perimeters",
        ],
        0,
        "Both perimeters are 20, while their areas are 24 and 16 square units.",
        "Compare the sum around each boundary with the product of its dimensions.",
      ),
      numeric(
        "Find the perimeter of a rectangle 6 units long and 4 units wide.",
        20,
        "6 + 4 + 6 + 4 = 20 length units.",
        [
          "Perimeter is the total boundary.",
          "There are two sides of each length.",
          "Calculate 2 × (6 + 4).",
        ],
      ),
      numeric(
        "Find the area of a rectangle 6 units long and 4 units wide, in square units.",
        24,
        "Six squares per row across four rows give 6 × 4 = 24 square units.",
        [
          "Count square units inside the boundary.",
          "Use the number of rows and squares in each row.",
          "Multiply 6 by 4.",
        ],
      ),
      numeric(
        "A rectangle is 7 units by 3 units. What area does it cover in square units?",
        21,
        "Its area is 7 × 3 = 21 square units.",
        [
          "Area counts the inside.",
          "Multiply the two perpendicular dimensions.",
          "Calculate 7 × 3.",
        ],
      ),
      numeric(
        "A rectangular floor has area 54 m² and width 6 m. Find its length in metres.",
        9,
        "Length × 6 = 54, so length = 54/6 = 9 m.",
        [
          "Area is length times width.",
          "Undo multiplication by the known width.",
          "Divide 54 by 6.",
        ],
      ),
      choose(
        "Which unit is appropriate for the area of a small floor?",
        ["Metres", "Square metres", "Cubic metres"],
        1,
        "Area counts two-dimensional coverage, so it uses square metres.",
        "A unit square has both length and width.",
      ),
    ],
    cards: [
      card(
        "A rectangle measures 9 cm by 5 cm. What is its perimeter in centimetres?",
        28,
        "2 × (9 + 5) = 28 cm.",
      ),
      card(
        "A rectangular poster measures 11 cm by 4 cm. What is its area in square centimetres?",
        44,
        "11 × 4 = 44 cm².",
      ),
    ],
  },
];
