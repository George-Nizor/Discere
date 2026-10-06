import {
  triangle,
  para,
  trapezoid,
  cutout,
  circle,
  beat,
  numeric,
  choose,
  card,
  type TeachingLesson,
} from "./definition.js";
export const areaLessons: TeachingLesson[] = [
  {
    id: "base-and-height",
    title: "Base and height",
    summary: "Measure perpendicular height and connect triangle area to a parallelogram.",
    moduleId: "geo-shapes",
    sourceIds: ["geo-area"],
    beats: [
      beat(
        "Half a rectangle",
        "A triangle with base 8 and perpendicular height 5 covers half of an 8 by 5 rectangle. Moving the top corner sideways along the same height changes the sloping sides but preserves the area.",
        ["Centred triangle", triangle(8, 5, 0.5)],
        ["Shifted triangle", triangle(8, 5, 0.9)],
      ),
      beat(
        "Which height counts?",
        "Height is the perpendicular distance to the line containing the base. The dashed guide meets the base at a right angle. A sloping side generally measures a different distance and cannot replace that height.",
        ["Centred triangle", triangle(8, 5, 0.5)],
        ["Shifted triangle", triangle(8, 5, 0.9)],
      ),
      beat(
        "Pair the triangles",
        "A diagonal divides a parallelogram into two equal-area triangles. Each has half the base-times-height area, so together they cover base times perpendicular height. Sliding the top edge preserves that height.",
        ["Gentle lean", para(8, 5, 0.2)],
        ["Larger lean", para(8, 5, 0.6)],
      ),
      beat(
        "A new triangle",
        "For base 7 and perpendicular height 6, a triangle covers half of 7 × 6. The equal-area comparison still works when the top corner moves; the formula depends on the base and perpendicular height.",
        ["Centred triangle", triangle(7, 6, 0.5)],
        ["Shifted triangle", triangle(7, 6, 0.15)],
      ),
    ],
    questions: [
      numeric(
        "A triangle has base 8 cm and perpendicular height 5 cm. Find its area in square centimetres.",
        20,
        "Half the enclosing rectangle gives 8 × 5 / 2 = 20 cm².",
        [
          "Compare the triangle with a rectangle of the same base and height.",
          "A triangle covers half that rectangle.",
          "Calculate 8 × 5 / 2.",
        ],
      ),
      choose(
        "The top corner moves sideways but stays 5 cm above an 8 cm base. What happens to the triangle's area?",
        ["It increases with the sloping side", "It stays the same", "It becomes zero"],
        1,
        "The base and perpendicular height remain fixed, so base × height / 2 remains unchanged.",
        "Identify which dimensions enter the area formula.",
      ),
      numeric(
        "A parallelogram has base 8 cm and perpendicular height 5 cm. Find its area in square centimetres.",
        40,
        "Two equal-area triangles together cover 8 × 5 = 40 cm².",
        [
          "A diagonal divides the parallelogram into two triangles.",
          "Adding the two half-areas cancels the division by two.",
          "Calculate 8 × 5.",
        ],
      ),
      numeric(
        "Find the area of a triangle with base 7 m and perpendicular height 6 m, in square metres.",
        21,
        "7 × 6 / 2 = 21 m².",
        [
          "Use the base and the perpendicular height.",
          "Take half their product.",
          "Calculate 7 × 6 / 2.",
        ],
      ),
      numeric(
        "A triangle has area 42 cm² and base 12 cm. Find its perpendicular height in centimetres.",
        7,
        "12 × height / 2 = 42, so height = 2 × 42 / 12 = 7 cm.",
        [
          "Reverse the triangle area formula.",
          "Double the area before dividing by the base.",
          "Calculate 2 × 42 / 12.",
        ],
      ),
      choose(
        "Which distance is the height used with a chosen triangle base?",
        [
          "Any sloping side",
          "The perpendicular distance from the opposite vertex to the base line",
          "The perimeter divided by three",
        ],
        1,
        "The height must meet the line containing the chosen base at a right angle.",
        "Look for the right-angle relationship to the base.",
      ),
    ],
    cards: [
      card(
        "A triangle has base 9 m and perpendicular height 8 m. Find its area in square metres.",
        36,
        "9 × 8 / 2 = 36 m².",
      ),
      card(
        "A parallelogram has base 11 cm and perpendicular height 3 cm. Find its area in square centimetres.",
        33,
        "11 × 3 = 33 cm².",
      ),
    ],
  },
  {
    id: "pieces-and-cutouts",
    title: "Pieces and cutouts",
    summary: "Calculate area by combining simple pieces or subtracting a missing corner.",
    moduleId: "geo-shapes",
    sourceIds: ["geo-area", "geo-circles"],
    beats: [
      beat(
        "The missing corner",
        "An L-shaped floor fits inside a 9 by 7 rectangle. The missing corner is 3 by 2. Subtract only that corner from the outer rectangle; the remaining region is the floor.",
        ["3 × 2 cutout", cutout(9, 7, 3, 2)],
        ["3 × 4 cutout", cutout(9, 7, 3, 4)],
      ),
      beat(
        "Two routes, one region",
        "The same L shape can be split into two non-overlapping rectangles: a 9 by 5 lower piece and a 6 by 2 upper piece. Their areas total 57, matching outer area minus cutout. Shared edges are not extra area.",
        ["3 × 2 cutout", cutout(9, 7, 3, 2)],
        ["4 × 2 cutout", cutout(9, 7, 4, 2)],
      ),
      beat(
        "Between two rectangles",
        "A trapezoid has two parallel bases. Its area is their average length times perpendicular height. With bases 10 and 6 and height 4, the area is halfway between the areas of 10 by 4 and 6 by 4 rectangles.",
        ["Bases 10 and 6", trapezoid(10, 6, 4)],
        ["Bases 10 and 8", trapezoid(10, 8, 4)],
      ),
      beat(
        "A larger cutout",
        "A 12 by 8 outer rectangle has a 5 by 3 corner removed. Work out the two rectangular areas before subtracting. Removing a bigger corner leaves less area; the outer dimensions alone are not enough.",
        ["5 × 3 cutout", cutout(12, 8, 5, 3)],
        ["5 × 5 cutout", cutout(12, 8, 5, 5)],
      ),
    ],
    questions: [
      numeric(
        "A 9 m by 7 m floor has a 3 m by 2 m corner removed. Find the remaining area in square metres.",
        57,
        "Outer area 9 × 7 = 63; removed area 3 × 2 = 6; 63 − 6 = 57 m².",
        [
          "Find the area before removing the corner.",
          "Find the corner's area separately.",
          "Calculate 9 × 7 − 3 × 2.",
        ],
      ),
      choose(
        "You split an L-shaped floor into two rectangles. What must be true before adding their areas?",
        [
          "They must overlap as much as possible",
          "They must cover the floor exactly without overlapping",
          "They must have equal perimeters",
        ],
        1,
        "A disjoint partition counts every part of the floor exactly once.",
        "Check whether any part is missing or counted twice.",
      ),
      numeric(
        "A trapezoid has parallel bases 10 cm and 6 cm, with perpendicular height 4 cm. Find its area in square centimetres.",
        32,
        "The average base is (10 + 6)/2 = 8; 8 × 4 = 32 cm².",
        [
          "Use both parallel bases.",
          "Average their lengths, then multiply by height.",
          "Calculate (10 + 6) × 4 / 2.",
        ],
      ),
      numeric(
        "A 12 cm by 8 cm rectangle has a 5 cm by 3 cm corner removed. Find the remaining area in square centimetres.",
        81,
        "12 × 8 − 5 × 3 = 96 − 15 = 81 cm².",
        [
          "Treat the missing part as a separate rectangle.",
          "Subtract its area from the full rectangle.",
          "Calculate 12 × 8 − 5 × 3.",
        ],
      ),
      numeric(
        "A trapezoid has parallel bases 13 m and 7 m and perpendicular height 5 m. Find its area in square metres.",
        50,
        "(13 + 7)/2 × 5 = 10 × 5 = 50 m².",
        [
          "Area uses the average of the two parallel bases.",
          "Multiply that average by perpendicular height.",
          "Calculate (13 + 7) × 5 / 2.",
        ],
      ),
      choose(
        "Two area pieces overlap in a 4 m² region. Adding their areas counts that region how many times?",
        ["Zero times", "Once", "Twice"],
        2,
        "The overlap belongs to both pieces, so the sum counts it twice. Subtract one copy when finding their combined area.",
        "Track the overlap once in each piece.",
      ),
    ],
    cards: [
      card(
        "An 8 m by 6 m rectangle has a 2 m by 3 m corner removed. Find the remaining area in square metres.",
        42,
        "8 × 6 − 2 × 3 = 42 m².",
      ),
      card(
        "A trapezoid has parallel bases 9 cm and 5 cm and perpendicular height 3 cm. Find its area in square centimetres.",
        21,
        "(9 + 5) × 3 / 2 = 21 cm².",
      ),
    ],
  },
  {
    id: "around-and-inside-circles",
    title: "Around and inside circles",
    summary: "Use radius and diameter correctly in circumference and circle-area calculations.",
    moduleId: "geo-shapes",
    sourceIds: ["geo-circles"],
    beats: [
      beat(
        "Centre to edge",
        "The radius runs from the centre to the circle. A diameter passes through the centre from edge to edge, so it contains two radii. Show the diameter to compare those distances.",
        ["Radius 3", circle(3)],
        ["Radius 6", circle(6)],
      ),
      beat(
        "Around the rim",
        "Circumference is the distance around a circle. It equals π times the diameter, or 2π times the radius. With radius 3, the circumference is 6π, approximately 18.84 when using π ≈ 3.14.",
        ["Radius 3", circle(3)],
        ["Radius 5", circle(5)],
      ),
      beat(
        "Cover the disc",
        "Circle area is π times radius squared. With radius 3, the area is 9π, approximately 28.26 square units when π ≈ 3.14. Circumference and area measure different things and use different units.",
        ["Radius 3", circle(3)],
        ["Radius 6", circle(6)],
      ),
      beat(
        "Diameter is not radius",
        "A circular mat with diameter 8 has radius 4. Divide the diameter by two before squaring the radius for area. Substituting the diameter as the radius would make the area four times too large.",
        ["Radius 4", circle(4)],
        ["Radius 8", circle(8)],
      ),
    ],
    questions: [
      numeric(
        "A circle has radius 3 cm. Find its diameter in centimetres.",
        6,
        "A diameter contains two radii: 2 × 3 = 6 cm.",
        [
          "The diameter crosses the entire circle through its centre.",
          "It contains a radius on each side of the centre.",
          "Multiply the radius by two.",
        ],
      ),
      numeric(
        "A circle has radius 3 cm. Use π ≈ 3.14 to find its circumference in centimetres.",
        18.84,
        "2 × 3.14 × 3 = 18.84 cm.",
        [
          "Circumference measures the rim.",
          "Multiply the diameter by π.",
          "Calculate 2 × 3.14 × 3.",
        ],
      ),
      numeric(
        "A disc has radius 3 cm. Use π ≈ 3.14 to find its area in square centimetres.",
        28.26,
        "3.14 × 3² = 3.14 × 9 = 28.26 cm².",
        [
          "Area covers the disc.",
          "Square the radius, then multiply by π.",
          "Calculate 3.14 × (3 × 3).",
        ],
      ),
      numeric(
        "A circular mat has diameter 8 m. Use π ≈ 3.14 to find its area in square metres.",
        50.24,
        "Radius = 8/2 = 4 m; area = 3.14 × 4² = 50.24 m².",
        [
          "The given distance is the diameter.",
          "Halve it to obtain the radius before squaring.",
          "Calculate 3.14 × (8/2)².",
        ],
      ),
      choose(
        "A radius doubles. What happens to circumference and area?",
        [
          "Both double",
          "Circumference doubles and area quadruples",
          "Circumference quadruples and area doubles",
        ],
        1,
        "Circumference contains one radius factor; area contains two, so their multipliers are 2 and 2².",
        "Compare 2πr with πr².",
      ),
      choose(
        "Which measurement determines the length of trim around a circular table?",
        ["Its circumference", "Its area", "Its volume"],
        0,
        "Trim follows the one-dimensional boundary, so its length is the circumference.",
        "Identify whether you need the boundary or the covered surface.",
      ),
    ],
    cards: [
      card(
        "A circle has diameter 10 cm. Use π ≈ 3.14 to find its circumference in centimetres.",
        31.4,
        "Circumference = π × diameter = 3.14 × 10 = 31.4 cm.",
      ),
      card(
        "A disc has radius 2 cm. Use π ≈ 3.14 to find its area in square centimetres.",
        12.56,
        "3.14 × 2² = 12.56 cm².",
      ),
    ],
  },
];
